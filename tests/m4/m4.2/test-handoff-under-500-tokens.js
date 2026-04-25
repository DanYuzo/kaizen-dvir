'use strict';

// AC 16, AC-103 — handoff artifacts generated at each archaeologist phase
// boundary (F1→F2, F2→F3, F3→F4, F5→F6, F6→F7) are under 500 tokens via
// M3.2 handoff-engine.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

const TOKEN_CEILING = 500;

function runBoundary(engine, from, to, workContext, decisions, files, blockers, next) {
  return engine.generate(from, to, workContext, decisions, files, blockers, next);
}

test('F1 -> F2 handoff is under 500 tokens (AC 16, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-f1');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = runBoundary(
      engine,
      'archaeologist',
      'archaeologist',
      {
        artifact_id: 'OUT-001',
        artifact_path: 'OST.md',
        current_phase: 'phase-1-objective',
        branch: 'main',
      },
      ['objetivo travou em melhoria', 'metrica: reduzir 60% do tempo de X'],
      ['outcome-statement.yaml', 'OST.md'],
      [],
      'iniciar F2 com o objetivo travado.'
    );
    assert.ok(r.tokenCount <= TOKEN_CEILING, 'F1 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F2 -> F3 handoff is under 500 tokens (AC 16, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-f2');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = runBoundary(
      engine,
      'archaeologist',
      'archaeologist',
      {
        artifact_id: 'kbs-populated',
        artifact_path: 'kbs/',
        current_phase: 'phase-2-sources-and-examples',
        branch: 'main',
      },
      [
        'modos escolhidos: 1+2',
        '3 exemplos de sucesso persistidos',
        'criterios derivados extraidos',
      ],
      ['kbs/etl-references.md', 'kbs/links-and-docs.md', 'kbs/success-examples.md', 'derived-criteria.yaml'],
      [],
      'iniciar F3 com os criterios derivados.'
    );
    assert.ok(r.tokenCount <= TOKEN_CEILING, 'F2 handoff ' + r.tokenCount);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F3 -> F4 handoff is under 500 tokens (AC 16, AC-103, KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-f3');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    // F3 handoff summarizes PUs by id only, pointing to process-map-as-is.yaml.
    const r = runBoundary(
      engine,
      'archaeologist',
      'stress-tester',
      {
        artifact_id: 'process-map-as-is',
        artifact_path: 'process-map-as-is.yaml',
        current_phase: 'phase-3-as-is',
        branch: 'main',
      },
      [
        'PUs: PU-001 ate PU-012',
        'primeiras Opportunities no OST: OPP-001, OPP-002, OPP-003',
      ],
      ['process-map-as-is.yaml', 'OST.md'],
      [],
      'iniciar F4 stress-test sobre as 12 PUs.'
    );
    assert.ok(r.tokenCount <= TOKEN_CEILING, 'F3 handoff ' + r.tokenCount);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F5 -> F6 handoff is under 500 tokens (AC 16, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-f5-f6');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = runBoundary(
      engine,
      'risk-mapper',
      'archaeologist',
      {
        artifact_id: 'risk-map',
        artifact_path: 'risk-map.yaml',
        current_phase: 'phase-5-risk-map',
        branch: 'main',
      },
      [
        'riscos por PU sobrevivente identificados',
        'residuais adicionadas ao OST como Opportunities',
        'primeiras Solutions emergiram',
      ],
      ['risk-map.yaml', 'OST.md'],
      [],
      'iniciar F6 to-be combinando filtro F4 e mitigacoes F5.'
    );
    assert.ok(r.tokenCount <= TOKEN_CEILING, 'F5->F6 handoff ' + r.tokenCount);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F6 -> F7 handoff is under 500 tokens (AC 16, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-f6');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    // F6 handoff summarizes Solutions by id only, pointing to OST.md.
    const r = runBoundary(
      engine,
      'archaeologist',
      'prioritizer',
      {
        artifact_id: 'process-map-to-be',
        artifact_path: 'process-map-to-be.yaml',
        current_phase: 'phase-6-to-be',
        branch: 'main',
      },
      [
        'Solutions definitivas: SOL-001 ate SOL-005',
        'Links Solution-Opportunity no OST',
      ],
      ['process-map-to-be.yaml', 'OST.md'],
      [],
      'iniciar F7 priorizacao ICE das 5 Solutions.'
    );
    assert.ok(r.tokenCount <= TOKEN_CEILING, 'F6 handoff ' + r.tokenCount);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('engine rejects handoff above 500-token ceiling with field named (AC 16)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('handoff-oversize');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const bigDecision = 'decisao muito longa '.repeat(200); // inflate budget.
    let err = null;
    try {
      engine.generate(
        'archaeologist',
        'stress-tester',
        {
          artifact_id: 'x',
          artifact_path: 'x',
          current_phase: 'phase-3-as-is',
          branch: 'main',
        },
        [bigDecision],
        [],
        [],
        'next.'
      );
    } catch (e) {
      err = e;
    }
    assert.notStrictEqual(err, null);
    assert.strictEqual(err.code, 'HANDOFF_OVER_BUDGET');
    assert.ok(err.message.includes('campo que mais pesa'));
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});
