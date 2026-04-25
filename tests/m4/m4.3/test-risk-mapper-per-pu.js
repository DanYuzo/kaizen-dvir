'use strict';

// AC 8 (M4.3) — F5 produces a risk entry per surviving PU. 100%
// coverage, no surviving PU left unassessed. AC-108, FR-104.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('risk-mapper.md persona exists at expected path (AC 7)', () => {
  assert.ok(
    fs.existsSync(helpers.RISK_MAPPER_PATH),
    'risk-mapper.md missing at ' + helpers.RISK_MAPPER_PATH
  );
});

test('risk-mapper frontmatter declares agent_id, tier 3, phases [5] (AC 7)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'risk-mapper');
  assert.ok(
    String(frontmatter.tier) === '3',
    'tier expected 3, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['5']);
});

test('risk-mapper references diretrizes-escrita.md in system prompt (FR-121)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  assert.ok(
    raw.includes('diretrizes-escrita.md'),
    'risk-mapper persona must reference diretrizes-escrita.md (FR-121)'
  );
});

test('validateRiskEntry passes when PU has at least one risk (AC 8)', () => {
  const entry = {
    pu_id: 'PU-001',
    riscos: [
      {
        id: 'RISK-001',
        categoria: 'operacional',
        descricao: 'expert pode esquecer de revisar',
        mitigacao: 'checklist obrigatorio antes da entrega',
      },
    ],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, true);
});

test('validateRiskEntry fails when PU has zero risks (AC 8)', () => {
  const entry = { pu_id: 'PU-001', riscos: [] };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
  assert.ok(r.reason.includes('PU-001'));
  assert.ok(r.reason.includes('sem risco'));
});

test('validateRiskEntry fails when riscos field missing (AC 8)', () => {
  const entry = { pu_id: 'PU-002' };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
});

test('validateRiskEntry fails when pu_id missing (AC 8)', () => {
  const entry = {
    riscos: [{ id: 'RISK-001', categoria: 'tecnico', descricao: 'x', mitigacao: 'y' }],
  };
  const r = helpers.validateRiskEntry(entry);
  assert.strictEqual(r.valid, false);
  assert.ok(r.reason.includes('pu_id'));
});

test('100% coverage check across surviving PU set (AC 8)', () => {
  const survivingPus = ['PU-002', 'PU-004', 'PU-006', 'PU-008'];
  const riskMap = [
    {
      pu_id: 'PU-002',
      riscos: [
        { id: 'RISK-001', categoria: 'operacional', descricao: 'd', mitigacao: 'm' },
      ],
    },
    {
      pu_id: 'PU-004',
      riscos: [
        { id: 'RISK-002', categoria: 'tecnico', descricao: 'd', mitigacao: 'm' },
      ],
    },
    {
      pu_id: 'PU-006',
      riscos: [
        { id: 'RISK-003', categoria: 'dependencia', descricao: 'd', mitigacao: 'm' },
      ],
    },
    {
      pu_id: 'PU-008',
      riscos: [
        { id: 'RISK-004', categoria: 'operacional', descricao: 'd', mitigacao: 'm' },
      ],
    },
  ];
  for (const pu of survivingPus) {
    const found = riskMap.find((e) => e.pu_id === pu);
    assert.ok(found, 'PU ' + pu + ' must have a risk entry');
    assert.strictEqual(helpers.validateRiskEntry(found).valid, true);
  }
});

test('coverage check fails when one surviving PU lacks entry (AC 8)', () => {
  const survivingPus = ['PU-002', 'PU-004'];
  const riskMap = [
    {
      pu_id: 'PU-002',
      riscos: [
        { id: 'RISK-001', categoria: 'operacional', descricao: 'd', mitigacao: 'm' },
      ],
    },
  ];
  const missing = survivingPus.filter(
    (pu) => !riskMap.find((e) => e.pu_id === pu)
  );
  assert.deepStrictEqual(missing, ['PU-004']);
});

test('phase-5 task declares per-PU coverage check (AC 8)', () => {
  const raw = helpers.readFileText(helpers.PHASE_5_TASK);
  assert.ok(
    raw.includes('por PU') || raw.includes('PU sobrevivente'),
    'phase-5 must declare per-PU iteration'
  );
  assert.ok(
    raw.includes('100%') || raw.includes('cobertura') || raw.includes('toda PU'),
    'phase-5 must declare 100% coverage'
  );
});

test('risk-mapper persona declares 3 risk categories (AC 8, FR-104)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  assert.ok(raw.includes('operacional'));
  assert.ok(raw.includes('tecnico'));
  assert.ok(raw.includes('dependencia'));
});
