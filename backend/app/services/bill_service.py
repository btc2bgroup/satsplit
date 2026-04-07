import math
import uuid

import shortuuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Bill, Participant
from app.services import exchange, lnurl


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

    participant = Participant(
        id=uuid.uuid4(),
        bill_id=bill.id,
        name=name,
        share_amount_msats=share_msats,
        share_amount_fiat=share_fiat,
        bolt11_invoice=invoice_data["pr"],
        payment_hash=payment_hash,
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


def _extract_payment_hash(bolt11: str) -> str | None:
    try:
        from bolt11 import decode

        decoded = decode(bolt11)
        return decoded.payment_hash
    except Exception:
        return None
