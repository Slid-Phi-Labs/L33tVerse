'use strict';

/**
 * Workspace claim flow (dependency-free, offline-testable).
 *
 * A workspace claims a tool version; the claim is entitlement-checked
 * with the same plan-gate pattern as chaseflow-invoices/lib/plan.ts:
 * pro/admin are unlimited, free workspaces are capped at
 * FREE_CLAIM_LIMIT claimed tools. Unknown plans are treated as free.
 */

const { getTool } = require('./catalog');

const DEFAULT_FREE_CLAIM_LIMIT = 3;

function normalizePlan(plan) {
  if (plan === 'pro' || plan === 'admin') return plan;
  return 'free';
}

/** Max tools a free workspace may claim. Env-overridable. */
function freeClaimLimit() {
  const raw = process.env.FREE_CLAIM_LIMIT;
  const parsed = raw == null || raw === '' ? NaN : Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_FREE_CLAIM_LIMIT;
}

function checkClaim({ plan, claimCount, limit } = {}) {
  const normalized = normalizePlan(plan);
  if (normalized === 'pro' || normalized === 'admin') return { allowed: true };
  const cap = limit ?? freeClaimLimit();
  if (claimCount < cap) return { allowed: true };
  return {
    allowed: false,
    reason: `free plan limit reached (${cap} claimed tools) — upgrade to pro`,
  };
}

function workspaceClaims(store, workspaceId) {
  return store.claims.filter((c) => c.workspace_id === workspaceId);
}

/**
 * Claim a tool version for a workspace. Version pins an exact release;
 * omitting it claims the latest. Re-claiming the same tool+version is
 * idempotent (returns the existing claim, no quota consumed).
 */
function claimTool(store, input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'workspace_id and tool required' };
  }
  const { workspace_id, tool: name, version, plan } = input;
  if (!workspace_id || !name) {
    return { ok: false, error: 'workspace_id and tool required' };
  }
  const pinned = getTool(store, name, version);
  if (!pinned) {
    const known = store.tools && store.tools[name];
    return {
      ok: false,
      code: 'not_found',
      error: known
        ? `version ${version} not found for tool "${name}"`
        : `unknown tool "${name}"`,
    };
  }
  const existing = store.claims.find(
    (c) => c.workspace_id === workspace_id && c.tool === pinned.name && c.version === pinned.version
  );
  if (existing) return { ok: true, claim: existing, duplicate: true };

  const gate = checkClaim({ plan, claimCount: workspaceClaims(store, workspace_id).length });
  if (!gate.allowed) {
    return { ok: false, code: 'plan_limit', error: gate.reason };
  }

  const claim = {
    id: 'clm-' + Date.now().toString(36) + Math.floor(Math.random() * 0xffff).toString(16),
    workspace_id,
    tool: pinned.name,
    version: pinned.version,
    plan: normalizePlan(plan),
    claimed_at: new Date().toISOString(),
  };
  store.claims.push(claim);
  return { ok: true, claim };
}

module.exports = {
  DEFAULT_FREE_CLAIM_LIMIT,
  normalizePlan,
  freeClaimLimit,
  checkClaim,
  workspaceClaims,
  claimTool,
};
