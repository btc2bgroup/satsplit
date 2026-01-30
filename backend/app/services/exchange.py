import math
import time

import httpx
from cachetools import TTLCache

from app.config import settings

_cache: TTLCache[str, float] = TTLCache(maxsize=64, ttl=settings.exchange_rate_cache_ttl)


async def get_btc_price(currency: str) -> float:
    """Return the price of 1 BTC in the given fiat currency."""
    currency = currency.upper()
    if currency in ("BTC", "SATS"):
        return 1.0

    cache_key = currency
    if cache_key in _cache:
        return _cache[cache_key]

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.coingecko_base_url}/simple/price",
            params={"ids": "bitcoin", "vs_currencies": currency.lower()},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

    price = data["bitcoin"][currency.lower()]
    _cache[cache_key] = price
    return price


async def fiat_to_msats(amount: float, currency: str) -> int:
    """Convert a fiat amount to millisatoshis."""
    currency = currency.upper()
    if currency == "SATS":
        return int(amount * 1000)
    if currency == "BTC":
        return int(amount * 1e11)

    btc_price = await get_btc_price(currency)
    btc_amount = amount / btc_price
    sats = math.ceil(btc_amount * 1e8)
    return sats * 1000
