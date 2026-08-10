import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
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
    participant_names: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

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
    # LUD-21 verify URL, captured from the LNURL-pay callback response. Internal only —
    # never serialized to clients.
    verify_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    preimage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_verify_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    bill: Mapped["Bill"] = relationship(back_populates="participants")

    @property
    def verifiable(self) -> bool:
        """Whether this invoice can be checked via LUD-21."""
        return self.verify_url is not None

    @property
    def verified(self) -> bool:
        """Whether settlement was confirmed by the LN service (vs. marked paid by hand)."""
        return self.verified_at is not None


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bills.id"))
    amount_sats: Mapped[int]
    btcpay_invoice_id: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
