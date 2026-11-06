'use strict';

/**
 * Claim-flow tests (fully offline): workspace claim -> plan-gate
 * entitlement check, reusing the chaseflow plan-gate pattern.
 * Run: npm test  (node --test tests/)
 */
const { describe, it, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const { emptyStore, registerTool } = require('../lib/catalog');
const {
  DEFAULT_FREE_CLAIM_LIMIT,
  normalizePlan,
  freeClaimLimit,
  checkClaim,
  claimTool,
} = require('../lib/claims');

const savedEnv = { ...process.env };
afterEach(() => {
  process.env = { ...savedEnv };
});

describe('plan gate — free capped, pro/admin unlimited', () => {
  it('lets pro and admin through regardless of count', () => {
    assert.equal(checkClaim({ plan: 'pro', claimCount: 999, limit: 1 }).allowed, true);
    assert.equal(checkClaim({ plan: 'admin', claimCount: 999, limit: 1 }).allowed, true);
  });

  it('caps free workspaces at the limit', () => {
    assert.equal(checkClaim({ plan: 'free', claimCount: 2, limit: 3 }).allowed, true);
    const over = checkClaim({ plan: 'free', claimCount: 3, limit: 3 });
    assert.equal(over.allowed, false);
    assert.match(over.reason ?? '', /free plan limit/);
  });

  it('treats unknown plans as free (safe default)', () => {
    assert.equal(normalizePlan('enterprise'), 'free');
    assert.equal(normalizePlan(undefined), 'free');
    assert.equal(checkClaim({ plan: 'enterprise', claimCount: 99, limit: 5 }).allowed, false);
  });

  it('reads FREE_CLAIM_LIMIT with a sane default', () => {
    delete process.env.FREE_CLAIM_LIMIT;
    assert.equal(freeClaimLimit(), DEFAULT_FREE_CLAIM_LIMIT);
    process.env.FREE_CLAIM_LIMIT = '1';
    assert.equal(freeClaimLimit(), 1);
    process.env.FREE_CLAIM_LIMIT = 'bogus';
    assert.equal(freeClaimLimit(), DEFAULT_FREE_CLAIM_LIMIT);
    process.env.FREE_CLAIM_LIMIT = '0';
    assert.equal(freeClaimLimit(), DEFAULT_FREE_CLAIM_LIMIT);
  });
});

describe('claim — workspace claim flow', () => {
  let store;
  beforeEach(() => {
    delete process.env.FREE_CLAIM_LIMIT;
    store = emptyStore();
    registerTool(store, { name: 'tool-a', version: '1.0.0' });
    registerTool(store, { name: 'tool-a', version: '2.0.0' });
    registerTool(store, { name: 'tool-b', version: '1.0.0' });
    registerTool(store, { name: 'tool-c', version: '1.0.0' });
    registerTool(store, { name: 'tool-d', version: '1.0.0' });
  });

  it('claims the latest when no version is pinned', () => {
    const r = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a' });
    assert.equal(r.ok, true);
    assert.equal(r.claim.tool, 'tool-a');
    assert.equal(r.claim.version, '2.0.0');
    assert.equal(r.claim.workspace_id, 'ws-1');
    assert.match(r.claim.id, /^clm-/);
  });

  it('claims a pinned older version', () => {
    const r = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a', version: '1.0.0' });
    assert.equal(r.ok, true);
    assert.equal(r.claim.version, '1.0.0');
  });

  it('rejects missing workspace_id / tool', () => {
    for (const input of [null, {}, { workspace_id: 'ws-1' }, { tool: 'tool-a' }]) {
      const r = claimTool(store, input);
      assert.equal(r.ok, false);
      assert.equal(r.error, 'workspace_id and tool required');
    }
  });

  it('rejects unknown tools and unknown versions', () => {
    const unknown = claimTool(store, { workspace_id: 'ws-1', tool: 'nope' });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.code, 'not_found');
    const badVersion = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a', version: '9.9.9' });
    assert.equal(badVersion.ok, false);
    assert.equal(badVersion.code, 'not_found');
  });

  it('caps free workspaces and reports plan_limit', () => {
    process.env.FREE_CLAIM_LIMIT = '2';
    assert.equal(claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a' }).ok, true);
    assert.equal(claimTool(store, { workspace_id: 'ws-1', tool: 'tool-b' }).ok, true);
    const over = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-c' });
    assert.equal(over.ok, false);
    assert.equal(over.code, 'plan_limit');
    assert.match(over.error, /free plan limit/);
  });

  it('pro workspaces claim past the free cap; quotas are per-workspace', () => {
    process.env.FREE_CLAIM_LIMIT = '1';
    assert.equal(
      claimTool(store, { workspace_id: 'ws-paid', tool: 'tool-a', plan: 'pro' }).ok,
      true
    );
    assert.equal(
      claimTool(store, { workspace_id: 'ws-paid', tool: 'tool-b', plan: 'pro' }).ok,
      true
    );
    assert.equal(claimTool(store, { workspace_id: 'ws-free', tool: 'tool-a' }).ok, true);
  });

  it('re-claiming the same tool+version is idempotent', () => {
    process.env.FREE_CLAIM_LIMIT = '1';
    const first = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a' });
    const second = claimTool(store, { workspace_id: 'ws-1', tool: 'tool-a' });
    assert.equal(second.ok, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.claim.id, first.claim.id);
    assert.equal(store.claims.length, 1);
  });
});
