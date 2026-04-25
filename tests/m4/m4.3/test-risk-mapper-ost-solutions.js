'use strict';

// AC 11, AC-117 (M4.3) — F5 adds residual Opportunities and first
// Solutions to OST.md with traceability linking each Solution to the
// originating Opportunity. The OST gains density for the first time in
// F5.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('appendOpportunity adds residual opportunity in F5 (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f5-residual');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo erro humano em 50%',
    });
    // F3 added first Opportunities.
    const oppF3 = ostWriter.appendOpportunity(cell, {
      description: 'F3: dor original na coleta',
      pus: ['PU-001'],
    });
    // F5 adds a residual Opportunity from accepted-but-not-mitigated risk.
    const oppF5 = ostWriter.appendOpportunity(cell, {
      description: 'F5: residual — flakiness aceito da API externa',
      pus: ['PU-003'],
    });
    assert.notStrictEqual(oppF3.id, oppF5.id);
    assert.ok(oppF5.id.startsWith('OPP-'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('residual'));
  } finally {
    helpers.rm(cell);
  }
});

test('appendSolution adds first Solution in F5 (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f5-first-sol');
  try {
    ostWriter.writeRoot(cell, {
      type: 'desejo',
      description: 'fluxo novo de venda',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo no envio de proposta',
      pus: ['PU-002'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'template de proposta com preview antes do commit',
      origin: opp.id,
    });
    assert.ok(sol.id.startsWith('SOL-'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes(sol.line));
    assert.ok(text.includes(opp.id));
  } finally {
    helpers.rm(cell);
  }
});

test('linkSolutionToOpportunity records traceability (AC 11)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f5-link');
  try {
    ostWriter.writeRoot(cell, {
      type: 'mapeamento',
      description: 'mapeio fluxo de atendimento',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'retrabalho na revisao',
      pus: ['PU-010'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'checklist obrigatorio antes da entrega',
      origin: opp.id,
    });
    const link = ostWriter.linkSolutionToOpportunity(cell, sol.id, opp.id);
    assert.ok(link.line.includes(sol.id));
    assert.ok(link.line.includes(opp.id));
    assert.ok(link.line.includes('resolve'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('## Links'));
    assert.ok(text.includes(sol.id + ' resolve ' + opp.id));
  } finally {
    helpers.rm(cell);
  }
});

test('every Solution carries pointer to originating Opportunity via origin field (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f5-origin');
  try {
    ostWriter.writeRoot(cell, {
      type: 'problema',
      description: 'X demora demais',
    });
    const opp1 = ostWriter.appendOpportunity(cell, {
      description: 'dor 1',
      pus: ['PU-001'],
    });
    const opp2 = ostWriter.appendOpportunity(cell, {
      description: 'dor 2',
      pus: ['PU-002'],
    });
    const sol1 = ostWriter.appendSolution(cell, {
      description: 'mitigacao 1',
      origin: opp1.id,
    });
    const sol2 = ostWriter.appendSolution(cell, {
      description: 'mitigacao 2',
      origin: opp2.id,
    });
    assert.ok(sol1.line.includes(opp1.id));
    assert.ok(sol2.line.includes(opp2.id));
  } finally {
    helpers.rm(cell);
  }
});

test('phase-5 task references appendOpportunity and appendSolution (AC 11)', () => {
  const raw = helpers.readFileText(helpers.PHASE_5_TASK);
  assert.ok(raw.includes('appendOpportunity'));
  assert.ok(raw.includes('appendSolution'));
  assert.ok(raw.includes('linkSolutionToOpportunity'));
});

test('risk-mapper persona declares OST density growth in F5 (AC 11, AC-117)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  assert.ok(
    raw.includes('densidade') || raw.includes('OST') && raw.includes('cresce'),
    'risk-mapper persona must declare OST density growth'
  );
  assert.ok(
    raw.includes('residual') || raw.includes('Residual'),
    'risk-mapper persona must mention residual Opportunities'
  );
  assert.ok(
    raw.includes('Solution') || raw.includes('primeiras'),
    'risk-mapper persona must mention first Solutions'
  );
});

test('Change Log records each Solution addition (AC 11, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f5-changelog');
  try {
    ostWriter.writeRoot(cell, {
      type: 'automacao',
      description: 'automatizo X',
    });
    ostWriter.appendOpportunity(cell, {
      description: 'dor base',
      pus: ['PU-001'],
    });
    ostWriter.appendSolution(cell, {
      description: 'primeira mitigacao',
      origin: 'OPP-001',
    });
    const text = helpers.readFileText(cell + '/OST.md');
    const changelogIdx = text.indexOf('## Change Log');
    const changelogBody = text.slice(changelogIdx);
    assert.ok(changelogBody.includes('adicionou SOL-001'));
  } finally {
    helpers.rm(cell);
  }
});
