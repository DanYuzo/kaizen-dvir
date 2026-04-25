'use strict';

// AC 1, 8: WAIVED verdict — FAIL with valid expert waiver.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('WAIVED when FAIL is resolved by a valid expert waiver', () => {
  const tmp = mkTmpLogs('verdict-waived');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => false },
    ];
    const waiver = {
      gate_id: 'quality-gate',
      artifact_id: 'art-waived-1',
      reason: 'risco aceito pelo expert para destravar M4',
      approved_by: 'expert',
      date: '2026-04-24T10:00:00.000Z',
      scope: 'apenas iteracao M4-pre-launch',
      waiver_ref: 'waiver-2026-04-24-10-00-00',
    };
    const out = gate.evaluate({ id: 'art-waived-1' }, criteria, {
      waiver: waiver,
    });
    assert.strictEqual(out.verdict, 'WAIVED');
    assert.strictEqual(out.waiver_ref, 'waiver-2026-04-24-10-00-00');
  } finally {
    rmTmp(tmp);
  }
});

test('FAIL stays FAIL when waiver is invalid (no approved_by)', () => {
  const tmp = mkTmpLogs('verdict-waived-invalid');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const criteria = [
      { id: 'c1', severity: 'critical', check: 'automated', run: () => false },
    ];
    const waiver = {
      gate_id: 'quality-gate',
      artifact_id: 'art-waived-2',
      reason: 'tentativa de bypass',
      approved_by: 'somebody-else',
      date: '2026-04-24T10:00:00.000Z',
      scope: 'qualquer',
    };
    const out = gate.evaluate({ id: 'art-waived-2' }, criteria, {
      waiver: waiver,
    });
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(
      out.issues.some((i) => /approved_by: expert/.test(i.message)),
      'pt-BR rejection issue surfaced'
    );
  } finally {
    rmTmp(tmp);
  }
});
