'use strict';

// AC 10, 11, 16 (M4.4) — contract-builder validates each F9 YAML
// contract DIRECTLY against celula-schema.json / task-contract-schema.json
// via M3.4 Schema Gate. NO YAML->JSON intermediate conversion (FR-020,
// D-v1.1-06). Schema Gate completes validation in under 500ms per
// contract (NFR-003). AC-104.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('contract-builder.md persona exists at expected path (AC 10)', () => {
  assert.ok(
    fs.existsSync(helpers.CONTRACT_BUILDER_PATH),
    'contract-builder.md missing at ' + helpers.CONTRACT_BUILDER_PATH
  );
});

test('contract-builder frontmatter declares agent_id, tier 3, phases [9] (AC 10)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'contract-builder');
  assert.ok(
    String(frontmatter.tier) === '3',
    'tier expected 3, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['9']);
});

test('contract-builder declares yaml_to_json_intermediate: false (AC 11, FR-020, D-v1.1-06)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(
    String(frontmatter.yaml_to_json_intermediate),
    'false',
    'frontmatter must declare yaml_to_json_intermediate: false'
  );
  assert.ok(
    raw.includes('FR-020'),
    'persona must cite FR-020'
  );
  assert.ok(
    raw.includes('D-v1.1-06'),
    'persona must cite D-v1.1-06'
  );
});

test('contract-builder declares 500ms perf budget (AC 11, NFR-003)', () => {
  const raw = helpers.readFileText(helpers.CONTRACT_BUILDER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(
    String(frontmatter.schema_gate_perf_budget_ms),
    '500',
    'frontmatter must declare 500ms perf budget'
  );
  assert.ok(
    raw.includes('500ms') || raw.includes('500 ms'),
    'persona prose must reference 500ms budget'
  );
  assert.ok(
    raw.includes('NFR-003'),
    'persona must cite NFR-003'
  );
});

test('phase-9 task instructs direct YAML validation via Schema Gate (AC 11, FR-020, D-v1.1-06)', () => {
  const raw = helpers.readFileText(helpers.PHASE_9_TASK);
  assert.ok(raw.includes('Schema Gate'));
  assert.ok(raw.includes('YAML') || raw.includes('yaml'));
  assert.ok(
    raw.includes('SEM conversao YAML para JSON intermediaria') ||
      raw.includes('sem conversao YAML para JSON intermediaria') ||
      raw.includes('sem conversao YAML para JSON'),
    'phase-9 task must declare no YAML->JSON intermediate conversion'
  );
  assert.ok(raw.includes('FR-020'));
  assert.ok(raw.includes('D-v1.1-06'));
});

test('Schema Gate validates a well-formed contract YAML in under 500ms (AC 11, NFR-003)', () => {
  const logs = helpers.mkTmpLogs('contract-perf');
  const dir = helpers.mkTmpCell('contract-perf-cell');
  try {
    const contract = helpers.makeContractYaml({
      task_id: 'TASK-001',
      description: 'descricao curta da Task em pt-BR',
      inputs: [
        {
          name: 'entrada1',
          type: 'string',
          description: 'entrada de texto curta',
          required: true,
        },
      ],
      outputs: [
        {
          name: 'saida1',
          type: 'string',
          description: 'saida de texto curta',
        },
      ],
      gates: ['quality_gate'],
      schema_reference: '.kaizen-dvir/dvir/schemas/task-contract-schema.json',
    });
    const target = path.join(dir, 'TASK-001.yaml');
    fs.writeFileSync(target, contract, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    // Warm up — first call pays schema-load cost.
    schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);

    // Measured call.
    const start = process.hrtime.bigint();
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);
    const durationMs = Number(
      (process.hrtime.bigint() - start) / 1000000n
    );

    assert.strictEqual(
      out.verdict,
      'PASS',
      'errors: ' + JSON.stringify(out.errors)
    );
    assert.strictEqual(out.errors.length, 0);
    assert.ok(
      durationMs < 500,
      'schema validation took ' + durationMs + 'ms; must be < 500ms'
    );
    assert.ok(
      out.durationMs < 500,
      'reported durationMs = ' + out.durationMs + ' must be < 500ms'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(dir);
  }
});

test('Schema Gate consumes YAML directly from disk (no JSON intermediate) (AC 11, FR-020)', () => {
  const dir = helpers.mkTmpCell('contract-yaml-direct');
  try {
    const contract = helpers.makeContractYaml({
      task_id: 'TASK-002',
      description: 'descricao curta',
      inputs: [
        {
          name: 'entrada1',
          type: 'string',
          description: 'descricao',
          required: true,
        },
      ],
      outputs: [
        {
          name: 'saida1',
          type: 'string',
          description: 'descricao',
        },
      ],
      gates: ['quality_gate'],
    });
    const target = path.join(dir, 'TASK-002.yaml');
    fs.writeFileSync(target, contract, 'utf8');

    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(target, helpers.TASK_CONTRACT_SCHEMA);
    assert.strictEqual(out.verdict, 'PASS');

    // Confirm no JSON sibling was generated as a byproduct.
    const jsonSibling = target.replace(/\.yaml$/u, '.json');
    assert.strictEqual(
      fs.existsSync(jsonSibling),
      false,
      'no JSON sibling must be created (FR-020 forbids YAML->JSON conversion)'
    );
  } finally {
    helpers.rm(dir);
  }
});
