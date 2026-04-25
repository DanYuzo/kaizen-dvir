'use strict';

// AC 13 (M4.4) — contract-builder blocks any empty or incomplete Task
// from advancing to F10. An empty Task emits Quality Gate FAIL with
// pt-BR message and stops F10 progression until resolved. FR-106.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('contract-builder persona declares empty-task block authority (AC 13)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  assert.ok(
    raw.includes('Task vazia') || raw.includes('Task incompleta'),
    'persona must declare blocking of empty/incomplete Task'
  );
  assert.ok(
    raw.includes('F10'),
    'persona must reference F10 progression block'
  );
});

test('phase-9 task instructs blocking of empty Task with pt-BR message (AC 13)', () => {
  const raw = helpers.readFileText(helpers.PHASE_9_TASK);
  assert.ok(
    raw.includes('Task vazia') || raw.includes('Task incompleta'),
    'phase-9 task must surface empty-Task block'
  );
  assert.ok(
    raw.includes('F10'),
    'phase-9 task must reference F10 block'
  );
  assert.ok(
    raw.includes('Schema Gate PASS') || raw.includes('Schema Gate em PASS'),
    'phase-9 task must require Schema Gate PASS before F10'
  );
});

test('Schema Gate FAILs on empty contract (AC 13, FR-106)', () => {
  const dir = helpers.mkTmpCell('empty-contract');
  try {
    const target = path.join(dir, 'TASK-EMPTY.yaml');
    fs.writeFileSync(target, '\n', 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.errors.length >= 1);
  } finally {
    helpers.rm(dir);
  }
});

test('Schema Gate FAILs on incomplete contract missing inputs and outputs (AC 13)', () => {
  const dir = helpers.mkTmpCell('incomplete-contract');
  try {
    const yaml = [
      'task_id: "TASK-INCOMPLETE"',
      'description: "descricao curta"',
      'gates:',
      '  - "quality_gate"',
      '',
    ].join('\n');
    const target = path.join(dir, 'TASK-INCOMPLETE.yaml');
    fs.writeFileSync(target, yaml, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);
    assert.strictEqual(out.verdict, 'FAIL');
    // Missing both `inputs` and `outputs` — at least one error per field.
    const inputErr = out.errors.find(
      (e) => typeof e.path === 'string' && e.path.includes('inputs')
    );
    const outputErr = out.errors.find(
      (e) => typeof e.path === 'string' && e.path.includes('outputs')
    );
    assert.ok(
      inputErr || outputErr,
      'must surface at least one field error for missing inputs/outputs'
    );
  } finally {
    helpers.rm(dir);
  }
});

test('contract-builder block message names Task id in pt-BR (AC 13, NFR-102)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  // Persona must surface a pt-BR template referencing `<id>` and F10.
  assert.ok(
    raw.includes('Task <id>') || raw.includes('Task <task-id>') || raw.includes('Task <'),
    'persona must surface pt-BR error template naming the Task id'
  );
});
