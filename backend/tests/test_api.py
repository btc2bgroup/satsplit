from unittest.mock import AsyncMock, patch

import pytest
from limits import parse_many
from slowapi.util import get_remote_address
from slowapi.wrappers import Limit

from app.limiter import limiter


def test_rate_limit(client):
    key = "app.routers.bills.get_bill"
    original = limiter._route_limits[key]
    tight = Limit(parse_many("1/minute")[0], get_remote_address, None, False, None, None, None, 1, True)
    limiter._route_limits[key] = [tight]
    limiter.enabled = True
    try:
        resp1 = client.get("/api/bills/nonexist")
        resp2 = client.get("/api/bills/nonexist")
        assert resp2.status_code == 429
    finally:
        limiter._route_limits[key] = original
        limiter.enabled = False


def test_create_bill(client, mock_lnurl, mock_exchange):
    resp = client.post("/api/bills", json={
        "amount": 100.00,
        "currency": "USD",
        "num_people": 4,
        "lightning_address": "test@example.com",
        "description": "Dinner",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["amount"] == 100.0
    assert data["currency"] == "USD"
    assert data["num_people"] == 4
    assert len(data["short_code"]) == 8
    assert data["participants"] == []


def test_get_bill(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 50.0,
        "currency": "EUR",
        "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    resp = client.get(f"/api/bills/{code}")
    assert resp.status_code == 200
    assert resp.json()["short_code"] == code


def test_get_bill_not_found(client):
    resp = client.get("/api/bills/nonexist")
    assert resp.status_code == 404


def test_join_bill(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    resp = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["participant"]["name"] == "Alice"
    assert data["participant"]["status"] == "invoice_created"
    assert data["bolt11_invoice"] is not None


def test_join_bill_duplicate_name(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    resp = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    assert resp.status_code == 400


def test_join_bill_full(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    client.post(f"/api/bills/{code}/join", json={"name": "Bob"})
    resp = client.post(f"/api/bills/{code}/join", json={"name": "Charlie"})
    assert resp.status_code == 400


def test_bill_status(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    client.post(f"/api/bills/{code}/join", json={"name": "Alice"})

    resp = client.get(f"/api/bills/{code}/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["joined"] == 1
    assert data["paid"] == 0


def test_get_participant(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    pid = join.json()["participant"]["id"]

    resp = client.get(f"/api/bills/{code}/participants/{pid}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Alice"


def test_update_participant_status_to_paid(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]
    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    pid = join.json()["participant"]["id"]

    resp = client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "paid"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paid"


def test_update_participant_status_to_unpaid(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]
    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    pid = join.json()["participant"]["id"]

    client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "paid"})
    resp = client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "invoice_created"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "invoice_created"


def test_update_participant_status_not_found(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    resp = client.patch(f"/api/bills/{code}/participants/00000000-0000-0000-0000-000000000000/status",
                        json={"status": "paid"})
    assert resp.status_code == 404


def test_create_bill_share_below_min_sendable(client, mock_exchange):
    """10 SATS / 4 people = 3 sats (rounded up), but min_sendable is 1000 msats (1 sat) by default.
    Use a high min_sendable to trigger the validation."""
    high_min = {
        "callback": "https://example.com/lnurlp/callback",
        "min_sendable": 5_000_000,  # 5000 sats
        "max_sendable": 100_000_000_000,
        "comment_length": 100,
    }
    with patch(
        "app.services.lnurl.resolve_lightning_address",
        new_callable=AsyncMock,
        return_value=high_min,
    ):
        resp = client.post("/api/bills", json={
            "amount": 10,
            "currency": "SATS",
            "num_people": 4,
            "lightning_address": "test@example.com",
        })
        assert resp.status_code == 400
        assert "below the minimum" in resp.json()["detail"]


def test_update_participant_status_invalid(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]
    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    pid = join.json()["participant"]["id"]

    resp = client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "invalid"})
    assert resp.status_code == 422


def test_stats_empty(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_bills"] == 0
    assert data["total_participants"] == 0
    assert data["total_value_by_currency"] == []
    assert data["bills_over_time"] == []
    assert data["participants_over_time"] == []


def test_stats_with_data(client, mock_lnurl, mock_exchange):
    client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    create2 = client.post("/api/bills", json={
        "amount": 50.0, "currency": "EUR", "num_people": 3,
        "lightning_address": "test@example.com",
    })
    code2 = create2.json()["short_code"]
    client.post(f"/api/bills/{code2}/join", json={"name": "Alice"})

    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_bills"] == 2
    assert data["total_participants"] == 1
    assert len(data["total_value_by_currency"]) == 2
    currencies = {c["currency"]: c for c in data["total_value_by_currency"]}
    assert currencies["USD"]["total"] == 100.0
    assert currencies["USD"]["count"] == 1
    assert currencies["EUR"]["total"] == 50.0
    assert len(data["bills_over_time"]) >= 1
    assert len(data["participants_over_time"]) >= 1
