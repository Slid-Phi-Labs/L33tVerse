# Agent-Rider Operator Dashboard

**L33tSaaS Labs · Claimed exclusive**

Single operator dashboard for Agent-Rider + CuNi health alerts.

## Status
- Exclusive claim locked
- Production schema ready
- Admin unlock ready
- Core API routes live:
  - `GET /api/health` — proxies Agent-Rider health
  - `GET /api/agents`
  - `GET /api/alerts`
  - `POST /api/admin/unlock`
- Next: wire Postgres, real agent list, basic dashboard UI

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
AGENT_RIDER_URL=https://agentrider.fly.dev
```

Live Agent-Rider target: https://agentrider.fly.dev
