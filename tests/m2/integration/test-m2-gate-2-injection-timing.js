'use strict';

// M2 Gate Criterion 2 (Epic KZ-M2 § Gate Criteria):
// Rules injection under 200ms in a 10-prompt benchmark.
// CIE-3 Boot file I/O is excluded from the budget per epic wording —
// "CIE-3 Boot counts only on the first cell activation per session".
// We measure the CIE-0+1+2 dispatch 10 times with no active cell, which
// is the steady-state injection cost the 200ms budget targets.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, freshCie } = require('./_helpers');

function pct(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

test('M2 Gate 2: CIE-0+1+2 under 200ms across 10 prompts (boot I/O excluded)', () => {
  const tmp = mkTmp('gate2');
  try {
    const cie = freshCie();
    const ctx = { sessionId: 's-gate2' };

    // Warm-up to exercise the fs cache — mirrors M2.2 timing test.
    cie.inject(ctx, ['CIE-0', 'CIE-1', 'CIE-2']);

    const runs = [];
    for (let i = 0; i < 10; i++) {
      const r = cie.inject(ctx, ['CIE-0', 'CIE-1', 'CIE-2']);
      runs.push(r.totalMs);
      assert.ok(
        r.totalMs < 200,
        'run ' + (i + 1) + ' exceeded 200ms budget (' + r.totalMs.toFixed(3) + 'ms)'
      );
    }

    const sorted = runs.slice().sort((a, b) => a - b);
    const p50 = pct(sorted, 50);
    const p95 = pct(sorted, 95);
    const mean = runs.reduce((a, b) => a + b, 0) / runs.length;

    process.stdout.write(
      '  [M2 Gate 2] runs=10 mean=' + mean.toFixed(2) +
        'ms p50=' + p50.toFixed(2) +
        'ms p95=' + p95.toFixed(2) +
        'ms budget=200ms\n'
    );
  } finally {
    rmTmp(tmp);
  }
});
