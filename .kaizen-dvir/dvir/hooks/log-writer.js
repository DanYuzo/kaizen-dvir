'use strict';

/**
 * log-writer.js — Structured log writer for KaiZen hook infrastructure.
 *
 * Public contract:
 *   - write(type, entry) — serializes `entry` to a JSON-Lines record under
 *                          .kaizen/logs/{type}/ and appends it to a daily
 *                          log file. Returns the absolute path written to.
 *
 * Serialization choice — JSON Lines (one JSON object per line):
 *   * stdlib-only via JSON.stringify (CON-003)
 *   * append-safe from multiple hooks without reading/parsing prior content
 *   * streaming-friendly for `kaizen doctor` (M2.5) and the observability
 *     report (M3)
 *   * YAML would require a parser or hand-rolled serializer; JSON.stringify
 *     ships zero-dep and handles Unicode / nested payloads deterministically.
 *
 * Directory layout (lazily created on first write, per Task 4):
 *   .kaizen/logs/hook-calls/YYYY-MM-DD.jsonl
 *   .kaizen/logs/gate-verdicts/YYYY-MM-DD.jsonl
 *   .kaizen/logs/handoffs/YYYY-MM-DD.jsonl
 *   .kaizen/logs/waivers/YYYY-MM-DD.jsonl
 *
 * CON-003: Node stdlib only (fs, path).
 * CON-002: CommonJS + ES2022.
 * AC 5: required fields — timestamp, event_type, hook_name, session_id.
 *       optional fields — payload, verdict.
 */

const fs = require('node:fs');
const path = require('node:path');

const VALID_TYPES = Object.freeze([
  'hook-calls',
  'gate-verdicts',
  'handoffs',
  'waivers',
]);

const REQUIRED_FIELDS = Object.freeze([
  'timestamp',
  'event_type',
  'hook_name',
  'session_id',
]);

// Resolve .kaizen/logs/ relative to the project root. We anchor on this file's
// location — `.kaizen-dvir/dvir/hooks/log-writer.js` — so the writer works
// regardless of the caller's cwd. Override via KAIZEN_LOGS_DIR for tests.
function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) {
    return process.env.KAIZEN_LOGS_DIR;
  }
  // up 4: hooks -> dvir -> .kaizen-dvir -> <projectRoot>
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  return path.join(projectRoot, '.kaizen', 'logs');
}

function _validate(type, entry) {
  if (!VALID_TYPES.includes(type)) {
    throw new Error(
      "log-writer: invalid type '" +
        type +
        "'. expected one of: " +
        VALID_TYPES.join(', ')
    );
  }
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('log-writer: entry must be a plain object');
  }
  const missing = [];
  for (const field of REQUIRED_FIELDS) {
    const v = entry[field];
    if (v === undefined || v === null || v === '') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      'log-writer: entry missing required field(s): ' + missing.join(', ')
    );
  }
}

function _dailyFileName(entry) {
  // Use the entry timestamp when parseable, otherwise fall back to now.
  let d = new Date(entry.timestamp);
  if (Number.isNaN(d.getTime())) {
    d = new Date();
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day + '.jsonl';
}

/**
 * Append a structured log entry to .kaizen/logs/{type}/YYYY-MM-DD.jsonl.
 * Creates parent directories on demand.
 *
 * @param {'hook-calls'|'gate-verdicts'|'handoffs'|'waivers'} type
 * @param {object} entry — must include timestamp, event_type, hook_name,
 *                         session_id. May include payload and/or verdict.
 * @returns {string} Absolute path of the file that received the entry.
 * @throws {Error} on invalid type, malformed entry, or filesystem failure.
 */
function write(type, entry) {
  _validate(type, entry);

  const dir = path.join(_logsRoot(), type);
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, _dailyFileName(entry));
  const line = JSON.stringify(entry) + '\n';

  // Append synchronously — ordering inside a process is preserved and
  // callers (hooks) expect the entry to be durable before returning.
  fs.appendFileSync(file, line, { encoding: 'utf8' });
  return file;
}

module.exports = {
  write: write,
  VALID_TYPES: VALID_TYPES,
  REQUIRED_FIELDS: REQUIRED_FIELDS,
};
