'use strict';

// AC 1, 2: CONCERNS verdict — medium fails.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('CONCERNS when only medium criteria fail', () => {
  const tmp = mkTmpLogs('verdict-concerns');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => true },
      { id: 'h1', severity: 'high', check: 'automated', run: () => true },
      { id: 'm1', severity: 'medium', check: 'automated', run: () => false },
    ];
    const out = gate.evaluate({ id: 'art-3' }, criteria);
    assert.strictEqual(out.verdict, 'CONCERNS');
    assert.ok(
      out.issues.some((i) => i.severity === 'medium'),
      'medium issue surfaced'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('CONCERNS when high fails AND selfHealingExhausted=true', () => {
  const tmp = mkTmpLogs('verdict-concerns-high-exhausted');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => true },
      { id: 'h1', severity: 'high', check: 'automated', run: () => false },
    ];
    const out = gate.evaluate({ id: 'art-4' }, criteria, {
      selfHealingExhausted: true,
    });
    assert.strictEqual(
      out.verdict,
      'CONCERNS',
      'high softens to CONCERNS after self-healing exhausts'
    );
  } finally {
    rmTmp(tmp);
  }
});
