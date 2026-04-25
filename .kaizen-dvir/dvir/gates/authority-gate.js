'use strict';

/**
 * authority-gate.js — KaiZen M3.4 Authority Gate.
 *
 * FR-012 (per-cell authorities.exclusive enforcement), NFR-005 (verdict
 * under 200ms), Commandment II.
 *
 * Public contract:
 *
 *   evaluate(toolCall, activeCellManifest, opts?) -> {
 *     verdict: 'PASS' | 'BLOCK',
 *     violatedAuthority?: string,
 *     message?: string,
 *     durationMs: number,
 *   }
 *
 *   toolCall shape: { tool_name: string, parameters?: object }
 *
 *   activeCellManifest:
 *     - object — already-parsed manifest with `authorities.exclusive`
 *     - string — cell name; we resolve via the in-memory manifest cache
 *                (re-uses the M2.4 PreToolUse parser)
 *     - null/undefined — no cell active; delegate to the M2.4 PreToolUse
 *                        baseline (Commandment I + II baseline) so the
 *                        contract preserves existing behavior (AC 8).
 *
 * In-memory per-session manifest cache (R-004 mitigation, NFR-005):
 *   Cells -> string[] of allowed authority tokens. Cleared between tests
 *   via `_resetCacheForTests()`. Cache is keyed by absolute cell name
 *   (single token, not path) to match the M2.4 convention.
 *
 * pt-BR violation message template (Dev Notes line 192):
 *   "acao bloqueada: a celula ativa nao tem autoridade para {authority}.
 *    consulte celula.yaml."
 *
 * Logging: every BLOCK verdict (and PASS by default for traceability,
 * controllable via opts.logPass=false) appends a gate-verdicts entry.
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const PRE_TOOL_USE_PATH = path.resolve(
  PROJECT_ROOT,
  '.claude',
  'hooks',
  'PreToolUse.js'
);

function _logWriter() {
  return require(path.resolve(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'dvir',
    'hooks',
    'log-writer.js'
  ));
}

function _sessionId() {
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

const VERDICTS = Object.freeze({ PASS: 'PASS', BLOCK: 'BLOCK' });

// Per-session manifest cache: cellName -> string[] of authority tokens.
const _cache = new Map();

function _celulasRoot() {
  if (process.env.KAIZEN_CELULAS_DIR) return process.env.KAIZEN_CELULAS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');
}

function _readCellManifestText(cellName) {
  const file = path.join(_celulasRoot(), cellName, 'celula.yaml');
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (_) {
    return null;
  }
}

/**
 * Reuse the M2.4 PreToolUse parser so the parse semantics are 1:1 with the
 * baseline. This keeps the AC 8 contract intact: when no cell is active or
 * when the cell has no `authorities.exclusive`, we fall through to the
 * exact same behavior the M2 baseline emits.
 */
function _parseAuthorities(yamlText) {
  const pre = require(PRE_TOOL_USE_PATH);
  return pre.parseAuthoritiesExclusive(yamlText);
}

function _loadAuthoritiesByName(cellName) {
  if (_cache.has(cellName)) return _cache.get(cellName);
  const text = _readCellManifestText(cellName);
  if (text === null) {
    _cache.set(cellName, []);
    return [];
  }
  const list = _parseAuthorities(text);
  _cache.set(cellName, list);
  return list;
}

/**
 * Extract authority tokens from a parsed manifest object. Accepts both:
 *   - { authorities: { exclusive: [...] } }
 *   - { authorities_exclusive: [...] }  (legacy / test override)
 */
function _extractAuthoritiesFromObject(manifest) {
  if (!manifest || typeof manifest !== 'object') return [];
  if (
    manifest.authorities &&
    typeof manifest.authorities === 'object' &&
    Array.isArray(manifest.authorities.exclusive)
  ) {
    return manifest.authorities.exclusive.slice();
  }
  if (Array.isArray(manifest.authorities_exclusive)) {
    return manifest.authorities_exclusive.slice();
  }
  return [];
}

function _toolTokens(toolName, parameters) {
  const out = [];
  if (typeof toolName !== 'string' || toolName.length === 0) return out;
  const name = toolName.trim();
  out.push(name);
  if (parameters && typeof parameters.command === 'string') {
    // Push least-specific (single word) BEFORE most-specific (composite),
    // so `tokens[tokens.length - 1]` in `_matchAuthority` refers to the
    // most-specific token (e.g. 'git push' > 'git'). The BLOCK message
    // then cites the innermost authority that the active cell lacked.
    const first = parameters.command.trim().split(/\s+/u)[0];
    if (first && first.length > 0) out.push(first);
    const head = parameters.command.trim().split(/\s+/u).slice(0, 2).join(' ');
    if (head.length > 0 && head !== first) out.push(head);
  }
  return out;
}

function _matchAuthority(toolName, parameters, allowedList) {
  if (!Array.isArray(allowedList) || allowedList.length === 0) {
    return { matched: true, token: null };
  }
  const tokens = _toolTokens(toolName, parameters).map((t) => t.toLowerCase());
  const allowed = allowedList.map((a) => String(a).toLowerCase());
  for (const tok of tokens) {
    if (allowed.includes(tok)) return { matched: true, token: tok };
  }
  // Most-specific token first (composite like 'git push' > 'git').
  const violated = tokens[tokens.length - 1] || toolName;
  return { matched: false, token: violated };
}

function _ptBrBlockMessage(violatedAuthority) {
  return (
    'acao bloqueada: a celula ativa nao tem autoridade para ' +
    violatedAuthority +
    '. consulte celula.yaml.'
  );
}

function _now() {
  return process.hrtime.bigint();
}

function _msSince(start) {
  return Number((process.hrtime.bigint() - start) / 1000000n);
}

function _logVerdict(entry) {
  try {
    _logWriter().write('gate-verdicts', entry);
  } catch (_) {
    // Defensive.
  }
}

/**
 * Public entry — see file header for full contract.
 *
 * @param {{ tool_name: string, parameters?: object }} toolCall
 * @param {object|string|null|undefined} activeCellManifest
 * @param {object} [opts] { gateId?, logPass? }
 * @returns {{ verdict: string, violatedAuthority?: string, message?: string, durationMs: number }}
 */
function evaluate(toolCall, activeCellManifest, opts) {
  const options = opts || {};
  const gateId = options.gateId || 'authority-gate';
  const logPass = options.logPass !== false; // default true
  const start = _now();
  const toolName = (toolCall && toolCall.tool_name) || '';
  const parameters = (toolCall && toolCall.parameters) || {};
  const artifactId = toolName || '<tool>';

  // No-active-cell path — delegate to the M2.4 PreToolUse baseline so we
  // preserve Commandment I/II enforcement exactly as M2.4 delivered (AC 8).
  if (
    activeCellManifest === null ||
    activeCellManifest === undefined ||
    (typeof activeCellManifest === 'string' && activeCellManifest.length === 0)
  ) {
    let pre;
    try {
      pre = require(PRE_TOOL_USE_PATH);
    } catch (_) {
      // M2.4 hook missing — degrade open (no breaking change in environments
      // where the hook is not loaded, e.g. some test fixtures).
      const dur = _msSince(start);
      return { verdict: VERDICTS.PASS, durationMs: dur };
    }
    const baseline = pre.evaluate({
      tool_name: toolName,
      parameters: parameters,
      active_cell: null,
      authorities_exclusive: [],
    });
    const dur = _msSince(start);
    if (baseline.verdict === 'BLOCK') {
      const result = {
        verdict: VERDICTS.BLOCK,
        violatedAuthority: baseline.commandment
          ? 'Mandamento ' + baseline.commandment
          : 'baseline',
        message: baseline.reason,
        durationMs: dur,
      };
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'BLOCK',
        baseline: true,
        commandment_ref: baseline.commandment || null,
        reason: baseline.reason,
        durationMs: dur,
      });
      return result;
    }
    if (logPass) {
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'PASS',
        baseline: true,
        durationMs: dur,
      });
    }
    return { verdict: VERDICTS.PASS, durationMs: dur };
  }

  // Active-cell path — resolve the allowed authorities list.
  let allowed;
  if (typeof activeCellManifest === 'string') {
    allowed = _loadAuthoritiesByName(activeCellManifest);
  } else {
    allowed = _extractAuthoritiesFromObject(activeCellManifest);
  }

  // Empty allowed list = cell declares no exclusive authorities → no
  // restriction beyond the M2.4 baseline. We treat this as PASS (the
  // baseline Commandment I/II would have fired upstream if needed).
  if (!Array.isArray(allowed) || allowed.length === 0) {
    const dur = _msSince(start);
    if (logPass) {
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'PASS',
        empty_authorities: true,
        durationMs: dur,
      });
    }
    return { verdict: VERDICTS.PASS, durationMs: dur };
  }

  const match = _matchAuthority(toolName, parameters, allowed);
  const dur = _msSince(start);

  if (match.matched) {
    if (logPass) {
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'PASS',
        matched_token: match.token,
        durationMs: dur,
      });
    }
    return { verdict: VERDICTS.PASS, durationMs: dur };
  }

  const message = _ptBrBlockMessage(match.token);
  const result = {
    verdict: VERDICTS.BLOCK,
    violatedAuthority: match.token,
    message: message,
    durationMs: dur,
  };
  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: artifactId,
    verdict: 'BLOCK',
    violated_authority: match.token,
    reason: message,
    durationMs: dur,
  });
  return result;
}

function _resetCacheForTests() {
  _cache.clear();
}

module.exports = {
  evaluate: evaluate,
  VERDICTS: VERDICTS,
  _resetCacheForTests: _resetCacheForTests,
  // Exposed for diagnostics.
  _cacheSize: () => _cache.size,
};
