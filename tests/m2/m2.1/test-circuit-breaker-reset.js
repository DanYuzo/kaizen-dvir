'use strict';

// AC 4 (AC-007): the circuit breaker resets the failure count for a hook
// when its handler succeeds after one or more failures. The next failure
// starts counting from 1.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

test('success after failures resets the counter to zero (AC 4)', () => {
  const tmp = mkTmpLogs('reset');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    let mode = 'fail';
    runner.register('UserPromptSubmit', (p) => {
      if (mode === 'fail') {
        throw new Error('planned failure');
      }
      return { ok: true, p: p };
    });

    // 2 failures — counter should reach 2, NOT triggering bypass (threshold=3).
    assert.throws(() => runner.dispatch('UserPromptSubmit', { n: 1 }));
    assert.throws(() => runner.dispatch('UserPromptSubmit', { n: 2 }));
    assert.strictEqual(
      runner._getFailureCount('UserPromptSubmit'),
      2,
      'counter at 2 after 2 failures'
    );

    // Success — counter resets to 0.
    mode = 'ok';
    const result = runner.dispatch('UserPromptSubmit', { n: 3 });
    assert.deepStrictEqual(result, { ok: true, p: { n: 3 } });
    assert.strictEqual(
      runner._getFailureCount('UserPromptSubmit'),
      0,
      'counter reset to 0 after success'
    );

    // Next failure starts from 1 (not 3).
    mode = 'fail';
    assert.throws(() => runner.dispatch('UserPromptSubmit', { n: 4 }));
    assert.strictEqual(
      runner._getFailureCount('UserPromptSubmit'),
      1,
      'counter restarts at 1 after reset'
    );
  } finally {
    rmTmp(tmp);
  }
});
