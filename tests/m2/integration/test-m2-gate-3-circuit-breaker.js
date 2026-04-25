'use strict';

// M2 Gate Criterion 3 (Epic KZ-M2 § Gate Criteria):
// A hook failure (simulated crash) enters bypass-and-log after 3
// consecutive failures without blocking the expert. Register a crashing
// handler on one event, dispatch 4 times, assert bypass sentinel on the
// 4th dispatch (never throws, never blocks), and confirm the other 2
// hooks are isolated (their counters stay at 0).

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, freshRunner } = require('./_helpers');

test('M2 Gate 3: 3-failure sequence triggers bypass-and-log; expert never blocked', () => {
  const tmp = mkTmp('gate3');
  try {
    const runner = freshRunner();

    // Crashing handler on UserPromptSubmit — isolated failure, other events
    // stay healthy (M2.1 isolation contract).
    let calls = 0;
    runner.register('UserPromptSubmit', () => {
      calls++;
      throw new Error('simulated UPS crash');
    });
    runner.register('PreToolUse', () => ({ verdict: 'PASS' }));
    runner.register('PreCompact', () => ({ verdict: 'PASS' }));

    // Three failures — each throws; counter increments to 3.
    for (let i = 1; i <= 3; i++) {
      assert.throws(
        () => runner.dispatch('UserPromptSubmit', { i: i }),
        /simulated UPS crash/,
        'failure ' + i + ' must throw the handler error'
      );
    }
    assert.strictEqual(calls, 3, 'handler invoked exactly 3 times');
    assert.strictEqual(runner._getFailureCount('UserPromptSubmit'), 3);

    // Fourth dispatch — breaker OPEN. MUST NOT throw. MUST NOT invoke
    // the handler. MUST return the documented bypass sentinel.
    const bypassed = runner.dispatch('UserPromptSubmit', { i: 4 });
    assert.strictEqual(calls, 3, 'handler must not be invoked on bypass');
    assert.deepStrictEqual(bypassed, {
      bypassed: true,
      event: 'UserPromptSubmit',
      reason: 'circuit_breaker_open',
    });

    // Isolation: the other two hooks still run normally.
    assert.deepStrictEqual(runner.dispatch('PreToolUse', {}), { verdict: 'PASS' });
    assert.deepStrictEqual(runner.dispatch('PreCompact', {}), { verdict: 'PASS' });
    assert.strictEqual(runner._getFailureCount('PreToolUse'), 0);
    assert.strictEqual(runner._getFailureCount('PreCompact'), 0);
  } finally {
    rmTmp(tmp);
  }
});
