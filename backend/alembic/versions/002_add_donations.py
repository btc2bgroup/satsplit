"""Add donations table

Revision ID: 002
Revises: 001
Create Date: 2026-01-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "donations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("bill_id", UUID(as_uuid=True), sa.ForeignKey("bills.id"), nullable=False),
        sa.Column("amount_sats", sa.Integer, nullable=False),
        sa.Column("btcpay_invoice_id", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("donations")
