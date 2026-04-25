'use strict';

/**
 * quality-gate.js — KaiZen Quality Gate engine (FR-006, FR-019, FR-023,
 * AC-202, AC-206, AC-207, NFR-006, M3.3).
 *
 * Public contract (FROZEN — consumed by M3.4 gate types and M4 Yotzer
 * cells. Any change is breaking — see story M3.3 Dev Notes.):
 *
 *   evaluate(artifact, criteria, options?) -> {
 *     verdict: 'PASS' | 'CONCERNS' | 'FAIL' | 'WAIVED',
 *     criteria_results: Array<{
 *       id: string, severity: 'critical'|'high'|'medium'|'low',
 *       passed: boolean, message: string|null, durationMs: number,
 *       skipped?: boolean, manualPending?: boolean
 *     }>,
 *     issues: Array<{ id?: string, severity: string, message: string }>,
 *     iterations?: number,
 *     waiver_ref?: string
 *   }
 *
 * Decision rule (PRD §07):
 *   - WAIVED: a valid expert waiver supplied via `options.waiver` resolves
 *             a FAIL into WAIVED. Validation goes through
 *             `gates/waiver.js#validateWaiver`. NON-NEGOTIABLE waivers are
 *             rejected at validation time and the verdict stays FAIL.
 *   - PASS: every critical and high criterion passes (and no critical/high
 *           was skipped due to budget exhaustion).
 *   - CONCERNS: medium fails, OR high fails after Self-Healing exhausts
 *               (signalled via `options.selfHealingExhausted: true`).
 *   - FAIL: any critical fails, OR high fails during dev (default), OR a
 *           critical/high criterion was skipped due to the 30s budget, OR
 *           the executor-judge invariant or change-log guard rejected the
 *           call.
 *
 * Severity enum: 'critical' | 'high' | 'medium' | 'low'. Unknown severities
 * raise FAIL with an explicit pt-BR issue (Risk M3.3-R1 mitigation).
 *
 * 30-second budget (NFR-006): the engine measures cumulative wall time of
 * automated criteria via `process.hrtime.bigint()` (monotonic, suspend-
 * resilient — Risk M3.3-R2 mitigation). Once the budget is exceeded
 * remaining criteria are NOT executed; they are returned as `skipped: true`
 * and a budget-timeout issue is appended.
 *
 * Manual criteria (`check: 'manual'`): the engine does NOT execute manual
 * checks. They are returned with `manualPending: true` and a PENDING_MANUAL
 * issue is appended; the M4 checklist runner resolves them.
 *
 * Logging: every verdict is appended via `log-writer.write('gate-verdicts',
 * entry)` with the M2.1 required fields (timestamp, event_type, hook_name,
 * session_id) plus the M3.3 extension (gate_id, artifact_id, verdict,
 * iterations, waiver_ref).
 *
 * Integration:
 *   - `executor-judge-validator.validateSeparation` runs BEFORE criteria
 *     when `options.executor` and `options.judge` are supplied. Violation
 *     short-circuits to FAIL.
 *   - `change-log-guard.check(artifactPath)` runs when the artifact carries
 *     a `## Change Log` section (detected via `artifact.path` + filesystem
 *     read or via `artifact.content` containing the heading). Violation =
 *     FAIL (AC-207).
 *
 * CON-002 CommonJS / ES2022. CON-003 stdlib only.
 */

const fs = require('node:fs');

const logWriter = require('../hooks/log-writer');
const ejValidator = require('./executor-judge-validator');
const waiverModule = require('./waiver');
const changeLogGuard = require('../memory/change-log-guard');

const SEVERITY_ENUM = Object.freeze(['critical', 'high', 'medium', 'low']);
const BUDGET_MS_DEFAULT = 30 * 1000; // NFR-006
const VERDICTS = Object.freeze({
  PASS: 'PASS',
  CONCERNS: 'CONCERNS',
  FAIL: 'FAIL',
  WAIVED: 'WAIVED',
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

function _hasChangeLogSection(content) {
  return /^##\s+Change\s+Log\s*$/im.test(content || '');
}

function _logVerdict(entry) {
  try {
    logWriter.write('gate-verdicts', entry);
  } catch (_) {
    // Defensive: never let a log-writer failure poison the gate response.
    // The verdict itself is returned to the caller regardless.
  }
}

/**
 * Execute one criterion. Wraps the criterion function with timing and
 * normalises its return shape.
 *
 * Criterion contract:
 *   {
 *     id: string,
 *     severity: 'critical'|'high'|'medium'|'low',
 *     check: 'automated' | 'manual',
 *     run?: (artifact) => boolean | { passed: boolean, message?: string }
 *   }
 */
function _runCriterion(criterion, artifact) {
  const start = _now();
  let passed = false;
  let message = null;
  try {
    const out =
      typeof criterion.run === 'function' ? criterion.run(artifact) : false;
    if (typeof out === 'boolean') {
      passed = out;
      message = out ? null : 'criterio falhou sem mensagem detalhada.';
    } else if (out && typeof out === 'object') {
      passed = out.passed === true;
      message = out.message || null;
    } else {
      passed = false;
      message = 'criterio retornou valor invalido.';
    }
  } catch (err) {
    passed = false;
    message =
      'erro ao avaliar criterio: ' +
      (err && err.message ? err.message : String(err));
  }
  return {
    id: criterion.id,
    severity: criterion.severity,
    passed: passed,
    message: passed ? null : message,
    durationMs: _msSince(start),
  };
}

function _validateCriterion(criterion, results, issues) {
  if (!criterion || typeof criterion !== 'object') {
    issues.push({
      severity: 'critical',
      message: 'criterio invalido: esperado objeto com id e severity.',
    });
    return false;
  }
  if (typeof criterion.id !== 'string' || criterion.id.length === 0) {
    issues.push({
      severity: 'critical',
      message: 'criterio sem id. AC-202 exige id por criterio.',
    });
    return false;
  }
  if (!SEVERITY_ENUM.includes(criterion.severity)) {
    issues.push({
      id: criterion.id,
      severity: 'critical',
      message:
        'severidade invalida em ' +
        criterion.id +
        ': "' +
        criterion.severity +
        '". valores aceitos: ' +
        SEVERITY_ENUM.join(', ') +
        '.',
    });
    results.push({
      id: criterion.id,
      severity: 'critical',
      passed: false,
      message: 'severidade invalida.',
      durationMs: 0,
    });
    return false;
  }
  return true;
}

function _decide(criteriaResults, options) {
  const exhausted = options && options.selfHealingExhausted === true;
  let anyCritical = false;
  let anyHigh = false;
  let anyMedium = false;
  let anySkippedCriticalOrHigh = false;
  for (const r of criteriaResults) {
    if (r.skipped && (r.severity === 'critical' || r.severity === 'high')) {
      anySkippedCriticalOrHigh = true;
    }
    if (r.passed || r.skipped || r.manualPending) continue;
    if (r.severity === 'critical') anyCritical = true;
    if (r.severity === 'high') anyHigh = true;
    if (r.severity === 'medium') anyMedium = true;
  }
  if (anyCritical) return VERDICTS.FAIL;
  if (anySkippedCriticalOrHigh) return VERDICTS.FAIL;
  if (anyHigh) return exhausted ? VERDICTS.CONCERNS : VERDICTS.FAIL;
  if (anyMedium) return VERDICTS.CONCERNS;
  return VERDICTS.PASS;
}

/**
 * Public entry point. See file header for the full contract.
 *
 * @param {object} artifact { id?, path?, content?, ... }
 * @param {Array<object>} criteria see _runCriterion contract.
 * @param {object} [options] { executor, judge, waiver, iterations,
 *                            selfHealingExhausted, gateId }
 * @returns {object}
 */
function evaluate(artifact, criteria, options) {
  const opts = options || {};
  const startWall = _now();
  const results = [];
  const issues = [];

  const gateId = opts.gateId || 'quality-gate';
  const artifactId =
    (artifact && (artifact.id || artifact.path)) || '<artifact>';

  // 1. Executor-≠-Judge invariant — runs BEFORE criteria.
  if (opts.executor !== undefined || opts.judge !== undefined) {
    const sep = ejValidator.validateSeparation(opts.executor, opts.judge);
    if (!sep.valid) {
      issues.push({
        severity: 'critical',
        message: sep.reason,
      });
      const out = {
        verdict: VERDICTS.FAIL,
        criteria_results: results,
        issues: issues,
      };
      _logVerdict({
        timestamp: new Date().toISOString(),
        event_type: 'gate',
        hook_name: gateId,
        session_id: _sessionId(),
        gate_id: gateId,
        artifact_id: artifactId,
        verdict: out.verdict,
        iterations: opts.iterations || 0,
        durationMs: _msSince(startWall),
      });
      return out;
    }
  }

  // 2. Change-log-guard integration (AC-207, FR-023).
  let content = artifact && typeof artifact.content === 'string'
    ? artifact.content
    : null;
  if (
    content === null &&
    artifact &&
    typeof artifact.path === 'string' &&
    fs.existsSync(artifact.path)
  ) {
    try {
      content = fs.readFileSync(artifact.path, 'utf8');
    } catch (_) {
      content = null;
    }
  }
  if (content !== null && _hasChangeLogSection(content)) {
    if (artifact.path && fs.existsSync(artifact.path)) {
      const guardOut = changeLogGuard.check(artifact.path);
      if (!guardOut.valid) {
        for (const v of guardOut.violations) {
          issues.push({
            severity: 'critical',
            message:
              'Change Log append-only violado (linha ' +
              v.line +
              '): ' +
              v.reason +
              ' AC-207 / FR-023.',
          });
        }
        const out = {
          verdict: VERDICTS.FAIL,
          criteria_results: results,
          issues: issues,
        };
        _logVerdict({
          timestamp: new Date().toISOString(),
          event_type: 'gate',
          hook_name: gateId,
          session_id: _sessionId(),
          gate_id: gateId,
          artifact_id: artifactId,
          verdict: out.verdict,
          iterations: opts.iterations || 0,
          durationMs: _msSince(startWall),
        });
        return out;
      }
    }
  }

  // 3. Iterate criteria with the 30s automated budget.
  const budgetMs =
    typeof opts.budgetMs === 'number' && opts.budgetMs > 0
      ? opts.budgetMs
      : BUDGET_MS_DEFAULT;
  let budgetExhausted = false;
  const list = Array.isArray(criteria) ? criteria : [];

  for (const c of list) {
    if (!_validateCriterion(c, results, issues)) {
      continue;
    }

    if (c.check === 'manual') {
      results.push({
        id: c.id,
        severity: c.severity,
        passed: false,
        message: 'criterio manual pendente.',
        durationMs: 0,
        manualPending: true,
      });
      issues.push({
        id: c.id,
        severity: c.severity,
        message:
          'criterio manual pendente: ' +
          c.id +
          '. checklist runner sera invocado em M4.',
      });
      continue;
    }

    if (budgetExhausted) {
      results.push({
        id: c.id,
        severity: c.severity,
        passed: false,
        message: 'criterio nao avaliado: orcamento de 30s esgotado.',
        durationMs: 0,
        skipped: true,
      });
      continue;
    }

    const r = _runCriterion(c, artifact);
    results.push(r);

    if (!r.passed) {
      issues.push({
        id: c.id,
        severity: c.severity,
        message: r.message || 'criterio falhou.',
      });
    }

    // Severity 'low' is log-only. We still record the result but never let
    // it affect the verdict; _decide() ignores low fails by construction.

    const elapsed = _msSince(startWall);
    if (elapsed >= budgetMs) {
      budgetExhausted = true;
    }
  }

  if (budgetExhausted) {
    issues.push({
      severity: 'critical',
      message:
        'Quality Gate excedeu orcamento de 30 segundos. NFR-006. criterios restantes ignorados.',
    });
  }

  // 4. Decide verdict.
  let verdict = _decide(results, opts);

  // 5. Waiver resolution (FAIL -> WAIVED if a valid expert waiver is given).
  let waiverRef = null;
  if (verdict === VERDICTS.FAIL && opts.waiver) {
    const v = waiverModule.validateWaiver(opts.waiver);
    if (v.valid) {
      verdict = VERDICTS.WAIVED;
      waiverRef =
        opts.waiver.waiver_ref ||
        (opts.waiver.date ? 'waiver-' + opts.waiver.date : 'waiver-anonymous');
    } else {
      issues.push({
        severity: 'critical',
        message: v.reason,
      });
    }
  }

  const out = {
    verdict: verdict,
    criteria_results: results,
    issues: issues,
  };
  if (typeof opts.iterations === 'number') {
    out.iterations = opts.iterations;
  }
  if (waiverRef) {
    out.waiver_ref = waiverRef;
  }

  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: artifactId,
    verdict: verdict,
    iterations: opts.iterations || 0,
    waiver_ref: waiverRef || undefined,
    durationMs: _msSince(startWall),
  });

  return out;
}

module.exports = {
  evaluate: evaluate,
  VERDICTS: VERDICTS,
  SEVERITY_ENUM: SEVERITY_ENUM,
  BUDGET_MS_DEFAULT: BUDGET_MS_DEFAULT,
};
