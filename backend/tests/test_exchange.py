import pytest

from app.services.exchange import fiat_to_msats


@pytest.mark.asyncio
async def test_sats_whole_number():
    result = await fiat_to_msats(10, "SATS")
    assert result == 10_000
    assert result % 1000 == 0


@pytest.mark.asyncio
async def test_sats_fractional_rounds_up():
    # 2.5 sats should round up to 3 sats = 3000 msats
    result = await fiat_to_msats(2.5, "SATS")
    assert result == 3_000
    assert result % 1000 == 0


@pytest.mark.asyncio
async def test_sats_small_fraction_rounds_up():
    # 0.1 sats should round up to 1 sat = 1000 msats
    result = await fiat_to_msats(0.1, "SATS")
    assert result == 1_000


@pytest.mark.asyncio
async def test_sats_already_whole():
    result = await fiat_to_msats(5.0, "SATS")
    assert result == 5_000
