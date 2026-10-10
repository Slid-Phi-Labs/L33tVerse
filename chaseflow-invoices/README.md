# ChaseFlow Invoices

**L33tSaaS Labs · Claimed exclusive**

Automated invoice chasing for freelancers and agencies + cash-flow forecast from outstanding receivables.

## Status (v0)
- Schema ready (users, workspaces, clients, invoices, chase_sequences)
- Admin unlock ready
- Core API routes:
  - `POST /api/invoices` / `GET /api/invoices`
  - `POST /api/chase` / `GET /api/chase` — 3-step sequence
  - `GET /api/forecast` — outstanding vs paid
  - `POST /api/admin/unlock`
- Minimal dashboard UI
- Stripe deps present; payment-link + webhook wiring next

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
```
