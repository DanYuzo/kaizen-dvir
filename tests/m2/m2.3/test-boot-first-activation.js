'use strict';

// AC 1, 2, 9: CIE-3 fires on the first `/Kaizen:{CellName}` activation per
// session, reads `boot:` from celula.yaml, concatenates declared boot files
// into the payload, and records the cell in session-booted-cells.json.
// A negative case verifies that the pattern anchored at start-of-line
// rejects mid-sentence / code-fence occurrences (M2.3-R1).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmp,
  rmTmp,
  seedFixtureCell,
  clearFixtureCell,
  cieFresh,
} = require('./_helpers');

test('CIE-3 first activation loads boot files and marks cell booted (AC 1, 2)', () => {
  const tmp = mkTmp('first-activation');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# README do teste-a\nConteudo do README.' },
    { path: 'MEMORY.md', content: '# Memoria\nUltimo estado salvo.' },
  ]);
  try {
    const cie = cieFresh();
    const result = cie.cie3Boot({
      sessionId: 's-first',
      prompt: '/Kaizen:' + fixture.cellName + '\nBom dia',
    });

    assert.strictEqual(result.layer, 'CIE-3');
    assert.strictEqual(result.cell, fixture.cellName);
    assert.ok(
      result.payload.includes('# README do teste-a'),
      'payload must include README contents'
    );
    assert.ok(
      result.payload.includes('# Memoria'),
      'payload must include MEMORY.md contents'
    );
    assert.deepStrictEqual(result.warnings, [], 'no warnings on happy path');
    assert.ok(result.bootIoMs >= 0, 'bootIoMs reported');

    // State file updated with the cell entry.
    const stateFile = process.env.KAIZEN_BOOTED_CELLS_FILE;
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.ok(
      Object.prototype.hasOwnProperty.call(state, fixture.cellName),
      'booted cell recorded in state file'
    );
    assert.ok(
      /\d{4}-\d{2}-\d{2}T/.test(state[fixture.cellName].booted_at),
      'booted_at is ISO-8601'
    );
    assert.strictEqual(cie.hasBooted(fixture.cellName), true);
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});

test('CIE-3 ignores mid-sentence /Kaizen:CellName occurrences (M2.3-R1)', () => {
  const tmp = mkTmp('first-noise');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: 'dummy' },
  ]);
  try {
    const cie = cieFresh();
    // `/Kaizen:` mid-sentence (no start-of-line anchor) must NOT activate.
    const result = cie.cie3Boot({
      sessionId: 's-noise',
      prompt: 'olha esse exemplo: /Kaizen:' + fixture.cellName + ' dentro da frase',
    });

    assert.strictEqual(result.payload, '');
    assert.strictEqual(result.cell, null);
    assert.strictEqual(cie.hasBooted(fixture.cellName), false);
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});

test('CIE-3 returns empty payload when prompt has no activation pattern', () => {
  const tmp = mkTmp('first-none');
  try {
    const cie = cieFresh();
    const result = cie.cie3Boot({
      sessionId: 's-none',
      prompt: 'um prompt qualquer sem ativacao',
    });
    assert.strictEqual(result.payload, '');
    assert.strictEqual(result.cell, null);
    assert.strictEqual(result.bootIoMs, 0, 'no disk I/O on short-circuit');
  } finally {
    rmTmp(tmp);
  }
});

test('inject() dispatches CIE-3 as the fourth layer (AC 1)', () => {
  const tmp = mkTmp('first-inject');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# readme' },
  ]);
  try {
    const cie = cieFresh();
    const result = cie.inject(
      {
        sessionId: 's-inject',
        prompt: '/Kaizen:' + fixture.cellName,
        activeCell: fixture.cellName,
      },
      ['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3']
    );
    assert.strictEqual(result.perLayer.length, 4);
    assert.strictEqual(result.perLayer[3].layer, 'CIE-3');
    assert.ok(
      result.combinedPayload.includes('# readme'),
      'combined payload includes CIE-3 contents'
    );
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});
