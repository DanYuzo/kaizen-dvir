'use strict';

// AC 3 (NFR-006): Automated gate with 10 criteria completes in < 30 seconds.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('10-criterion automated gate completes well under 30 seconds', () => {
  const tmp = mkTmpLogs('gate-timing');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [];
    for (let i = 0; i < 10; i++) {
      criteria.push({
        id: 'c' + i,
        severity: i < 4 ? 'critical' : i < 7 ? 'high' : i < 9 ? 'medium' : 'low',
        check: 'automated',
        run: () => true,
      });
    }
    const start = process.hrtime.bigint();
    const out = gate.evaluate({ id: 'art-timing' }, criteria);
    const elapsedMs = Number(
      (process.hrtime.bigint() - start) / 1000000n
    );
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.criteria_results.length, 10);
    assert.ok(
      elapsedMs < 30000,
      'elapsed ' + elapsedMs + 'ms must be < 30000ms (NFR-006)'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('gate aborts when budget exceeded mid-run', () => {
  const tmp = mkTmpLogs('gate-timing-budget');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const slow = (ms) => {
      const start = Date.now();
      while (Date.now() - start < ms) {
        // intentional spin
      }
      return true;
    };
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => slow(40) },
      { id: 'c2', severity: 'critical', check: 'automated', run: () => slow(40) },
      { id: 'c3', severity: 'critical', check: 'automated', run: () => slow(40) },
      { id: 'c4', severity: 'critical', check: 'automated', run: () => true },
    ];
    const out = gate.evaluate({ id: 'art-budget' }, criteria, {
      budgetMs: 50, // tiny budget triggers skip
    });
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(
      out.criteria_results.some((r) => r.skipped),
      'at least one criterion skipped due to budget'
    );
    assert.ok(
      out.issues.some((i) => /30 segundos|orcamento/i.test(i.message)),
      'pt-BR budget timeout issue surfaced'
    );
  } finally {
    rmTmp(tmp);
  }
});
