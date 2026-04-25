'use strict';

// AC 12 (M4.4) — Schema Gate at F9 emits per-field pt-BR error on
// violation. Error names the offending field, states the violation,
// and suggests the correction (NFR-101 — guide, not just describe).
// AC-104, NFR-102.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('Schema Gate emits FAIL with per-field error when required field missing (AC 12, AC-104)', () => {
  const dir = helpers.mkTmpCell('per-field-missing');
  try {
    // Missing `description` (required field).
    const contract = [
      'task_id: "TASK-001"',
      'inputs:',
      '  - name: "entrada"',
      '    type: "string"',
      '    description: "x"',
      'outputs:',
      '  - name: "saida"',
      '    type: "string"',
      '    description: "y"',
      'gates:',
      '  - "quality_gate"',
      '',
    ].join('\n');
    const target = path.join(dir, 'TASK-001.yaml');
    fs.writeFileSync(target, contract, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);

    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.errors.length >= 1, 'must surface at least one error');
    // First error names a path (pt-BR error message).
    const first = out.errors[0];
    assert.ok(
      typeof first.path === 'string' && first.path.length > 0,
      'error must carry a path field naming the offending field'
    );
    assert.ok(
      typeof first.message === 'string' && first.message.length > 0,
      'error must carry a pt-BR message'
    );
  } finally {
    helpers.rm(dir);
  }
});

test('Schema Gate emits per-field error when wrong type passed (AC 12, AC-104)', () => {
  const dir = helpers.mkTmpCell('per-field-type');
  try {
    // `inputs` should be array, not string.
    const contract = [
      'task_id: "TASK-002"',
      'description: "descricao curta"',
      'inputs: "wrong-type"',
      'outputs:',
      '  - name: "saida"',
      '    type: "string"',
      '    description: "y"',
      'gates:',
      '  - "quality_gate"',
      '',
    ].join('\n');
    const target = path.join(dir, 'TASK-002.yaml');
    fs.writeFileSync(target, contract, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);

    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.errors.length >= 1);
    // Find the input-type error path.
    const matched = out.errors.find(
      (e) => typeof e.path === 'string' && e.path.includes('inputs')
    );
    assert.ok(
      matched,
      'error path must point at "inputs" field. errors: ' +
        JSON.stringify(out.errors)
    );
  } finally {
    helpers.rm(dir);
  }
});

test('contract-builder persona declares per-field pt-BR error contract (AC 12, NFR-101, NFR-102)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  assert.ok(
    raw.includes('por campo') || raw.includes('per-field') || raw.includes('Erro por campo'),
    'persona must declare per-field error contract'
  );
  assert.ok(
    raw.includes('AC-104'),
    'persona must cite AC-104'
  );
  assert.ok(
    raw.includes('NFR-101') || raw.includes('orient'),
    'persona must cite NFR-101 or describe guidance requirement'
  );
});

test('phase-9 task surfaces per-field pt-BR error examples (AC 12, AC-104)', () => {
  const raw = helpers.readFileText(helpers.PHASE_9_TASK);
  // Examples of per-field errors must appear in pt-BR.
  assert.ok(
    raw.includes('path:') && raw.includes('inputs') && raw.includes('outputs'),
    'phase-9 must surface per-field error examples'
  );
  assert.ok(
    raw.includes('em pt-BR') || raw.includes('pt-BR'),
    'phase-9 must require pt-BR error messages'
  );
});

test('Schema Gate error path uses dotted notation for nested fields (AC 12)', () => {
  const dir = helpers.mkTmpCell('per-field-nested');
  try {
    // inputs[0] missing `description` (required nested field).
    const contract = [
      'task_id: "TASK-003"',
      'description: "descricao curta"',
      'inputs:',
      '  - name: "entrada"',
      '    type: "string"',
      'outputs:',
      '  - name: "saida"',
      '    type: "string"',
      '    description: "y"',
      'gates:',
      '  - "quality_gate"',
      '',
    ].join('\n');
    const target = path.join(dir, 'TASK-003.yaml');
    fs.writeFileSync(target, contract, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);

    assert.strictEqual(out.verdict, 'FAIL');
    const nested = out.errors.find(
      (e) =>
        typeof e.path === 'string' &&
        (e.path.includes('inputs') && e.path.includes('description'))
    );
    assert.ok(
      nested,
      'error path must point at inputs[0].description (nested). errors: ' +
        JSON.stringify(out.errors)
    );
  } finally {
    helpers.rm(dir);
  }
});
