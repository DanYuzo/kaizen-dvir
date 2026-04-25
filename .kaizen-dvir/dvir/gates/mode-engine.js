'use strict';

/**
 * mode-engine.js — KaiZen M3.4 Mode Engine.
 *
 * FR-038, AC-102 (prereq), AC-113 (prereq), R-002 / R-007 mitigation.
 *
 * Public contract (FROZEN — consumed by playback-gate.js, M4 Yotzer chief
 * agent, and `kaizen doctor --memory`):
 *
 *   promptSessionStart(opts?) -> string
 *     Returns the pt-BR prompt rendered at session boot. Caller (CLI shell
 *     or test harness) handles the actual stdin read.
 *
 *   selectMode(choice) -> { mode: 'interativo'|'automatico', persisted: string }
 *     Records the expert's choice. `choice` accepts 'interativo' | 'automatico'
 *     or the legacy short forms 'i' | 'a'. Persists at .kaizen/state/session-mode.yaml
 *     (FR-038). Throws with pt-BR message on invalid input.
 *
 *   getMode() -> 'interativo'|'automatico'|null
 *     Pure read of .kaizen/state/session-mode.yaml. null when no mode is set
 *     (e.g. session opened without prompt — caller should call selectMode()).
 *
 *   switchMode(target) -> { mode, previous, logged: true }
 *     Implements *modo interativo / *modo auto mid-session switches (AC 12).
 *     Writes a YAML entry under .kaizen/state/session-mode.yaml AND a
 *     mode_switch entry to .kaizen/logs/gate-verdicts/.
 *
 *   isCriticalInvariant(cellManifest, phase) -> boolean
 *     Reads `critical_invariants:` list from the active cell manifest and
 *     returns true when the phase is listed (AC 13).
 *
 * Cross-story dependency (KZ-M3-R5 mitigation):
 *   The `critical_invariants:` field schema validation for tier-1 cells
 *   lands in M3.5 doctor (`kaizen doctor --cells` flags missing field).
 *   This module consumes the field with a permissive default — missing or
 *   empty list means no phase is critical-invariant. Schema Gate (this
 *   story) enforces presence for tier-1 cells (R5 mitigation hook).
 *
 * Storage layout (CON-004 — .kaizen/ is gitignored):
 *   .kaizen/state/session-mode.yaml
 *   .kaizen/logs/gate-verdicts/YYYY-MM-DD.jsonl  (mode_switch entries)
 *
 * Override for tests: KAIZEN_STATE_DIR (mirrors M2.4 PreCompact convention)
 *                     KAIZEN_LOGS_DIR (mirrors M2.1 log-writer convention).
 *
 * PreCompact cooperation (M2.4): the snapshot writer in PreCompact.js may
 * include a pointer to session-mode.yaml so the selection survives
 * autocompact. No code in this module touches PreCompact directly — the
 * cooperation is via the on-disk file at the documented path.
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only. Language Policy
 * D-v1.4-06 (pt-BR for user-facing strings, EN for machine identifiers).
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const VALID_MODES = Object.freeze(['interativo', 'automatico']);
const SESSION_MODE_FILENAME = 'session-mode.yaml';

// pt-BR prompt template (diretrizes-escrita: short sentences, present tense,
// active voice, no adverbs). Matches the canonical sample in story Dev Notes
// line 189.
const PROMPT_TEXT =
  'modo: interativo (Playback entre fases) ou automatico ' +
  '(auto-aprova se gate PASS; pausa so em pontos criticos)?';

function _stateDir() {
  if (process.env.KAIZEN_STATE_DIR) return process.env.KAIZEN_STATE_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'state');
}

function _modeFile() {
  return path.join(_stateDir(), SESSION_MODE_FILENAME);
}

function _sessionId() {
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

// Lazy log-writer require so KAIZEN_LOGS_DIR overrides set at test boot
// take effect (the writer caches the dir on first call).
function _logWriter() {
  return require(path.resolve(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'dvir',
    'hooks',
    'log-writer.js'
  ));
}

function _normalizeChoice(choice) {
  if (typeof choice !== 'string') return null;
  const trimmed = choice.trim().toLowerCase();
  if (trimmed === 'interativo' || trimmed === 'i') return 'interativo';
  if (trimmed === 'automatico' || trimmed === 'a' || trimmed === 'auto') {
    return 'automatico';
  }
  return null;
}

function _yamlEscape(s) {
  return String(s)
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\n/gu, '\\n');
}

function _writeMode(mode) {
  const dir = _stateDir();
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString();
  const yaml =
    'mode: "' +
    _yamlEscape(mode) +
    '"\n' +
    'updated_at: "' +
    _yamlEscape(ts) +
    '"\n' +
    'session_id: "' +
    _yamlEscape(_sessionId()) +
    '"\n';
  const target = _modeFile();
  fs.writeFileSync(target, yaml, { encoding: 'utf8' });
  return target;
}

function _readModeFile() {
  const target = _modeFile();
  if (!fs.existsSync(target)) return null;
  let raw;
  try {
    raw = fs.readFileSync(target, 'utf8');
  } catch (_) {
    return null;
  }
  // Tiny purpose-built reader — matches what _writeMode emits. Looks for
  // the `mode:` line and extracts the quoted value.
  const lines = raw.split(/\r?\n/u);
  for (const line of lines) {
    const m = /^mode\s*:\s*"([^"]*)"\s*$/u.exec(line);
    if (m) {
      const value = m[1];
      if (VALID_MODES.includes(value)) return value;
      return null;
    }
  }
  return null;
}

/**
 * Render the session-start pt-BR prompt. Pure function — caller handles
 * the actual stdin read.
 *
 * @returns {string}
 */
function promptSessionStart() {
  return PROMPT_TEXT;
}

/**
 * Persist the expert's mode selection at .kaizen/state/session-mode.yaml.
 *
 * @param {string} choice 'interativo' | 'automatico' | 'i' | 'a' | 'auto'
 * @returns {{ mode: string, persisted: string }}
 */
function selectMode(choice) {
  const normalized = _normalizeChoice(choice);
  if (normalized === null) {
    const err = new Error(
      'modo invalido. use "interativo" ou "automatico".'
    );
    err.code = 'MODE_INVALID';
    throw err;
  }
  const persisted = _writeMode(normalized);
  return { mode: normalized, persisted: persisted };
}

/**
 * Read the persisted mode. Returns null when no mode has been selected
 * yet in this session.
 *
 * @returns {'interativo'|'automatico'|null}
 */
function getMode() {
  return _readModeFile();
}

/**
 * Switch the active mode mid-session and emit a mode_switch verdict log
 * entry. Implements *modo interativo / *modo auto (AC 12).
 *
 * @param {string} target 'interativo' | 'automatico'
 * @returns {{ mode: string, previous: string|null, logged: true }}
 */
function switchMode(target) {
  const normalized = _normalizeChoice(target);
  if (normalized === null) {
    const err = new Error(
      'modo invalido. use "interativo" ou "automatico".'
    );
    err.code = 'MODE_INVALID';
    throw err;
  }
  const previous = _readModeFile();
  _writeMode(normalized);

  const entry = {
    timestamp: new Date().toISOString(),
    event_type: 'mode_switch',
    hook_name: 'mode-engine',
    session_id: _sessionId(),
    gate_id: 'mode-engine',
    artifact_id: SESSION_MODE_FILENAME,
    verdict: 'PASS',
    previous_mode: previous,
    new_mode: normalized,
    message: 'mudanca de modo registrada: ' + normalized + '. vigora a partir desta fase.',
  };
  try {
    _logWriter().write('gate-verdicts', entry);
  } catch (_) {
    // Defensive: never let log failure poison the switch.
  }

  return { mode: normalized, previous: previous, logged: true };
}

/**
 * Read `critical_invariants:` list from a parsed cell manifest and check
 * whether `phase` is listed. Permissive default — missing or empty list
 * returns false. Cross-story dependency: schema completeness for tier-1
 * cells lands in M3.5 doctor (see file header).
 *
 * Accepts the manifest as either:
 *   - parsed object with `critical_invariants: [...]`
 *   - parsed object with `tiers.<name>.critical_invariants: [...]`
 *     (defensive — schema today carries it at top level; future cells may
 *      scope per tier)
 *
 * @param {object} cellManifest parsed celula.yaml object
 * @param {string} phase phase identifier (e.g. 'F1', 'phase-1', 'objetivo')
 * @returns {boolean}
 */
function isCriticalInvariant(cellManifest, phase) {
  if (!cellManifest || typeof cellManifest !== 'object') return false;
  if (typeof phase !== 'string' || phase.length === 0) return false;

  // Top-level shape (canonical for M4 Yotzer).
  if (Array.isArray(cellManifest.critical_invariants)) {
    return cellManifest.critical_invariants.includes(phase);
  }

  // Nested-by-tier shape (forward-compatible).
  if (cellManifest.tiers && typeof cellManifest.tiers === 'object') {
    for (const tierName of Object.keys(cellManifest.tiers)) {
      const tier = cellManifest.tiers[tierName];
      if (tier && Array.isArray(tier.critical_invariants)) {
        if (tier.critical_invariants.includes(phase)) return true;
      }
    }
  }

  return false;
}

module.exports = {
  promptSessionStart: promptSessionStart,
  selectMode: selectMode,
  getMode: getMode,
  switchMode: switchMode,
  isCriticalInvariant: isCriticalInvariant,
  VALID_MODES: VALID_MODES,
  PROMPT_TEXT: PROMPT_TEXT,
  SESSION_MODE_FILENAME: SESSION_MODE_FILENAME,
};
