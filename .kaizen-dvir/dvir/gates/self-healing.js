'use strict';

/**
 * self-healing.js — Self-Healing Loop (FR-007, AC-204, R-013, M3.3).
 *
 * Public contract (FROZEN — consumed by M4 Yotzer cells before escalating
 * to the expert. Any signature change is breaking.):
 *
 *   run(executor, artifact, gate, options?) -> {
 *     finalVerdict: 'PASS' | 'CONCERNS' | 'FAIL' | 'WAIVED',
 *     iterations: number,
 *     escalated: boolean,
 *     escalationTrigger: 'max_iterations_reached'|'verdict_blocked'|
 *                       'fix_failure'|'manual_escalate'|null,
 *     history: Array<{ iteration: number, verdict: string,
 *                      issues: Array, durationMs: number }>,
 *     escalationMessage: string|null
 *   }
 *
 * Cooperation contract with the executor sub-agent (cells implement this):
 *   executor.invoke({ artifact, previousVerdict, issues })
 *     -> { revisedArtifact: <object> }
 *
 *   The loop NEVER fixes the artifact itself — it is the orchestrator, not
 *   the author. This separation is what bounds the loop at 2 iterations
 *   (KZ-M3-R3 mitigation).
 *
 * Bounds (PRD §07 Self-Healing config):
 *   - max_iterations: 2 (default; configurable via `options.maxIterations`)
 *   - timeout_minutes: 30 per iteration (default; configurable via
 *     `options.timeoutMs`). Measured by `process.hrtime.bigint()` for
 *     monotonic deltas (Risk M3.3-R2 mitigation).
 *   - severity_filter: ['critical', 'high'] (default). Issues OUTSIDE the
 *     filter never enter the loop.
 *
 * Severity behaviour (PRD §07):
 *   - critical -> auto_fix on every iteration up to maxIterations
 *   - high     -> auto_fix while iteration < maxIterations, otherwise
 *                 document_as_concern (passes selfHealingExhausted=true to
 *                 the gate so the verdict softens to CONCERNS)
 *   - medium   -> document_as_concern (no retry; loop bypassed)
 *   - low      -> ignore (loop bypassed)
 *
 * Escalation triggers (exact set per PRD §07 line 161-164):
 *   max_iterations_reached, verdict_blocked, fix_failure, manual_escalate
 *
 * Escalation log: every escalation appends a YAML-shaped entry to
 * `.kaizen/logs/gate-verdicts/` via `log-writer` with the full iteration
 * history; a pt-BR escalation message is returned to the caller for
 * surfacing to the expert.
 *
 * CON-002 CommonJS / ES2022. CON-003 stdlib only.
 */

const logWriter = require('../hooks/log-writer');

const DEFAULTS = Object.freeze({
  maxIterations: 2,
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  severityFilter: Object.freeze(['critical', 'high']),
});

const TRIGGERS = Object.freeze({
  MAX_ITERATIONS: 'max_iterations_reached',
  VERDICT_BLOCKED: 'verdict_blocked',
  FIX_FAILURE: 'fix_failure',
  MANUAL_ESCALATE: 'manual_escalate',
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

function _hasRetryableIssue(verdict, severityFilter) {
  if (!verdict || !Array.isArray(verdict.issues)) return false;
  for (const issue of verdict.issues) {
    if (severityFilter.includes(issue.severity)) return true;
  }
  return false;
}

function _hasMaxSeverity(verdict, severity) {
  if (!verdict || !Array.isArray(verdict.issues)) return false;
  return verdict.issues.some((i) => i.severity === severity);
}

function _logEscalation(entry) {
  try {
    logWriter.write('gate-verdicts', entry);
  } catch (_) {
    // Defensive: never let log-writer poison escalation flow.
  }
}

function _ptBrEscalationMessage(trigger, history, artifactId) {
  // history[0] is the initial verdict; subsequent entries are retry attempts.
  const retries = history.length > 0 ? history.length - 1 : 0;
  const aId = artifactId || '<artifact>';
  if (trigger === TRIGGERS.MAX_ITERATIONS) {
    return (
      'self-healing esgotou ' +
      retries +
      ' tentativas. artefato: ' +
      aId +
      '. historico em .kaizen/logs/gate-verdicts/.'
    );
  }
  if (trigger === TRIGGERS.FIX_FAILURE) {
    return 'iteracao excedeu o orcamento de tempo. escalando ao expert.';
  }
  if (trigger === TRIGGERS.VERDICT_BLOCKED) {
    return (
      'gate retornou verdict bloqueado. escalando ao expert. artefato: ' +
      aId +
      '.'
    );
  }
  if (trigger === TRIGGERS.MANUAL_ESCALATE) {
    return (
      'escalonamento manual solicitado. artefato: ' +
      aId +
      '. historico preservado em .kaizen/logs/gate-verdicts/.'
    );
  }
  return 'self-healing escalado ao expert.';
}

/**
 * Wrap the executor invocation with a per-iteration timeout. Uses
 * monotonic clock deltas to detect overruns. Returns either the executor
 * result, or `{ timedOut: true }` when the deadline elapses before the
 * executor returns.
 */
function _invokeWithTimeout(executor, payload, timeoutMs) {
  // The executor contract is synchronous in MVP scope — long-running async
  // executors are out of scope for M3.3 (Yotzer cells in M4 wrap their own
  // long ops). We measure time across the call and report `fix_failure` if
  // the synchronous call already exceeded the budget.
  const start = _now();
  let result = null;
  let threw = null;
  try {
    result = executor.invoke(payload);
  } catch (err) {
    threw = err;
  }
  const elapsed = _msSince(start);
  if (elapsed > timeoutMs) {
    return { timedOut: true, elapsed: elapsed };
  }
  if (threw) {
    return { error: threw, elapsed: elapsed };
  }
  return { result: result, elapsed: elapsed };
}

function _runGate(gate, artifact, opts) {
  if (!gate || typeof gate.evaluate !== 'function') {
    throw new Error(
      'self-healing: gate inválido. esperado objeto com evaluate().'
    );
  }
  return gate.evaluate(artifact, opts && opts.criteria, opts);
}

/**
 * Public entry point. See file header for the full contract.
 *
 * @param {{ invoke: function }} executor
 * @param {object} artifact
 * @param {object} gate must expose `evaluate(artifact, criteria, options)`
 * @param {object} [options]
 *   - maxIterations  (default 2)
 *   - timeoutMs      (default 30 * 60 * 1000)
 *   - severityFilter (default ['critical', 'high'])
 *   - criteria       (forwarded to gate.evaluate)
 *   - manualEscalate (boolean)
 *   - gateId         (string)
 *   - initialVerdict (object) — optional precomputed initial verdict to
 *                              skip the first gate call (used by tests)
 * @returns {object}
 */
function run(executor, artifact, gate, options) {
  const opts = options || {};
  const maxIterations =
    typeof opts.maxIterations === 'number' && opts.maxIterations >= 0
      ? opts.maxIterations
      : DEFAULTS.maxIterations;
  const timeoutMs =
    typeof opts.timeoutMs === 'number' && opts.timeoutMs > 0
      ? opts.timeoutMs
      : DEFAULTS.timeoutMs;
  const severityFilter = Array.isArray(opts.severityFilter)
    ? opts.severityFilter
    : DEFAULTS.severityFilter;
  const gateId = opts.gateId || 'self-healing';
  const artifactId =
    (artifact && (artifact.id || artifact.path)) || '<artifact>';

  const history = [];
  let currentArtifact = artifact;

  // Manual-escalate short-circuit.
  if (opts.manualEscalate === true) {
    const trigger = TRIGGERS.MANUAL_ESCALATE;
    const msg = _ptBrEscalationMessage(trigger, history, artifactId);
    _logEscalation({
      timestamp: new Date().toISOString(),
      event_type: 'gate-escalation',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactId,
      verdict: 'FAIL',
      iterations: 0,
      escalation_trigger: trigger,
      message: msg,
    });
    return {
      finalVerdict: 'FAIL',
      iterations: 0,
      escalated: true,
      escalationTrigger: trigger,
      history: history,
      escalationMessage: msg,
    };
  }

  // Initial gate evaluation (or use a precomputed verdict).
  const initial =
    opts.initialVerdict ||
    _runGate(gate, currentArtifact, {
      criteria: opts.criteria,
      iterations: 0,
      gateId: gateId,
    });
  history.push({
    iteration: 0,
    verdict: initial.verdict,
    issues: initial.issues || [],
    durationMs: 0,
  });

  // If initial verdict is already PASS / CONCERNS / WAIVED, no loop.
  if (initial.verdict !== 'FAIL') {
    return {
      finalVerdict: initial.verdict,
      iterations: 0,
      escalated: false,
      escalationTrigger: null,
      history: history,
      escalationMessage: null,
    };
  }

  // Severity filter — issues outside the filter mean the loop has nothing
  // to retry. Verdict is FAIL but no auto-fix is possible.
  if (!_hasRetryableIssue(initial, severityFilter)) {
    const trigger = TRIGGERS.VERDICT_BLOCKED;
    const msg = _ptBrEscalationMessage(trigger, history, artifactId);
    _logEscalation({
      timestamp: new Date().toISOString(),
      event_type: 'gate-escalation',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactId,
      verdict: 'FAIL',
      iterations: 0,
      escalation_trigger: trigger,
      message: msg,
      history: history,
    });
    return {
      finalVerdict: 'FAIL',
      iterations: 0,
      escalated: true,
      escalationTrigger: trigger,
      history: history,
      escalationMessage: msg,
    };
  }

  let lastVerdict = initial;

  for (let i = 1; i <= maxIterations; i++) {
    // Cooperate with executor — pass previous verdict + issues.
    const callStart = _now();
    const callOut = _invokeWithTimeout(
      executor,
      {
        artifact: currentArtifact,
        previousVerdict: lastVerdict,
        issues: lastVerdict.issues || [],
      },
      timeoutMs
    );
    const callMs = _msSince(callStart);

    if (callOut.timedOut || callOut.error) {
      const trigger = TRIGGERS.FIX_FAILURE;
      const msg = _ptBrEscalationMessage(trigger, history, artifactId);
      history.push({
        iteration: i,
        verdict: 'FAIL',
        issues: [
          {
            severity: 'critical',
            message: callOut.timedOut
              ? 'executor excedeu timeout de ' + timeoutMs + 'ms.'
              : 'executor lancou erro: ' +
                (callOut.error && callOut.error.message
                  ? callOut.error.message
                  : String(callOut.error)),
          },
        ],
        durationMs: callMs,
      });
      _logEscalation({
        timestamp: new Date().toISOString(),
        event_type: 'gate-escalation',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'FAIL',
        iterations: i,
        escalation_trigger: trigger,
        message: msg,
        history: history,
      });
      return {
        finalVerdict: 'FAIL',
        iterations: i,
        escalated: true,
        escalationTrigger: trigger,
        history: history,
        escalationMessage: msg,
      };
    }

    // Apply revised artifact.
    if (
      callOut.result &&
      typeof callOut.result === 'object' &&
      callOut.result.revisedArtifact
    ) {
      currentArtifact = callOut.result.revisedArtifact;
    }

    // Re-evaluate.
    const evalStart = _now();
    const reEval = _runGate(gate, currentArtifact, {
      criteria: opts.criteria,
      iterations: i,
      gateId: gateId,
      // High issues soften to CONCERNS only after the FINAL iteration.
      selfHealingExhausted: i === maxIterations,
    });
    const evalMs = _msSince(evalStart);
    history.push({
      iteration: i,
      verdict: reEval.verdict,
      issues: reEval.issues || [],
      durationMs: callMs + evalMs,
    });

    // Success terminations.
    if (
      reEval.verdict === 'PASS' ||
      reEval.verdict === 'CONCERNS' ||
      reEval.verdict === 'WAIVED'
    ) {
      return {
        finalVerdict: reEval.verdict,
        iterations: i,
        escalated: false,
        escalationTrigger: null,
        history: history,
        escalationMessage: null,
      };
    }

    lastVerdict = reEval;

    // If only HIGH issues remain after the final iteration the gate has
    // already softened to CONCERNS via selfHealingExhausted=true, so we
    // wouldn't reach this branch. If we are here at i === maxIterations
    // the verdict is FAIL (critical fail or hard rejection) and we
    // escalate.
    if (i === maxIterations) {
      // After the final iteration we always escalate via MAX_ITERATIONS.
      // The HIGH-only path already softens to CONCERNS via
      // `selfHealingExhausted=true` and exits earlier (the
      // `reEval.verdict !== 'FAIL'` branch above), so reaching here implies
      // a persistent FAIL.
      const trigger = TRIGGERS.MAX_ITERATIONS;
      const msg = _ptBrEscalationMessage(trigger, history, artifactId);
      _logEscalation({
        timestamp: new Date().toISOString(),
        event_type: 'gate-escalation',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: 'FAIL',
        iterations: i,
        escalation_trigger: trigger,
        message: msg,
        history: history,
      });
      return {
        finalVerdict: 'FAIL',
        iterations: i,
        escalated: true,
        escalationTrigger: trigger,
        history: history,
        escalationMessage: msg,
      };
    }
  }

  // Unreachable, but keeps TypeScript-style exhaustiveness happy.
  return {
    finalVerdict: lastVerdict.verdict,
    iterations: maxIterations,
    escalated: true,
    escalationTrigger: TRIGGERS.MAX_ITERATIONS,
    history: history,
    escalationMessage: _ptBrEscalationMessage(
      TRIGGERS.MAX_ITERATIONS,
      history,
      artifactId
    ),
  };
}

module.exports = {
  run: run,
  DEFAULTS: DEFAULTS,
  TRIGGERS: TRIGGERS,
};
