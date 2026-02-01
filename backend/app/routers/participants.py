import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request

logger = logging.getLogger(__name__)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_session
from app.limiter import limiter
from app.models import Participant
from app.schemas import JoinRequest, JoinResponse, ParticipantOut, UpdateStatusRequest
from app.services import bill_service
from app.services.lnurl import LnurlError

router = APIRouter(prefix="/api")


@router.post("/bills/{short_code}/join", response_model=JoinResponse, status_code=201)
@limiter.limit(settings.rate_limit)
async def join_bill(request: Request, short_code: str, body: JoinRequest, session: AsyncSession = Depends(get_session)):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    try:
        participant = await bill_service.join_bill(session, bill, body.name)
    except ValueError as e:
        logger.warning("Join bill %s failed: %s", short_code, e)
        raise HTTPException(400, detail=str(e))
    except LnurlError as e:
        logger.error("Join bill %s LNURL error: %s", short_code, e)
        raise HTTPException(422, detail=str(e))
    return JoinResponse(participant=ParticipantOut.model_validate(participant), bolt11_invoice=participant.bolt11_invoice)


@router.get("/bills/{short_code}/participants/{participant_id}", response_model=ParticipantOut)
@limiter.limit(settings.rate_limit)
async def get_participant(request: Request, short_code: str, participant_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    result = await session.execute(
        select(Participant).where(Participant.id == participant_id, Participant.bill_id == bill.id)
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(404, detail="Participant not found")
    return participant


@router.patch("/bills/{short_code}/participants/{participant_id}/status", response_model=ParticipantOut)
@limiter.limit(settings.rate_limit)
async def update_participant_status(
    request: Request,
    short_code: str,
    participant_id: uuid.UUID,
    body: UpdateStatusRequest,
    session: AsyncSession = Depends(get_session),
):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    participant = await bill_service.update_participant_status(session, bill, participant_id, body.status)
    if not participant:
        raise HTTPException(404, detail="Participant not found")
    return participant
