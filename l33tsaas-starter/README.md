# L33tSaaS Starter

Shared template for every new claimed pack.

## Includes
- Next.js 14 App Router ready
- Base production schema (users / workspaces / resources / events)
- Admin unlock (`POST /api/admin/unlock`)
- Stripe + pg ready in package.json
- Discovery template (`spec/00_DISCOVERY.md`)
- 48-hour SLA compliant skeleton

## Quick start
```bash
cp .env.example .env.local
npm install
psql $DATABASE_URL -f schema.sql
npm run dev
```

## Rules (no waitlist)
- Validation Gate = Signal Score ≥ 40 **or** ≥ 3 discovery notes
- Talk-to-3 before built
- Claim → skeleton within 48h

See PROCESS.md in saas-agent-vault.
