'use strict';

// AC 15 (M4.3) — pu-reduction-justified.md checklist fires on F4
// Quality Gate invocation. Covers: cada PU cortada com autor / motivo /
// impacto se removida; meta de ≥10% atingida OU waiver registrado;
// ordem Musk respeitada; Opportunities removidas do OST com
// justificativa; nenhuma PU cortada sem rastreabilidade.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('pu-reduction-justified.md exists at expected path (AC 15)', () => {
  assert.ok(
    fs.existsSync(helpers.PU_REDUCTION_CHECKLIST),
    'pu-reduction-justified.md missing at ' + helpers.PU_REDUCTION_CHECKLIST
  );
});

test('checklist declares F4 Quality Gate invocation (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(
    raw.includes('Quality Gate F4') || raw.includes('gate F4') || raw.includes('F4 antes'),
    'checklist must declare invocation by F4 Quality Gate'
  );
});

test('checklist covers PU rationale fields (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(raw.includes('quem decidiu') || raw.includes('autor'));
  assert.ok(raw.includes('motivo'));
  assert.ok(raw.includes('quebra'));
  assert.ok(raw.includes('cut-log.yaml'));
});

test('checklist covers ≥10% target with waiver path (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(raw.includes('10%'));
  assert.ok(raw.includes('waiver') || raw.includes('approved_by'));
});

test('checklist covers Musk order respect (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(raw.includes('Musk'));
  assert.ok(
    raw.includes('Questionar') &&
      raw.includes('Deletar') &&
      raw.includes('Simplificar') &&
      raw.includes('Acelerar') &&
      raw.includes('Automatizar'),
    'checklist must enumerate the 5 Musk steps in pt-BR'
  );
});

test('checklist covers OST pruning with justification (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(raw.includes('OST'));
  assert.ok(raw.includes('Opportunit') || raw.includes('Opportunities'));
  assert.ok(raw.includes('cut-log.yaml'));
});

test('checklist requires no PU cut without traceability (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  assert.ok(
    raw.includes('rastreabilidade') ||
      raw.includes('sem rastreabilidade') ||
      raw.includes('sem rastreio'),
    'checklist must require traceability for every cut'
  );
});

test('checklist contains actionable [ ] items (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  const items = (raw.match(/-\s\[\s\]/gu) || []).length;
  assert.ok(
    items >= 10,
    'checklist must have at least 10 actionable items, got ' + items
  );
});

test('phase-4 task references pu-reduction-justified.md as gate-time checklist (AC 15)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  assert.ok(
    raw.includes('pu-reduction-justified'),
    'phase-4 task must reference pu-reduction-justified checklist'
  );
});

test('manifest declares pu-reduction-justified in components.checklists (AC 15)', () => {
  const raw = helpers.readFileText(helpers.MANIFEST_PATH);
  assert.ok(raw.includes('pu-reduction-justified'));
});

test('checklist follows pt-BR diretrizes — short sentences, present voice (FR-121)', () => {
  const raw = helpers.readFileText(helpers.PU_REDUCTION_CHECKLIST);
  // No English fillers expected in user-facing items.
  assert.ok(!raw.toLowerCase().includes('please'));
  assert.ok(!raw.toLowerCase().includes('should '));
  // Comments allow EN; checklist body must not include English imperatives
  // outside the comment block.
  const bodyOnly = raw.replace(/<!--[\s\S]*?-->/gu, '');
  assert.ok(!bodyOnly.toLowerCase().includes('please'));
});
