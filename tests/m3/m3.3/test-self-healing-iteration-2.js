'use strict';

// AC 4, 5: Self-Healing terminates at iteration 2 — FAIL -> FAIL -> PASS.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  mkTmpLogs,
  rmTmp,
  requireFreshGate,
  makeScriptedExecutor,
  makeScriptedGate,
} = require('./_helpers');

test('Self-Healing terminates at iteration 2 when second fix yields PASS', () => {
  const tmp = mkTmpLogs('healing-iter-2');
  try {
    const sh = requireFreshGate('self-healing.js');
    const executor = makeScriptedExecutor();
    const gate = makeScriptedGate([
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'erro 0' }],
      },
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'erro 1' }],
      },
      { verdict: 'PASS', issues: [] },
    ]);
    const result = sh.run(executor, { id: 'art-iter2' }, gate, {
      maxIterations: 2,
    });
    assert.strictEqual(result.finalVerdict, 'PASS');
    assert.strictEqual(result.iterations, 2);
    assert.strictEqual(result.escalated, false);
    assert.strictEqual(executor.callCount(), 2);
    assert.strictEqual(result.history.length, 3);
  } finally {
    rmTmp(tmp);
  }
});
