import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class BillCreate(BaseModel):
    amount: float = Field(gt=0)
    currency: str = Field(max_length=4)
    num_people: int = Field(ge=2, le=100)
    lightning_address: str = Field(max_length=320)
    description: str | None = Field(None, max_length=256)
    participant_names: list[str] | None = Field(None, max_length=100)

    @field_validator("participant_names")
    @classmethod
    def validate_participant_names(cls, v: list[str] | None) -> list[str] | None:
        if v is not None:
            for name in v:
                if len(name) > 100:
                    raise ValueError("Participant name must be 100 characters or less")
        return v


class ParticipantOut(BaseModel):
    id: uuid.UUID
    name: str
    share_amount_msats: int
    share_amount_fiat: float
    status: str
    bolt11_invoice: str | None = None
    payment_hash: str | None = None
    verifiable: bool = False
    verified: bool = False
    preimage: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BillOut(BaseModel):
    id: uuid.UUID
    short_code: str
    amount: float
    currency: str
    num_people: int
    lightning_address: str
    description: str | None
    participant_names: list[str] | None = None
    created_at: datetime
    participants: list[ParticipantOut]

    model_config = {"from_attributes": True}


class BillStatus(BaseModel):
    short_code: str
    num_people: int
    joined: int
    paid: int


class JoinRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class JoinResponse(BaseModel):
    participant: ParticipantOut
    bolt11_invoice: str


class UpdateStatusRequest(BaseModel):
    status: Literal["paid", "invoice_created"]


class ExchangeRateOut(BaseModel):
    currency: str
    btc_price: float
