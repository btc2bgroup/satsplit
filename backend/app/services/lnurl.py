import json
import logging

import httpx

from app.config import settings
from app.services.url_guard import UnsafeUrlError, check_host_resolves_public

logger = logging.getLogger(__name__)

# A LUD-21 verify response is a handful of small JSON fields. Cap the body so a hostile
# host cannot stream indefinitely into the backend.
MAX_VERIFY_BODY_BYTES = 64 * 1024


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

    verify = data.get("verify")
    return {
        "pr": data["pr"],
        "routes": data.get("routes", []),
        "verify": verify if isinstance(verify, str) and verify else None,
    }


async def verify_payment(verify_url: str, expected_pr: str | None = None) -> dict:
    """Check a LUD-21 verify URL for settlement.

    Returns {"settled": bool, "preimage": str | None}. Raises LnurlError when the
    LN SERVICE reports an error or returns something we cannot trust — an ambiguous
    response must never be read as "definitely unpaid".
    """
    host = httpx.URL(verify_url).host
    try:
        await check_host_resolves_public(host)
    except UnsafeUrlError as e:
        raise LnurlError(str(e))

    try:
        async with httpx.AsyncClient() as client:
            # No redirect following: a redirect off the validated host would sidestep
            # the SSRF guard entirely.
            resp = await client.get(
                verify_url, timeout=settings.lnurl_verify_timeout, follow_redirects=False
            )
            if resp.is_redirect:
                raise LnurlError("Verification failed: verify URL redirected")
            resp.raise_for_status()
            body = resp.content[: MAX_VERIFY_BODY_BYTES + 1]
    except httpx.HTTPStatusError as e:
        raise LnurlError(f"Verification failed ({e.response.status_code})")
    except httpx.RequestError as e:
        raise LnurlError(f"Verification failed: {e}")

    if len(body) > MAX_VERIFY_BODY_BYTES:
        raise LnurlError("Verification failed: response too large")

    try:
        data = json.loads(body)
    except ValueError:
        raise LnurlError("Verification failed: invalid response")

    if not isinstance(data, dict):
        raise LnurlError("Verification failed: invalid response")

    if data.get("status") == "ERROR":
        raise LnurlError(data.get("reason", "Verification error"))

    settled = data.get("settled")
    if not isinstance(settled, bool):
        raise LnurlError("Verification failed: response has no 'settled' field")

    returned_pr = data.get("pr")
    if expected_pr and isinstance(returned_pr, str) and returned_pr.lower() != expected_pr.lower():
        raise LnurlError("Verification failed: response is for a different invoice")

    preimage = data.get("preimage")
    if not isinstance(preimage, str) or not preimage:
        preimage = None
    if settled and preimage is None:
        logger.warning("LUD-21 verify reported settled with no preimage: %s", verify_url)

    return {"settled": settled, "preimage": preimage}
