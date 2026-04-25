'use strict';

// M3 Gate Criterion 2 (Epic KZ-M3 § Gate Criteria):
//   "Self-Healing Loop runs up to 2 iterations on any FAIL verdict with
//   severity CRITICAL or HIGH; escalates to expert on third attempt with
//   full log of previous attempts."
//
// AC 12, AC-204, FR-007, R-013.
//
// Methodology: seed a CRITICAL FAIL verdict via a stub gate that always
// returns FAIL. Compose with self-healing.run() and a stub executor.
// Assert: history has 3 entries (initial + 2 retries), verdict stays FAIL,
// escalated=true, escalation log appended to .kaizen/logs/gate-verdicts/
// in pt-BR with the iteration history embedded.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const {
  mkSandbox,
  rmSandbox,
  loadSelfHealing,
  readJsonl,
} = require('./_helpers');

function _stubGateAlwaysFail() {
  return {
    evaluate: function () {
      return {
        verdict: 'FAIL',
        criteria_results: [
          {
            id: 'critical-criterion',
            severity: 'critical',
            passed: false,
            message: 'falha critica simulada.',
            durationMs: 1,
          },
        ],
        issues: [
          {
            id: 'critical-criterion',
            severity: 'critical',
            message: 'falha critica simulada.',
          },
        ],
      };
    },
  };
}

function _stubExecutor() {
  return {
    invoke: function (payload) {
      // Always returns the same artifact — the failing gate keeps failing.
      return { revisedArtifact: payload.artifact };
    },
  };
}

test('Gate 2 — Self-Healing runs 2 iterations then escalates on CRITICAL FAIL (AC 12, FR-007)', () => {
  const sb = mkSandbox('gate2-critical');
  try {
    const sh = loadSelfHealing();
    const executor = _stubExecutor();
    const gate = _stubGateAlwaysFail();
    const result = sh.run(executor, { id: 'critical-art' }, gate, {
      maxIterations: 2,
      gateId: 'gate2-quality-stub',
    });
    assert.strictEqual(result.finalVerdict, 'FAIL');
    assert.strictEqual(result.iterations, 2);
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.escalationTrigger, 'max_iterations_reached');
    // history: index 0 is initial verdict, then 2 retry verdicts.
    assert.strictEqual(result.history.length, 3, 'history must contain initial + 2 retries');
    assert.match(result.escalationMessage, /self-healing esgotou/);
    // Escalation log persisted in pt-BR.
    const entries = readJsonl(sb.logs, 'gate-verdicts');
    const escalations = entries.filter((e) => e.event_type === 'gate-escalation');
    assert.ok(escalations.length >= 1, 'at least one escalation log entry written');
    const last = escalations[escalations.length - 1];
    assert.strictEqual(last.escalation_trigger, 'max_iterations_reached');
    assert.ok(Array.isArray(last.history), 'escalation entry includes full history');
    assert.strictEqual(last.iterations, 2);
    assert.match(last.message, /self-healing esgotou/);
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 2 — terminates immediately if first verdict is PASS (no loop)', () => {
  const sb = mkSandbox('gate2-pass');
  try {
    const sh = loadSelfHealing();
    const passGate = {
      evaluate: function () {
        return { verdict: 'PASS', criteria_results: [], issues: [] };
      },
    };
    const result = sh.run(_stubExecutor(), { id: 'pass-art' }, passGate, {
      maxIterations: 2,
    });
    assert.strictEqual(result.finalVerdict, 'PASS');
    assert.strictEqual(result.iterations, 0);
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(result.history.length, 1, 'only the initial verdict in history');
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 2 — recovers when executor fixes the failure on iteration 1', () => {
  const sb = mkSandbox('gate2-recover');
  try {
    const sh = loadSelfHealing();
    let calls = 0;
    const flipGate = {
      evaluate: function () {
        calls += 1;
        if (calls === 1) {
          return {
            verdict: 'FAIL',
            criteria_results: [],
            issues: [{ severity: 'critical', message: 'falha 1' }],
          };
        }
        return { verdict: 'PASS', criteria_results: [], issues: [] };
      },
    };
    const executor = {
      invoke: function (payload) {
        return { revisedArtifact: { id: payload.artifact.id, fixed: true } };
      },
    };
    const result = sh.run(executor, { id: 'recover-art' }, flipGate, {
      maxIterations: 2,
    });
    assert.strictEqual(result.finalVerdict, 'PASS');
    assert.strictEqual(result.iterations, 1);
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(result.history.length, 2);
  } finally {
    rmSandbox(sb);
  }
});
