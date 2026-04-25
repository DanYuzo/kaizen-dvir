'use strict';

// AC 8: approved waiver written to .kaizen/logs/waivers/ with the 6 fields.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('recordWaiver writes YAML with all 6 required fields', () => {
  const tmp = mkTmpLogs('waiver-audit');
  try {
    const waiver = requireFreshGate('waiver.js');
    const result = waiver.recordWaiver({
      gateId: 'quality-gate',
      artifactId: 'art-audit-1',
      reason: 'risco aceito para destravar M4',
      approvedBy: 'expert',
      scope: 'apenas iteracao M4-pre-launch',
      date: '2026-04-24T10:00:00.000Z',
    });
    assert.strictEqual(result.recorded, true);
    assert.ok(result.path && fs.existsSync(result.path));

    const content = fs.readFileSync(result.path, 'utf8');
    assert.match(content, /^gate_id: "quality-gate"$/m);
    assert.match(content, /^artifact_id: "art-audit-1"$/m);
    assert.match(content, /^reason: ".+"$/m);
    assert.match(content, /^approved_by: "expert"$/m);
    assert.match(content, /^date: ".+"$/m);
    assert.match(content, /^scope: ".+"$/m);

    // Filename derived from timestamp (no `:` to keep Windows-safe).
    const dir = path.join(tmp, 'waivers');
    const files = fs.readdirSync(dir);
    assert.strictEqual(files.length, 1);
    assert.ok(/\.yaml$/.test(files[0]));
    assert.ok(!files[0].includes(':'), 'filename is Windows-safe');
  } finally {
    rmTmp(tmp);
  }
});
