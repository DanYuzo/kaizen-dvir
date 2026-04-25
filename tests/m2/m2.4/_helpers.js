'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.claude', 'hooks');
const DVIR_HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');

/**
 * Create a unique tmpdir for logs and state to isolate from M2.2's
 * parallel tests. Sets KAIZEN_LOGS_DIR, KAIZEN_STATE_DIR, and
 * KAIZEN_BOOTED_CELLS_FILE so PreCompact's booted-cells read also lands
 * in the sandbox.
 */
function mkTmp(label) {
  const random = crypto.randomBytes(4).toString('hex');
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2.4-' + label + '-' + random + '-')
  );
  const logs = path.join(root, 'logs');
  const state = path.join(root, 'state');
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_STATE_DIR = state;
  process.env.KAIZEN_BOOTED_CELLS_FILE = path.join(
    state,
    'session-booted-cells.json'
  );
  return { root: root, logs: logs, state: state };
}

function rmTmp(sandbox) {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_BOOTED_CELLS_FILE;
  delete process.env.KAIZEN_ACTIVE_CELL;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // Best-effort cleanup — Windows file locks can transiently block.
  }
}

function requireFreshHook(name) {
  const full = path.join(HOOKS_DIR, name);
  delete require.cache[require.resolve(full)];
  const lw = path.join(DVIR_HOOKS_DIR, 'log-writer.js');
  delete require.cache[require.resolve(lw)];
  const runner = path.join(DVIR_HOOKS_DIR, 'hook-runner.js');
  delete require.cache[require.resolve(runner)];
  return require(full);
}

function readJsonlFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.map((l) => JSON.parse(l));
}

function readAllJsonlEntries(logsDir, type) {
  const dir = path.join(logsDir, type);
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.jsonl$/.test(f))
    .sort();
  const out = [];
  for (const f of files) {
    out.push(...readJsonlFile(path.join(dir, f)));
  }
  return out;
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  HOOKS_DIR: HOOKS_DIR,
  DVIR_HOOKS_DIR: DVIR_HOOKS_DIR,
  mkTmp: mkTmp,
  rmTmp: rmTmp,
  requireFreshHook: requireFreshHook,
  readJsonlFile: readJsonlFile,
  readAllJsonlEntries: readAllJsonlEntries,
};
