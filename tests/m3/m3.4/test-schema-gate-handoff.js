'use strict';

// AC 4 — Schema Gate accepts handoff-schema.json (M3.2) through the same
// call surface as celula-schema.json. One entry point, multiple schemas.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const HANDOFF_SCHEMA = path.join(helpers.SCHEMAS_DIR, 'handoff-schema.json');
const CELULA_SCHEMA = path.join(helpers.SCHEMAS_DIR, 'celula-schema.json');

test('valid handoff YAML validates against handoff-schema.json', () => {
  const logs = helpers.mkTmpLogs('sg-ho-pass');
  const tmp = helpers.mkTmpDir('sg-ho-pass-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'handoff:\n' +
      '  from: "sm"\n' +
      '  to: "dev"\n' +
      '  work_context:\n' +
      '    artifact_id: "KZ-M3.4"\n' +
      '    artifact_path: "docs/kaizen/stories/M3.4.gate-suite-and-mode-engine.md"\n' +
      '    current_phase: "implementation"\n' +
      '    branch: "main"\n' +
      '  decisions:\n' +
      '    - "use playback gate"\n' +
      '  files_modified:\n' +
      '    - ".kaizen-dvir/dvir/gates/playback-gate.js"\n' +
      '  blockers: []\n' +
      '  next_action: "implement schema gate"\n';
    const yamlPath = path.join(tmp, 'handoff.yaml');
    fs.writeFileSync(yamlPath, yaml, { encoding: 'utf8' });
    const out = schema.validate(yamlPath, HANDOFF_SCHEMA);
    assert.strictEqual(out.verdict, 'PASS', JSON.stringify(out.errors));
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('handoff missing next_action fails with clear pt-BR error', () => {
  const logs = helpers.mkTmpLogs('sg-ho-fail');
  const tmp = helpers.mkTmpDir('sg-ho-fail-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'handoff:\n' +
      '  from: "sm"\n' +
      '  to: "dev"\n' +
      '  work_context:\n' +
      '    artifact_id: "KZ-M3.4"\n' +
      '    artifact_path: "x"\n' +
      '    current_phase: "y"\n' +
      '    branch: "main"\n' +
      '  decisions: []\n' +
      '  files_modified: []\n' +
      '  blockers: []\n';
    const yamlPath = path.join(tmp, 'handoff.yaml');
    fs.writeFileSync(yamlPath, yaml, { encoding: 'utf8' });
    const out = schema.validate(yamlPath, HANDOFF_SCHEMA);
    assert.strictEqual(out.verdict, 'FAIL');
    const msgs = out.errors.map((e) => e.message).join(' | ');
    assert.match(msgs, /next_action|obrigatorio/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('same call surface accepts both handoff and celula schemas', () => {
  const logs = helpers.mkTmpLogs('sg-multi');
  const tmp = helpers.mkTmpDir('sg-multi-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    // celula
    const celulaYaml =
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
    const celulaPath = path.join(tmp, 'celula.yaml');
    fs.writeFileSync(celulaPath, celulaYaml, { encoding: 'utf8' });
    const cOut = schema.validate(celulaPath, CELULA_SCHEMA);
    assert.strictEqual(cOut.verdict, 'PASS');

    // handoff
    const handoffYaml =
      'handoff:\n' +
      '  from: "a"\n' +
      '  to: "b"\n' +
      '  work_context:\n' +
      '    artifact_id: "x"\n' +
      '    artifact_path: "x"\n' +
      '    current_phase: "x"\n' +
      '    branch: "main"\n' +
      '  decisions: []\n' +
      '  files_modified: []\n' +
      '  blockers: []\n' +
      '  next_action: "x"\n';
    const hPath = path.join(tmp, 'handoff.yaml');
    fs.writeFileSync(hPath, handoffYaml, { encoding: 'utf8' });
    const hOut = schema.validate(hPath, HANDOFF_SCHEMA);
    assert.strictEqual(hOut.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});
