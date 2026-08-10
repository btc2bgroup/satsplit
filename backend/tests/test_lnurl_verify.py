import json
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.lnurl import MAX_VERIFY_BODY_BYTES, LnurlError, fetch_invoice, verify_payment
from app.services.url_guard import UnsafeUrlError

VERIFY_URL = "https://example.com/verify/894e7f7e"
PR = "lnbc10n1pjabcdef"


@pytest.fixture(autouse=True)
def allow_host():
    """Skip the DNS check — it is covered on its own in test_url_guard."""
    with patch("app.services.lnurl.check_host_resolves_public", new_callable=AsyncMock):
        yield


@pytest.mark.asyncio
async def test_settled(httpx_mock):
    httpx_mock.add_response(
        url=VERIFY_URL,
        json={"status": "OK", "settled": True, "preimage": "ab" * 32, "pr": PR},
    )
    result = await verify_payment(VERIFY_URL, PR)
    assert result == {"settled": True, "preimage": "ab" * 32}


@pytest.mark.asyncio
async def test_unsettled(httpx_mock):
    httpx_mock.add_response(
        url=VERIFY_URL,
        json={"status": "OK", "settled": False, "preimage": None, "pr": PR},
    )
    result = await verify_payment(VERIFY_URL, PR)
    assert result == {"settled": False, "preimage": None}


@pytest.mark.asyncio
async def test_settled_without_preimage_still_settles(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, json={"status": "OK", "settled": True, "pr": PR})
    result = await verify_payment(VERIFY_URL, PR)
    assert result == {"settled": True, "preimage": None}


@pytest.mark.asyncio
async def test_error_status_raises(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, json={"status": "ERROR", "reason": "Not found"})
    with pytest.raises(LnurlError, match="Not found"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_missing_settled_field_raises(httpx_mock):
    """An ambiguous response must not be read as 'definitely unpaid'."""
    httpx_mock.add_response(url=VERIFY_URL, json={"status": "OK", "pr": PR})
    with pytest.raises(LnurlError, match="settled"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_non_bool_settled_raises(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, json={"status": "OK", "settled": "true", "pr": PR})
    with pytest.raises(LnurlError, match="settled"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_pr_mismatch_raises(httpx_mock):
    httpx_mock.add_response(
        url=VERIFY_URL,
        json={"status": "OK", "settled": True, "preimage": "ab" * 32, "pr": "lnbc10n1pOTHER"},
    )
    with pytest.raises(LnurlError, match="different invoice"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_pr_case_insensitive_match(httpx_mock):
    httpx_mock.add_response(
        url=VERIFY_URL,
        json={"status": "OK", "settled": True, "preimage": "ab" * 32, "pr": PR.upper()},
    )
    result = await verify_payment(VERIFY_URL, PR)
    assert result["settled"] is True


@pytest.mark.asyncio
async def test_missing_pr_in_response_is_tolerated(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, json={"status": "OK", "settled": True, "preimage": None})
    result = await verify_payment(VERIFY_URL, PR)
    assert result["settled"] is True


@pytest.mark.asyncio
async def test_http_error_raises(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, status_code=500)
    with pytest.raises(LnurlError, match="500"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_timeout_raises(httpx_mock):
    httpx_mock.add_exception(httpx.ReadTimeout("timed out"), url=VERIFY_URL)
    with pytest.raises(LnurlError, match="Verification failed"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_invalid_json_raises(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, content=b"<html>not json</html>")
    with pytest.raises(LnurlError, match="invalid response"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_non_object_json_raises(httpx_mock):
    httpx_mock.add_response(url=VERIFY_URL, json=[1, 2, 3])
    with pytest.raises(LnurlError, match="invalid response"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_redirect_is_refused(httpx_mock):
    """Following a redirect would sidestep the SSRF host check."""
    httpx_mock.add_response(
        url=VERIFY_URL, status_code=302, headers={"Location": "http://169.254.169.254/"}
    )
    with pytest.raises(LnurlError, match="redirect"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_oversized_body_raises(httpx_mock):
    payload = json.dumps({"status": "OK", "settled": True, "pad": "x" * MAX_VERIFY_BODY_BYTES})
    httpx_mock.add_response(url=VERIFY_URL, content=payload.encode())
    with pytest.raises(LnurlError, match="too large"):
        await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_unsafe_host_raises():
    with patch(
        "app.services.lnurl.check_host_resolves_public",
        new_callable=AsyncMock,
        side_effect=UnsafeUrlError("nope"),
    ):
        with pytest.raises(LnurlError, match="nope"):
            await verify_payment(VERIFY_URL, PR)


@pytest.mark.asyncio
async def test_fetch_invoice_captures_verify_url(httpx_mock):
    httpx_mock.add_response(
        url="https://example.com/cb?amount=1000",
        json={"pr": PR, "routes": [], "verify": VERIFY_URL},
    )
    data = await fetch_invoice("https://example.com/cb", 1000)
    assert data["verify"] == VERIFY_URL


@pytest.mark.asyncio
async def test_fetch_invoice_without_verify_url(httpx_mock):
    httpx_mock.add_response(url="https://example.com/cb?amount=1000", json={"pr": PR, "routes": []})
    data = await fetch_invoice("https://example.com/cb", 1000)
    assert data["verify"] is None


@pytest.mark.asyncio
async def test_fetch_invoice_ignores_non_string_verify(httpx_mock):
    httpx_mock.add_response(
        url="https://example.com/cb?amount=1000", json={"pr": PR, "routes": [], "verify": 42}
    )
    data = await fetch_invoice("https://example.com/cb", 1000)
    assert data["verify"] is None
