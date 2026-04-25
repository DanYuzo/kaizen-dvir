'use strict';

// M2 Gate Criterion 4 (Epic KZ-M2 § Gate Criteria):
// Schema validation accepts the expanded v1.4 manifest in under 500ms,
// YAML 1.2 strict mode (no implicit typing). We validate the parsed
// object shape and also re-check rejection on the Norway Problem input —
// the contract is: accept the well-formed, reject the ambiguous, under
// budget.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, SCHEMAS_DIR } = require('./_helpers');

const SCHEMA_PATH = path.join(SCHEMAS_DIR, 'celula-schema.json');
const VALIDATOR_PATH = path.join(SCHEMAS_DIR, 'validator.js');

function loadValidator() {
  delete require.cache[require.resolve(VALIDATOR_PATH)];
  return require(VALIDATOR_PATH);
}

function validManifest() {
  return {
    description: 'Celula gate-4',
    boot: ['README.md', 'agents/chief/MEMORY.md'],
    tiers: { 'tier-1': { name: 'chief' } },
    commands: [{ name: 'start', description: 'Inicia fluxo' }],
    components: {
      agents: ['chief.md'],
      tasks: ['start.md'],
      workflows: [],
      templates: [],
      checklists: [],
      kbs: [],
    },
    authorities: { exclusive: ['start'] },
    dependencies: { celulas: [] },
  };
}

test('M2 Gate 4: expanded v1.4 manifest accepted under 500ms', () => {
  const tmp = mkTmp('gate4');
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const { validate } = loadValidator();
    const manifest = validManifest();

    const start = process.hrtime.bigint();
    const result = validate(schema, manifest);
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;

    assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
    assert.ok(ms < 500, 'validation took ' + ms.toFixed(3) + 'ms; budget 500ms');

    process.stdout.write('  [M2 Gate 4] accept latency=' + ms.toFixed(3) + 'ms\n');
  } finally {
    rmTmp(tmp);
  }
});

test('M2 Gate 4: Norway-coerced manifest rejected (YAML 1.2 strict contract)', () => {
  const tmp = mkTmp('gate4-reject');
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const { validate } = loadValidator();
    const manifest = validManifest();
    // Simulate the YAML 1.1 Norway Problem: `description: no` -> boolean.
    manifest.description = false;
    const result = validate(schema, manifest);
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.some(
        (e) => /description/.test(e.path) && /Tipo invalido/.test(e.message)
      ),
      'pt-BR explicit type error expected; got ' + JSON.stringify(result.errors)
    );
  } finally {
    rmTmp(tmp);
  }
});

test('M2 Gate 4: manifest missing required field rejected', () => {
  const tmp = mkTmp('gate4-missing');
  try {
    const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    const { validate } = loadValidator();
    const manifest = validManifest();
    delete manifest.components;
    const result = validate(schema, manifest);
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.some(
        (e) => /Campo obrigatorio ausente/.test(e.message) && /components/.test(e.message)
      ),
      JSON.stringify(result.errors)
    );
  } finally {
    rmTmp(tmp);
  }
});
