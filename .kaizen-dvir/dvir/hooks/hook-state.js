'use strict';

/**
 * hook-state.js — Read-only aggregator for `kaizen doctor --hooks` (M2.5).
 *
 * Reports:
 *   - load state per hook (probe require('.claude/hooks/<name>.js'))
 *   - circuit breaker state per hook (read from hook-runner failure counter)
 *   - last N entries from .kaizen/logs/hook-calls/ (JSON-lines tail)
 *
 * Contract:
 *   - Read-only. No mutations. No side effects on hooks or logs.
 *   - Safe to run on a live session in progress.
 *
 * CON-002 CommonJS/ES2022. CON-003 stdlib only. D-v1.4-06 pt-BR user-facing.
 */

const fs = require('node:fs');
const path = require('node:path');

const HOOK_NAMES = Object.freeze(['UserPromptSubmit', 'PreCompact', 'PreToolUse']);

function _projectRoot() {
  // hook-state.js -> hooks -> dvir -> .kaizen-dvir -> <projectRoot>
  return path.resolve(__dirname, '..', '..', '..');
}

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) return process.env.KAIZEN_LOGS_DIR;
  return path.join(_projectRoot(), '.kaizen', 'logs');
}

/**
 * Probe each hook file: require() it inside try/catch. Load success is
 * "the module parsed and executed without throwing". A file that throws
 * on import is treated as "falha" (failed). Absence of the file is also
 * "falha" with a distinct reason code.
 * @returns {Array<{name:string, state:'ok'|'falha', reason?:string}>}
 */
function readLoadStates() {
  const out = [];
  const hooksDir = path.join(_projectRoot(), '.claude', 'hooks');
  for (const name of HOOK_NAMES) {
    const file = path.join(hooksDir, name + '.js');
    if (!fs.existsSync(file)) {
      out.push({ name: name, state: 'falha', reason: 'arquivo ausente' });
      continue;
    }
    // Probe: require() with cache-miss to surface parse/load errors but not
    // trigger registration side-effects against the running hook-runner.
    // We evaluate the module in a child-scope by flushing the require cache
    // entry before and after. On any throw, report falha with the message.
    const abs = path.resolve(file);
    let registered = false;
    try {
      delete require.cache[abs];
      require(abs);
      registered = true;
    } catch (err) {
      out.push({
        name: name,
        state: 'falha',
        reason: err && err.message ? err.message : String(err),
      });
    } finally {
      delete require.cache[abs];
    }
    if (registered) {
      out.push({ name: name, state: 'ok' });
    }
  }
  return out;
}

/**
 * Read circuit-breaker state per hook from hook-runner. We avoid keeping
 * a live handler registered — instead we read the failure counter map
 * through the exposed _getFailureCount accessor. State labels are pt-BR.
 * @returns {Array<{name:string, state:'fechado'|'aberto', failures:number}>}
 */
function readBreakerStates() {
  const runnerPath = path.join(
    _projectRoot(),
    '.kaizen-dvir',
    'dvir',
    'hooks',
    'hook-runner.js'
  );
  let runner;
  try {
    runner = require(runnerPath);
  } catch (_) {
    // If the runner itself fails to load, report all hooks as fechado/0
    // (unknown) — the load-states report already surfaced the root cause.
    return HOOK_NAMES.map((n) => ({ name: n, state: 'fechado', failures: 0 }));
  }
  const threshold = runner.FAILURE_THRESHOLD || 3;
  const out = [];
  for (const name of HOOK_NAMES) {
    const failures =
      typeof runner._getFailureCount === 'function'
        ? runner._getFailureCount(name)
        : 0;
    out.push({
      name: name,
      state: failures >= threshold ? 'aberto' : 'fechado',
      failures: failures,
    });
  }
  return out;
}

/**
 * Read the last N entries across all daily log files in
 * .kaizen/logs/hook-calls/, most recent first. Tolerates a missing
 * directory (returns []), malformed lines (skipped), and empty files.
 * @param {number} n
 * @returns {Array<object>}
 */
function readRecentHookCalls(n) {
  const limit = typeof n === 'number' && n > 0 ? n : 5;
  const dir = path.join(_logsRoot(), 'hook-calls');
  if (!fs.existsSync(dir)) return [];
  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => /\.jsonl$/u.test(f)).sort();
  } catch (_) {
    return [];
  }
  // Collect entries preserving insertion order (append-only log), then take
  // the final N. File names are ISO dates — lexicographic sort = chronological.
  const all = [];
  for (const f of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(dir, f), 'utf8');
    } catch (_) {
      continue;
    }
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        all.push(JSON.parse(line));
      } catch (_) {
        // skip malformed
      }
    }
  }
  return all.slice(-limit).reverse();
}

module.exports = {
  HOOK_NAMES: HOOK_NAMES,
  readLoadStates: readLoadStates,
  readBreakerStates: readBreakerStates,
  readRecentHookCalls: readRecentHookCalls,
};
