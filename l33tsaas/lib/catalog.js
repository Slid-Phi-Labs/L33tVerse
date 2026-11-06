'use strict';

/**
 * L33tSaaS tool registry (dependency-free, offline-testable).
 *
 * A tool is registered under a name with an exact MAJOR.MINOR.PATCH
 * version. Consumers pin an exact version; omitting the version
 * resolves to the latest registered version.
 *
 * Store shape:
 *   { tools: { [name]: { versions: { [version]: Tool }, latest: string } },
 *     claims: Claim[] }
 */

const fs = require('node:fs');
const path = require('node:path');

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function emptyStore() {
  return { tools: {}, claims: [] };
}

/** Numeric MAJOR.MINOR.PATCH comparison: -1 | 0 | 1. */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

function validateTool(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'name and version required' };
  }
  const { name, version } = input;
  if (name == null || version == null) {
    return { ok: false, error: 'name and version required' };
  }
  if (typeof name !== 'string' || !NAME_RE.test(name)) {
    return { ok: false, error: 'invalid tool name (lowercase letters, digits, hyphens)' };
  }
  if (typeof version !== 'string' || !VERSION_RE.test(version)) {
    return { ok: false, error: 'invalid version (expected MAJOR.MINOR.PATCH)' };
  }
  return { ok: true };
}

/**
 * Register a tool version. Re-registering an existing version refreshes
 * its metadata. Returns { ok, tool, isNew } or { ok: false, error }.
 */
function registerTool(store, input) {
  const valid = validateTool(input);
  if (!valid.ok) return valid;
  const { name, version } = input;
  const entry = store.tools[name] || (store.tools[name] = { versions: {}, latest: null });
  const isNew = !entry.versions[version];
  entry.versions[version] = {
    name,
    version,
    description: typeof input.description === 'string' ? input.description : '',
    updated_at: new Date().toISOString(),
  };
  if (!entry.latest || compareVersions(entry.latest, version) <= 0) {
    entry.latest = version;
  }
  return { ok: true, tool: entry.versions[version], isNew };
}

/**
 * Resolve a tool. With an exact version this is a pin; without one it
 * resolves to the latest registered version. Returns the tool or null.
 */
function getTool(store, name, version) {
  const entry = store && store.tools ? store.tools[name] : undefined;
  if (!entry) return null;
  const pinned = version || entry.latest;
  return entry.versions[pinned] || null;
}

/** Latest version of every tool, sorted by name. */
function listTools(store) {
  return Object.keys(store.tools)
    .sort()
    .map((name) => store.tools[name].versions[store.tools[name].latest]);
}

/** Load the JSON file store; a missing file yields an empty store. */
function loadStore(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return emptyStore();
    throw err;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`corrupt catalog store: ${filePath}`);
  }
  if (!data || typeof data !== 'object' || !data.tools || typeof data.tools !== 'object') {
    throw new Error(`corrupt catalog store: ${filePath}`);
  }
  if (!Array.isArray(data.claims)) data.claims = [];
  return data;
}

/** Persist the store atomically (tmp file + rename). */
function saveStore(filePath, store) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2) + '\n');
  fs.renameSync(tmp, filePath);
}

module.exports = {
  emptyStore,
  compareVersions,
  validateTool,
  registerTool,
  getTool,
  listTools,
  loadStore,
  saveStore,
};
