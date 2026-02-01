from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_session
from app.limiter import limiter
from app.schemas import BillCreate, BillOut, BillStatus, ExchangeRateOut
from app.services import bill_service, exchange
from app.services.lnurl import LnurlError

router = APIRouter(prefix="/api")


@router.post("/bills", response_model=BillOut, status_code=201)
@limiter.limit(settings.rate_limit)
async def create_bill(request: Request, body: BillCreate, session: AsyncSession = Depends(get_session)):
    try:
        bill = await bill_service.create_bill(
            session,
            amount=body.amount,
            currency=body.currency,
            num_people=body.num_people,
            lightning_address=body.lightning_address,
            description=body.description,
        )
    except (LnurlError, ValueError) as e:
        raise HTTPException(400, detail=str(e))
    return bill


@router.get("/bills/{short_code}", response_model=BillOut)
@limiter.limit(settings.rate_limit)
async def get_bill(request: Request, short_code: str, session: AsyncSession = Depends(get_session)):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    return bill


@router.get("/bills/{short_code}/status", response_model=BillStatus)
@limiter.limit(settings.rate_limit)
async def get_bill_status(request: Request, short_code: str, session: AsyncSession = Depends(get_session)):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    return BillStatus(
        short_code=bill.short_code,
        num_people=bill.num_people,
        joined=len(bill.participants),
        paid=sum(1 for p in bill.participants if p.status == "paid"),
    )


@router.get("/exchange-rate", response_model=ExchangeRateOut)
@limiter.limit(settings.rate_limit)
async def get_exchange_rate(request: Request, currency: str = Query(default="USD", max_length=4)):
    try:
        price = await exchange.get_btc_price(currency.upper())
    except Exception as e:
        raise HTTPException(502, detail=f"Failed to fetch exchange rate: {e}")
    return ExchangeRateOut(currency=currency.upper(), btc_price=price)
