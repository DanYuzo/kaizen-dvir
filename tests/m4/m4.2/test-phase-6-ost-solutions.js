'use strict';

// AC 13, 14, AC-117 — F6 consolidates definitive Solutions in OST.md
// via ost-writer.appendSolution() + linkSolutionToOpportunity(). Every
// Solution links to the Opportunity it resolves.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('appendSolution populates Solutions section (AC 13, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f6-sols');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo em 60% o tempo de X',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo na coleta',
      pus: ['PU-001'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'trocar coleta manual por importador',
      origin: 'F6',
    });
    assert.ok(sol.id.startsWith('SOL-'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes(sol.line));
    assert.ok(text.includes('trocar coleta manual'));
    // Empty-list placeholder for Solutions is gone.
    assert.ok(!text.includes('lista vazia. F5 adiciona primeiras Solutions'));

    // Link Solution to Opportunity.
    const link = ostWriter.linkSolutionToOpportunity(cell, sol.id, opp.id);
    assert.ok(link.line.includes(sol.id));
    assert.ok(link.line.includes(opp.id));
    const text2 = helpers.readFileText(cell + '/OST.md');
    assert.ok(text2.includes(sol.id + ' resolve ' + opp.id));
    assert.ok(!text2.includes('sem links ainda'));
  } finally {
    helpers.rm(cell);
  }
});

test('auto-id allocation is sequential SOL-001, SOL-002, ... (AC 13)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f6-sol-ids');
  try {
    ostWriter.writeRoot(cell, { type: 'automacao', description: 'automatizo envio diario' });
    const s1 = ostWriter.appendSolution(cell, { description: 'trocar manual por job cron' });
    const s2 = ostWriter.appendSolution(cell, { description: 'abrir alerta de falha' });
    const s3 = ostWriter.appendSolution(cell, { description: 'registrar log estruturado' });
    assert.strictEqual(s1.id, 'SOL-001');
    assert.strictEqual(s2.id, 'SOL-002');
    assert.strictEqual(s3.id, 'SOL-003');
  } finally {
    helpers.rm(cell);
  }
});

test('linkSolutionToOpportunity rejects missing ids (AC 14)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f6-link-reject');
  try {
    ostWriter.writeRoot(cell, { type: 'desejo', description: 'quero fluxo simples' });
    assert.throws(() => ostWriter.linkSolutionToOpportunity(cell, '', 'OPP-001'), /solutionId/u);
    assert.throws(() => ostWriter.linkSolutionToOpportunity(cell, 'SOL-001', ''), /opportunityId/u);
  } finally {
    helpers.rm(cell);
  }
});

test('appendSolution rejects entries without description (AC 13)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f6-sol-reject');
  try {
    ostWriter.writeRoot(cell, { type: 'problema', description: 'X atrasa em Y' });
    assert.throws(() => ostWriter.appendSolution(cell, { origin: 'F6' }), /description/u);
  } finally {
    helpers.rm(cell);
  }
});

test('phase-6-to-be.md references appendSolution and linkSolutionToOpportunity (AC 13, 14)', () => {
  const raw = helpers.readFileText(helpers.PHASE_6_TASK);
  assert.ok(raw.includes('ost-writer.appendSolution'));
  assert.ok(raw.includes('ost-writer.linkSolutionToOpportunity'));
});

test('multiple Solutions can link to the same Opportunity (AC 14)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f6-multi-link');
  try {
    ostWriter.writeRoot(cell, { type: 'melhoria', description: 'reduzo latencia em 50%' });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo unico',
      pus: ['PU-010'],
    });
    const s1 = ostWriter.appendSolution(cell, { description: 'cache em memoria' });
    const s2 = ostWriter.appendSolution(cell, { description: 'indice na tabela' });
    ostWriter.linkSolutionToOpportunity(cell, s1.id, opp.id);
    ostWriter.linkSolutionToOpportunity(cell, s2.id, opp.id);
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes(s1.id + ' resolve ' + opp.id));
    assert.ok(text.includes(s2.id + ' resolve ' + opp.id));
  } finally {
    helpers.rm(cell);
  }
});
