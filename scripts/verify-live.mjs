#!/usr/bin/env node
/**
 * verify-live.mjs — env-gated live credential checks for L33tVerse.
 *
 *   stripe   → STRIPE_SECRET_KEY set? list one price via api.stripe.com.
 *   database → DATABASE_URL set? connect with the repo's `pg` dep + SELECT 1.
 *
 * Each check PRINTS SKIP (exit 0 overall) when its env var is absent, and
 * FAILs loudly — non-zero exit — when the env var is present but broken.
 *
 * Usage:
 *   node scripts/verify-live.mjs [--timeout <ms>]
 *
 * Node stdlib only, except the database check reuses the `pg` dependency
 * already vendored by chaseflow-invoices (run `npm install` there first).
 */
'use strict';

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHASEFLOW_DIR = path.join(ROOT, 'chaseflow-invoices');

const TIMEOUT = Number(process.argv.includes('--timeout')
  ? process.argv[process.argv.indexOf('--timeout') + 1]
  : process.env.VERIFY_TIMEOUT_MS) || 15000;

function keyMode(key) {
  if (key.startsWith('sk_live')) return 'live';
  if (key.startsWith('sk_test')) return 'test';
  return 'unrecognized-prefix';
}

async function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) return { check: 'stripe prices', status: 'SKIP', detail: 'STRIPE_SECRET_KEY not set' };
  try {
    const res = await fetch('https://api.stripe.com/v1/prices?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const text = await res.text();
    if (res.status !== 200) {
      return { check: 'stripe prices', status: 'FAIL', detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    let count = '?';
    try { count = JSON.parse(text).data?.length ?? '?'; } catch { /* keep '?' */ }
    return { check: 'stripe prices', status: 'PASS', detail: `key mode=${keyMode(key)}, listed ${count} price(s)` };
  } catch (err) {
    return { check: 'stripe prices', status: 'FAIL', detail: `request error: ${err.message}` };
  }
}

async function checkDatabase() {
  const url = process.env.DATABASE_URL || '';
  if (!url) return { check: 'database select 1', status: 'SKIP', detail: 'DATABASE_URL not set' };
  let Pool;
  try {
    const require = createRequire(import.meta.url);
    const pgPath = require.resolve('pg', { paths: [CHASEFLOW_DIR] });
    ({ Pool } = require(pgPath));
  } catch {
    return {
      check: 'database select 1',
      status: 'FAIL',
      detail: `DATABASE_URL is set but module 'pg' not found — run \`npm install\` in chaseflow-invoices first`,
    };
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: TIMEOUT });
  try {
    const res = await pool.query('select 1 as ok');
    if (res.rows?.[0]?.ok !== 1) {
      return { check: 'database select 1', status: 'FAIL', detail: `unexpected result: ${JSON.stringify(res.rows).slice(0, 160)}` };
    }
    return { check: 'database select 1', status: 'PASS', detail: 'select 1 returned 1' };
  } catch (err) {
    return { check: 'database select 1', status: 'FAIL', detail: `${err.message}`.slice(0, 300) };
  } finally {
    await pool.end().catch(() => {});
  }
}

const rows = [await checkStripe(), await checkDatabase()];

const sizes = {
  check: Math.max('CHECK'.length, ...rows.map((r) => r.check.length)),
  status: Math.max('STATUS'.length, ...rows.map((r) => r.status.length)),
};
for (const r of rows) {
  console.log(`${r.check.padEnd(sizes.check)}  ${r.status.padEnd(sizes.status)}  ${r.detail}`);
}

const failed = rows.filter((r) => r.status === 'FAIL').length;
const skipped = rows.filter((r) => r.status === 'SKIP').length;
console.log(`\nverify-live: ${rows.length - failed - skipped} passed, ${skipped} skipped, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
