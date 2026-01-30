import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    short_code: Mapped[str] = mapped_column(String(8), unique=True, index=True)
    amount: Mapped[float] = mapped_column(Numeric(16, 2))
    currency: Mapped[str] = mapped_column(String(4))
    num_people: Mapped[int]
    lightning_address: Mapped[str] = mapped_column(String(320))
    description: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    participants: Mapped[list["Participant"]] = relationship(back_populates="bill", lazy="selectin")


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (UniqueConstraint("bill_id", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bills.id"))
    name: Mapped[str] = mapped_column(String(100))
    share_amount_msats: Mapped[int] = mapped_column(BigInteger)
    share_amount_fiat: Mapped[float] = mapped_column(Numeric(16, 2))
    bolt11_invoice: Mapped[str | None] = mapped_column(nullable=True)
    payment_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    bill: Mapped["Bill"] = relationship(back_populates="participants")
