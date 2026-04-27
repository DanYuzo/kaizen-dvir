#!/usr/bin/env node
'use strict';

/**
 * .claude/hooks/UserPromptSubmit.js — Claude Code hook entry point for
 * the KaiZen `UserPromptSubmit` event.
 *
 * Registers a handler with the M2.1 hook-runner dispatcher. On dispatch,
 * calls the Context Injection Engine (CIE) to build the static context
 * payload (CIE-0 Commandments, CIE-1 Global rules, CIE-2 Cell rules) and
 * returns it to Claude Code as the injected prompt prefix.
 *
 * Filename extension: `.js` per Epic KZ-M2 § Deliverables. The Hook System
 * spec (`05-hook-system.md` § Configuração) references `.cjs` — this story
 * follows the epic per Commandment III (no invention). Flagged in Dev Notes
 * for @architect confirmation at the quality gate.
 *
 * The handler never throws: layer errors are logged and bypassed internally
 * by `cie.js`. The hook-runner's circuit breaker still covers any catastrophic
 * failure of the handler function itself (M2.1 AC-007).
 *
 * CON-002: CommonJS + ES2022.
 * CON-003: Node stdlib only.
 * CON-004: Errors written to .kaizen/logs/hook-calls/ via log-writer.js.
 */

const fs = require('node:fs');
const path = require('node:path');

// Resolve the real handler modules inside `.kaizen-dvir/dvir/hooks/`.
// Up 2: .claude/hooks -> .claude -> <projectRoot>
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// 2-step lookup so the shipped shim works in two install shapes:
//   1. Monorepo / framework source — `.kaizen-dvir/dvir/hooks/` lives at
//      <projectRoot>/.kaizen-dvir/dvir/hooks (current dev layout).
//   2. Installed package — kaizen-init only copies a subset of dvir/ to the
//      target project. The full `dvir/hooks/` ships inside the npm package
//      at `node_modules/kaizen-dvir/.kaizen-dvir/dvir/hooks/`.
function resolveHooksDir() {
  const local = path.resolve(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
  if (fs.existsSync(path.join(local, 'hook-runner.js'))) return local;
  try {
    return path.dirname(
      require.resolve('kaizen-dvir/.kaizen-dvir/dvir/hooks/hook-runner.js')
    );
  } catch (_) {
    // Last resort: keep local path so the subsequent require throws a
    // clearer "Cannot find module" pointing at the expected location.
    return local;
  }
}

const HOOKS_DIR = resolveHooksDir();

const hookRunner = require(path.join(HOOKS_DIR, 'hook-runner.js'));
const cie = require(path.join(HOOKS_DIR, 'cie.js'));

const EVENT = 'UserPromptSubmit';
// PRESERVED from M2.2 to keep the composable-API test assertion green.
// The expanded M2.3 layer set is `ALL_LAYERS` below; the handler dispatches
// that expanded set, while external callers relying on the M2.2 contract
// can still reference `DEFAULT_LAYERS`.
const DEFAULT_LAYERS = ['CIE-0', 'CIE-1', 'CIE-2'];
// M2.3 adds CIE-3 Boot to the standard dispatch.
const ALL_LAYERS = ['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3'];

// Startup probe (M2.3 / KZ-M2-R2): first `handler` invocation per process
// checks whether a PreCompact snapshot exists AND `session-booted-cells.json`
// does NOT — if so, rehydrate the state file from the latest snapshot. This
// is the pragmatic wire-up noted in Dev Notes for @architect confirmation;
// we do NOT invent a new hook type for post-compact resumption.
let _restoreProbed = false;

function _latestSnapshotPath() {
  const fs = require('node:fs');
  const stateDir = process.env.KAIZEN_STATE_DIR
    || path.join(PROJECT_ROOT, '.kaizen', 'state');
  let entries;
  try {
    entries = fs.readdirSync(stateDir);
  } catch (_) {
    return null;
  }
  const snaps = entries
    .filter((n) => /^precompact-.*\.ya?ml$/.test(n))
    .sort(); // filename has YYYYMMDD-HHMMSS — lexicographic = chronological.
  if (snaps.length === 0) return null;
  return path.join(stateDir, snaps[snaps.length - 1]);
}

function _maybeRestoreFromSnapshot() {
  if (_restoreProbed) return;
  _restoreProbed = true;
  const fs = require('node:fs');
  const stateFile = process.env.KAIZEN_BOOTED_CELLS_FILE
    || path.join(
      process.env.KAIZEN_STATE_DIR
        || path.join(PROJECT_ROOT, '.kaizen', 'state'),
      'session-booted-cells.json'
    );
  let stateExists = false;
  try {
    fs.accessSync(stateFile, fs.constants.F_OK);
    stateExists = true;
  } catch (_) {
    stateExists = false;
  }
  if (stateExists) return; // State already present — no restore needed.
  const snap = _latestSnapshotPath();
  if (!snap) return;
  try {
    cie.restoreBootedCellsFromSnapshot(snap);
  } catch (_) {
    // Best-effort — swallow; CIE-3 treats missing state as "no cells booted".
  }
}

/**
 * Build the injection payload for a single prompt event.
 *
 * @param {object} payload — Claude Code hook payload. Expected shape is
 *   forward-compatible: anything with `sessionCtx` (or the payload itself
 *   used as sessionCtx) works. M2.3 wires CIE-3 into the standard dispatch
 *   and attempts a post-compact state restore on the first call per process.
 * @returns {{combinedPayload:string, perLayer:Array, totalMs:number}}
 */
function handler(payload) {
  _maybeRestoreFromSnapshot();
  const sessionCtx =
    (payload && typeof payload === 'object' && payload.sessionCtx) ||
    payload ||
    {};
  return cie.inject(sessionCtx, ALL_LAYERS);
}

// Register once when this module is loaded. Claude Code may load the hook
// file multiple times across process lifecycles, but within a single process
// the hook-runner rejects duplicate registration. Guard so that re-require
// during tests does not throw.
function _register() {
  try {
    hookRunner.register(EVENT, handler);
  } catch (err) {
    if (err && /duplicate registration/.test(err.message)) {
      return; // already registered in this process — intentional no-op.
    }
    throw err;
  }
}

_register();

module.exports = {
  EVENT: EVENT,
  DEFAULT_LAYERS: DEFAULT_LAYERS,
  ALL_LAYERS: ALL_LAYERS,
  handler: handler,
  // Exposed for tests: re-run registration after `_resetForTests` of runner.
  _register: _register,
  // Test-only: reset the first-prompt restore probe so a freshly-required
  // module under test starts from a clean slate.
  _resetProbeForTests: () => { _restoreProbed = false; },
};
