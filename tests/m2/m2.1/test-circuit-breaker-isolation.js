'use strict';

// AC 2 (M2.1-R1 mitigation): per-hook counter independence. Three failures
// in hook A must NOT open the breaker for hook B.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

test('failure counter is isolated per event (AC 2)', () => {
  const tmp = mkTmpLogs('isolation');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    let invocationsB = 0;
    runner.register('HookA', () => {
      throw new Error('A always fails');
    });
    runner.register('HookB', (p) => {
      invocationsB += 1;
      return { b: true, p: p };
    });

    // Open HookA breaker with 3 failures.
    for (let i = 0; i < 3; i += 1) {
      assert.throws(() => runner.dispatch('HookA', { i: i }));
    }
    // 4th HookA dispatch is bypassed (no throw).
    const bypass = runner.dispatch('HookA', { i: 3 });
    assert.strictEqual(bypass.bypassed, true, 'HookA breaker is open');

    // HookB must still work — counter stayed at 0 the entire time.
    assert.strictEqual(
      runner._getFailureCount('HookB'),
      0,
      'HookB counter untouched by HookA failures'
    );
    const result = runner.dispatch('HookB', { x: 1 });
    assert.deepStrictEqual(result, { b: true, p: { x: 1 } });
    assert.strictEqual(invocationsB, 1, 'HookB handler invoked normally');
  } finally {
    rmTmp(tmp);
  }
});
