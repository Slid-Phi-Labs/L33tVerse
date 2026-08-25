# Architecture overview — ChaseFlow Invoices

## Default MVP stack
- Next.js (App Router) + TypeScript
- Postgres (Supabase / Neon)
- Auth: magic link or one OAuth provider
- Stripe Checkout + Customer Portal
- Host: Fly.io or Vercel

## Principles
- One workspace per user at MVP
- Thin API over Postgres
- Webhooks own plan state, not the client
