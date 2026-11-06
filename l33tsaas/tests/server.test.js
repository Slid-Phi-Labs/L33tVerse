'use strict';

/** HTTP smoke tests for the l33tsaas service (stdlib only, offline). */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { registerTool } = require('../lib/catalog');
const { createServer, seed } = require('../lib/server');

describe('server — health, tools, claims', () => {
  let server;
  let base;
  let tmpFile;

  before(async () => {
    tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l33tsaas-srv-')), 'catalog.json');
    process.env.CATALOG_FILE = tmpFile;
    const store = seed({ tools: {}, claims: [] });
    registerTool(store, { name: 'tool-a', version: '1.0.0' });
    server = createServer(store);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    delete process.env.CATALOG_FILE;
    await new Promise((resolve) => server.close(resolve));
  });

  it('answers /healthz', async () => {
    const res = await fetch(`${base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, service: 'l33tsaas' });
  });

  it('serves a landing page at /', async () => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    const html = await res.text();
    assert.match(html, /L33tSaaS/);
    assert.match(html, /\/v1\/tools/);
  });

  it('lists tools and resolves a pinned version', async () => {
    const list = await fetch(`${base}/v1/tools`);
    assert.equal(list.status, 200);
    const { tools } = await list.json();
    assert.ok(tools.some((t) => t.name === 'chaseflow-invoices'));
    assert.ok(tools.some((t) => t.name === 'tool-a'));

    const pinned = await fetch(`${base}/v1/tools/chaseflow-invoices?version=0.1.0`);
    assert.equal(pinned.status, 200);
    assert.equal((await pinned.json()).tool.version, '0.1.0');

    const missing = await fetch(`${base}/v1/tools/nope`);
    assert.equal(missing.status, 404);
  });

  it('claims a tool (201), repeats idempotently (200), gates over-limit (402)', async () => {
    process.env.FREE_CLAIM_LIMIT = '1';
    const post = (body) =>
      fetch(`${base}/v1/claims`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

    const first = await post({ workspace_id: 'ws-1', tool: 'tool-a' });
    assert.equal(first.status, 201);
    assert.equal((await first.json()).ok, true);

    const repeat = await post({ workspace_id: 'ws-1', tool: 'tool-a' });
    assert.equal(repeat.status, 200);

    const over = await post({ workspace_id: 'ws-1', tool: 'chaseflow-invoices' });
    assert.equal(over.status, 402);
    assert.equal((await over.json()).code, 'plan_limit');

    const unknown = await post({ workspace_id: 'ws-1', tool: 'nope' });
    assert.equal(unknown.status, 404);

    const bad = await post({});
    assert.equal(bad.status, 400);
    delete process.env.FREE_CLAIM_LIMIT;
  });
});
