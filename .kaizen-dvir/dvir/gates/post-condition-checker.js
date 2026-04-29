'use strict';

/**
 * post-condition-checker.js — KaiZen M9.4 Phase Post-Condition Checker.
 *
 * Verifies that artefacts declared in a phase task's `post_condition`
 * frontmatter exist on disk BEFORE the phase gate (Schema Gate, Quality
 * Gate, or Playback Gate) emits a PASS verdict. Without this check, a
 * phase that never wrote its artefacts would still close — the bug that
 * D-v2.0-04 documents and M9.4 fixes.
 *
 * Public contract (FROZEN — consumed by phase task instructions and the
 * M9.4 test fixture):
 *
 *   checkArtefacts(celulaPath, expectedFiles, opts?) -> {
 *     verdict: 'PASS' | 'FAIL',
 *     missing: Array<{ path: string, message: string }>,
 *     present: Array<string>,
 *     phase: number | null,
 *     durationMs: number,
 *   }
 *
 *     celulaPath:
 *       absolute path to the generated cell directory. Each entry in
 *       `expectedFiles` is resolved relative to this directory.
 *     expectedFiles:
 *       Array<string> — list of relative paths that must exist on disk.
 *       Directories are accepted; the checker passes when the directory
 *       exists AND is not empty (to enforce "tasks/" or "contracts/"
 *       being populated, not merely created).
 *     opts (optional):
 *       { phase?: number, gateId?: string, allowEmptyDir?: boolean }
 *       - phase: phase number (1..10), included in the pt-BR error
 *         message and the verdict log entry.
 *       - gateId: log identifier (default 'post-condition-checker').
 *       - allowEmptyDir: when true, a directory entry passes whether
 *         empty or not. Default false.
 *
 * Read-only: this module never writes to celulaPath. It is L1 code
 * (`.kaizen-dvir/dvir/`) and respects CON-005 — reads from L2 are
 * allowed; writes are not. CON-002 CommonJS / ES2022. CON-003 stdlib
 * only.
 *
 * Language Policy D-v1.4-06:
 *   user-facing error messages in pt-BR. Applies M9.1 leigo vocabulary
 *   (etapa instead of fase) per AC-5 of M9.4.
 *
 * Mode parity (AC-6):
 *   This checker is called identically in `mode: interativo` and
 *   `mode: automatico`. Mode never short-circuits the existence check.
 */

const fs = require('node:fs');
const path = require('node:path');

const VERDICTS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

function _now() {
  return process.hrtime.bigint();
}

function _msSince(start) {
  return Number((process.hrtime.bigint() - start) / 1000000n);
}

function _sessionId() {
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

function _logVerdict(entry) {
  // Defensive: log-writer is M2.1 infrastructure; a logging failure must
  // never poison the gate response. Same pattern as schema-gate.js.
  try {
    const logWriter = require(path.resolve(__dirname, '..', 'hooks', 'log-writer.js'));
    logWriter.write('gate-verdicts', entry);
  } catch (_) {
    // Intentional swallow.
  }
}

/**
 * Build the pt-BR error message for a missing artefact. Applies M9.1
 * leigo vocabulary: "etapa" instead of "fase", concrete corrective
 * action, frases curtas, presente, voz ativa.
 *
 * @param {number|null} phase
 * @param {string} relPath
 * @param {string} reason — 'absent' | 'empty_dir'
 * @returns {string}
 */
function _formatMissingMessage(phase, relPath, reason) {
  const etapaLabel =
    typeof phase === 'number' && Number.isFinite(phase)
      ? 'a etapa ' + phase
      : 'esta etapa';
  if (reason === 'empty_dir') {
    return (
      etapaLabel +
      " ainda nao pode fechar — a pasta '" +
      relPath +
      "' existe mas esta vazia. escreva os arquivos esperados antes de pedir o fechamento da etapa."
    );
  }
  return (
    etapaLabel +
    " ainda nao pode fechar — o arquivo '" +
    relPath +
    "' nao foi criado. escreva o arquivo antes de pedir o fechamento da etapa."
  );
}

function _isDirNonEmpty(absPath) {
  try {
    const entries = fs.readdirSync(absPath);
    return entries.length > 0;
  } catch (_) {
    return false;
  }
}

function _checkOne(celulaPath, relPath, allowEmptyDir, phase) {
  if (typeof relPath !== 'string' || relPath.length === 0) {
    return {
      ok: false,
      message: _formatMissingMessage(phase, '(invalido)', 'absent'),
    };
  }
  const abs = path.resolve(celulaPath, relPath);
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch (_) {
    return { ok: false, message: _formatMissingMessage(phase, relPath, 'absent') };
  }
  if (stat.isDirectory()) {
    if (allowEmptyDir) return { ok: true };
    if (_isDirNonEmpty(abs)) return { ok: true };
    return { ok: false, message: _formatMissingMessage(phase, relPath, 'empty_dir') };
  }
  // Regular file (or anything else — symlink resolved by statSync).
  return { ok: true };
}

/**
 * Public entry point. See file header for contract.
 *
 * @param {string} celulaPath
 * @param {Array<string>} expectedFiles
 * @param {object} [opts]
 * @returns {object}
 */
function checkArtefacts(celulaPath, expectedFiles, opts) {
  const options = opts || {};
  const start = _now();

  if (typeof celulaPath !== 'string' || celulaPath.length === 0) {
    const err = new Error(
      'post-condition-checker: celulaPath obrigatorio.'
    );
    err.code = 'POST_CONDITION_CELL_PATH_MISSING';
    throw err;
  }

  if (!Array.isArray(expectedFiles)) {
    const err = new Error(
      'post-condition-checker: expectedFiles deve ser um array.'
    );
    err.code = 'POST_CONDITION_EXPECTED_INVALID';
    throw err;
  }

  const phase =
    typeof options.phase === 'number' && Number.isFinite(options.phase)
      ? options.phase
      : null;
  const gateId = options.gateId || 'post-condition-checker';
  const allowEmptyDir = options.allowEmptyDir === true;

  const present = [];
  const missing = [];

  for (const relPath of expectedFiles) {
    const out = _checkOne(celulaPath, relPath, allowEmptyDir, phase);
    if (out.ok) {
      present.push(relPath);
    } else {
      missing.push({ path: relPath, message: out.message });
    }
  }

  const verdict = missing.length === 0 ? VERDICTS.PASS : VERDICTS.FAIL;
  const durationMs = _msSince(start);

  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: celulaPath,
    phase: phase,
    verdict: verdict,
    missing_count: missing.length,
    present_count: present.length,
    durationMs: durationMs,
  });

  return {
    verdict: verdict,
    missing: missing,
    present: present,
    phase: phase,
    durationMs: durationMs,
  };
}

module.exports = {
  checkArtefacts: checkArtefacts,
  VERDICTS: VERDICTS,
  // Exposed for tests.
  _formatMissingMessage: _formatMissingMessage,
};
