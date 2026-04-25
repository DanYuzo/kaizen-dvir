'use strict';

/**
 * Shared helpers for M2 gate integration tests (tests/m2/integration/).
 * Each gate test is the 1:1 mapping from Epic KZ-M2 § Gate Criteria.
 *
 * Isolation: per-test tmpdir with KAIZEN_LOGS_DIR + KAIZEN_STATE_DIR set,
 * mirroring M2.1/M2.2/M2.3/M2.4/M2.5 tests.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const CLAUDE_HOOKS_DIR = path.join(PROJECT_ROOT, '.claude', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkTmp(label) {
  const random = _rand();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2int-' + label + '-' + random + '-')
  );
  const logs = path.join(root, 'logs');
  const state = path.join(root, 'state');
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_STATE_DIR = state;
  process.env.KAIZEN_BOOTED_CELLS_FILE = path.join(state, 'session-booted-cells.json');
  return { root: root, logs: logs, state: state, label: label };
}

function rmTmp(sandbox) {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_BOOTED_CELLS_FILE;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function requireFresh(absPath) {
  const resolved = require.resolve(absPath);
  delete require.cache[resolved];
  // Also flush the common M2 hook chain so each test loads a clean runner/cie.
  const lw = path.join(HOOKS_DIR, 'log-writer.js');
  const runner = path.join(HOOKS_DIR, 'hook-runner.js');
  const cie = path.join(HOOKS_DIR, 'cie.js');
  for (const p of [lw, runner, cie]) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_) {
      /* not yet loaded */
    }
  }
  return require(absPath);
}

function freshRunner() {
  return requireFresh(path.join(HOOKS_DIR, 'hook-runner.js'));
}

function freshCie() {
  return requireFresh(path.join(HOOKS_DIR, 'cie.js'));
}

function freshHookEntry(name) {
  // name: 'UserPromptSubmit' | 'PreCompact' | 'PreToolUse'
  // Full flush: resets runner/cie/log-writer too. Use when loading a hook
  // entry in ISOLATION.
  return requireFresh(path.join(CLAUDE_HOOKS_DIR, name + '.js'));
}

/**
 * Load a hook entry WITHOUT flushing the shared runner/cie/log-writer cache.
 * Use when loading multiple hook entries that must register against the
 * SAME runner instance (e.g. M2 Gate 1 integration test).
 */
function loadHookEntry(name) {
  const full = path.join(CLAUDE_HOOKS_DIR, name + '.js');
  const resolved = require.resolve(full);
  delete require.cache[resolved];
  return require(full);
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  HOOKS_DIR: HOOKS_DIR,
  CLAUDE_HOOKS_DIR: CLAUDE_HOOKS_DIR,
  SCHEMAS_DIR: SCHEMAS_DIR,
  mkTmp: mkTmp,
  rmTmp: rmTmp,
  requireFresh: requireFresh,
  freshRunner: freshRunner,
  freshCie: freshCie,
  freshHookEntry: freshHookEntry,
  loadHookEntry: loadHookEntry,
};
