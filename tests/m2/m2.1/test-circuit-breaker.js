'use strict';

// AC 3 (FR-014, NFR-010, AC-007): after 3 consecutive failures, the 4th
// dispatch call bypasses — handler is NOT invoked and a bypass log entry
// is written. Bypass does not throw (expert is never blocked).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

test('3 consecutive failures open the breaker; 4th call bypasses (AC 3)', () => {
  const tmp = mkTmpLogs('breaker');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    let invocations = 0;
    runner.register('PreToolUse', () => {
      invocations += 1;
      throw new Error('boom');
    });

    // 3 consecutive failures — each propagates (as designed) and increments.
    for (let i = 0; i < 3; i += 1) {
      assert.throws(
        () => runner.dispatch('PreToolUse', { i: i }),
        /boom/,
        'failure #' + (i + 1) + ' propagates'
      );
    }
    assert.strictEqual(invocations, 3, 'handler invoked exactly 3 times');
    assert.strictEqual(
      runner._getFailureCount('PreToolUse'),
      3,
      'counter reached threshold'
    );

    // 4th call: handler MUST NOT be invoked and call MUST NOT throw.
    let result;
    assert.doesNotThrow(() => {
      result = runner.dispatch('PreToolUse', { i: 3 });
    }, 'bypass does not throw');
    assert.strictEqual(invocations, 3, 'handler NOT invoked on bypass');
    assert.deepStrictEqual(
      result,
      {
        bypassed: true,
        event: 'PreToolUse',
        reason: 'circuit_breaker_open',
      },
      'dispatch returns documented bypass sentinel'
    );

    // Log artifact: a bypass entry must exist under hook-calls/.
    const dir = path.join(tmp, 'hook-calls');
    assert.ok(fs.existsSync(dir), 'hook-calls/ directory created on bypass');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
    assert.ok(files.length > 0, 'at least one daily log file written');

    const lines = fs
      .readFileSync(path.join(dir, files[0]), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));

    const hasBypass = lines.some(
      (e) => e.event_type === 'bypass' && e.hook_name === 'PreToolUse'
    );
    assert.ok(hasBypass, 'log contains a bypass entry for PreToolUse');

    const hasTrigger = lines.some(
      (e) =>
        e.event_type === 'bypass_triggered' && e.hook_name === 'PreToolUse'
    );
    assert.ok(hasTrigger, 'log contains a bypass_triggered entry');
  } finally {
    rmTmp(tmp);
  }
});
