# Architecture overview — Operator Dashboard

## Default MVP stack
- Next.js (App Router) + TypeScript
- Postgres (Supabase / Neon)
- Auth: magic link or one OAuth provider
- Stripe Checkout + Customer Portal
- Host: Fly.io or Vercel
- Live data from Agent-Rider /api/health and related endpoints

## Principles
- Thin UI over live health APIs
- One workspace per user at MVP
- Webhooks / polling for status updates
