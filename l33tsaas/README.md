# l33tsaas

L33tSaaS Labs — revolving supermarket for builders and agents (Fly deploy tree).

## Status (v0.1 — minimal real core)

Real and tested (`npm test`, 27 tests, stdlib only, no network):

- Tool registry (`lib/catalog.js`) — register/get/list with exact-version
  pinning (unpinned resolves to latest), plus a JSON file store
  (atomic save, empty store on missing file, clear error on corrupt file).
- Claim flow (`lib/claims.js`) — workspace claim → entitlement check using
  the same plan-gate pattern as `chaseflow-invoices/lib/plan.ts`
  (pro/admin unlimited, free capped at `FREE_CLAIM_LIMIT`, default 3;
  unknown plans count as free; re-claims are idempotent).
- HTTP service (`lib/server.js`) — `GET /healthz`, `GET /v1/tools`,
  `GET /v1/tools/:name`, `POST /v1/claims` (201 / 400 / 404 /
  402 `plan_limit`, mirroring the chaseflow 402 for plan limits).

Still scaffold / not yet real:

- The catalog seeds with a single entry (`chaseflow-invoices@0.1.0`);
  there is no admin UI, no Stripe billing, and no persistence beyond the
  local JSON file (`CATALOG_FILE`, default `data/catalog.json`).
- `fly.toml` is new and undeployed — no chaseflow deploy pattern exists
  in this repo (no `fly.toml` anywhere), so it is a minimal standalone
  config; set `primary_region` before the first deploy.

## Quick start

```bash
npm test          # offline suite (node --test tests/)
npm start         # serves :8080 (PORT= / CATALOG_FILE= overridable)
```

## Deploy

```bash
fly launch --no-deploy   # first time (keeps this fly.toml's settings)
fly deploy
```

## Env

```
PORT=8080
CATALOG_FILE=./data/catalog.json
FREE_CLAIM_LIMIT=3
```
