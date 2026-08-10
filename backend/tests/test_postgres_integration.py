"""Integration tests that need a real Postgres.

Skipped unless GD_TEST_DATABASE_URL points at a disposable database. These cover the
gap SQLite leaves: type strictness on the wire. CI runs them in the migrations job,
which already has a Postgres service.
"""

import os
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.models import Base, Bill, Participant
from app.services import bill_service

DATABASE_URL = os.environ.get("GD_TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not DATABASE_URL, reason="GD_TEST_DATABASE_URL is not set"
)


@pytest_asyncio.fixture
async def pg_session():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


async def _seed(session) -> tuple[Bill, Participant]:
    bill = Bill(
        id=uuid.uuid4(),
        short_code="pgtest01",
        amount=50,
        currency="USD",
        num_people=2,
        lightning_address="test@example.com",
    )
    participant = Participant(
        id=uuid.uuid4(),
        bill_id=bill.id,
        name="Alice",
        share_amount_msats=25_000_000,
        share_amount_fiat=25,
        bolt11_invoice="lnbc250n1pexample",
        verify_url="https://example.com/verify/abc",
        status="invoice_created",
    )
    session.add_all([bill, participant])
    await session.commit()
    await session.refresh(bill)
    return bill, participant


@pytest.mark.asyncio
async def test_verify_writes_aware_datetimes(pg_session):
    """Regression: aware datetimes must bind to the timestamptz columns.

    A naive DateTime mapping raises DataError here ("can't subtract offset-naive and
    offset-aware datetimes") while passing silently on SQLite.
    """
    bill, participant = await _seed(pg_session)

    with patch(
        "app.services.lnurl.verify_payment",
        new_callable=AsyncMock,
        return_value={"settled": True, "preimage": "ab" * 32},
    ):
        updated = await bill_service.verify_participant_payment(pg_session, bill, participant.id)

    assert updated is not None
    assert updated.status == "paid"
    assert updated.preimage == "ab" * 32
    assert updated.verified_at is not None
    assert updated.verified_at.tzinfo is not None
    assert updated.last_verify_check_at is not None


@pytest.mark.asyncio
async def test_throttle_comparison_survives_a_round_trip(pg_session):
    """The stored timestamp is read back and compared on the next call."""
    bill, participant = await _seed(pg_session)

    with patch(
        "app.services.lnurl.verify_payment",
        new_callable=AsyncMock,
        return_value={"settled": False, "preimage": None},
    ) as mock_verify:
        await bill_service.verify_participant_payment(pg_session, bill, participant.id)
        await bill_service.verify_participant_payment(pg_session, bill, participant.id)

    # The second call is inside the throttle window, so it never reaches the LN service.
    assert mock_verify.await_count == 1


@pytest.mark.asyncio
async def test_unsettled_leaves_verified_at_null(pg_session):
    bill, participant = await _seed(pg_session)

    with patch(
        "app.services.lnurl.verify_payment",
        new_callable=AsyncMock,
        return_value={"settled": False, "preimage": None},
    ):
        updated = await bill_service.verify_participant_payment(pg_session, bill, participant.id)

    assert updated.status == "invoice_created"
    assert updated.verified_at is None

    result = await pg_session.execute(
        select(Participant).where(Participant.id == participant.id)
    )
    stored = result.scalar_one()
    assert stored.last_verify_check_at is not None
    assert stored.last_verify_check_at <= datetime.now(timezone.utc)
