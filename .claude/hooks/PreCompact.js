'use strict';

/**
 * PreCompact.js — KaiZen M2.4 hook entry point.
 *
 * Event-triggered gate that fires before Claude Code autocompact. Writes
 * a YAML snapshot to `.kaizen/state/precompact-{YYYYMMDD-HHMMSS}.yaml` so
 * session state (notably CIE-3's booted-cell record) survives the
 * compaction that would otherwise wipe it. This closes the write side of
 * KZ-M2-R2; the read side (rehydration in UserPromptSubmit) is scoped to
 * a follow-up story.
 *
 * M3.2 cooperation extension (additive, no breaking change to M2.4):
 *   The snapshot now carries an optional `latest_handoff_path` field that
 *   points to the most recent handoff artifact under .kaizen/handoffs/, so
 *   post-compact session restore can rehydrate the handoff trail without
 *   prompting the expert (AC-201, NFR-011, M3.2 Task 5). When the
 *   handoff-engine module is missing or `readLatest` returns null, the
 *   field is emitted as `null` and downstream readers degrade gracefully.
 *
 * NFR-013 deviation (explicit, documented):
 *   The M2.1 circuit breaker normally bypasses a hook after 3 consecutive
 *   failures. `PreCompact` MUST NOT take that path — a silent snapshot
 *   loss is exactly what this hook exists to prevent. On any write
 *   failure, we return { verdict: 'BLOCK', reason, error } to the caller
 *   BEFORE the circuit breaker can evaluate the failure as a bypass
 *   candidate (we don't throw — throwing would increment the failure
 *   counter and could eventually trigger bypass on subsequent calls).
 *
 * Constraints honoured:
 *   - CON-002: CommonJS + ES2022.
 *   - CON-003: Node stdlib only. Hand-rolled YAML emitter for the small
 *     fixed snapshot schema (see `buildYaml()` below).
 *   - NFR-004: target < 1s snapshot time.
 *
 * Registers with the M2.1 hook-runner under event name `PreCompact`.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// 2-step lookup so the shipped shim works in two install shapes:
//   1. Monorepo / framework source — `.kaizen-dvir/dvir/` lives at
//      <projectRoot>/.kaizen-dvir/dvir (current dev layout).
//   2. Installed package — kaizen-init only copies a subset of dvir/ to the
//      target project. The full `dvir/` tree ships inside the npm package
//      at `node_modules/kaizen-dvir/.kaizen-dvir/dvir/`.
function resolveDvirDir() {
  const local = path.resolve(PROJECT_ROOT, '.kaizen-dvir', 'dvir');
  if (fs.existsSync(path.join(local, 'hooks', 'hook-runner.js'))) return local;
  try {
    return path.dirname(
      path.dirname(
        require.resolve('kaizen-dvir/.kaizen-dvir/dvir/hooks/hook-runner.js')
      )
    );
  } catch (_) {
    return local;
  }
}

const DVIR_DIR = resolveDvirDir();
const RUNNER_PATH = path.join(DVIR_DIR, 'hooks', 'hook-runner.js');
const LOG_WRITER_PATH = path.join(DVIR_DIR, 'hooks', 'log-writer.js');
const HANDOFF_ENGINE_PATH = path.join(DVIR_DIR, 'memory', 'handoff-engine.js');

function _logWriter() {
  return require(LOG_WRITER_PATH);
}

/**
 * Resolve the most recent handoff artifact path under `.kaizen/handoffs/`
 * (M3.2 cooperation contract). Best-effort: any failure (missing module,
 * missing directory, parse error) returns null and the snapshot proceeds
 * with `latest_handoff_path: null` — graceful degradation per Dev Notes.
 *
 * Filters out in-flight `.tmp-` filenames so we never capture a partial
 * write (M3.2-R2 mitigation).
 *
 * @returns {string|null}
 */
function _readLatestHandoffPath() {
  let engine;
  try {
    engine = require(HANDOFF_ENGINE_PATH);
  } catch (_) {
    return null;
  }
  let retained;
  try {
    retained = engine.listRetained();
  } catch (_) {
    return null;
  }
  if (!Array.isArray(retained) || retained.length === 0) return null;
  for (const entry of retained) {
    if (
      entry &&
      typeof entry.path === 'string' &&
      entry.filename &&
      entry.filename.indexOf('.tmp-') === -1
    ) {
      return entry.path;
    }
  }
  return null;
}

/**
 * Resolve the `.kaizen/state/` directory. Tests override via the
 * `KAIZEN_STATE_DIR` env variable, mirroring `KAIZEN_LOGS_DIR`.
 *
 * @returns {string}
 */
function stateDir() {
  if (process.env.KAIZEN_STATE_DIR) return process.env.KAIZEN_STATE_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'state');
}

/**
 * Resolve the `session-booted-cells.json` path. M2.3 writes this file;
 * tests may also inject via `KAIZEN_BOOTED_CELLS_FILE` for isolation.
 *
 * @returns {string}
 */
function bootedCellsFile() {
  if (process.env.KAIZEN_BOOTED_CELLS_FILE) {
    return process.env.KAIZEN_BOOTED_CELLS_FILE;
  }
  return path.join(stateDir(), 'session-booted-cells.json');
}

/**
 * ISO-8601 compact stamp for filenames: YYYYMMDD-HHMMSS (UTC).
 *
 * @param {Date} d
 * @returns {string}
 */
function compactStamp(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return y + m + day + '-' + hh + mm + ss;
}

/**
 * Escape a string for a double-quoted YAML 1.2 scalar. We quote every
 * string by default to dodge the Norway Problem (`no`, `off`, `yes`,
 * `1.0` etc getting coerced by implicit typing on re-parse).
 *
 * @param {string} s
 * @returns {string} quoted scalar
 */
function yamlQuote(s) {
  const escaped = String(s)
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\n/gu, '\\n')
    .replace(/\r/gu, '\\r')
    .replace(/\t/gu, '\\t');
  return '"' + escaped + '"';
}

/**
 * Emit a YAML value at a given indent. Supports:
 *   - string (always quoted)
 *   - number (finite → bare; non-finite → quoted string)
 *   - boolean (bare true/false)
 *   - null / undefined → "null" literal
 *   - array of scalars or objects → block list
 *   - plain object → nested block mapping
 *
 * All object keys are emitted bare (ASCII identifier discipline expected
 * from the schema). Sufficient for the fixed PreCompact snapshot shape.
 *
 * @param {*} value
 * @param {number} indent
 * @returns {string}
 */
function yamlValue(value, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : yamlQuote(String(value));
  }
  if (typeof value === 'string') return yamlQuote(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = ' '.repeat(indent);
    const lines = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length === 0) {
          lines.push(pad + '- {}');
          continue;
        }
        // First key on the `-` line, remaining keys aligned below it.
        const head = keys[0];
        lines.push(pad + '- ' + head + ': ' + yamlValue(item[head], indent + 4));
        for (let i = 1; i < keys.length; i++) {
          const k = keys[i];
          lines.push(' '.repeat(indent + 2) + k + ': ' + yamlValue(item[k], indent + 4));
        }
      } else {
        lines.push(pad + '- ' + yamlValue(item, indent + 2));
      }
    }
    return '\n' + lines.join('\n');
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const pad = ' '.repeat(indent);
    const lines = [];
    for (const k of keys) {
      lines.push(pad + k + ': ' + yamlValue(value[k], indent + 2));
    }
    return '\n' + lines.join('\n');
  }
  // Fallback: treat as string.
  return yamlQuote(String(value));
}

/**
 * Emit the full YAML document for a snapshot object. Top-level keys
 * appear at indent 0; nested structures use yamlValue() recursively.
 *
 * @param {object} snapshot
 * @returns {string}
 */
function buildYaml(snapshot) {
  const keys = Object.keys(snapshot);
  const lines = [];
  for (const k of keys) {
    lines.push(k + ': ' + yamlValue(snapshot[k], 2));
  }
  // Ensure a trailing newline.
  return lines.join('\n') + '\n';
}

/**
 * Read and parse `session-booted-cells.json` for inclusion in the
 * snapshot. On absence or parse failure, returns an empty object with a
 * pt-BR warning logged — never crashes the snapshot (per Task 1
 * subtasks).
 *
 * @returns {object}
 */
function readBootedCells() {
  const file = bootedCellsFile();
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch (_) {
    // Malformed state file: pt-BR warning into the hook-calls log.
    try {
      _logWriter().write('hook-calls', {
        timestamp: new Date().toISOString(),
        event_type: 'warn',
        hook_name: 'PreCompact',
        session_id:
          'pid-' + process.pid + '-' + (process.env.KAIZEN_SESSION_ID || 'default'),
        message:
          'session-booted-cells.json malformado — snapshot prossegue com objeto vazio.',
      });
    } catch (__) {
      // Never cascade a log failure into the snapshot path.
    }
    return {};
  }
}

/**
 * Build the snapshot object in memory. Kept pure (no I/O beyond the
 * booted-cells read and clock) for testability.
 *
 * @param {object} payload  optional Claude Code payload
 * @returns {object}
 */
function buildSnapshot(payload) {
  const now = new Date();
  const sessionId =
    (payload && payload.session_id) ||
    'pid-' + process.pid + '-' + (process.env.KAIZEN_SESSION_ID || 'default');
  const activeCell = payload && payload.active_cell ? payload.active_cell : null;
  const ctxSummary =
    payload && typeof payload.ctx_summary === 'string' && payload.ctx_summary.length > 0
      ? payload.ctx_summary
      : null;

  // M3.2 cooperation: snapshot embeds a pointer to the latest handoff so
  // post-compact restore can rehydrate the handoff trail without prompting
  // the expert (AC-201, NFR-011). Tests and callers may pre-set
  // `payload.latest_handoff_path` to override the disk lookup; otherwise we
  // best-effort resolve via handoff-engine.listRetained(). Missing engine or
  // empty disk → field emits as `null` (graceful degradation).
  let latestHandoffPath = null;
  if (payload && typeof payload.latest_handoff_path === 'string') {
    latestHandoffPath = payload.latest_handoff_path;
  } else {
    latestHandoffPath = _readLatestHandoffPath();
  }

  return {
    version: '1.0',
    timestamp: now.toISOString(),
    active_session_id: sessionId,
    session_id: sessionId,
    active_cell: activeCell,
    session_booted_cells: readBootedCells(),
    ctx_summary: ctxSummary,
    working_document:
      payload && payload.working_document ? payload.working_document : null,
    decisions: payload && Array.isArray(payload.decisions) ? payload.decisions : [],
    files_modified:
      payload && Array.isArray(payload.files_modified) ? payload.files_modified : [],
    next_action:
      payload && typeof payload.next_action === 'string' ? payload.next_action : null,
    latest_handoff_path: latestHandoffPath,
  };
}

/**
 * Handler registered with the M2.1 runner.
 *
 * @param {object} payload
 * @returns {{ verdict: 'PASS'|'BLOCK', snapshot_path?: string, reason?: string, error?: string, duration_ms?: number }}
 */
function handle(payload) {
  const started = Date.now();
  const snapshot = buildSnapshot(payload);
  const sessionId = snapshot.active_session_id;

  let yamlText;
  try {
    yamlText = buildYaml(snapshot);
  } catch (err) {
    return _blockOnFailure(
      sessionId,
      'falha ao serializar snapshot em YAML',
      err,
      Date.now() - started
    );
  }

  const dir = stateDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    return _blockOnFailure(
      sessionId,
      'falha ao criar diretorio .kaizen/state/',
      err,
      Date.now() - started
    );
  }

  const stamp = compactStamp(new Date(snapshot.timestamp));
  const file = path.join(dir, 'precompact-' + stamp + '.yaml');

  try {
    // writeFileSync without `wx` flag: overwrite is fine (same-second
    // collisions are rare and last-writer-wins is acceptable for a
    // snapshot whose purpose is survival, not history).
    fs.writeFileSync(file, yamlText, { encoding: 'utf8' });
  } catch (err) {
    return _blockOnFailure(
      sessionId,
      'falha ao gravar snapshot em ' + file,
      err,
      Date.now() - started
    );
  }

  const duration = Date.now() - started;

  // Success log — gate-verdicts channel for integration-gate visibility.
  try {
    _logWriter().write('hook-calls', {
      timestamp: new Date().toISOString(),
      event_type: 'snapshot_written',
      hook_name: 'PreCompact',
      session_id: sessionId,
      verdict: 'PASS',
      snapshot_path: file,
      duration_ms: duration,
    });
  } catch (_) {
    // Never cascade.
  }

  return {
    verdict: 'PASS',
    snapshot_path: file,
    duration_ms: duration,
  };
}

/**
 * Build the BLOCK verdict for a snapshot failure. Emits a pt-BR failure
 * log entry on the `hook-calls` channel. Does NOT throw — throwing would
 * route through the M2.1 circuit breaker and eventually trigger bypass,
 * which violates NFR-013.
 *
 * @param {string} sessionId
 * @param {string} reason pt-BR short reason
 * @param {Error|*} err
 * @param {number} durationMs
 * @returns {{ verdict: 'BLOCK', reason: string, error: string, duration_ms: number }}
 */
function _blockOnFailure(sessionId, reason, err, durationMs) {
  const msg =
    err && err.message ? String(err.message) : err ? String(err) : 'unknown';
  try {
    _logWriter().write('hook-calls', {
      timestamp: new Date().toISOString(),
      event_type: 'snapshot_failure',
      hook_name: 'PreCompact',
      session_id: sessionId,
      verdict: 'BLOCK',
      message:
        'Snapshot bloqueado (NFR-013): ' + reason + '. expert alertado, autocompact impedido.',
      error: msg,
      duration_ms: durationMs,
    });
  } catch (_) {
    // Never cascade.
  }
  return {
    verdict: 'BLOCK',
    reason:
      'Snapshot bloqueado (NFR-013): ' +
      reason +
      '. expert alertado, autocompact impedido.',
    error: msg,
    duration_ms: durationMs,
  };
}

/**
 * Register handler with the M2.1 runner.
 */
function register() {
  const runner = require(RUNNER_PATH);
  runner.register('PreCompact', handle);
}

module.exports = {
  register: register,
  handle: handle,
  buildSnapshot: buildSnapshot,
  buildYaml: buildYaml,
  yamlQuote: yamlQuote,
  yamlValue: yamlValue,
  compactStamp: compactStamp,
  readBootedCells: readBootedCells,
  stateDir: stateDir,
};
