'use strict';

// AC 4 (M4.3) — F4 meets ≥10% cut target OR emits Quality Gate CONCERNS
// with expert waiver path. Never silently passes under target. Never
// emits FAIL on under-target alone. AC-107, M4.3-R3.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('evalCutTarget returns PASS when cut percentage equals 10% (AC 4)', () => {
  const r = helpers.evalCutTarget(10, 1, false);
  assert.strictEqual(r.verdict, 'PASS');
  assert.strictEqual(r.pct, 10);
});

test('evalCutTarget returns PASS when cut percentage exceeds 10% (AC 4)', () => {
  const r = helpers.evalCutTarget(20, 4, false);
  assert.strictEqual(r.verdict, 'PASS');
  assert.strictEqual(r.pct, 20);
});

test('evalCutTarget returns CONCERNS when cut percentage below 10% without waiver (AC 4, AC-107)', () => {
  const r = helpers.evalCutTarget(20, 1, false);
  assert.strictEqual(r.verdict, 'CONCERNS');
  assert.ok(r.pct < 10);
  assert.ok(r.message.includes('corte abaixo de 10%'));
  assert.ok(r.message.includes('waiver'));
});

test('evalCutTarget never returns FAIL on under-target alone (AC 4, M4.3-R3)', () => {
  // Many under-target scenarios — none should escalate to FAIL.
  const cases = [
    { total: 100, cut: 0, expected: 'CONCERNS' },
    { total: 100, cut: 1, expected: 'CONCERNS' },
    { total: 100, cut: 5, expected: 'CONCERNS' },
    { total: 100, cut: 9, expected: 'CONCERNS' },
    { total: 50, cut: 4, expected: 'CONCERNS' },
    { total: 12, cut: 1, expected: 'CONCERNS' },
  ];
  for (const c of cases) {
    const r = helpers.evalCutTarget(c.total, c.cut, false);
    assert.notStrictEqual(r.verdict, 'FAIL', 'under-target must not FAIL');
    assert.strictEqual(r.verdict, c.expected);
  }
});

test('evalCutTarget returns PASS when waiver registered even below 10% (AC 4, AC-107)', () => {
  const r = helpers.evalCutTarget(20, 1, true);
  assert.strictEqual(r.verdict, 'PASS');
  assert.strictEqual(r.waiver, true);
});

test('evalCutTarget message guides expert to waiver or deeper Deletar (NFR-101)', () => {
  const r = helpers.evalCutTarget(50, 2, false);
  assert.strictEqual(r.verdict, 'CONCERNS');
  assert.ok(r.message.includes('approved_by'));
  assert.ok(r.message.includes('Deletar'));
});

test('Quality Gate emits CONCERNS for medium severity cut-target failure (AC 4)', () => {
  const logs = helpers.mkTmpLogs('cut-target');
  try {
    const qg = helpers.freshGate('quality-gate.js');
    const out = qg.evaluate(
      { id: 'F4-cut', content: '## Change Log\n- entry\n' },
      [
        {
          id: 'F4-MUSK-ORDER',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F4-CUT-RATIONALE',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F4-CUT-TARGET',
          severity: 'medium',
          check: 'automated',
          run: () => ({
            passed: false,
            message:
              'corte abaixo de 10%. registre waiver com approved_by ou aprofunde a fase Deletar.',
          }),
        },
      ],
      { gateId: 'F4' }
    );
    assert.strictEqual(out.verdict, 'CONCERNS');
    assert.notStrictEqual(out.verdict, 'FAIL');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('phase-4 task declares cut-target verdict as CONCERNS not FAIL (AC 4)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  assert.ok(
    raw.includes('CONCERNS'),
    'phase-4 must declare CONCERNS path for under-target'
  );
  assert.ok(
    raw.includes('waiver') || raw.includes('approved_by'),
    'phase-4 must declare waiver path'
  );
  assert.ok(
    raw.includes('nunca FAIL') || raw.includes('nunca emite FAIL') || /FAIL apenas por meta/u.test(raw),
    'phase-4 must state FAIL is not the verdict for under-target'
  );
});

test('stress-tester persona declares ≥10% target with waiver path (AC 4)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  assert.ok(raw.includes('10%'));
  assert.ok(raw.includes('waiver') || raw.includes('approved_by'));
  assert.ok(raw.includes('CONCERNS'));
});
