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
) -> Bill:
    # Validate lightning address is resolvable
    await lnurl.resolve_lightning_address(lightning_address)

    bill = Bill(
        id=uuid.uuid4(),
        short_code=shortuuid.ShortUUID().random(length=8),
        amount=amount,
        currency=currency.upper(),
        num_people=num_people,
        lightning_address=lightning_address,
        description=description,
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

    # Check duplicate name
    for p in bill.participants:
        if p.name.lower() == name.lower():
            raise ValueError(f"Name '{name}' is already taken")

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

    comment = name if lnurl_data["comment_length"] >= len(name) else None
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
