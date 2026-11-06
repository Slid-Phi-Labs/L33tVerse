# L33tVerse

The SaaS supermarket of the Slid Phi machine: revolving shelves of
software for builders and agents. Claim a pack, deploy it, bill for
it — repeat.

| Part | Path | What it is |
|---|---|---|
| l33tsaas | `l33tsaas/` | The revolving supermarket for builders and agents (Fly deploy tree). HONEST STATUS: minimal real core (v0.1) — tool registry with version pinning + JSON file store, workspace claim flow with plan gate, stdlib HTTP service, `node:test` suite green; Dockerfile now matches the files present and `fly.toml` is new/undeployed. Still scaffold: single seeded catalog entry, JSON-file persistence only, no UI, no billing. |
| l33tsaas-starter | `l33tsaas-starter/` | Shared starter template: Next.js 14 + Neon-ready schema + Stripe + admin unlock. |
| chaseflow-invoices | `chaseflow-invoices/` | Automated polite multi-channel invoice chasing + payment links + cash-flow forecast. |
| agent-rider-operator | `agent-rider-operator/` | Operator dashboard for Agent-Rider + CuNi health alerts. |

## Provenance

Fused from four repos with full history preserved (merge commits, not
squashes), all from `main`.

## Licenses

Mixed: each subdirectory keeps its own `LICENSE` and terms, which
govern that subdirectory. Nothing here is relicensed by the merge.

Private — if you can read this, you're inside the lab.
