#!/usr/bin/env node
/**
 * readiness-probe.mjs — live-path readiness checks for L33tVerse.
 *
 * Probes the l33tsaas HTTP service and the chaseflow-invoices Next app
 * and prints a per-check table. Exits 0 only when every check passes,
 * non-zero otherwise (CI-safe).
 *
 * Usage:
 *   node scripts/readiness-probe.mjs [--spawn[=l33tsaas,chaseflow]]
 *       [--l33tsaas <url>] [--chaseflow <url>] [--timeout <ms>] [--wait <ms>]
 *
 * Base URLs (explicit flags win over env, env wins over defaults):
 *   L33TSAAS_BASE_URL   (default http://127.0.0.1:8080)
 *   CHASEFLOW_BASE_URL  (default http://127.0.0.1:3000)
 *
 * With --spawn the script starts the servers itself on 127.0.0.1 with
 * ephemeral ports (overriding the matching base URL), waits for them to
 * answer, probes, then shuts them down:
 *   l33tsaas   → `node l33tsaas/lib/server.js` (temp CATALOG_FILE)
 *   chaseflow  → `node node_modules/next/dist/bin/next start` (needs
 *                 chaseflow-invoices/.next — run `npm run build` there first)
 *
 * Chaseflow has no /healthz route (only a blueprint checklist aspiration),
 * so its health signal is the DB-less-safe GET /api/stripe/status plus a
 * placeholder-safe GET /api/forecast?workspace_id=….
 *
 * Node stdlib only.
 */
'use strict';

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L33TSAAS_DIR = path.join(ROOT, 'l33tsaas');
const CHASEFLOW_DIR = path.join(ROOT, 'chaseflow-invoices');

function usage() {
  console.log(`usage: node scripts/readiness-probe.mjs [options]

options:
  --l33tsaas <url>   base URL for l33tsaas (env L33TSAAS_BASE_URL, default http://127.0.0.1:8080)
  --chaseflow <url>  base URL for chaseflow (env CHASEFLOW_BASE_URL, default http://127.0.0.1:3000)
  --spawn[=a,b]      spawn servers before probing (default with flag: l33tsaas,chaseflow)
  --timeout <ms>     per-request timeout (default 5000)
  --wait <ms>        spawn readiness deadline (default 90000)
  -h, --help         this help`);
}

function parseArgs(argv) {
  const opts = {
    l33tsaas: process.env.L33TSAAS_BASE_URL || process.env.L33TSAAS_URL || 'http://127.0.0.1:8080',
    chaseflow: process.env.CHASEFLOW_BASE_URL || process.env.CHASEFLOW_URL || 'http://127.0.0.1:3000',
    spawn: [],
    timeout: Number(process.env.PROBE_TIMEOUT_MS) || 5000,
    wait: Number(process.env.PROBE_WAIT_MS) || 90000,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { usage(); process.exit(0); }
    else if (a === '--spawn') opts.spawn = ['l33tsaas', 'chaseflow'];
    else if (a.startsWith('--spawn=')) opts.spawn = a.slice('--spawn='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--l33tsaas') opts.l33tsaas = argv[++i];
    else if (a.startsWith('--l33tsaas=')) opts.l33tsaas = a.slice('--l33tsaas='.length);
    else if (a === '--chaseflow') opts.chaseflow = argv[++i];
    else if (a.startsWith('--chaseflow=')) opts.chaseflow = a.slice('--chaseflow='.length);
    else if (a === '--timeout') opts.timeout = Number(argv[++i]);
    else if (a.startsWith('--timeout=')) opts.timeout = Number(a.slice('--timeout='.length));
    else if (a === '--wait') opts.wait = Number(argv[++i]);
    else if (a.startsWith('--wait=')) opts.wait = Number(a.slice('--wait='.length));
    else { console.error(`unknown argument: ${a}`); usage(); process.exit(2); }
  }
  for (const s of opts.spawn) {
    if (s !== 'l33tsaas' && s !== 'chaseflow') {
      console.error(`unknown --spawn target: ${s} (want l33tsaas and/or chaseflow)`);
      process.exit(2);
    }
  }
  return opts;
}

function freePort(host) {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, host, () => {
      const port = srv.address().port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

async function getJson(url, timeoutMs) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  return { status: res.status, body, raw: text.slice(0, 300) };
}

async function waitForReady(url, timeoutMs, deadlineMs, label) {
  const start = Date.now();
  let lastErr = '';
  for (;;) {
    try {
      const { status } = await getJson(url, timeoutMs);
      if (status >= 200 && status < 500) return;
      lastErr = `status ${status}`;
    } catch (err) {
      lastErr = err.message;
    }
    if (Date.now() - start > deadlineMs) {
      throw new Error(`${label} not ready within ${deadlineMs}ms (last: ${lastErr})`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

function startChild(label, cmd, args, options, env) {
  const child = spawn(cmd, args, {
    ...options,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let tail = '';
  const keep = (chunk) => {
    tail += chunk.toString();
    if (tail.length > 4000) tail = tail.slice(-4000);
  };
  child.stdout.on('data', keep);
  child.stderr.on('data', keep);
  child.once('exit', (code) => {
    if (!finished.has(child)) {
      console.error(`${label} exited early with code ${code}. output:\n${tail}`);
    }
  });
  return { child, log: () => tail };
}

const finished = new Set();

async function stopChild(label, handle) {
  finished.add(handle.child);
  if (handle.child.exitCode !== null) return;
  await new Promise((resolve) => {
    const t = setTimeout(() => { handle.child.kill('SIGKILL'); resolve(); }, 5000);
    handle.child.once('exit', () => { clearTimeout(t); resolve(); });
    handle.child.kill();
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const children = [];

  try {
    if (opts.spawn.includes('l33tsaas')) {
      const port = await freePort('127.0.0.1');
      opts.l33tsaas = `http://127.0.0.1:${port}`;
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'l33tsaas-probe-'));
      const handle = startChild('l33tsaas', process.execPath, [path.join(L33TSAAS_DIR, 'lib', 'server.js')], {
        cwd: L33TSAAS_DIR,
      }, { PORT: String(port), CATALOG_FILE: path.join(tmp, 'catalog.json') });
      children.push(['l33tsaas', handle]);
      await waitForReady(`${opts.l33tsaas}/healthz`, opts.timeout, opts.wait, 'l33tsaas');
    }

    if (opts.spawn.includes('chaseflow')) {
      if (!fs.existsSync(path.join(CHASEFLOW_DIR, '.next'))) {
        throw new Error(
          `cannot spawn chaseflow: ${path.join(CHASEFLOW_DIR, '.next')} missing — run \`npm run build\` in chaseflow-invoices first`
        );
      }
      const port = await freePort('127.0.0.1');
      opts.chaseflow = `http://127.0.0.1:${port}`;
      const handle = startChild('chaseflow', process.execPath,
        [path.join(CHASEFLOW_DIR, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'],
        { cwd: CHASEFLOW_DIR }, { PORT: String(port), NODE_ENV: 'production' });
      children.push(['chaseflow', handle]);
      await waitForReady(`${opts.chaseflow}/api/stripe/status`, opts.timeout, opts.wait, 'chaseflow');
    }

    const checks = [
      {
        name: 'l33tsaas /healthz',
        url: `${opts.l33tsaas}/healthz`,
        expect: '200 {ok:true, service:l33tsaas}',
        test: ({ status, body }) =>
          status === 200 && body?.ok === true && body?.service === 'l33tsaas'
            ? { ok: true, detail: 'service=l33tsaas' }
            : { ok: false, detail: `got status ${status} body ${(JSON.stringify(body) ?? '').slice(0, 160)}` },
      },
      {
        name: 'l33tsaas /v1/tools',
        url: `${opts.l33tsaas}/v1/tools`,
        expect: '200, non-empty tools[]',
        test: ({ status, body }) =>
          status === 200 && Array.isArray(body?.tools) && body.tools.length >= 1
            ? { ok: true, detail: `${body.tools.length} tool(s)` }
            : { ok: false, detail: `got status ${status} body ${(JSON.stringify(body) ?? '').slice(0, 160)}` },
      },
      {
        name: 'chaseflow stripe status',
        url: `${opts.chaseflow}/api/stripe/status`,
        expect: '200, mode test|live|unconfigured',
        test: ({ status, body }) =>
          status === 200 && ['test', 'live', 'unconfigured'].includes(body?.mode)
            ? { ok: true, detail: `mode=${body.mode}` }
            : { ok: false, detail: `got status ${status} body ${(JSON.stringify(body) ?? '').slice(0, 160)}` },
      },
      {
        name: 'chaseflow forecast',
        url: `${opts.chaseflow}/api/forecast?workspace_id=readiness-probe`,
        expect: '200, outstanding_cents number',
        test: ({ status, body }) =>
          status === 200 && typeof body?.outstanding_cents === 'number'
            ? { ok: true, detail: `source=${body.source ?? '?'}, outstanding=${body.outstanding_cents}` }
            : { ok: false, detail: `got status ${status} body ${(JSON.stringify(body) ?? '').slice(0, 160)}` },
      },
    ];

    const rows = [];
    for (const c of checks) {
      let status = 'PASS';
      let detail = '';
      try {
        const res = await getJson(c.url, opts.timeout);
        const outcome = c.test(res);
        if (!outcome.ok) status = 'FAIL';
        detail = outcome.detail;
      } catch (err) {
        status = 'FAIL';
        detail = `request error: ${err.message}`;
      }
      rows.push({ check: c.name, endpoint: c.url, expect: c.expect, status, detail });
    }

    const width = (s) => String(s).length;
    const cols = ['check', 'endpoint', 'expect', 'status', 'detail'];
    const sizes = Object.fromEntries(cols.map((k) => [k, Math.max(k.length, ...rows.map((r) => width(r[k])))]));
    const line = (r) => cols.map((k) => String(r[k]).padEnd(sizes[k])).join('  ');
    console.log(line(Object.fromEntries(cols.map((k) => [k, k.toUpperCase()]))));
    console.log(cols.map((k) => '-'.repeat(sizes[k])).join('  '));
    for (const r of rows) console.log(line(r));

    const failed = rows.filter((r) => r.status !== 'PASS').length;
    console.log(`\nreadiness-probe: ${rows.length - failed}/${rows.length} checks passed`);
    process.exitCode = failed === 0 ? 0 : 1;
  } catch (err) {
    console.error(`readiness-probe: ERROR ${err.message}`);
    process.exitCode = 1;
  } finally {
    for (const [label, handle] of children.reverse()) {
      await stopChild(label, handle).catch(() => {});
    }
  }
}

await main();
