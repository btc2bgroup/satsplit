"""Add LUD-21 verify columns to participants

Revision ID: 004
Revises: 003
Create Date: 2026-08-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("participants", sa.Column("verify_url", sa.String(512), nullable=True))
    op.add_column("participants", sa.Column("preimage", sa.String(64), nullable=True))
    op.add_column("participants", sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("participants", sa.Column("last_verify_check_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("participants", "last_verify_check_at")
    op.drop_column("participants", "verified_at")
    op.drop_column("participants", "preimage")
    op.drop_column("participants", "verify_url")
