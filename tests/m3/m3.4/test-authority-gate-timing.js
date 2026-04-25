'use strict';

// AC 7 / NFR-005 — Authority Gate resolves in under 200ms across 100
// sequential calls on a cached manifest (warm cache, R-004 mitigation).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('100 sequential calls average under 200ms each on cached manifest', () => {
  const logs = helpers.mkTmpLogs('ag-perf-warm');
  const celulas = helpers.mkTmpCelulas('ag-perf-warm');
  try {
    helpers.writeCelulaYaml(
      celulas,
      'yotzer',
      'description: "yotzer"\n' +
        'authorities:\n' +
        '  exclusive:\n' +
        '    - "Read"\n' +
        '    - "Write"\n' +
        '    - "Bash"\n'
    );
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();

    // Warm-up call to populate cache (NFR-005 contract is the steady-state
    // warm-cache path).
    authority.evaluate(
      { tool_name: 'Read', parameters: {} },
      'yotzer',
      { logPass: false }
    );

    let maxMs = 0;
    let totalMs = 0;
    const ITERATIONS = 100;
    for (let i = 0; i < ITERATIONS; i++) {
      const start = process.hrtime.bigint();
      const out = authority.evaluate(
        { tool_name: 'Read', parameters: {} },
        'yotzer',
        { logPass: false }
      );
      const ms = Number((process.hrtime.bigint() - start) / 1000000n);
      assert.strictEqual(out.verdict, 'PASS');
      if (ms > maxMs) maxMs = ms;
      totalMs += ms;
    }
    const avg = totalMs / ITERATIONS;
    assert.ok(maxMs < 200, 'max ms exceeded 200: ' + maxMs);
    assert.ok(avg < 200, 'avg ms exceeded 200: ' + avg);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(celulas);
  }
});

// Optional cold-cache reporting — PO Should-Fix #3. Not gated by NFR-005,
// just observed for @architect's performance_benchmark visibility.
test('cold-cache single-call observation (informational)', () => {
  const logs = helpers.mkTmpLogs('ag-perf-cold');
  const celulas = helpers.mkTmpCelulas('ag-perf-cold');
  try {
    helpers.writeCelulaYaml(
      celulas,
      'yotzer',
      'description: "yotzer"\n' +
        'authorities:\n' +
        '  exclusive:\n' +
        '    - "Read"\n'
    );
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();

    const start = process.hrtime.bigint();
    const out = authority.evaluate(
      { tool_name: 'Read', parameters: {} },
      'yotzer',
      { logPass: false }
    );
    const coldMs = Number((process.hrtime.bigint() - start) / 1000000n);
    assert.strictEqual(out.verdict, 'PASS');
    // Cold cache should still be well under the 200ms steady-state ceiling
    // for a single-key manifest. Loose ceiling so noisy CI does not flake.
    assert.ok(
      coldMs < 1000,
      'cold-cache single-call exceeded 1000ms (informational): ' + coldMs
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(celulas);
  }
});
