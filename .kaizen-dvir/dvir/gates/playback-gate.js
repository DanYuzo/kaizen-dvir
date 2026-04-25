'use strict';

/**
 * playback-gate.js — KaiZen M3.4 Playback Gate.
 *
 * FR-021, FR-027 (Ikigai mutation gating), AC-102 (prereq), Commandment VI.
 *
 * Public contract:
 *
 *   present(artifactSummary, narrative, opts?) -> {
 *     verdict: 'PASS' | 'ADJUST' | 'HALT' | 'AUTO_PASS',
 *     option:  'sim'  | 'ajustar'| 'nao'   | null,
 *     reason?: string,
 *     paused:  boolean,
 *     mode:    'interativo'|'automatico',
 *     critical_invariant: boolean,
 *   }
 *
 * Verdict semantics:
 *   - PASS / option='sim'      → expert approved. Caller advances.
 *   - ADJUST / option='ajustar'→ caller loops back to the collector with
 *                                `reason`. NOT a Quality Gate verdict — it
 *                                is internal control flow.
 *   - HALT / option='nao'      → caller halts. `reason` is registered.
 *   - AUTO_PASS                → auto mode + Quality Gate PASS + phase NOT
 *                                in critical_invariants. No prompt was shown.
 *
 * opts (all optional):
 *   - mode: 'interativo'|'automatico' — explicit override; otherwise read
 *           from mode-engine.getMode(). Defaults to 'interativo' when no
 *           mode is set (safe default — Commandment VI).
 *   - phase: string — phase identifier consulted against critical_invariants.
 *   - cellManifest: object — parsed celula.yaml; consumed by
 *           mode-engine.isCriticalInvariant().
 *   - qualityVerdict: 'PASS'|'CONCERNS'|'FAIL'|'WAIVED' — the upstream
 *           Quality Gate verdict. Required for auto-mode auto-approve.
 *   - prompt: function(narrative, options) -> 'sim'|'ajustar'|'nao'
 *           — caller-supplied prompt. Defaults to a no-op that returns
 *           'sim' (test harnesses inject a deterministic prompt).
 *   - reasonCollector: function(option) -> string
 *           — caller-supplied reason collector for 'ajustar' / 'nao'.
 *   - gateId: string — log correlation id (default 'playback-gate').
 *
 * AC-102 / R-007 mitigation:
 *   In auto mode, the gate consults `mode-engine.isCriticalInvariant(
 *   cellManifest, phase)` BEFORE deciding to auto-approve. When the phase
 *   is critical-invariant the gate ALWAYS pauses and runs the full prompt
 *   path — regardless of mode. This is the single guarantee that protects
 *   Yotzer F1, F2, F10 from silent auto-approve.
 *
 * Logging: every verdict (PASS / ADJUST / HALT / AUTO_PASS) appends a
 * gate-verdicts log entry via the M3.3 logging surface.
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06 — pt-BR for narrative, prompt, halt/adjust
 * messages.
 */

const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const MODE_ENGINE = require('./mode-engine.js');

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

const VERDICTS = Object.freeze({
  PASS: 'PASS',
  ADJUST: 'ADJUST',
  HALT: 'HALT',
  AUTO_PASS: 'AUTO_PASS',
});

const OPTIONS = Object.freeze({
  SIM: 'sim',
  AJUSTAR: 'ajustar',
  NAO: 'nao',
});

// Default no-op prompt — returns 'sim'. Test harnesses inject a real one.
function _defaultPrompt() {
  return OPTIONS.SIM;
}

function _defaultReasonCollector(_option) {
  // Both ADJUST and HALT default to the same placeholder when no real
  // collector is wired (test fixtures only). Production callers always
  // inject a real collector via opts.reasonCollector.
  return 'sem detalhes informados.';
}

/**
 * Render a pt-BR narrative paragraph that summarizes the artifact about
 * to be built. Generic — Yotzer-phase-specific templates ship with the
 * M4 Yotzer cell (Scope OUT).
 *
 * Echoes fields from `artifactSummary` so the narrative drift risk
 * (M3.4-R3) is mitigated: the description always reflects the live
 * artifact, never a cached template.
 *
 * @param {object} artifactSummary { id?, type?, intent?, fields? }
 * @returns {string}
 */
function renderNarrative(artifactSummary) {
  const safe = artifactSummary && typeof artifactSummary === 'object'
    ? artifactSummary
    : {};
  const id = typeof safe.id === 'string' ? safe.id : 'sem-id';
  const type = typeof safe.type === 'string' ? safe.type : 'artefato';
  const intent =
    typeof safe.intent === 'string' && safe.intent.length > 0
      ? safe.intent
      : 'producao de artefato';
  const fieldNames =
    safe.fields && typeof safe.fields === 'object' && !Array.isArray(safe.fields)
      ? Object.keys(safe.fields)
      : [];
  const fieldsLine =
    fieldNames.length > 0
      ? 'campos previstos: ' + fieldNames.join(', ') + '.'
      : 'sem campos detalhados.';
  return (
    'a celula vai criar ' +
    type +
    ' (' +
    id +
    '). objetivo: ' +
    intent +
    '. ' +
    fieldsLine
  );
}

function _logVerdict(entry) {
  try {
    _logWriter().write('gate-verdicts', entry);
  } catch (_) {
    // Defensive — never fail the gate on a log issue.
  }
}

function _buildResult(verdict, option, mode, paused, critical, reason) {
  const out = {
    verdict: verdict,
    option: option,
    paused: paused,
    mode: mode,
    critical_invariant: critical,
  };
  if (reason !== undefined && reason !== null) out.reason = reason;
  return out;
}

/**
 * Public entry — see file header for full contract.
 */
function present(artifactSummary, narrative, opts) {
  const options = opts || {};
  const gateId = options.gateId || 'playback-gate';
  const artifactId =
    (artifactSummary && (artifactSummary.id || artifactSummary.path)) ||
    '<artifact>';

  // Resolve mode. Explicit override > mode-engine.getMode() > default.
  let mode = options.mode;
  if (mode !== 'interativo' && mode !== 'automatico') {
    mode = MODE_ENGINE.getMode() || 'interativo';
  }

  // Critical-invariant lookup — gate ALWAYS runs this even in interactive
  // mode so the result is visible in the verdict log (auditable).
  const critical = MODE_ENGINE.isCriticalInvariant(
    options.cellManifest || {},
    options.phase || ''
  );

  const renderedNarrative =
    typeof narrative === 'string' && narrative.length > 0
      ? narrative
      : renderNarrative(artifactSummary);

  // Auto-approve path: only when mode === automatico AND quality verdict
  // is PASS AND phase is NOT critical-invariant. Anything else falls
  // through to the prompt path. This is the AC-102 guarantee.
  if (
    mode === 'automatico' &&
    options.qualityVerdict === 'PASS' &&
    critical === false
  ) {
    const result = _buildResult(VERDICTS.AUTO_PASS, null, mode, false, false, null);
    _logVerdict({
      timestamp: new Date().toISOString(),
      event_type: 'gate',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactId,
      verdict: 'PASS',
      mode: mode,
      critical_invariant: false,
      auto_approved: true,
      narrative: renderedNarrative,
    });
    return result;
  }

  // Prompt path. We pause the workflow and run the caller-supplied prompt.
  const promptFn = typeof options.prompt === 'function' ? options.prompt : _defaultPrompt;
  const reasonFn =
    typeof options.reasonCollector === 'function'
      ? options.reasonCollector
      : _defaultReasonCollector;

  const choice = promptFn(renderedNarrative, {
    options: [OPTIONS.SIM, OPTIONS.AJUSTAR, OPTIONS.NAO],
    artifactSummary: artifactSummary,
    mode: mode,
    critical_invariant: critical,
  });

  let verdict;
  let option;
  let reason = null;

  if (choice === OPTIONS.SIM) {
    verdict = VERDICTS.PASS;
    option = OPTIONS.SIM;
  } else if (choice === OPTIONS.AJUSTAR) {
    verdict = VERDICTS.ADJUST;
    option = OPTIONS.AJUSTAR;
    reason = reasonFn(OPTIONS.AJUSTAR) || 'sem detalhes.';
  } else if (choice === OPTIONS.NAO) {
    verdict = VERDICTS.HALT;
    option = OPTIONS.NAO;
    reason = reasonFn(OPTIONS.NAO) || 'sem detalhes.';
  } else {
    // Unknown choice — coerce to HALT for safety (Commandment VI).
    verdict = VERDICTS.HALT;
    option = OPTIONS.NAO;
    reason = 'resposta nao reconhecida. consideramos como nao.';
  }

  const result = _buildResult(verdict, option, mode, true, critical, reason);

  // Log path — only PASS goes through as a Quality Gate verdict; ADJUST
  // and HALT are control flow but we still record them for auditability.
  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: artifactId,
    verdict: verdict === VERDICTS.PASS ? 'PASS' : verdict,
    mode: mode,
    critical_invariant: critical,
    option: option,
    reason: reason || undefined,
    narrative: renderedNarrative,
  });

  return result;
}

module.exports = {
  present: present,
  renderNarrative: renderNarrative,
  VERDICTS: VERDICTS,
  OPTIONS: OPTIONS,
};
