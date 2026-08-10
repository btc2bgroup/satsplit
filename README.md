# SatSplit

Split any bill and settle instantly over the Bitcoin Lightning Network.

## Architecture

- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS + Vite

## Quick Start

### With Docker Compose

```bash
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001

### Local Development

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

**Database:**

```bash
docker compose up db
```

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

All backend settings use the `GD_` env prefix (see `backend/app/config.py`).

| Variable | Description | Default |
|---|---|---|
| `GD_DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/satsplit` |
| `GD_CORS_ORIGINS` | Allowed CORS origins (JSON array) | `["http://localhost:3000"]` |
| `GD_EXCHANGE_RATE_CACHE_TTL` | Exchange rate cache TTL in seconds | `60` |
| `GD_COINGECKO_BASE_URL` | CoinGecko API base URL | `https://api.coingecko.com/api/v3` |
| `GD_RATE_LIMIT` | API rate limit | `60/minute` |
| `GD_LNURL_VERIFY_ENABLED` | Enable LUD-21 payment verification | `true` |
| `GD_LNURL_VERIFY_TIMEOUT` | Timeout for verify requests in seconds | `10` |
| `GD_LNURL_VERIFY_MIN_INTERVAL` | Minimum seconds between verify checks per participant | `3` |
| `GD_BTCPAY_URL` | BTCPay Server base URL | (empty, donations disabled) |
| `GD_BTCPAY_API_KEY` | BTCPay Server API key | (empty) |
| `GD_BTCPAY_STORE_ID` | BTCPay Server store ID | (empty) |

### Payment verification (LUD-21)

When an invoice is fetched, the LNURL-pay callback may return a
[LUD-21](https://github.com/lnurl/luds/blob/luds/21.md) `verify` URL. SatSplit stores it and
uses it to confirm settlement directly with the recipient's own wallet — no node access
required. The bill owner sees each share flip to **Paid ✓ verified** on its own, and the payer
gets a "Payment received" confirmation without leaving the page.

Not every wallet implements LUD-21. Participants whose invoice carries no usable verify URL
keep the manual Mark Paid / Mark Unpaid toggle, and the UI says so.

Verify URLs come from a third party, so before the backend fetches one it must be HTTPS, live
on the same domain as the LNURL callback, and resolve to a publicly routable address. URLs that
fail those checks are discarded and the participant falls back to the manual toggle.

Set `GD_LNURL_VERIFY_ENABLED=false` to turn the feature off entirely.

### Donations via BTCPay Server

To enable the optional donation feature, configure all three `GD_BTCPAY_*` variables. When set, users see a "I want to support this project" toggle on the bill creation form with preset amounts (21 / 210 / 2100 sats). After creating a bill, the user is redirected to BTCPay checkout and back to the bill page upon completion.

## Database Migrations

```bash
cd backend
alembic upgrade head
```

## Tests

**Backend:**

```bash
cd backend
pytest
```

**Frontend:**

```bash
cd frontend
npm test
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/bills` | Create a new bill |
| `GET` | `/api/bills/:code` | Get bill by short code |
| `GET` | `/api/bills/:code/status` | Get bill join/payment status |
| `POST` | `/api/bills/:code/join` | Join a bill as participant |
| `PATCH` | `/api/bills/:code/participants/:id/status` | Update participant status |
| `POST` | `/api/bills/:code/participants/:id/verify` | Check payment settlement via LUD-21 |
| `POST` | `/api/donations` | Create a BTCPay donation invoice |
| `GET` | `/api/exchange-rate` | Get current BTC exchange rate |
