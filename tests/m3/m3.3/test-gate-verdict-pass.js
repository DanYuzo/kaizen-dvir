'use strict';

// AC 1, 2: PASS verdict — all critical + high pass.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('PASS when all critical and high criteria pass', () => {
  const tmp = mkTmpLogs('verdict-pass');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => true },
      { id: 'c2', severity: 'critical', check: 'automated', run: () => true },
      { id: 'h1', severity: 'high', check: 'automated', run: () => true },
      { id: 'h2', severity: 'high', check: 'automated', run: () => true },
    ];
    const out = gate.evaluate({ id: 'art-1' }, criteria);
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.criteria_results.length, 4);
    assert.ok(out.criteria_results.every((r) => r.passed));
    assert.strictEqual(out.issues.length, 0);
  } finally {
    rmTmp(tmp);
  }
});

test('PASS ignores low-severity failures (log-only)', () => {
  const tmp = mkTmpLogs('verdict-pass-low');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => true },
      { id: 'h1', severity: 'high', check: 'automated', run: () => true },
      { id: 'l1', severity: 'low', check: 'automated', run: () => false },
    ];
    const out = gate.evaluate({ id: 'art-2' }, criteria);
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    rmTmp(tmp);
  }
});
