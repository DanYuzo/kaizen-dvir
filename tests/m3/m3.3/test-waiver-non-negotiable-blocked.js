'use strict';

// AC 9: NON-NEGOTIABLE hard-lock — waivers on Commandment I or II rejected
// regardless of approved_by.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('Waiver on Commandment I rejected even with approved_by: expert', () => {
  const tmp = mkTmpLogs('waiver-non-neg-i');
  try {
    const waiver = requireFreshGate('waiver.js');
    const out = waiver.validateWaiver({
      gate_id: 'commandment-I-gate',
      artifact_id: 'art-y',
      reason: 'expert quer pular CLI first',
      approved_by: 'expert',
      date: '2026-04-24T10:00:00.000Z',
      scope: 'commandment I',
    });
    assert.strictEqual(out.valid, false);
    assert.match(out.reason, /commandment I e NON-NEGOTIABLE/i);
  } finally {
    rmTmp(tmp);
  }
});

test('Waiver on Commandment II rejected even with approved_by: expert', () => {
  const tmp = mkTmpLogs('waiver-non-neg-ii');
  try {
    const waiver = requireFreshGate('waiver.js');
    const out = waiver.validateWaiver({
      gate_id: 'authority-gate',
      artifact_id: 'art-z',
      reason: 'expert quer bypass de authority',
      approved_by: 'expert',
      date: '2026-04-24T10:00:00.000Z',
      scope: 'commandment-II',
    });
    assert.strictEqual(out.valid, false);
    assert.match(out.reason, /commandment II e NON-NEGOTIABLE/i);
  } finally {
    rmTmp(tmp);
  }
});

test('Waiver on Commandment III (MUST) accepted with approved_by: expert', () => {
  const tmp = mkTmpLogs('waiver-must-iii');
  try {
    const waiver = requireFreshGate('waiver.js');
    const out = waiver.validateWaiver({
      gate_id: 'commandment-III-gate',
      artifact_id: 'art-iii',
      reason: 'gap aceito pelo expert',
      approved_by: 'expert',
      date: '2026-04-24T10:00:00.000Z',
      scope: 'apenas spike de pesquisa',
    });
    assert.strictEqual(out.valid, true);
  } finally {
    rmTmp(tmp);
  }
});
