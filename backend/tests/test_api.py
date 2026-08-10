from unittest.mock import AsyncMock, patch

import pytest
from limits import parse_many
from slowapi.util import get_remote_address
from slowapi.wrappers import Limit

from app.limiter import limiter

from .conftest import MOCK_INVOICE_DATA, MOCK_LNURL_DATA


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


def test_join_bill_duplicate_name_unpaid_returns_existing(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    first = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    second = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    assert second.status_code == 201
    assert second.json()["participant"]["id"] == first.json()["participant"]["id"]


def test_join_bill_duplicate_name_paid_rejected(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]

    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    pid = join.json()["participant"]["id"]
    client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "paid"})

    resp = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    assert resp.status_code == 400
    assert "already paid" in resp.json()["detail"]


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


def test_create_bill_with_participant_names(client, mock_lnurl, mock_exchange):
    resp = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "Bob", "Charlie"],
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["participant_names"] == ["Alice", "Bob", "Charlie"]


def test_create_bill_without_participant_names(client, mock_lnurl, mock_exchange):
    resp = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
    })
    assert resp.status_code == 201
    assert resp.json()["participant_names"] is None


def test_create_bill_participant_names_count_mismatch(client, mock_lnurl, mock_exchange):
    resp = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 3,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "Bob"],
    })
    assert resp.status_code == 400
    assert "must match" in resp.json()["detail"]


def test_create_bill_participant_names_duplicate(client, mock_lnurl, mock_exchange):
    resp = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "alice"],
    })
    assert resp.status_code == 400
    assert "unique" in resp.json()["detail"].lower()


def test_join_bill_with_predefined_name(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "Bob"],
    })
    code = create.json()["short_code"]

    resp = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    assert resp.status_code == 201
    assert resp.json()["participant"]["name"] == "Alice"


def test_join_bill_predefined_name_not_in_list(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "Bob"],
    })
    code = create.json()["short_code"]

    resp = client.post(f"/api/bills/{code}/join", json={"name": "Charlie"})
    assert resp.status_code == 400
    assert "not in the participant list" in resp.json()["detail"]


def test_join_bill_predefined_name_case_insensitive(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0,
        "currency": "USD",
        "num_people": 2,
        "lightning_address": "test@example.com",
        "participant_names": ["Alice", "Bob"],
    })
    code = create.json()["short_code"]

    resp = client.post(f"/api/bills/{code}/join", json={"name": "alice"})
    assert resp.status_code == 201
    # Should use the original casing from the creator
    assert resp.json()["participant"]["name"] == "Alice"


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


# --- LUD-21 payment verification -------------------------------------------------


def _bill_with_participant(client):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]
    join = client.post(f"/api/bills/{code}/join", json={"name": "Alice"})
    return code, join.json()["participant"]["id"]


def test_join_exposes_verifiable_flag(client, mock_lnurl, mock_exchange):
    create = client.post("/api/bills", json={
        "amount": 100.0, "currency": "USD", "num_people": 2,
        "lightning_address": "test@example.com",
    })
    code = create.json()["short_code"]
    join = client.post(f"/api/bills/{code}/join", json={"name": "Bob"})
    participant = join.json()["participant"]
    assert participant["verifiable"] is True
    assert participant["verified"] is False
    # The verify URL itself is internal and must never reach the client.
    assert "verify_url" not in participant


def test_verify_marks_participant_paid(client, mock_lnurl, mock_exchange, mock_verify_settled):
    code, pid = _bill_with_participant(client)

    resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "paid"
    assert data["verified"] is True
    assert data["preimage"] == "aa" * 32
    mock_verify_settled.assert_awaited_once()


def test_verify_unsettled_leaves_status_alone(client, mock_lnurl, mock_exchange, mock_verify_unsettled):
    code, pid = _bill_with_participant(client)

    resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "invoice_created"
    assert data["verified"] is False
    assert data["preimage"] is None


def test_verify_is_idempotent_and_skips_outbound_call_once_paid(
    client, mock_lnurl, mock_exchange, mock_verify_settled
):
    code, pid = _bill_with_participant(client)

    first = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    second = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert first.status_code == second.status_code == 200
    assert second.json()["status"] == "paid"
    # Second call short-circuits: no second request to the LN service.
    assert mock_verify_settled.await_count == 1


def test_verify_throttled_returns_current_state_without_calling_service(
    client, mock_lnurl, mock_exchange, mock_verify_unsettled
):
    code, pid = _bill_with_participant(client)

    client.post(f"/api/bills/{code}/participants/{pid}/verify")
    resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert resp.status_code == 200
    assert resp.json()["status"] == "invoice_created"
    assert mock_verify_unsettled.await_count == 1


def test_verify_respects_min_interval_setting(client, mock_lnurl, mock_exchange, mock_verify_unsettled):
    from app.config import settings

    original = settings.lnurl_verify_min_interval
    settings.lnurl_verify_min_interval = 0
    try:
        code, pid = _bill_with_participant(client)
        client.post(f"/api/bills/{code}/participants/{pid}/verify")
        client.post(f"/api/bills/{code}/participants/{pid}/verify")
        assert mock_verify_unsettled.await_count == 2
    finally:
        settings.lnurl_verify_min_interval = original


def test_verify_unsupported_when_no_verify_url(client, mock_exchange):
    no_verify_invoice = dict(MOCK_INVOICE_DATA)
    no_verify_invoice["verify"] = None
    with (
        patch("app.services.lnurl.resolve_lightning_address", new_callable=AsyncMock,
              return_value=MOCK_LNURL_DATA),
        patch("app.services.lnurl.fetch_invoice", new_callable=AsyncMock,
              return_value=no_verify_invoice),
    ):
        code, pid = _bill_with_participant(client)

    join_resp = client.get(f"/api/bills/{code}/participants/{pid}")
    assert join_resp.json()["verifiable"] is False

    resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert resp.status_code == 409
    assert "does not support" in resp.json()["detail"]


def test_offsite_verify_url_is_discarded(client, mock_exchange):
    """An off-domain verify URL is dropped rather than stored — SSRF guard."""
    evil_invoice = dict(MOCK_INVOICE_DATA)
    evil_invoice["verify"] = "https://169.254.169.254/latest/meta-data"
    with (
        patch("app.services.lnurl.resolve_lightning_address", new_callable=AsyncMock,
              return_value=MOCK_LNURL_DATA),
        patch("app.services.lnurl.fetch_invoice", new_callable=AsyncMock,
              return_value=evil_invoice),
    ):
        code, pid = _bill_with_participant(client)

    assert client.get(f"/api/bills/{code}/participants/{pid}").json()["verifiable"] is False
    assert client.post(f"/api/bills/{code}/participants/{pid}/verify").status_code == 409


def test_verify_lnurl_error_returns_422(client, mock_lnurl, mock_exchange):
    from app.services.lnurl import LnurlError

    code, pid = _bill_with_participant(client)
    with patch("app.services.lnurl.verify_payment", new_callable=AsyncMock,
               side_effect=LnurlError("Not found")):
        resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
    assert resp.status_code == 422
    assert "Not found" in resp.json()["detail"]


def test_verify_participant_not_found(client, mock_lnurl, mock_exchange):
    code, _ = _bill_with_participant(client)
    resp = client.post(
        f"/api/bills/{code}/participants/00000000-0000-0000-0000-000000000000/verify"
    )
    assert resp.status_code == 404


def test_verify_bill_not_found(client):
    resp = client.post(
        "/api/bills/nonexist/participants/00000000-0000-0000-0000-000000000000/verify"
    )
    assert resp.status_code == 404


def test_verify_disabled_by_setting(client, mock_exchange):
    from app.config import settings

    original = settings.lnurl_verify_enabled
    settings.lnurl_verify_enabled = False
    try:
        with (
            patch("app.services.lnurl.resolve_lightning_address", new_callable=AsyncMock,
                  return_value=MOCK_LNURL_DATA),
            patch("app.services.lnurl.fetch_invoice", new_callable=AsyncMock,
                  return_value=MOCK_INVOICE_DATA),
        ):
            code, pid = _bill_with_participant(client)
        resp = client.post(f"/api/bills/{code}/participants/{pid}/verify")
        assert resp.status_code == 409
    finally:
        settings.lnurl_verify_enabled = original


def test_manually_marked_paid_is_not_flagged_verified(client, mock_lnurl, mock_exchange):
    code, pid = _bill_with_participant(client)
    resp = client.patch(f"/api/bills/{code}/participants/{pid}/status", json={"status": "paid"})
    assert resp.json()["status"] == "paid"
    assert resp.json()["verified"] is False
