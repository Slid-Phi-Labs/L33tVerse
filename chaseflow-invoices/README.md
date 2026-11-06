# ChaseFlow Invoices

**L33tSaaS Labs · Claimed exclusive**

Automated invoice chasing for freelancers and agencies + cash-flow forecast from outstanding receivables.

## Status (v1 — one real money path)
- Schema ready (users, workspaces, clients, invoices, chase_sequences)
- Admin unlock ready
- Core API routes:
  - `POST /api/invoices` / `GET /api/invoices` — create is plan-gated (free capped, pro/admin unlimited)
  - `POST /api/chase` / `GET /api/chase` — 3-step sequence
  - `GET /api/forecast` — outstanding vs paid
  - `POST /api/admin/unlock`
- Real money path (the ONE wired end-to-end):
  - `POST /api/stripe/checkout` — real Stripe Checkout Session per invoice, URL saved as `payment_link`
  - `POST /api/stripe/webhook` — `checkout.session.completed` flips the invoice to `paid`
  - `GET /api/stripe/status` — test / live / unconfigured
- Minimal dashboard UI
- Tests: `npm test` (offline; Stripe adapter is injected, no network)

## Money path setup
1. `cp .env.example .env.local` and set `STRIPE_SECRET_KEY` (`sk_test_...` to start).
2. `psql $DATABASE_URL -f schema.sql`, then `npm install && npm run dev`.
3. Create invoice → `POST /api/invoices` → `POST /api/stripe/checkout` → pay → Stripe calls `POST /api/stripe/webhook`.
4. For local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`.
5. Without `STRIPE_SECRET_KEY`, checkout returns a marked `stub` session (never a real charge).

## Honest scope notes
- No Customer Portal yet (`blueprint/backend/02_BILLING.md` lists it as future).
- No DB → routes return memory/placeholder shapes; checkout requires a DB and answers 503 without one.
- `l33tsaas/` at the repo root is still a hollow shell (README + Dockerfile only, no `store/` tree) — untouched by this change.

## Quick start
```bash
cp .env.example .env.local
npm install
psql $DATABASE_URL -f schema.sql
npm run dev
```

## Env
```
DATABASE_URL=
ADMIN_CODE=change-me-in-production
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FREE_INVOICE_LIMIT=10
```
