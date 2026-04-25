'use strict';

// AC 1, 2: FAIL verdict — critical fails.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('FAIL when any critical criterion fails', () => {
  const tmp = mkTmpLogs('verdict-fail-critical');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => false },
      { id: 'h1', severity: 'high', check: 'automated', run: () => true },
    ];
    const out = gate.evaluate({ id: 'art-fail-1' }, criteria);
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.issues.some((i) => i.severity === 'critical'));
  } finally {
    rmTmp(tmp);
  }
});

test('FAIL when high fails during dev (no exhaustion flag)', () => {
  const tmp = mkTmpLogs('verdict-fail-high-dev');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => true },
      { id: 'h1', severity: 'high', check: 'automated', run: () => false },
    ];
    const out = gate.evaluate({ id: 'art-fail-2' }, criteria);
    assert.strictEqual(out.verdict, 'FAIL');
  } finally {
    rmTmp(tmp);
  }
});

test('FAIL when severity is unknown (R-1 mitigation)', () => {
  const tmp = mkTmpLogs('verdict-fail-bad-severity');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'x1', severity: 'urgent', check: 'automated', run: () => true },
    ];
    const out = gate.evaluate({ id: 'art-fail-3' }, criteria);
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(
      out.issues.some((i) => /severidade invalida/.test(i.message)),
      'pt-BR severity error surfaced'
    );
  } finally {
    rmTmp(tmp);
  }
});
