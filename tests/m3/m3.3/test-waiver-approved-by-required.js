'use strict';

// AC 8: waiver missing `approved_by: expert` is rejected; not persisted.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('validateWaiver rejects waiver without approved_by: expert', () => {
  const tmp = mkTmpLogs('waiver-no-approved-by');
  try {
    const waiver = requireFreshGate('waiver.js');
    const out = waiver.validateWaiver({
      gate_id: 'quality-gate',
      artifact_id: 'art-x',
      reason: 'tentativa',
      approved_by: 'someone-else',
      date: '2026-04-24',
      scope: 'qualquer',
    });
    assert.strictEqual(out.valid, false);
    assert.match(out.reason, /approved_by: expert/);
  } finally {
    rmTmp(tmp);
  }
});

test('validateWaiver rejects waiver missing required fields', () => {
  const tmp = mkTmpLogs('waiver-missing-field');
  try {
    const waiver = requireFreshGate('waiver.js');
    const out = waiver.validateWaiver({
      gate_id: 'quality-gate',
      artifact_id: 'art-x',
      // reason missing
      approved_by: 'expert',
      date: '2026-04-24',
      scope: 'q',
    });
    assert.strictEqual(out.valid, false);
    assert.match(out.reason, /reason/);
  } finally {
    rmTmp(tmp);
  }
});

test('recordWaiver does NOT persist when waiver is invalid', () => {
  const tmp = mkTmpLogs('waiver-not-persisted');
  try {
    const waiver = requireFreshGate('waiver.js');
    const result = waiver.recordWaiver({
      gateId: 'quality-gate',
      artifactId: 'art-x',
      reason: 'tentativa',
      approvedBy: 'not-expert',
      scope: 'q',
      date: '2026-04-24T10:00:00.000Z',
    });
    assert.strictEqual(result.recorded, false);
    assert.strictEqual(result.path, null);
    const dir = path.join(tmp, 'waivers');
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      assert.strictEqual(files.length, 0, 'no waiver file written');
    }
  } finally {
    rmTmp(tmp);
  }
});
