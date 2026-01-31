from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_session
from app.limiter import limiter
from app.models import Bill, Donation
from app.services.btcpay import BtcPayError, create_invoice

router = APIRouter(prefix="/api")


class DonationRequest(BaseModel):
    bill_short_code: str
    amount_sats: int = Field(gt=0)


class DonationResponse(BaseModel):
    checkout_url: str


@router.post("/donations", response_model=DonationResponse, status_code=201)
@limiter.limit(settings.rate_limit)
async def create_donation(
    request: Request,
    body: DonationRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Bill).where(Bill.short_code == body.bill_short_code)
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(404, detail="Bill not found")

    redirect_url = f"{settings.cors_origins[0]}/bill/{body.bill_short_code}?donated=1"

    try:
        inv = await create_invoice(body.amount_sats, redirect_url)
    except BtcPayError as e:
        raise HTTPException(502, detail=str(e))

    donation = Donation(
        bill_id=bill.id,
        amount_sats=body.amount_sats,
        btcpay_invoice_id=inv["invoice_id"],
    )
    session.add(donation)
    await session.commit()

    return DonationResponse(checkout_url=inv["checkout_url"])
