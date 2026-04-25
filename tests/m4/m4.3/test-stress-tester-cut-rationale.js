'use strict';

// AC 3 (M4.3) — F4 documents cut rationale per removed PU in 100% of
// cases. Every cut row in cut-log.yaml carries PU id, date, author,
// reason, and what breaks if removed. AC-107.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('makeCutLogEntry accepts complete rationale (AC 3, AC-107)', () => {
  const entry = helpers.makeCutLogEntry({
    pu_id: 'PU-007',
    date: '2026-04-25',
    author: 'expert',
    reason: 'PU duplica trabalho de PU-003',
    what_breaks: 'nada — saida de PU-003 cobre o caso',
  });
  assert.strictEqual(entry.pu_id, 'PU-007');
  assert.strictEqual(entry.date, '2026-04-25');
  assert.strictEqual(entry.author, 'expert');
  assert.ok(entry.reason.length > 0);
  assert.ok(entry.what_breaks.length > 0);
});

test('makeCutLogEntry rejects missing pu_id (AC 3)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      date: '2026-04-25',
      author: 'expert',
      reason: 'razao',
      what_breaks: 'nada',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.code, 'CUT_RATIONALE_INCOMPLETE');
  assert.strictEqual(err.missing, 'pu_id');
});

test('makeCutLogEntry rejects missing date (AC 3)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      pu_id: 'PU-001',
      author: 'expert',
      reason: 'razao',
      what_breaks: 'nada',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.missing, 'date');
});

test('makeCutLogEntry rejects missing author (AC 3)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      pu_id: 'PU-001',
      date: '2026-04-25',
      reason: 'razao',
      what_breaks: 'nada',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.missing, 'author');
});

test('makeCutLogEntry rejects missing reason (AC 3)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      pu_id: 'PU-001',
      date: '2026-04-25',
      author: 'expert',
      what_breaks: 'nada',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.missing, 'reason');
});

test('makeCutLogEntry rejects missing what_breaks (AC 3)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      pu_id: 'PU-001',
      date: '2026-04-25',
      author: 'expert',
      reason: 'razao',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.missing, 'what_breaks');
});

test('makeCutLogEntry error message guides expert to fill all fields (NFR-101)', () => {
  let err = null;
  try {
    helpers.makeCutLogEntry({
      date: '2026-04-25',
      author: 'expert',
      reason: 'razao',
      what_breaks: 'nada',
    });
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.ok(err.message.includes('PU cortada sem rationale completo'));
  assert.ok(err.message.includes('id, data, autor, motivo'));
  assert.ok(err.message.includes('o que quebra'));
});

test('phase-4 task declares cut-rationale fields per removed PU (AC 3)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  assert.ok(raw.includes('pu_id'));
  assert.ok(raw.includes('date') || raw.includes('data'));
  assert.ok(raw.includes('author') || raw.includes('autor'));
  assert.ok(raw.includes('reason') || raw.includes('motivo'));
  assert.ok(raw.includes('what_breaks') || raw.includes('o que quebra'));
});

test('stress-tester persona declares cut rationale fields (AC 3)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  assert.ok(
    raw.includes('id, data, autor, motivo') || raw.includes('id, data, autor'),
    'stress-tester persona must enumerate cut-log fields'
  );
});

test('100% of cuts have rationale — batch validation simulates auditor pass (AC 3, AC-107)', () => {
  const cuts = [
    { pu_id: 'PU-001', date: '2026-04-25', author: 'expert', reason: 'duplicada', what_breaks: 'nada' },
    { pu_id: 'PU-005', date: '2026-04-25', author: 'expert', reason: 'sem decisor', what_breaks: 'fluxo X' },
    { pu_id: 'PU-009', date: '2026-04-25', author: 'expert', reason: 'fora de escopo', what_breaks: 'nada' },
  ];
  let validated = 0;
  for (const c of cuts) {
    const entry = helpers.makeCutLogEntry(c);
    assert.ok(entry.pu_id);
    validated++;
  }
  assert.strictEqual(validated, cuts.length);
});
