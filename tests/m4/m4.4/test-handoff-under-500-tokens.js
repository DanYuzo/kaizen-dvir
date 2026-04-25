'use strict';

// AC 20 (M4.4) — Handoff artifacts F7->F8, F8->F9, and F9->F10 each
// fit under 500 tokens via M3.2 handoff-engine. AC-103, KZ-M4-R3.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

const TOKEN_CEILING = 500;

test('F7 -> F8 handoff fits under 500 tokens (AC 20, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f7-to-f8');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'prioritizer',
      'task-granulator',
      {
        artifact_id: 'mvp-backlog',
        artifact_path: 'mvp-backlog.yaml',
        current_phase: 'phase-7-prioritize',
        branch: 'main',
      },
      [
        'MVP essencial fechado com 4 PUs',
        'roadmap aberto com 6 PUs',
        'desbloqueio: PU-002',
        'OST com Solutions marcadas mvp ou roadmap',
      ],
      ['mvp-backlog.yaml', 'roadmap.yaml', 'OST.md'],
      [],
      'iniciar F8 granularizando MVP a partir de PU-002.'
    );
    assert.ok(
      r.tokenCount <= TOKEN_CEILING,
      'F7->F8 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F8 -> F9 handoff fits under 500 tokens (AC 20, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f8-to-f9');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'task-granulator',
      'contract-builder',
      {
        artifact_id: 'tasks',
        artifact_path: 'tasks/',
        current_phase: 'phase-8-granulate',
        branch: 'main',
      },
      [
        'Tasks atomicas: 8',
        'Actions inline em todas as Tasks',
        'nenhum action-*.md emitido',
        'OST fechado: Task -> Solution -> Opportunity -> Outcome',
      ],
      ['tasks/', 'OST.md'],
      [],
      'iniciar F9 escrevendo contratos por Task.'
    );
    assert.ok(
      r.tokenCount <= TOKEN_CEILING,
      'F8->F9 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F9 -> F10 handoff fits under 500 tokens (AC 20, AC-103)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f9-to-f10');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const r = engine.generate(
      'contract-builder',
      'publisher',
      {
        artifact_id: 'contracts',
        artifact_path: 'contracts/',
        current_phase: 'phase-9-contracts',
        branch: 'main',
      },
      [
        'contratos YAML: 8',
        'Schema Gate PASS para todos',
        'sob 500ms por contrato',
        'erro por campo em pt-BR pronto',
      ],
      ['contracts/', 'OST.md'],
      [],
      'iniciar F10 progressive-systemizer + publisher.'
    );
    assert.ok(
      r.tokenCount <= TOKEN_CEILING,
      'F9->F10 handoff ' + r.tokenCount + ' > ' + TOKEN_CEILING
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('chained F7 -> F8 -> F9 -> F10 cumulative pointer pattern stays under budget (AC 20, KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('chain-7-10');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const f7 = engine.generate(
      'prioritizer',
      'task-granulator',
      {
        artifact_id: 'mvp-backlog',
        artifact_path: 'mvp-backlog.yaml',
        current_phase: 'phase-7-prioritize',
        branch: 'main',
      },
      ['MVP fechado', 'roadmap aberto'],
      ['mvp-backlog.yaml', 'roadmap.yaml', 'OST.md'],
      [],
      'iniciar F8.'
    );
    const f8 = engine.generate(
      'task-granulator',
      'contract-builder',
      {
        artifact_id: 'tasks',
        artifact_path: 'tasks/',
        current_phase: 'phase-8-granulate',
        branch: 'main',
      },
      ['Tasks atomicas geradas', 'OST fechado'],
      ['tasks/', 'OST.md'],
      [],
      'iniciar F9.'
    );
    const f9 = engine.generate(
      'contract-builder',
      'publisher',
      {
        artifact_id: 'contracts',
        artifact_path: 'contracts/',
        current_phase: 'phase-9-contracts',
        branch: 'main',
      },
      ['contratos validados', 'sob orcamento'],
      ['contracts/', 'OST.md'],
      [],
      'iniciar F10.'
    );
    assert.ok(f7.tokenCount <= TOKEN_CEILING);
    assert.ok(f8.tokenCount <= TOKEN_CEILING);
    assert.ok(f9.tokenCount <= TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('handoff payloads carry reference pointers only, not embedded content (KZ-M4-R3)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('pointer-only');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    const f8 = engine.generate(
      'task-granulator',
      'contract-builder',
      {
        artifact_id: 'tasks',
        artifact_path: 'tasks/',
        current_phase: 'phase-8-granulate',
        branch: 'main',
      },
      ['referencia compacta'],
      ['tasks/', 'OST.md'],
      [],
      'iniciar F9.'
    );
    assert.ok(f8.artifact.handoff.files_modified.includes('tasks/'));
    assert.ok(f8.artifact.handoff.files_modified.includes('OST.md'));
    assert.ok(f8.tokenCount < TOKEN_CEILING);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});
