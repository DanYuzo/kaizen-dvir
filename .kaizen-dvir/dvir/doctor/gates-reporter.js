'use strict';

/**
 * gates-reporter.js — `kaizen doctor --gates` (M3.5, AC 3, FR-029).
 *
 * Reads the last 100 entries from .kaizen/logs/gate-verdicts/ across all
 * daily JSONL files (newest last by lexicographic filename order = ISO
 * date order). Aggregates invocation counts per gate type and renders the
 * last 5 verdicts per gate type with `{timestamp} {gate_id} {artifact_id}
 * {verdict-pt-BR}`.
 *
 * Read-only — no mutations to logs or state. Safe on empty directory.
 *
 * pt-BR output. Identifiers stay literal. CON-002 / CON-003.
 */

const fs = require('node:fs');
const path = require('node:path');

const messages = require('./messages.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const TAIL_LIMIT = 100;
const PER_TYPE_RECENT = 5;

const GATE_TYPE_KEYS = Object.keys(messages.GATE_TYPES);

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) return process.env.KAIZEN_LOGS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'logs');
}

function _verdictsDir() {
  return path.join(_logsRoot(), 'gate-verdicts');
}

/**
 * Tail the last `n` JSONL entries across the verdict log directory.
 * Returns entries in insertion order (oldest first inside the slice).
 *
 * @param {number} n
 * @returns {Array<object>}
 */
function _tailEntries(n) {
  const dir = _verdictsDir();
  if (!fs.existsSync(dir)) return [];
  let names;
  try {
    names = fs
      .readdirSync(dir)
      .filter((f) => /\.jsonl$/u.test(f))
      .sort();
  } catch (_) {
    return [];
  }
  const collected = [];
  for (const name of names) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(dir, name), 'utf8');
    } catch (_) {
      continue;
    }
    for (const line of raw.split(/\r?\n/u)) {
      if (line.trim().length === 0) continue;
      try {
        collected.push(JSON.parse(line));
      } catch (_) {
        // skip malformed
      }
    }
  }
  return collected.slice(-n);
}

/**
 * Map a verdict log entry to a normalised gate type string.
 *
 * Verdict log entries are written by:
 *   - quality-gate.js   (gate_id starts with "quality" or equals "quality-gate")
 *   - playback-gate.js  (gate_id includes "playback")
 *   - schema-gate.js    (gate_id includes "schema")
 *   - authority-gate.js (gate_id includes "authority")
 *   - reuse-gate.js     (gate_id includes "reuse")
 *   - mode-engine.js    (gate_id "mode-engine") — bucketed under "playback"
 *
 * Unknown gate_ids are bucketed as "quality" (the default-gate fallback).
 */
function _typeOf(entry) {
  const id = String(entry.gate_id || entry.hook_name || '').toLowerCase();
  if (id.indexOf('playback') !== -1) return 'playback';
  if (id.indexOf('schema') !== -1) return 'schema';
  if (id.indexOf('authority') !== -1) return 'authority';
  if (id.indexOf('reuse') !== -1) return 'reuse';
  if (id.indexOf('mode') !== -1) return 'playback';
  if (id.indexOf('quality') !== -1) return 'quality';
  return 'quality';
}

function _verdictLabel(entry) {
  const v = String(entry.verdict || '').toUpperCase();
  return messages.VERDICT_LABELS[v] || (entry.verdict || '-');
}

function _padDots(label, width) {
  if (label.length >= width) return label;
  return label + '.'.repeat(width - label.length);
}

/**
 * Aggregate counts and last-5-per-type from the tailed entries.
 *
 * @param {Array<object>} entries
 * @returns {{counts: Object, recentByType: Object}}
 */
function _aggregate(entries) {
  const counts = {};
  const recent = {};
  for (const t of GATE_TYPE_KEYS) {
    counts[t] = 0;
    recent[t] = [];
  }
  for (const entry of entries) {
    const t = _typeOf(entry);
    counts[t] = (counts[t] || 0) + 1;
    if (!recent[t]) recent[t] = [];
    recent[t].push(entry);
    // Keep only the last PER_TYPE_RECENT (drop older).
    if (recent[t].length > PER_TYPE_RECENT) recent[t].shift();
  }
  return { counts: counts, recentByType: recent };
}

/**
 * Render the `--gates` report. Returns a string ending with `\n`.
 * Suitable for direct stdout write.
 *
 * @returns {string}
 */
function render() {
  const lines = [];
  lines.push(messages.HEADER_GATES);
  const entries = _tailEntries(TAIL_LIMIT);
  if (entries.length === 0) {
    lines.push(messages.EMPTY_VERDICTS);
    lines.push('');
    return lines.join('\n') + '\n';
  }
  const agg = _aggregate(entries);
  // Counts block.
  for (const t of GATE_TYPE_KEYS) {
    const label = _padDots('  ' + t + ' ', 14);
    lines.push(label + ' ' + agg.counts[t] + ' invocações');
  }
  lines.push('');
  // Last 5 per type.
  for (const t of GATE_TYPE_KEYS) {
    const recent = agg.recentByType[t] || [];
    if (recent.length === 0) continue;
    lines.push('  últimos veredictos — ' + t + ':');
    for (const e of recent) {
      const ts = e.timestamp || '-';
      const gid = e.gate_id || e.hook_name || '-';
      const aid = e.artifact_id || '-';
      lines.push(
        '    ' + ts + '  ' + gid + '  ' + aid + '  ' + _verdictLabel(e)
      );
    }
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

module.exports = {
  render: render,
  TAIL_LIMIT: TAIL_LIMIT,
  PER_TYPE_RECENT: PER_TYPE_RECENT,
  GATE_TYPE_KEYS: GATE_TYPE_KEYS,
  // Exposed for tests.
  _internal: {
    _tailEntries: _tailEntries,
    _typeOf: _typeOf,
    _aggregate: _aggregate,
    _verdictLabel: _verdictLabel,
  },
};
