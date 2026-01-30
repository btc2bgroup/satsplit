import asyncio
import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_session
from app.main import app
from app.models import Base


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.fixture
def client(db_session):
    async def override_session():
        yield db_session

    app.dependency_overrides[get_session] = override_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


MOCK_LNURL_DATA = {
    "callback": "https://example.com/lnurlp/callback",
    "min_sendable": 1000,
    "max_sendable": 100_000_000_000,
    "comment_length": 100,
}

MOCK_INVOICE_DATA = {
    "pr": "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql",
    "routes": [],
}


@pytest.fixture
def mock_lnurl():
    with (
        patch("app.services.lnurl.resolve_lightning_address", new_callable=AsyncMock, return_value=MOCK_LNURL_DATA) as m1,
        patch("app.services.lnurl.fetch_invoice", new_callable=AsyncMock, return_value=MOCK_INVOICE_DATA) as m2,
    ):
        yield m1, m2


@pytest.fixture
def mock_exchange():
    with patch("app.services.exchange.get_btc_price", new_callable=AsyncMock, return_value=100_000.0):
        yield
