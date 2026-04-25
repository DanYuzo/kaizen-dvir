'use strict';

/**
 * reuse-gate.js — KaiZen M3.4 Reuse Gate (soft, WARN-only).
 *
 * FR-022, Commandment VII (Evolução Incremental). Soft gate per PRD §7 —
 * never blocks advance.
 *
 * Public contract:
 *
 *   check(artifactType, artifactIntent, opts?) -> {
 *     verdict: 'WARN' | 'OK',
 *     candidates: string[],
 *     message?: string,
 *   }
 *
 *   - 'OK' is the silent-pass case (no candidates found). NO log entry is
 *     emitted in this case (AC 10 — silent when no match).
 *   - 'WARN' carries up to 5 candidate paths and a pt-BR message listing
 *     them. WARN is logged to .kaizen/logs/gate-verdicts/.
 *
 * Scan scope (MVP, Scope OUT for full 6-verification per A5):
 *   - .kaizen-dvir/celulas/                 (installed cells)
 *   - celulas/                              (project-root cells)
 *
 * Match heuristic (MVP — documented for @architect review, M3.4-R2):
 *   A candidate is any directory under the scan roots whose lower-cased
 *   name contains either:
 *     - the lower-cased `artifactType`, OR
 *     - any whitespace-separated token of `artifactIntent` of length >= 4
 *   We also scan FILES one level deep matching the same rule, so that
 *   single-file artifacts (e.g. handoffs, contracts) are caught.
 *
 *   The 5-candidate cap (Dev Notes M3.4-R2) prevents WARN-message inflation
 *   — when more than 5 candidates exist we report the 5 most recently
 *   modified.
 *
 * pt-BR message template (Dev Notes line 196):
 *   "atencao: ja existe artefato parecido. candidatos: {list}. deseja continuar?"
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

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

const VERDICTS = Object.freeze({ WARN: 'WARN', OK: 'OK' });

const CANDIDATE_CAP = 5;
const MIN_TOKEN_LEN = 4;

function _scanRoots() {
  if (process.env.KAIZEN_REUSE_ROOTS) {
    return process.env.KAIZEN_REUSE_ROOTS.split(path.delimiter)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
  return [
    path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas'),
    path.join(PROJECT_ROOT, 'celulas'),
  ];
}

function _safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
}

function _safeStat(p) {
  try {
    return fs.statSync(p);
  } catch (_) {
    return null;
  }
}

function _intentTokens(intent) {
  if (typeof intent !== 'string') return [];
  return intent
    .toLowerCase()
    .split(/[\s_\-/.]+/u)
    .filter((t) => t.length >= MIN_TOKEN_LEN);
}

function _matchesNeedle(name, typeLower, intentTokens) {
  const lower = name.toLowerCase();
  if (typeLower.length > 0 && lower.includes(typeLower)) return true;
  for (const tok of intentTokens) {
    if (lower.includes(tok)) return true;
  }
  return false;
}

function _scanRoot(root, typeLower, intentTokens, found) {
  const entries = _safeReaddir(root);
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      // Match the directory itself.
      if (_matchesNeedle(entry.name, typeLower, intentTokens)) {
        const stat = _safeStat(full);
        found.push({ path: full, mtimeMs: stat ? stat.mtimeMs : 0 });
      }
      // One level deep into directories so single-file artifacts are caught.
      const inner = _safeReaddir(full);
      for (const sub of inner) {
        if (_matchesNeedle(sub.name, typeLower, intentTokens)) {
          const subFull = path.join(full, sub.name);
          const stat = _safeStat(subFull);
          found.push({ path: subFull, mtimeMs: stat ? stat.mtimeMs : 0 });
        }
      }
    } else if (entry.isFile()) {
      if (_matchesNeedle(entry.name, typeLower, intentTokens)) {
        const stat = _safeStat(full);
        found.push({ path: full, mtimeMs: stat ? stat.mtimeMs : 0 });
      }
    }
  }
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
 * @param {string} artifactType
 * @param {string} artifactIntent
 * @param {object} [opts] { gateId? }
 * @returns {{ verdict: string, candidates: string[], message?: string }}
 */
function check(artifactType, artifactIntent, opts) {
  const options = opts || {};
  const gateId = options.gateId || 'reuse-gate';
  const typeLower =
    typeof artifactType === 'string' ? artifactType.toLowerCase().trim() : '';
  const intentTokens = _intentTokens(artifactIntent);

  if (typeLower.length === 0 && intentTokens.length === 0) {
    // Insufficient input — silent pass; nothing actionable to compare.
    return { verdict: VERDICTS.OK, candidates: [] };
  }

  const found = [];
  for (const root of _scanRoots()) {
    _scanRoot(root, typeLower, intentTokens, found);
  }

  if (found.length === 0) {
    // Silent pass per AC 10 — no log entry emitted.
    return { verdict: VERDICTS.OK, candidates: [] };
  }

  // Deduplicate by path, sort newest first, cap at CANDIDATE_CAP.
  const seen = new Set();
  const unique = [];
  for (const f of found) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    unique.push(f);
  }
  unique.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const top = unique.slice(0, CANDIDATE_CAP).map((f) => f.path);

  const list = top.join(', ');
  const message =
    'atencao: ja existe artefato parecido. candidatos: ' +
    list +
    '. deseja continuar?';

  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: typeLower + ':' + (artifactIntent || ''),
    verdict: 'WARN',
    candidates: top,
    candidate_count: top.length,
    truncated: unique.length > top.length,
  });

  return {
    verdict: VERDICTS.WARN,
    candidates: top,
    message: message,
  };
}

module.exports = {
  check: check,
  VERDICTS: VERDICTS,
  CANDIDATE_CAP: CANDIDATE_CAP,
};
