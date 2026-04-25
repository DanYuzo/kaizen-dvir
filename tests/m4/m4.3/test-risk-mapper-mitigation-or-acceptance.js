'use strict';

// AC 9 (M4.3) — F5 associates a concrete mitigation OR an explicit
// acceptance record (with approved_by: expert and rationale) OR a cut
// recommendation. Never produces a bare risk entry. AC-108.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('risk with concrete mitigation passes (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'esquecimento humano',
        mitigacao: 'lembrete automatico via slack diariamente',
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, true);
});

test('risk with acceptance record passes when approved_by expert (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'tecnico',
        descricao: 'depende de API externa flaky',
        aceite: {
          approved_by: 'expert',
          razao: 'custo de troca alto, frequencia de falha baixa',
        },
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, true);
});

test('risk with cut recommendation passes (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'dependencia',
        descricao: 'fornecedor instavel',
        recomendacao_corte: 'remover PU e absorver fluxo em PU-003',
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, true);
});

test('bare risk without any outcome fails (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      { id: 'RISK-001', categoria: 'operacional', descricao: 'risco' },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
  assert.ok(r.reason.includes('sem destino'));
  assert.ok(
    r.reason.includes('mitigacao') &&
      r.reason.includes('aceite') &&
      r.reason.includes('corte')
  );
});

test('acceptance without approved_by fails (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'tecnico',
        descricao: 'risco',
        aceite: { razao: 'aceito' },
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
});

test('acceptance without razao fails (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'risco',
        aceite: { approved_by: 'expert' },
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
});

test('acceptance with approved_by other than expert fails (AC 9)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'risco',
        aceite: { approved_by: 'agent', razao: 'aceito' },
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
});

test('mixed PU with several risks each having a destination passes (AC 9)', () => {
  const entry = {
    pu_id: 'PU-005',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'd1',
        mitigacao: 'm1',
      },
      {
        id: 'RISK-002',
        categoria: 'tecnico',
        descricao: 'd2',
        aceite: { approved_by: 'expert', razao: 'r2' },
      },
      {
        id: 'RISK-003',
        categoria: 'dependencia',
        descricao: 'd3',
        recomendacao_corte: 'voltar a F4',
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, true);
});

test('one bare risk in mixed batch fails entire entry (AC 9)', () => {
  const entry = {
    pu_id: 'PU-005',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'd1',
        mitigacao: 'm1',
      },
      // RISK-002 is bare — no destination.
      { id: 'RISK-002', categoria: 'tecnico', descricao: 'd2' },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
  assert.ok(r.reason.includes('RISK-002'));
});

test('risk-mapper persona declares 3 outcome options (AC 9, AC-108)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  assert.ok(raw.includes('mitigacao') || raw.includes('Mitigacao'));
  assert.ok(raw.includes('aceite') || raw.includes('Aceite'));
  assert.ok(
    raw.includes('corte') ||
      raw.includes('cut') ||
      raw.includes('Recomendacao'),
    'risk-mapper persona must mention cut recommendation'
  );
  assert.ok(
    raw.includes('approved_by'),
    'risk-mapper persona must require approved_by for acceptance'
  );
});

test('phase-5 task declares mitigation OR acceptance OR cut (AC 9)', () => {
  const raw = helpers.readFileText(helpers.PHASE_5_TASK);
  assert.ok(raw.includes('mitigacao'));
  assert.ok(raw.includes('aceite'));
  assert.ok(raw.includes('corte'));
  assert.ok(raw.includes('approved_by'));
});
