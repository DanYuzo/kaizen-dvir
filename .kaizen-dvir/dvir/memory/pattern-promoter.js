'use strict';

/**
 * pattern-promoter.js — Expert-gated pattern promotion (M3.5, FR-025,
 * Commandment V).
 *
 * Public contract (consumed exclusively by `bin/kaizen.js doctor --promotion`
 * — see expert-only invocation guard below):
 *
 *   listCandidates() -> Array<{ id, pattern, source_cell, date }>
 *   approve(candidateId, opts)
 *     -> { promoted: true, target: 'rules'|'commandments', path: <abs> }
 *     | { promoted: false, reason: <pt-BR string> }
 *   reject(candidateId, reason)
 *     -> { rejected: true } | { rejected: false, reason: <pt-BR string> }
 *
 * Source of truth — `.kaizen/logs/promotion-candidates.yaml`. The file is
 * a JSON-Lines stream written by M3.1 `memory-writer.flagForPromotion()`
 * (each line a flow-style YAML 1.2 mapping serialized via JSON.stringify).
 * Every line has shape:
 *   { timestamp: ISO8601, celula: string, pattern: string, status: string }
 * Status transitions tracked in-place by appending a `{ ..., status: "promoted"|"rejected", verdict_ref: <abs> }`
 * line — append-only (FR-023).
 *
 * Approve target paths:
 *   rules         -> .claude/rules/{inferred}.md
 *   commandments  -> .kaizen-dvir/commandments.md  (DOUBLE-CONFIRM REQUIRED)
 *
 * Double-confirmation (AC 9, Commandment V):
 *   When `targetLayer === 'commandments'` the promoter invokes the
 *   caller-supplied `confirm` function with the normative pt-BR prompt
 *   text from `messages.PROMPT_COMMANDMENTS_DOUBLE_CONFIRM`. Only when
 *   the function returns the literal string `'sim'` does the appender
 *   touch `.kaizen-dvir/commandments.md`. Any other return value (`'nao'`,
 *   empty string, undefined) aborts with no filesystem change and logs
 *   the abort to `.kaizen/logs/gate-verdicts/`.
 *
 * Expert-only invocation guard (FR-025):
 *   `approve()` and `reject()` check the `__expertCli__` flag on `opts`
 *   (set only by `bin/kaizen.js` under `doctor --promotion`). When the
 *   flag is missing they return `{ promoted: false, reason: ... }` with
 *   a pt-BR error and DO NOT touch the filesystem. A cell or another
 *   agent calling these functions directly cannot promote a pattern.
 *
 * Append-only Commandments (FR-023):
 *   The Commandments target path is APPENDED — never rewritten. The
 *   `change-log-guard.check()` baseline is updated AFTER the append so
 *   the new entry becomes the new historical baseline.
 *
 * pt-BR errors. EN code, EN module name. CON-002 / CON-003.
 */

const fs = require('node:fs');
const path = require('node:path');

const messages = require('../doctor/messages.js');
const logWriter = require('../hooks/log-writer.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const RULES_DIR_DEFAULT = path.join(PROJECT_ROOT, '.claude', 'rules');
const COMMANDMENTS_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'commandments.md'
);

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) return process.env.KAIZEN_LOGS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'logs');
}

function _candidatesFile() {
  return path.join(_logsRoot(), 'promotion-candidates.yaml');
}

function _rulesDir() {
  if (process.env.KAIZEN_RULES_DIR) return process.env.KAIZEN_RULES_DIR;
  return RULES_DIR_DEFAULT;
}

function _commandmentsPath() {
  if (process.env.KAIZEN_COMMANDMENTS_PATH) {
    return process.env.KAIZEN_COMMANDMENTS_PATH;
  }
  return COMMANDMENTS_PATH;
}

function _sessionId() {
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

/**
 * Read the candidates JSONL file. Each non-empty line is a JSON object;
 * malformed lines are skipped (defensive — same posture as log-writer).
 *
 * Status transitions (`status: "promoted"|"rejected"`) are honored by
 * collapsing the latest status per (celula, pattern) pair. The displayed
 * candidate list excludes anything not currently in `status: "candidate"`.
 *
 * Each rendered candidate carries an `id` derived from a deterministic
 * SHA-1-style fingerprint over `celula + pattern` truncated to 12 chars
 * — stable across processes so `kaizen doctor --promotion approve {id}`
 * works without writing intermediate id files.
 *
 * @returns {Array<{id:string, pattern:string, source_cell:string, date:string}>}
 */
function listCandidates() {
  const file = _candidatesFile();
  if (!fs.existsSync(file)) return [];
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_) {
    return [];
  }
  const lines = raw.split(/\r?\n/u);
  // Map id -> { id, pattern, source_cell, date, status }
  const byId = new Map();
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (_) {
      continue;
    }
    const cell = obj.celula || obj.source_cell || '';
    const pattern = obj.pattern || '';
    if (!cell || !pattern) continue;
    const id = computeCandidateId(cell, pattern);
    const existing = byId.get(id);
    const status = obj.status || 'candidate';
    byId.set(id, {
      id: id,
      pattern: pattern,
      source_cell: cell,
      date: obj.timestamp || (existing ? existing.date : ''),
      status: status,
    });
  }
  const out = [];
  for (const v of byId.values()) {
    if (v.status === 'candidate') {
      out.push({
        id: v.id,
        pattern: v.pattern,
        source_cell: v.source_cell,
        date: v.date,
      });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/**
 * Deterministic 12-char fingerprint. Pure JS — CON-003 forbids node:crypto
 * here would be allowed (stdlib), but this fingerprint must be stable
 * across Node versions and platforms; we use a hand-rolled FNV-1a 64-bit
 * variant rendered in hex for portability.
 */
function computeCandidateId(cell, pattern) {
  const seed = String(cell) + '|' + String(pattern);
  // FNV-1a 32-bit, then double-pass for a 64-bit-shaped value rendered as
  // 12-char hex. Sufficient for de-duping candidate lines.
  function fnv32(str, seedVal) {
    let h = seedVal >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }
  const a = fnv32(seed, 2166136261);
  const b = fnv32(seed.split('').reverse().join(''), a ^ 0x9e3779b1);
  const hex = (a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0')).slice(0, 12);
  return hex;
}

function _inferRuleFilename(candidate) {
  // Slugify the first 6 words of the pattern, kebab-case, ASCII only.
  const text = String(candidate.pattern || 'padrao');
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 6);
  const slug = words.length > 0 ? words.join('-') : 'padrao-promovido';
  return slug + '.md';
}

function _appendStatusLine(candidate, statusValue, extras) {
  const file = _candidatesFile();
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    celula: candidate.source_cell,
    pattern: candidate.pattern,
    status: statusValue,
    candidate_id: candidate.id,
    extras: extras || null,
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, line + '\n', { encoding: 'utf8' });
}

function _logVerdict(entry) {
  try {
    logWriter.write('gate-verdicts', entry);
  } catch (_) {
    // Defensive — never let a log failure mask a successful promotion.
  }
}

function _findCandidate(candidateId) {
  const list = listCandidates();
  for (const c of list) {
    if (c.id === candidateId) return c;
  }
  return null;
}

function _expertGuardError() {
  return (
    'promoção bloqueada. apenas `kaizen doctor --promotion` pode aprovar ou rejeitar candidatos. FR-025 / Commandment V.'
  );
}

/**
 * Append the rule body to .claude/rules/{inferred}.md. Creates the rules
 * directory on demand. Append-only when the file already exists; on first
 * write emits a minimal header + the pattern row.
 */
function _writeRule(candidate) {
  const dir = _rulesDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = _inferRuleFilename(candidate);
  const target = path.join(dir, filename);
  const stamp = new Date().toISOString().slice(0, 10);
  const block =
    '\n' +
    '## ' +
    stamp +
    ' — promovido de ' +
    candidate.source_cell +
    '\n\n' +
    candidate.pattern +
    '\n';
  if (!fs.existsSync(target)) {
    const header = '# Padrão promovido\n\n' +
      'Origem: célula `' + candidate.source_cell + '`. Promovido via `kaizen doctor --promotion`.\n';
    fs.writeFileSync(target, header + block, { encoding: 'utf8' });
  } else {
    fs.appendFileSync(target, block, { encoding: 'utf8' });
  }
  return target;
}

/**
 * Append a Commandments amendment block PLUS a Change Log row. Append-only
 * (FR-023) — never rewrites prior bytes.
 */
function _writeCommandment(candidate) {
  const target = _commandmentsPath();
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const block =
    '\n' +
    '## ' +
    stamp +
    ' — emenda promovida de ' +
    candidate.source_cell +
    '\n\n' +
    candidate.pattern +
    '\n';
  const changeLogRow =
    '\n- ' +
    stamp +
    ' — pattern-promoter — promovido padrão "' +
    candidate.pattern.slice(0, 60) +
    '" da célula ' +
    candidate.source_cell +
    '.\n';
  if (!fs.existsSync(target)) {
    const header =
      '# Commandments\n\n' +
      'Constituição do KaiZen. Apêndices abaixo seguem ordem cronológica.\n' +
      '\n## Change Log\n';
    fs.writeFileSync(target, header + changeLogRow + block, {
      encoding: 'utf8',
    });
  } else {
    // Append the change log row first (under the existing section), then
    // the new amendment block at end of file. Both append-only.
    fs.appendFileSync(target, changeLogRow + block, { encoding: 'utf8' });
  }
  return target;
}

/**
 * Public — list current candidates. No mutations.
 */
function listCandidatesPublic() {
  return listCandidates();
}

/**
 * Public — approve a candidate. See file header for the full contract.
 *
 * @param {string} candidateId
 * @param {object} opts
 *   - targetLayer: 'rules' | 'commandments'  (default 'rules')
 *   - confirm: function(promptText) -> 'sim' | 'nao' | string  (REQUIRED for commandments)
 *   - __expertCli__: boolean  (REQUIRED — set by bin/kaizen.js)
 * @returns {{promoted: boolean, target?: string, path?: string, reason?: string}}
 */
function approve(candidateId, opts) {
  const options = opts || {};
  if (options.__expertCli__ !== true) {
    return { promoted: false, reason: _expertGuardError() };
  }
  const targetLayer = options.targetLayer === 'commandments' ? 'commandments' : 'rules';
  const candidate = _findCandidate(candidateId);
  if (!candidate) {
    return {
      promoted: false,
      reason:
        'candidato não encontrado: ' +
        candidateId +
        '. liste os candidatos com `kaizen doctor --promotion`.',
    };
  }

  let writtenPath = null;

  if (targetLayer === 'commandments') {
    // Double-confirmation (AC 9). The confirm function MUST return 'sim'
    // (case-insensitive after trim) to proceed. Anything else aborts.
    const confirmFn = typeof options.confirm === 'function'
      ? options.confirm
      : null;
    if (!confirmFn) {
      return {
        promoted: false,
        reason:
          'confirmação obrigatória para alvo commandments. invoque `confirm` na chamada.',
      };
    }
    const reply = confirmFn(messages.PROMPT_COMMANDMENTS_DOUBLE_CONFIRM, {
      candidate: candidate,
    });
    const normalized = typeof reply === 'string' ? reply.trim().toLowerCase() : '';
    if (normalized !== 'sim') {
      // Abort — log and return.
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: 'pattern-promoter',
        session_id: _sessionId(),
        gate_id: 'pattern-promoter',
        artifact_id: 'commandments:' + candidate.id,
        verdict: 'HALT',
        candidate_id: candidate.id,
        target_layer: targetLayer,
        reason: 'aborto na confirmação dupla. resposta: ' + (reply || '(vazia)') + '.',
      });
      return {
        promoted: false,
        reason:
          'promoção abortada. confirmação dupla retornou "' +
          (reply || '(vazia)') +
          '". commandments.md inalterado.',
      };
    }
    writtenPath = _writeCommandment(candidate);
  } else {
    writtenPath = _writeRule(candidate);
  }

  // Mark candidate as promoted (append-only status transition).
  _appendStatusLine(candidate, 'promoted', { target_layer: targetLayer, target_path: writtenPath });

  // Log verdict.
  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: 'pattern-promoter',
    session_id: _sessionId(),
    gate_id: 'pattern-promoter',
    artifact_id: targetLayer + ':' + candidate.id,
    verdict: 'PASS',
    candidate_id: candidate.id,
    target_layer: targetLayer,
    target_path: writtenPath,
    source_cell: candidate.source_cell,
  });

  return {
    promoted: true,
    target: targetLayer,
    path: writtenPath,
  };
}

/**
 * Public — reject a candidate. Records the rejection reason in pt-BR.
 *
 * @param {string} candidateId
 * @param {string} reason — pt-BR rejection reason.
 * @param {object} opts — { __expertCli__: boolean }
 * @returns {{rejected: boolean, reason?: string}}
 */
function reject(candidateId, reason, opts) {
  const options = opts || {};
  if (options.__expertCli__ !== true) {
    return { rejected: false, reason: _expertGuardError() };
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    return {
      rejected: false,
      reason: 'motivo da rejeição obrigatório. informe `--reason "..."`.',
    };
  }
  const candidate = _findCandidate(candidateId);
  if (!candidate) {
    return {
      rejected: false,
      reason:
        'candidato não encontrado: ' +
        candidateId +
        '. liste os candidatos com `kaizen doctor --promotion`.',
    };
  }
  _appendStatusLine(candidate, 'rejected', { reason: reason });
  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: 'pattern-promoter',
    session_id: _sessionId(),
    gate_id: 'pattern-promoter',
    artifact_id: 'reject:' + candidate.id,
    verdict: 'FAIL',
    candidate_id: candidate.id,
    reason: reason,
    source_cell: candidate.source_cell,
  });
  return { rejected: true };
}

module.exports = {
  listCandidates: listCandidatesPublic,
  approve: approve,
  reject: reject,
  computeCandidateId: computeCandidateId,
  // Exposed for tests only.
  _internal: {
    _candidatesFile: _candidatesFile,
    _rulesDir: _rulesDir,
    _commandmentsPath: _commandmentsPath,
    _inferRuleFilename: _inferRuleFilename,
  },
};

// --- Change Log -----------------------------------------------------------
// 2026-04-24 — @dev (Dex) — M3.5 initial implementation. Expert-only
//   approve/reject flow consumed exclusively by `bin/kaizen.js doctor
//   --promotion`. Double-confirmation on `targetLayer: commandments`
//   (AC 9). FNV-1a 12-char fingerprint for deterministic candidate ids
//   stable across processes. Append-only status transitions in the
//   candidates file (FR-023). Verdict logging via M2.1 log-writer.
