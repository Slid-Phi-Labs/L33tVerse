# Staging checklist (L33tVerse live path)

Goal: prove the money path works against real services before promoting to
production. Work through the list top to bottom; every command runs from the
repo root unless noted.

## 1. Env vars

Copy the examples and fill in real values (never commit secrets):

```bash
cp chaseflow-invoices/.env.example chaseflow-invoices/.env.local
```

| Var | Where | Required for |
|---|---|---|
| `DATABASE_URL` | chaseflow `.env.local`, Fly secrets | Postgres (invoices, clients, chase state) |
| `ADMIN_CODE` | chaseflow `.env.local`, Fly secrets | `POST /api/admin/unlock` |
| `STRIPE_SECRET_KEY` | chaseflow `.env.local`, Fly secrets | Real Checkout Sessions (`sk_test_…` first) |
| `STRIPE_WEBHOOK_SECRET` | chaseflow `.env.local`, Fly secrets | Webhook signature verify (local: from `stripe listen`) |
| `FREE_INVOICE_LIMIT` | chaseflow env | Free-plan invoice cap (default 10) |
| `NEXT_PUBLIC_BASE_URL` | chaseflow env | Checkout success/cancel URLs |
| `PORT` / `CATALOG_FILE` / `FREE_CLAIM_LIMIT` | l33tsaas env | Service port, JSON store, free claim cap |

## 2. Migrate

```bash
psql "$DATABASE_URL" -f chaseflow-invoices/schema.sql
```

l33tsaas needs no migration: it seeds its catalog (`chaseflow-invoices@0.1.0`)
into `CATALOG_FILE` (default `l33tsaas/data/catalog.json`) on first boot.

## 3. Probe (local, self-spawned servers)

Builds chaseflow once, then the probe spawns both servers on
`127.0.0.1` with ephemeral ports, checks them, and shuts them down:

```bash
npm install --prefix chaseflow-invoices --no-audit --no-fund
npm run build --prefix chaseflow-invoices
node scripts/readiness-probe.mjs --spawn
```

Expected: `4/4 checks passed` — l33tsaas `/healthz` + `/v1/tools`,
chaseflow `/api/stripe/status` + `/api/forecast`. Any FAIL prints the
endpoint, what was expected, and what came back; exit code is non-zero.

Against a deployed staging host instead:

```bash
L33TSAAS_BASE_URL=https://l33tsaas-staging.fly.dev \
CHASEFLOW_BASE_URL=https://chaseflow-staging.fly.dev \
  node scripts/readiness-probe.mjs
```

## 4. Verify live credentials

```bash
node scripts/verify-live.mjs
```

- No env set → each check prints `SKIP`, exit 0 (safe in CI).
- `STRIPE_SECRET_KEY` set → lists one price via `api.stripe.com`; any
  auth/network error prints `FAIL` and exits non-zero.
- `DATABASE_URL` set → connects with the repo's `pg` dep and runs
  `select 1`; any connect/query error prints `FAIL` and exits non-zero
  (needs `npm install` in `chaseflow-invoices` first).

## 5. Fly deploy

l33tsaas ships a `fly.toml` (app `l33tsaas`); set `primary_region` to your
nearest region before the first deploy. chaseflow has no `fly.toml` yet —
create one with `fly launch --no-deploy` inside `chaseflow-invoices/`.

```bash
# l33tsaas
fly deploy --config l33tsaas/fly.toml
fly secrets set STRIPE_SECRET_KEY=sk_test_… DATABASE_URL=… --app <chaseflow-app>

# chaseflow (from chaseflow-invoices/)
fly deploy
fly secrets set STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… \
  DATABASE_URL=… ADMIN_CODE=… --app <chaseflow-app>
```

Then re-run steps 3 (remote URLs) and 4 against staging. Promote
`sk_test_…` → `sk_live_…` only after the staging money path
(invoice → checkout → webhook → `paid`) is green.
