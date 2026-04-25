'use strict';

// AC 13 (M4.3) — Handoff artifacts F4→F5 and F5→F6 stay under 500
// tokens each. Both use the M3.2 handoff-engine reference-pointer
// payload pattern. AC-103, KZ-M4-R3.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

const TOKEN_CEILING = 500;

test('F4 -> F5 handoff fits under 500 tokens (AC 13, AC-103, KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f4-to-f5');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'stress-tester',
      'risk-mapper',
      {
        artifact_id: 'as-is-filtered',
        artifact_path: 'as-is-filtered.yaml',
        current_phase: 'phase-4-stress-test',
        branch: 'main',
      },
      [
        'PUs sobreviventes: PU-002 PU-004 PU-006 PU-008',
        'PUs cortadas: PU-001 PU-003 PU-005',
        'meta de corte 25% atingida sem waiver',
      ],
      ['as-is-filtered.yaml', 'cut-log.yaml', 'OST.md'],
      [],
      'iniciar F5 risk-map sobre as 4 PUs sobreviventes.'
    );
    assert.ok(
      r.tokenCount <= TOKEN_CEILING,
      'F4->F5 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F5 -> F6 handoff fits under 500 tokens (AC 13, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f5-to-f6');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
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
        'mitigacoes concretas: 4',
        'aceites com approved_by expert: 2',
        'Opportunities residuais e primeiras Solutions no OST',
      ],
      ['risk-map.yaml', 'risk-reversal-guarantees.yaml', 'OST.md'],
      [],
      'iniciar F6 to-be combinando filtro F4 e mitigacoes F5.'
    );
    assert.ok(
      r.tokenCount <= TOKEN_CEILING,
      'F5->F6 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F4->F5 handoff carries reference pointers only — not embedded content (KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f4-to-f5-pointer');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'stress-tester',
      'risk-mapper',
      {
        artifact_id: 'as-is-filtered',
        artifact_path: 'as-is-filtered.yaml',
        current_phase: 'phase-4-stress-test',
        branch: 'main',
      },
      ['referencia compacta'],
      ['as-is-filtered.yaml', 'cut-log.yaml', 'OST.md'],
      [],
      'iniciar F5.'
    );
    // Files referenced are pointer paths, not inlined content.
    assert.ok(r.artifact.handoff.files_modified.includes('as-is-filtered.yaml'));
    assert.ok(r.artifact.handoff.files_modified.includes('cut-log.yaml'));
    assert.ok(r.artifact.handoff.files_modified.includes('OST.md'));
    // The token count must stay well under ceiling with pointer pattern.
    assert.ok(r.tokenCount < TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F5->F6 handoff carries reference pointers only (KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f5-to-f6-pointer');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'risk-mapper',
      'archaeologist',
      {
        artifact_id: 'risk-map',
        artifact_path: 'risk-map.yaml',
        current_phase: 'phase-5-risk-map',
        branch: 'main',
      },
      ['referencia compacta'],
      ['risk-map.yaml', 'risk-reversal-guarantees.yaml', 'OST.md'],
      [],
      'iniciar F6.'
    );
    assert.ok(r.artifact.handoff.files_modified.includes('risk-map.yaml'));
    assert.ok(r.artifact.handoff.files_modified.includes('risk-reversal-guarantees.yaml'));
    assert.ok(r.artifact.handoff.files_modified.includes('OST.md'));
    assert.ok(r.tokenCount < TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('handoff-engine rejects oversized F4 handoff with pt-BR field name (AC 13)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('oversize');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const inflate = 'rationale extenso de corte com muitos detalhes '.repeat(100);
    let err = null;
    try {
      engine.generate(
        'stress-tester',
        'risk-mapper',
        {
          artifact_id: 'as-is-filtered',
          artifact_path: 'x',
          current_phase: 'phase-4-stress-test',
          branch: 'main',
        },
        [inflate],
        [],
        [],
        'next.'
      );
    } catch (e) {
      err = e;
    }
    assert.notStrictEqual(err, null);
    assert.strictEqual(err.code, 'HANDOFF_OVER_BUDGET');
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('chained F3 -> F4 -> F5 -> F6 cumulative pointer pattern stays under budget (KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('chain');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    // Each link is independent — token budget applies per handoff.
    const f3 = engine.generate(
      'archaeologist',
      'stress-tester',
      {
        artifact_id: 'process-map-as-is',
        artifact_path: 'process-map-as-is.yaml',
        current_phase: 'phase-3-as-is',
        branch: 'main',
      },
      ['PUs: PU-001 a PU-012'],
      ['process-map-as-is.yaml', 'OST.md'],
      [],
      'iniciar F4.'
    );
    const f4 = engine.generate(
      'stress-tester',
      'risk-mapper',
      {
        artifact_id: 'as-is-filtered',
        artifact_path: 'as-is-filtered.yaml',
        current_phase: 'phase-4-stress-test',
        branch: 'main',
      },
      ['cortou 3 PUs', 'meta atingida'],
      ['as-is-filtered.yaml', 'cut-log.yaml', 'OST.md'],
      [],
      'iniciar F5.'
    );
    const f5 = engine.generate(
      'risk-mapper',
      'archaeologist',
      {
        artifact_id: 'risk-map',
        artifact_path: 'risk-map.yaml',
        current_phase: 'phase-5-risk-map',
        branch: 'main',
      },
      ['riscos mapeados', 'OST cresceu'],
      ['risk-map.yaml', 'risk-reversal-guarantees.yaml', 'OST.md'],
      [],
      'iniciar F6.'
    );
    assert.ok(f3.tokenCount <= TOKEN_CEILING);
    assert.ok(f4.tokenCount <= TOKEN_CEILING);
    assert.ok(f5.tokenCount <= TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});
