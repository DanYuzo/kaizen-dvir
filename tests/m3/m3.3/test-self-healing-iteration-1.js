'use strict';

// AC 4, 5: Self-Healing terminates at iteration 1 — FAIL -> auto_fix -> PASS.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  mkTmpLogs,
  rmTmp,
  requireFreshGate,
  makeScriptedExecutor,
  makeScriptedGate,
} = require('./_helpers');

test('Self-Healing terminates at iteration 1 when fix yields PASS', () => {
  const tmp = mkTmpLogs('healing-iter-1');
  try {
    const sh = requireFreshGate('self-healing.js');
    const executor = makeScriptedExecutor();
    // Initial verdict: FAIL with critical issue. Iteration 1 verdict: PASS.
    const gate = makeScriptedGate([
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'erro inicial' }],
      },
      { verdict: 'PASS', issues: [] },
    ]);
    const result = sh.run(executor, { id: 'art-iter1' }, gate, {
      maxIterations: 2,
    });
    assert.strictEqual(result.finalVerdict, 'PASS');
    assert.strictEqual(result.iterations, 1);
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(result.escalationTrigger, null);
    assert.strictEqual(executor.callCount(), 1, 'executor invoked once');
    assert.strictEqual(result.history.length, 2);
  } finally {
    rmTmp(tmp);
  }
});
