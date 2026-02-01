import logging

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.limiter import limiter
from app.config import settings
from app.models import Bill, Participant

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/stats")
@limiter.limit(settings.rate_limit)
async def get_stats(request: Request, session: AsyncSession = Depends(get_session)):
    total_bills = (await session.execute(select(func.count(Bill.id)))).scalar() or 0
    total_participants = (await session.execute(select(func.count(Participant.id)))).scalar() or 0

    currency_rows = (
        await session.execute(
            select(
                Bill.currency,
                func.sum(Bill.amount).label("total"),
                func.count(Bill.id).label("count"),
            ).group_by(Bill.currency)
        )
    ).all()
    total_value_by_currency = [
        {"currency": r.currency, "total": float(r.total), "count": r.count}
        for r in currency_rows
    ]

    bills_over_time_rows = (
        await session.execute(
            select(
                func.date(Bill.created_at).label("date"),
                func.count(Bill.id).label("count"),
            )
            .group_by(func.date(Bill.created_at))
            .order_by(func.date(Bill.created_at))
        )
    ).all()
    bills_over_time = [
        {"date": str(r.date), "count": r.count} for r in bills_over_time_rows
    ]

    participants_over_time_rows = (
        await session.execute(
            select(
                func.date(Participant.created_at).label("date"),
                func.count(Participant.id).label("count"),
            )
            .group_by(func.date(Participant.created_at))
            .order_by(func.date(Participant.created_at))
        )
    ).all()
    participants_over_time = [
        {"date": str(r.date), "count": r.count} for r in participants_over_time_rows
    ]

    return {
        "total_bills": total_bills,
        "total_participants": total_participants,
        "total_value_by_currency": total_value_by_currency,
        "bills_over_time": bills_over_time,
        "participants_over_time": participants_over_time,
    }
