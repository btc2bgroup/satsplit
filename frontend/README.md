# SatSplit — Frontend

React single-page application for splitting bills and paying with Bitcoin Lightning.

## Overview

The frontend provides a dark-themed, mobile-first UI where a bill creator enters the total amount and shares a link. Participants open the link, enter their name, and receive a Lightning invoice (QR code) to pay their share.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — build tool and dev server
- **Tailwind CSS v4** — utility-first styling
- **react-router-dom** — client-side routing
- **qrcode.react** — QR code generation for Lightning invoices

## Pages

### `/` — Create Bill

Form with fields:
- **Amount** — total bill amount
- **Currency** — USD, EUR, or GBP dropdown
- **Number of people** — how many are splitting (min 2)
- **Lightning Address** — where payments go (e.g. `you@getalby.com`)
- **Description** — optional label

On submit, creates the bill via the API and redirects to the bill page. The `short_code` is stored in `localStorage` to identify the creator.

### `/bill/:shortCode` — View Bill

Progressive single page that shows different content based on context:

- **Everyone** sees the bill summary (total, per-person amount, currency) and a live progress bar showing joined/paid counts
- **Creator** (detected via `localStorage`) sees a shareable link with copy button
- **Participant** (not the creator, hasn't joined yet) sees a join form to enter their name
- **Participant after joining** sees their Lightning invoice as a QR code, with a copy button and an "Open Wallet" deep link (`lightning:` protocol)

### `*` — 404

Simple not-found page with a link back to the home page.

## Components

| Component | Purpose |
|-----------|---------|
| `Layout` | Header with logo, centered content area, footer |
| `BillForm` | Bill creation form with validation and loading state |
| `BillSummary` | Read-only display of bill details (total, split, per-person) |
| `JoinForm` | Name input to join a bill |
| `InvoiceDisplay` | QR code + copy invoice button + "Open Wallet" deep link |
| `ProgressBar` | Two bars showing joined and paid counts out of total |
| `ShareLink` | Copyable URL for sharing the bill |

## API Client

`src/api.ts` — thin `fetch` wrapper with TypeScript types matching the backend schemas:

- `api.createBill(data)` — `POST /api/bills`
- `api.getBill(code)` — `GET /api/bills/{code}`
- `api.getStatus(code)` — `GET /api/bills/{code}/status`
- `api.joinBill(code, name)` — `POST /api/bills/{code}/join`

## Status Polling

The `usePollStatus` hook polls `GET /api/bills/{code}/status` every 3 seconds to keep the progress bar updated in real time.

## Styling

- Dark navy background (`slate-900`)
- Cards with subtle borders and rounded corners
- Bitcoin orange (`#f7931a`) accent for buttons and highlights
- Green progress bar for paid status
- Mobile-first, single-column layout (`max-w-lg`)

## Running

### Local development

```bash
npm install
npm run dev
```

Runs on http://localhost:3000. The Vite dev server proxies `/api` requests to `http://localhost:8001` (the backend).

### Docker

```bash
docker compose up frontend -d
```

Multi-stage build: Node 20 builds the app, Caddy serves the static files. Caddy also reverse proxies `/api/*` to the backend and falls back to `index.html` for SPA routing.

## Tests

### Component tests (Vitest + React Testing Library)

```bash
npm test
```

18 tests covering all components and the API client. Runs in jsdom with mocked fetch and clipboard APIs.

### E2E tests (Playwright)

```bash
npx playwright install   # first time only
npm run test:e2e
```

3 tests covering the full create-bill, join-bill, and 404 flows. Requires the backend to be running (e.g. via `docker compose up`).
