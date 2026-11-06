'use strict';

/**
 * L33tSaaS supermarket core — minimal HTTP service (stdlib only).
 *
 *   GET  /healthz              → { ok: true, service: 'l33tsaas' }
 *   GET  /v1/tools             → { tools: [...] } (latest of each)
 *   GET  /v1/tools/:name[?version=] → { tool } (pinned or latest)
 *   POST /v1/claims { workspace_id, tool, version?, plan? }
 *                              → 201 claim | 400 | 404 | 402 (plan_limit)
 *
 * State lives in the JSON file store (CATALOG_FILE or data/catalog.json).
 */

const http = require('node:http');
const path = require('node:path');
const { emptyStore, registerTool, getTool, listTools, loadStore, saveStore } = require('./catalog');
const { claimTool } = require('./claims');

const DEFAULT_FILE = path.join(__dirname, '..', 'data', 'catalog.json');

function storeFile() {
  return process.env.CATALOG_FILE || DEFAULT_FILE;
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('body too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function seed(store) {
  if (Object.keys(store.tools).length === 0) {
    registerTool(store, {
      name: 'chaseflow-invoices',
      version: '0.1.0',
      description: 'Automated polite multi-channel invoice chasing + cash-flow forecast.',
    });
  }
  return store;
}

function createServer(store) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/healthz') {
        return send(res, 200, { ok: true, service: 'l33tsaas' });
      }
      if (req.method === 'GET' && url.pathname === '/v1/tools') {
        return send(res, 200, { tools: listTools(store), count: listTools(store).length });
      }
      const toolMatch = url.pathname.match(/^\/v1\/tools\/([A-Za-z0-9-]+)$/);
      if (req.method === 'GET' && toolMatch) {
        const tool = getTool(store, toolMatch[1], url.searchParams.get('version') || undefined);
        if (!tool) return send(res, 404, { ok: false, error: 'tool not found' });
        return send(res, 200, { tool });
      }
      if (req.method === 'POST' && url.pathname === '/v1/claims') {
        const body = await readBody(req);
        const result = claimTool(store, body);
        if (!result.ok) {
          const status = result.code === 'plan_limit' ? 402 : result.code === 'not_found' ? 404 : 400;
          return send(res, status, { ok: false, error: result.error, code: result.code });
        }
        saveStore(storeFile(), store);
        return send(res, result.duplicate ? 200 : 201, { ok: true, claim: result.claim });
      }
      return send(res, 404, { ok: false, error: 'not found' });
    } catch (err) {
      return send(res, 400, { ok: false, error: err.message });
    }
  });
}

if (require.main === module) {
  let store;
  try {
    store = loadStore(storeFile());
  } catch (err) {
    console.error(`l33tsaas: cannot load store (${err.message})`);
    process.exit(1);
  }
  seed(store);
  const port = Number(process.env.PORT) || 8080;
  createServer(store).listen(port, () => {
    console.log(`l33tsaas listening on :${port}`);
  });
}

module.exports = { createServer, seed, storeFile, emptyStore };
