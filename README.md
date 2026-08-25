# Agent-Rider Operator Dashboard

**L33tSaaS Labs · Claimed exclusive**

Single operator dashboard for Agent-Rider + CuNi health alerts.

## Status
- Exclusive claim locked
- Production schema ready
- Admin unlock ready
- Core API routes:
  - `GET /api/health` — live upstream check against Agent-Rider
  - `GET /api/agents` — DB-backed with placeholder fallback
  - `GET /api/alerts` — DB-backed
  - `POST /api/admin/unlock`
- Dashboard UI showing health, agents, and alerts
- Next: persist health checks, Slack alert routing, multi-fleet

## Quick start
```bash
cp .env.example .env.local
npm install
psql $DATABASE_URL -f schema.sql
npm run dev
```

Open http://localhost:3000

## Env
```
DATABASE_URL=
ADMIN_CODE=change-me-in-production
AGENT_RIDER_URL=https://agentrider.fly.dev
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
