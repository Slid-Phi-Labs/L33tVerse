# Agent-Rider Operator Dashboard

**L33tSaaS Labs · Smart Frame Certified · SFv1 · SF-1 · L/C/D**  
**Status:** Claimed exclusive · Scaffold ready (2026-08-25)

## Idea
Operator dashboard for Agent-Rider + CuNi health alerts.
Single pane of glass for rider health, CuNi status, alerts, and fleet overview.

Ties directly to live https://agentrider.fly.dev

## Stack
- Next.js (App Router)
- Postgres / Neon
- Agent-Rider JWT / health endpoints
- Admin unlock via owner code

## Admin unlock
`POST /api/admin/unlock` with `{ "code": "..." }` → role=admin, plan=admin, billing_bypass=true

## Schema
See `schema.sql`

## Blueprint origin
From L33tSaaS pack `operator-dashboard-for-agent-rider-cuni-health-a` (claimed in saas-agent-vault).
