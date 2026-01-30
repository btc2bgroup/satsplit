import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models import Participant
from app.schemas import JoinRequest, JoinResponse, ParticipantOut
from app.services import bill_service
from app.services.lnurl import LnurlError

router = APIRouter(prefix="/api")


@router.post("/bills/{short_code}/join", response_model=JoinResponse, status_code=201)
async def join_bill(short_code: str, body: JoinRequest, session: AsyncSession = Depends(get_session)):
    bill = await bill_service.get_bill_by_code(session, short_code)
    if not bill:
        raise HTTPException(404, detail="Bill not found")
    try:
        participant = await bill_service.join_bill(session, bill, body.name)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except LnurlError as e:
        raise HTTPException(502, detail=str(e))
    return JoinResponse(participant=ParticipantOut.model_validate(participant), bolt11_invoice=participant.bolt11_invoice)


@router.get("/bills/{short_code}/participants/{participant_id}", response_model=ParticipantOut)
async def get_participant(short_code: str, participant_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
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
