import httpx

from app.config import settings


class BtcPayError(Exception):
    pass


async def create_invoice(amount_sats: int, redirect_url: str) -> dict:
    """Create a BTCPay Server invoice. Returns {invoice_id, checkout_url}."""
    if not settings.btcpay_url or not settings.btcpay_api_key or not settings.btcpay_store_id:
        raise BtcPayError("BTCPay Server is not configured")

    url = f"{settings.btcpay_url}/api/v1/stores/{settings.btcpay_store_id}/invoices"
    headers = {"Authorization": f"token {settings.btcpay_api_key}"}
    payload = {
        "amount": str(amount_sats),
        "currency": "SATS",
        "checkout": {
            "redirectURL": redirect_url,
            "redirectAutomatically": True,
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers, timeout=15)

    if resp.status_code not in (200, 201):
        raise BtcPayError(f"BTCPay returned {resp.status_code}: {resp.text}")

    data = resp.json()
    return {
        "invoice_id": data["id"],
        "checkout_url": data["checkoutLink"],
    }
