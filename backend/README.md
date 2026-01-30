# SatSplit — Backend

FastAPI application that powers bill splitting with Bitcoin Lightning payments.

## Overview

The backend handles bill creation, participant management, Lightning invoice generation, and fiat-to-BTC conversion. It uses the LNURL-pay protocol to generate invoices from any Lightning address.

## Tech Stack

- **FastAPI** — async web framework
- **SQLAlchemy** (async) + **asyncpg** — PostgreSQL ORM and driver
- **Alembic** — database migrations
- **httpx** — async HTTP client for external APIs
- **Pydantic** — request/response validation and settings
- **bolt11** — BOLT11 invoice parsing
- **CoinGecko API** — real-time BTC/fiat exchange rates

## API Endpoints

### Bills

#### `POST /api/bills` — Create a bill

Request body:

```json
{
  "amount": 100.00,
  "currency": "USD",
  "num_people": 4,
  "lightning_address": "user@getalby.com",
  "description": "Dinner"
}
```

- `amount` — total bill amount (must be > 0)
- `currency` — ISO currency code, max 4 chars (e.g. USD, EUR, GBP)
- `num_people` — number of people splitting the bill (must be >= 2)
- `lightning_address` — where payments are received (validated on creation)
- `description` — optional, max 256 chars

Returns the created bill with an 8-character `short_code` for sharing.

#### `GET /api/bills/{short_code}` — Get bill details

Returns the full bill including all participants and their payment status.

#### `GET /api/bills/{short_code}/status` — Get bill status

Returns a lightweight status summary:

```json
{
  "short_code": "abc12345",
  "num_people": 4,
  "joined": 2,
  "paid": 1
}
```

This endpoint is polled by the frontend every 3 seconds.

#### `GET /api/exchange-rate?currency=USD` — Get BTC price

Returns the current BTC price in the given fiat currency via CoinGecko. Results are cached for 60 seconds.

### Participants

#### `POST /api/bills/{short_code}/join` — Join a bill

Request body:

```json
{
  "name": "Alice"
}
```

This endpoint:
1. Checks the bill exists and isn't full
2. Checks the name isn't already taken
3. Calculates the equal share (`amount / num_people`)
4. Converts the share to millisatoshis using the current BTC price
5. Resolves the Lightning address via LNURL-pay
6. Fetches a BOLT11 invoice for the share amount
7. Returns the invoice for payment

Response includes a `bolt11_invoice` string and participant details.

#### `GET /api/bills/{short_code}/participants/{participant_id}` — Get participant

Returns a single participant's details including payment status.

## Database

Two tables:

- **bills** — stores bill metadata and the Lightning address
- **participants** — stores each person's name, share amount (fiat and msats), BOLT11 invoice, payment hash, and status

Participant status values: `pending`, `invoice_created`, `paid`, `failed`.

Names are unique per bill (enforced by a database constraint).

## Services

### Lightning (LNURL-pay)

- `resolve_lightning_address(address)` — resolves `user@domain` to a LNURL-pay endpoint at `https://domain/.well-known/lnurlp/user`
- `fetch_invoice(callback, amount_msats, comment)` — requests a BOLT11 invoice from the LNURL callback

### Exchange Rates

- `get_btc_price(currency)` — fetches BTC price from CoinGecko (cached 60s)
- `fiat_to_msats(amount, currency)` — converts a fiat amount to millisatoshis

## Configuration

All settings use the `GD_` environment variable prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `GD_DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@localhost:5432/satsplit` | Database connection string |
| `GD_CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `GD_EXCHANGE_RATE_CACHE_TTL` | `60` | Exchange rate cache TTL in seconds |
| `GD_COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | CoinGecko API URL |

## Running

### Local development

```bash
# Start PostgreSQL (e.g. via Docker)
docker compose up db -d

# Install dependencies
pip install -e ".[dev]"

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

### Docker

```bash
docker compose up backend -d
```

The Docker entrypoint runs migrations automatically before starting uvicorn on port 8000.

## Tests

```bash
pytest
```

Tests use an in-memory SQLite database and mock all external HTTP calls (Lightning, CoinGecko).
