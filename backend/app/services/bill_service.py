import logging
import math
import uuid
from datetime import datetime, timedelta, timezone

import shortuuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Bill, Participant
from app.services import exchange, lnurl, url_guard

logger = logging.getLogger(__name__)


class VerifyUnsupported(Exception):
    """The participant's invoice has no usable LUD-21 verify URL."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat those as UTC so comparisons work."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def create_bill(
    session: AsyncSession,
    amount: float,
    currency: str,
    num_people: int,
    lightning_address: str,
    description: str | None = None,
    participant_names: list[str] | None = None,
) -> Bill:
    # Validate lightning address is resolvable
    lnurl_data = await lnurl.resolve_lightning_address(lightning_address)

    # Validate per-person share meets minimum sendable
    share_fiat = round(amount / num_people, 2)
    share_msats = await exchange.fiat_to_msats(share_fiat, currency)
    if share_msats < lnurl_data["min_sendable"]:
        min_sats = lnurl_data["min_sendable"] // 1000
        raise ValueError(
            f"Per-person share ({share_msats // 1000} sats) is below the minimum "
            f"sendable amount ({min_sats} sats) for this lightning address"
        )

    # Validate participant names if provided
    if participant_names is not None:
        names = [n.strip() for n in participant_names if n.strip()]
        if len(names) != len(set(n.lower() for n in names)):
            raise ValueError("Participant names must be unique")
        if len(names) != num_people:
            raise ValueError(
                f"Number of participant names ({len(names)}) must match "
                f"number of people ({num_people})"
            )
        participant_names = names

    bill = Bill(
        id=uuid.uuid4(),
        short_code=shortuuid.ShortUUID().random(length=8),
        amount=amount,
        currency=currency.upper(),
        num_people=num_people,
        lightning_address=lightning_address,
        description=description,
        participant_names=participant_names,
    )
    session.add(bill)
    await session.commit()
    await session.refresh(bill)
    return bill


async def get_bill_by_code(session: AsyncSession, short_code: str) -> Bill | None:
    result = await session.execute(select(Bill).where(Bill.short_code == short_code))
    return result.scalar_one_or_none()


async def join_bill(session: AsyncSession, bill: Bill, name: str) -> Participant:
    # Check capacity
    if len(bill.participants) >= bill.num_people:
        raise ValueError("Bill is full")

    # If bill has predefined names, validate against them
    if bill.participant_names:
        valid = [n for n in bill.participant_names if n.lower() == name.lower()]
        if not valid:
            raise ValueError(f"Name '{name}' is not in the participant list")
        name = valid[0]  # Use the original casing from the creator

    # Check duplicate name — return existing participant if unpaid
    for p in bill.participants:
        if p.name.lower() == name.lower():
            if p.status == "paid":
                raise ValueError(f"'{name}' has already paid")
            return p

    # Calculate share
    share_fiat = round(float(bill.amount) / bill.num_people, 2)
    share_msats = await exchange.fiat_to_msats(share_fiat, bill.currency)

    # Resolve LNURL and fetch invoice
    lnurl_data = await lnurl.resolve_lightning_address(bill.lightning_address)

    if share_msats < lnurl_data["min_sendable"] or share_msats > lnurl_data["max_sendable"]:
        raise ValueError(
            f"Share amount {share_msats} msats is outside the accepted range "
            f"({lnurl_data['min_sendable']}-{lnurl_data['max_sendable']})"
        )

    bill_label = bill.description or "Split bill"
    comment_text = f"satsplit.app - {bill_label} ({name})"
    comment = comment_text if lnurl_data["comment_length"] >= len(comment_text) else None
    invoice_data = await lnurl.fetch_invoice(lnurl_data["callback"], share_msats, comment)

    # Extract payment hash from bolt11
    payment_hash = _extract_payment_hash(invoice_data["pr"])

    verify_url = _safe_verify_url(
        invoice_data.get("verify"), lnurl_data["callback"], bill.lightning_address
    )

    participant = Participant(
        id=uuid.uuid4(),
        bill_id=bill.id,
        name=name,
        share_amount_msats=share_msats,
        share_amount_fiat=share_fiat,
        bolt11_invoice=invoice_data["pr"],
        payment_hash=payment_hash,
        verify_url=verify_url,
        status="invoice_created",
    )
    session.add(participant)
    await session.commit()
    await session.refresh(participant)
    return participant


async def update_participant_status(
    session: AsyncSession, bill: Bill, participant_id: uuid.UUID, new_status: str
) -> Participant | None:
    result = await session.execute(
        select(Participant).where(Participant.id == participant_id, Participant.bill_id == bill.id)
    )
    participant = result.scalar_one_or_none()
    if not participant:
        return None
    participant.status = new_status
    await session.commit()
    await session.refresh(participant)
    return participant


def _safe_verify_url(verify_url: str | None, callback: str, lightning_address: str) -> str | None:
    """Keep a LUD-21 verify URL only if it passes the SSRF guard.

    A rejected URL is not an error for the payer — the participant simply falls back to
    the manual paid/unpaid toggle.
    """
    if not verify_url or not settings.lnurl_verify_enabled:
        return None
    try:
        url_guard.check_url_shape(verify_url, callback, lightning_address)
    except url_guard.UnsafeUrlError as e:
        logger.warning("Discarding LUD-21 verify URL for %s: %s", lightning_address, e)
        return None
    return verify_url


async def get_participant(
    session: AsyncSession, bill: Bill, participant_id: uuid.UUID
) -> Participant | None:
    result = await session.execute(
        select(Participant).where(Participant.id == participant_id, Participant.bill_id == bill.id)
    )
    return result.scalar_one_or_none()


async def verify_participant_payment(
    session: AsyncSession, bill: Bill, participant_id: uuid.UUID
) -> Participant | None:
    """Check settlement via LUD-21 and mark the participant paid if it has settled.

    Returns None when the participant does not exist, and raises VerifyUnsupported when
    the invoice carries no usable verify URL.
    """
    participant = await get_participant(session, bill, participant_id)
    if not participant:
        return None

    # Already paid: nothing to learn, and no reason to contact the LN service again.
    if participant.status == "paid":
        return participant

    if not participant.verify_url or not settings.lnurl_verify_enabled:
        raise VerifyUnsupported("This lightning address does not support payment verification")

    now = _utcnow()
    if participant.last_verify_check_at is not None:
        elapsed = now - _as_utc(participant.last_verify_check_at)
        if elapsed < timedelta(seconds=settings.lnurl_verify_min_interval):
            # Throttled. Return current state rather than erroring — clients poll this.
            return participant

    participant.last_verify_check_at = now
    await session.commit()

    result = await lnurl.verify_payment(participant.verify_url, participant.bolt11_invoice)

    if result["settled"]:
        participant.status = "paid"
        participant.preimage = result["preimage"]
        participant.verified_at = _utcnow()
        await session.commit()
        await session.refresh(participant)

    return participant


def _extract_payment_hash(bolt11: str) -> str | None:
    try:
        from bolt11 import decode

        decoded = decode(bolt11)
        return decoded.payment_hash
    except Exception:
        return None
