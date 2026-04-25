'use strict';

// AC 4 — Schema Gate validates YAML directly against JSON Schema, no
// intermediate YAML→JSON conversion file (FR-020, D-v1.1-06).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const SCHEMA_PATH = path.join(helpers.SCHEMAS_DIR, 'celula-schema.json');

function writeYaml(dir, name, content) {
  const full = path.join(dir, name);
  fs.writeFileSync(full, content, { encoding: 'utf8' });
  return full;
}

test('well-formed celula.yaml validates as PASS', () => {
  const logs = helpers.mkTmpLogs('sg-yaml-pass');
  const tmp = helpers.mkTmpDir('sg-yaml-pass-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'description: "celula de teste"\n' +
      'boot:\n' +
      '  - "boot-1"\n' +
      'tiers:\n' +
      '  worker:\n' +
      '    role: "executor"\n' +
      'commands:\n' +
      '  - name: "help"\n' +
      '    description: "mostra ajuda"\n' +
      'components:\n' +
      '  templates: []\n' +
      '  checklists: []\n' +
      '  kbs: []\n';
    const yamlPath = writeYaml(tmp, 'celula.yaml', yaml);
    const out = schema.validate(yamlPath, SCHEMA_PATH);
    assert.strictEqual(out.verdict, 'PASS', JSON.stringify(out.errors));
    assert.strictEqual(out.errors.length, 0);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('missing required field fails with field-specific pt-BR error', () => {
  const logs = helpers.mkTmpLogs('sg-yaml-fail');
  const tmp = helpers.mkTmpDir('sg-yaml-fail-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'description: "incompleta"\n' +
      'boot:\n' +
      '  - "x"\n';
    const yamlPath = writeYaml(tmp, 'celula.yaml', yaml);
    const out = schema.validate(yamlPath, SCHEMA_PATH);
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.errors.length > 0);
    const msgs = out.errors.map((e) => e.message).join(' | ');
    assert.match(msgs, /obrigatorio/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('YAML 1.1 implicit boolean (R-015) rejected as ambiguous', () => {
  const logs = helpers.mkTmpLogs('sg-r015');
  const tmp = helpers.mkTmpDir('sg-r015-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    // Bare `no` would be parsed as boolean false in YAML 1.1.
    const yaml =
      'description: no\n' +
      'boot:\n' +
      '  - "x"\n' +
      'tiers:\n' +
      '  worker:\n' +
      '    role: "x"\n' +
      'commands: []\n' +
      'components:\n' +
      '  templates: []\n' +
      '  checklists: []\n' +
      '  kbs: []\n';
    const yamlPath = writeYaml(tmp, 'celula.yaml', yaml);
    const out = schema.validate(yamlPath, SCHEMA_PATH);
    assert.strictEqual(out.verdict, 'FAIL');
    const msgs = out.errors.map((e) => e.message).join(' | ');
    assert.match(msgs, /ambiguo|aspas/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('no intermediate JSON file is created on disk', () => {
  const logs = helpers.mkTmpLogs('sg-no-json');
  const tmp = helpers.mkTmpDir('sg-no-json-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'description: "x"\n' +
      'boot:\n' +
      '  - "x"\n' +
      'tiers:\n' +
      '  worker:\n' +
      '    role: "x"\n' +
      'commands: []\n' +
      'components:\n' +
      '  templates: []\n' +
      '  checklists: []\n' +
      '  kbs: []\n';
    const yamlPath = writeYaml(tmp, 'celula.yaml', yaml);
    schema.validate(yamlPath, SCHEMA_PATH);
    const entries = fs.readdirSync(tmp);
    const jsonSiblings = entries.filter((n) => n.endsWith('.json'));
    assert.strictEqual(jsonSiblings.length, 0, 'no .json file should be produced');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});
