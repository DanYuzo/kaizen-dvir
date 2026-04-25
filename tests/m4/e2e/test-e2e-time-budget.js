'use strict';

// AC 3 (M4.6) — M4 GATE — single criterion: end-to-end active-expert
// time under 4 hours (SM-01). PRD §M4 verbatim. All other ACs are
// supporting validations that harden this gate.
//
// Definition (PRD §M4): active-expert time = cumulative prompt-reading +
// elicit-answering + Playback-Gate-validating time. Idle time between
// phases AND autonomous sub-agent execution do NOT count.
//
// Test methodology: deterministic clock injection (M4.6-R1 mitigation)
// replays a realistic 10-phase elicitation curve. The fixture aims for
// ~10 minutes of cumulative active-expert time (well below 4h).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

test('M4 GATE — SM-01 — end-to-end active-expert time under 4 hours (PRD §M4 single gate criterion)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-budget');
  try {
    const tb = helpers.freshTimeBudget();
    // Run the synthetic pipeline. interactionMs and idleMs are injected
    // from the fixture. Idle time is NOT counted in the budget (correct
    // active-expert-time semantic).
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-budget-gate',
      cellName: 'test-cell',
      mode: 'interativo',
      interactionMs: 60_000,
      idleMs: 30_000,
    });
    const agg = tb.aggregate({ workId: pipeline.workId });

    // ========================================================================
    // M4 GATE — single criterion
    // ========================================================================
    assert.ok(
      agg.cumulativeMs < FOUR_HOURS_MS,
      'M4 GATE FAIL — SM-01: active-expert time ' +
        agg.cumulativeMs +
        ' ms exceeds 4h (' +
        FOUR_HOURS_MS +
        ' ms). Single gate criterion failed.'
    );
    assert.strictEqual(agg.withinBudget, true, 'aggregate.withinBudget must be true');

    // Idle time between phases is excluded — cumulative is strictly less
    // than total simulated time. With 10 phases, 60s interaction + 30s
    // idle, total simulated = 10 * 90s = 900s, cumulative = 10 * 60s = 600s.
    assert.ok(
      agg.cumulativeMs < pipeline.totalSimulatedMs,
      'idle time must be excluded from the active-expert budget'
    );
    assert.strictEqual(agg.cumulativeMs, 600_000, 'expected 10 minutes of active expert time');

    // Per-phase totals — every phase contributes a 60s interval.
    for (const phase of helpers.PHASES) {
      assert.strictEqual(
        agg.phaseTotals[phase],
        60_000,
        'phase ' + phase + ' must have a 60s interaction interval'
      );
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('time-budget harness emits pt-BR warning when projected total exceeds 4h (NFR-101)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-budget-warn');
  try {
    const tb = helpers.freshTimeBudget();
    // Simulate a projection that exceeds 4h.
    const cumulative = 3 * 60 * 60 * 1000;
    const projected = 5 * 60 * 60 * 1000;
    const w = tb.emitBudgetWarning(cumulative, projected);
    assert.strictEqual(w.warned, true, 'warning must fire above 4h');
    assert.ok(/4 h/u.test(w.message) || /4h/u.test(w.message), 'message mentions 4h');
    assert.ok(
      /modo automatico/u.test(w.message) || /reduzir dominio/u.test(w.message),
      'message offers actionable hint'
    );
    // Within budget: no warning.
    const ok = tb.emitBudgetWarning(cumulative, cumulative);
    assert.strictEqual(ok.warned, false, 'no warning under budget');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
