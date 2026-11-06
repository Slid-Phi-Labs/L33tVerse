'use strict';

/**
 * Tool registry tests (fully offline). Run: npm test  (node --test tests/)
 */
const { describe, it, afterEach, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  emptyStore,
  compareVersions,
  validateTool,
  registerTool,
  getTool,
  listTools,
  loadStore,
  saveStore,
} = require('../lib/catalog');

describe('validate — tool name / version shape', () => {
  it('accepts a well-formed tool', () => {
    assert.equal(validateTool({ name: 'chaseflow-invoices', version: '0.1.0' }).ok, true);
  });

  it('rejects missing or malformed input with the API error', () => {
    for (const body of [null, {}, { name: 'x' }, { version: '1.0.0' }]) {
      const r = validateTool(body);
      assert.equal(r.ok, false);
    }
    assert.equal(validateTool({}).error, 'name and version required');
  });

  it('rejects bad names and non-semver versions', () => {
    assert.equal(validateTool({ name: 'Bad Name!', version: '1.0.0' }).ok, false);
    for (const v of ['1', '1.0', 'v1.0.0', '1.0.0-beta', 42]) {
      assert.equal(validateTool({ name: 'tool', version: v }).ok, false, `version ${v}`);
    }
  });
});

describe('register/get/list — version pinning', () => {
  let store;
  beforeEach(() => {
    store = emptyStore();
  });

  it('registers and resolves the latest when no version is pinned', () => {
    registerTool(store, { name: 'tool-a', version: '0.1.0' });
    registerTool(store, { name: 'tool-a', version: '0.2.0' });
    assert.equal(getTool(store, 'tool-a').version, '0.2.0');
    assert.equal(getTool(store, 'tool-a', '0.1.0').version, '0.1.0');
  });

  it('pins exact versions even when a newer release exists', () => {
    registerTool(store, { name: 'tool-a', version: '1.0.0' });
    registerTool(store, { name: 'tool-a', version: '2.0.0' });
    assert.equal(getTool(store, 'tool-a', '1.0.0').version, '1.0.0');
    assert.equal(getTool(store, 'tool-a', '9.9.9'), null);
  });

  it('an older release does not move latest backwards', () => {
    registerTool(store, { name: 'tool-a', version: '2.0.0' });
    registerTool(store, { name: 'tool-a', version: '1.9.9' });
    assert.equal(getTool(store, 'tool-a').version, '2.0.0');
  });

  it('re-registering a version refreshes metadata and reports isNew=false', () => {
    const first = registerTool(store, { name: 'tool-a', version: '1.0.0', description: 'old' });
    assert.equal(first.isNew, true);
    const second = registerTool(store, { name: 'tool-a', version: '1.0.0', description: 'new' });
    assert.equal(second.isNew, false);
    assert.equal(getTool(store, 'tool-a').description, 'new');
  });

  it('returns null for unknown tools', () => {
    assert.equal(getTool(store, 'nope'), null);
  });

  it('lists the latest of each tool sorted by name', () => {
    registerTool(store, { name: 'zebra', version: '1.0.0' });
    registerTool(store, { name: 'alpha', version: '1.0.0' });
    registerTool(store, { name: 'alpha', version: '1.1.0' });
    const listed = listTools(store);
    assert.deepEqual(
      listed.map((t) => `${t.name}@${t.version}`),
      ['alpha@1.1.0', 'zebra@1.0.0']
    );
  });

  it('compareVersions orders numerically, not lexicographically', () => {
    assert.equal(compareVersions('1.9.0', '1.10.0'), -1);
    assert.equal(compareVersions('2.0.0', '1.99.99'), 1);
    assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  });
});

describe('store — JSON file persistence', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'l33tsaas-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('a missing file loads as an empty store', () => {
    assert.deepEqual(loadStore(path.join(dir, 'missing.json')), { tools: {}, claims: [] });
  });

  it('round-trips tools and claims through save/load', () => {
    const file = path.join(dir, 'sub', 'catalog.json');
    const store = emptyStore();
    registerTool(store, { name: 'tool-a', version: '1.0.0' });
    store.claims.push({ id: 'clm-1', workspace_id: 'ws-1', tool: 'tool-a', version: '1.0.0' });
    saveStore(file, store);
    const loaded = loadStore(file);
    assert.equal(loaded.tools['tool-a'].latest, '1.0.0');
    assert.equal(loaded.claims.length, 1);
  });

  it('rejects a corrupt file with a clear error', () => {
    const file = path.join(dir, 'bad.json');
    fs.writeFileSync(file, '{not json');
    assert.throws(() => loadStore(file), /corrupt catalog store/);
    fs.writeFileSync(file, JSON.stringify({ claims: [] }));
    assert.throws(() => loadStore(file), /corrupt catalog store/);
  });
});
