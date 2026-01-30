import httpx


class LnurlError(Exception):
    pass


async def resolve_lightning_address(address: str) -> dict:
    """Resolve a lightning address to its LNURL-pay metadata."""
    if "@" not in address:
        raise LnurlError(f"Invalid lightning address: {address}")

    user, domain = address.split("@", 1)
    url = f"https://{domain}/.well-known/lnurlp/{user}"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10, follow_redirects=True)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise LnurlError(f"Lightning address not found: {address} ({e.response.status_code})")
    except httpx.RequestError as e:
        raise LnurlError(f"Failed to resolve lightning address: {e}")

    if data.get("status") == "ERROR":
        raise LnurlError(data.get("reason", "LNURL error"))

    return {
        "callback": data["callback"],
        "min_sendable": data["minSendable"],
        "max_sendable": data["maxSendable"],
        "comment_length": data.get("commentAllowed", 0),
    }


async def fetch_invoice(callback: str, amount_msats: int, comment: str | None = None) -> dict:
    """Fetch a bolt11 invoice from an LNURL-pay callback."""
    params: dict[str, str | int] = {"amount": amount_msats}
    if comment:
        params["comment"] = comment

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(callback, params=params, timeout=10, follow_redirects=True)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise LnurlError(f"Invoice fetch failed ({e.response.status_code})")
    except httpx.RequestError as e:
        raise LnurlError(f"Invoice fetch failed: {e}")

    if data.get("status") == "ERROR":
        raise LnurlError(data.get("reason", "Invoice fetch error"))

    return {
        "pr": data["pr"],
        "routes": data.get("routes", []),
    }
