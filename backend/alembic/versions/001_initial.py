"""Initial tables

Revision ID: 001
Revises:
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "bills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("short_code", sa.String(8), unique=True, index=True, nullable=False),
        sa.Column("amount", sa.Numeric(16, 2), nullable=False),
        sa.Column("currency", sa.String(4), nullable=False),
        sa.Column("num_people", sa.Integer, nullable=False),
        sa.Column("lightning_address", sa.String(320), nullable=False),
        sa.Column("description", sa.String(256), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "participants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bill_id", UUID(as_uuid=True), sa.ForeignKey("bills.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("share_amount_msats", sa.BigInteger, nullable=False),
        sa.Column("share_amount_fiat", sa.Numeric(16, 2), nullable=False),
        sa.Column("bolt11_invoice", sa.Text, nullable=True),
        sa.Column("payment_hash", sa.String(64), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("bill_id", "name"),
    )


def downgrade() -> None:
    op.drop_table("participants")
    op.drop_table("bills")
