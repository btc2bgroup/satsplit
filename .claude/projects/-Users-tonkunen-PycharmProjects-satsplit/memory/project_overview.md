---
name: SatSplit project overview
description: Bill-splitting app that settles payments via Bitcoin Lightning Network
type: project
---

SatSplit is a bill-splitting web app where participants settle their share instantly over the Bitcoin Lightning Network.

**Stack:**
- Backend: FastAPI + SQLAlchemy (async) + PostgreSQL, Alembic migrations
- Frontend: React + TypeScript + Tailwind CSS + Vite, Playwright for e2e tests
- Deployment: Docker Compose with Caddy reverse proxy
- Config env prefix: `GD_`

**Key features:**
- Create bills, share via short code, participants join and pay their share via Lightning invoices
- BTC exchange rate via CoinGecko API
- Optional donations via BTCPay Server
- Public stats dashboard

**Why:** Personal/open-source project by cryptoteun (GitHub user).

**How to apply:** This is a full-stack app — changes may span backend and frontend. Lightning/Bitcoin domain knowledge is relevant.