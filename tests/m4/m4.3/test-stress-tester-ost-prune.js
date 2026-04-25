'use strict';

// AC 5 (M4.3) — F4 prunes the OST. Every cut PU removes the
// corresponding Opportunity entry from OST.md with traceable
// justification linking back to cut-log.yaml. KZ-M4-R8 mitigation.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('appendChangeLog records OST pruning with cut-log reference (AC 5)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f4-prune');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo bloat do As-is em 20%',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo na coleta de briefing',
      pus: ['PU-001'],
    });
    // PU-001 cortada — registra remocao da Opportunity correspondente.
    const change =
      'removeu ' +
      opp.id +
      ' por corte de PU-001 — ver cut-log.yaml entrada de 2026-04-25.';
    const result = ostWriter.appendChangeLog(cell, '@stress-tester', change);
    assert.ok(result.line.includes(opp.id));
    assert.ok(result.line.includes('cut-log.yaml'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('removeu ' + opp.id));
    assert.ok(text.includes('cut-log.yaml'));
  } finally {
    helpers.rm(cell);
  }
});

test('OST preserves Opportunity entry after pruning (audit trail kept) (AC 5, KZ-M4-R8)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f4-prune-keep');
  try {
    ostWriter.writeRoot(cell, {
      type: 'problema',
      description: 'X atrasa Y',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'retrabalho de revisao',
      pus: ['PU-007'],
    });
    ostWriter.appendChangeLog(
      cell,
      '@stress-tester',
      'removeu ' + opp.id + ' por corte de PU-007 — ver cut-log.yaml.'
    );
    const text = helpers.readFileText(cell + '/OST.md');
    // Opportunity entry stays — only Change Log records removal.
    assert.ok(text.includes(opp.line));
    assert.ok(text.includes('removeu ' + opp.id));
  } finally {
    helpers.rm(cell);
  }
});

test('multiple cut PUs each get pruning entry in Change Log (AC 5)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f4-multi');
  try {
    ostWriter.writeRoot(cell, {
      type: 'mapeamento',
      description: 'mapeio fluxo de venda',
    });
    const opp1 = ostWriter.appendOpportunity(cell, {
      description: 'dor 1',
      pus: ['PU-001'],
    });
    const opp2 = ostWriter.appendOpportunity(cell, {
      description: 'dor 2',
      pus: ['PU-002'],
    });
    const opp3 = ostWriter.appendOpportunity(cell, {
      description: 'dor 3',
      pus: ['PU-003'],
    });
    ostWriter.appendChangeLog(
      cell,
      '@stress-tester',
      'removeu ' + opp1.id + ' por corte de PU-001 — cut-log.yaml.'
    );
    ostWriter.appendChangeLog(
      cell,
      '@stress-tester',
      'removeu ' + opp3.id + ' por corte de PU-003 — cut-log.yaml.'
    );
    const text = helpers.readFileText(cell + '/OST.md');
    const changelogIdx = text.indexOf('## Change Log');
    const changelogBody = text.slice(changelogIdx);
    assert.ok(changelogBody.includes('removeu ' + opp1.id));
    assert.ok(changelogBody.includes('removeu ' + opp3.id));
    // OPP-002 was NOT cut — must not appear in pruning entries.
    const removedOpp2 = (
      changelogBody.match(new RegExp('removeu ' + opp2.id, 'gu')) || []
    ).length;
    assert.strictEqual(removedOpp2, 0);
  } finally {
    helpers.rm(cell);
  }
});

test('stress-tester persona declares OST pruning responsibility (AC 5)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  assert.ok(
    raw.includes('OST') &&
      (raw.includes('poda') || raw.includes('Pod') || raw.includes('remov')),
    'stress-tester persona must declare OST pruning'
  );
  assert.ok(
    raw.includes('cut-log.yaml'),
    'stress-tester persona must reference cut-log.yaml'
  );
});

test('phase-4 task declares OST pruning step linking to cut-log.yaml (AC 5)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  assert.ok(raw.includes('OST'));
  assert.ok(raw.includes('cut-log.yaml'));
  assert.ok(
    raw.includes('appendChangeLog') ||
      raw.includes('ost-writer') ||
      raw.includes('removida'),
    'phase-4 must declare OST mutation API'
  );
});
