'use strict';

// AC 11, AC-117 — F3 calls ost-writer.appendOpportunity() for each
// observed dor/gap. Each Opportunity references at least one PU.
// OST.md Opportunities section gets populated.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('appendOpportunity adds entry to Opportunities section (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f3-opps');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo em 60% o tempo de X',
    });
    const r1 = ostWriter.appendOpportunity(cell, {
      description: 'gargalo na coleta de briefing',
      pus: ['PU-001', 'PU-002'],
    });
    assert.ok(r1.id.startsWith('OPP-'));
    assert.ok(r1.line.includes('gargalo na coleta'));
    assert.ok(r1.line.includes('PU-001'));

    const r2 = ostWriter.appendOpportunity(cell, {
      description: 'retrabalho na revisao final',
      pus: ['PU-005'],
    });
    assert.ok(r2.id.startsWith('OPP-'));
    assert.notStrictEqual(r1.id, r2.id, 'ids must be unique');

    const text = helpers.readFileText(r2.line ? cell + '/OST.md' : r2.line);
    assert.ok(text.includes(r1.line));
    assert.ok(text.includes(r2.line));
    // Empty-list placeholder should be gone after first append.
    assert.ok(!text.includes('lista vazia. F3 adiciona as primeiras Opportunities'));
  } finally {
    helpers.rm(cell);
  }
});

test('auto-id allocation is sequential OPP-001, OPP-002, ... (AC 11)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f3-ids');
  try {
    ostWriter.writeRoot(cell, {
      type: 'mapeamento',
      description: 'mapeio o fluxo de atendimento',
    });
    const r1 = ostWriter.appendOpportunity(cell, { description: 'dor 1', pus: ['PU-001'] });
    const r2 = ostWriter.appendOpportunity(cell, { description: 'dor 2', pus: ['PU-002'] });
    const r3 = ostWriter.appendOpportunity(cell, { description: 'dor 3', pus: ['PU-003'] });
    assert.strictEqual(r1.id, 'OPP-001');
    assert.strictEqual(r2.id, 'OPP-002');
    assert.strictEqual(r3.id, 'OPP-003');
  } finally {
    helpers.rm(cell);
  }
});

test('appendOpportunity rejects entries without description (AC 11)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f3-reject');
  try {
    ostWriter.writeRoot(cell, { type: 'problema', description: 'X atrasa em Y' });
    assert.throws(() => ostWriter.appendOpportunity(cell, { pus: ['PU-001'] }), /description/u);
  } finally {
    helpers.rm(cell);
  }
});

test('phase-3-as-is.md references ost-writer.appendOpportunity (AC 11)', () => {
  const raw = helpers.readFileText(helpers.PHASE_3_TASK);
  assert.ok(raw.includes('ost-writer.appendOpportunity'));
});

test('Change Log registers each Opportunity addition (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f3-changelog');
  try {
    ostWriter.writeRoot(cell, { type: 'desejo', description: 'quero uma rotina nova' });
    ostWriter.appendOpportunity(cell, { description: 'dor na rotina atual', pus: ['PU-010'] });
    const text = helpers.readFileText(cell + '/OST.md');
    // Change Log section carries the adicionou entry.
    const changelogIndex = text.indexOf('## Change Log');
    assert.ok(changelogIndex > -1);
    const changelogBody = text.slice(changelogIndex);
    assert.ok(changelogBody.includes('adicionou OPP-001'));
  } finally {
    helpers.rm(cell);
  }
});
