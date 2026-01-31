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

All backend settings use the `GD_` env prefix (see `backend/app/config.py`).

| Variable | Description | Default |
|---|---|---|
| `GD_DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://postgres:postgres@localhost:5432/satsplit` |
| `GD_CORS_ORIGINS` | Allowed CORS origins (JSON array) | `["http://localhost:3000"]` |
| `GD_EXCHANGE_RATE_CACHE_TTL` | Exchange rate cache TTL in seconds | `60` |
| `GD_COINGECKO_BASE_URL` | CoinGecko API base URL | `https://api.coingecko.com/api/v3` |
| `GD_RATE_LIMIT` | API rate limit | `60/minute` |
| `GD_BTCPAY_URL` | BTCPay Server base URL | (empty, donations disabled) |
| `GD_BTCPAY_API_KEY` | BTCPay Server API key | (empty) |
| `GD_BTCPAY_STORE_ID` | BTCPay Server store ID | (empty) |

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
| `POST` | `/api/donations` | Create a BTCPay donation invoice |
| `GET` | `/api/exchange-rate` | Get current BTC exchange rate |
