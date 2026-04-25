'use strict';

// AC 1 / NFR-004 / AC-005 — snapshot completes in under 1 second,
// averaged over 10 runs. Also asserts the worst-case single run.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, requireFreshHook } = require('./_helpers');

test('PreCompact snapshot averages under 1s over 10 runs (NFR-004)', () => {
  const tmp = mkTmp('timing');
  try {
    const hook = requireFreshHook('PreCompact.js');
    const durations = [];
    for (let i = 0; i < 10; i++) {
      const t0 = Date.now();
      const result = hook.handle({
        session_id: 'sess-timing-' + i,
        active_cell: 'yotzer',
        decisions: [
          { timestamp: '2026-04-23T14:18:00Z', author: '@sm', note: 'iter ' + i },
        ],
        files_modified: ['docs/file-' + i + '.md'],
        next_action: 'run ' + i,
      });
      const elapsed = Date.now() - t0;
      assert.strictEqual(result.verdict, 'PASS', 'run ' + i + ' must PASS');
      assert.ok(
        result.duration_ms < 1000,
        'run ' + i + ' reported duration_ms ' + result.duration_ms + ' ms must be < 1000'
      );
      durations.push(elapsed);
    }
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const worst = Math.max(...durations);
    assert.ok(avg < 1000, 'average ' + avg + 'ms must be < 1000ms');
    assert.ok(worst < 1000, 'worst-case ' + worst + 'ms must be < 1000ms');
  } finally {
    rmTmp(tmp);
  }
});
