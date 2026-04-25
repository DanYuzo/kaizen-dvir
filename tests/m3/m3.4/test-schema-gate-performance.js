'use strict';

// AC 5 / NFR-003 — Schema Gate validates a well-formed cell manifest in
// under 500ms. Warm-cache run (single-call hot path).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const SCHEMA_PATH = path.join(helpers.SCHEMAS_DIR, 'celula-schema.json');

test('well-formed manifest validates in under 500ms (warm cache)', () => {
  const logs = helpers.mkTmpLogs('sg-perf');
  const tmp = helpers.mkTmpDir('sg-perf-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    // Non-tier-1 manifest (no chief/coordinator) so the R5 hook does not
    // require critical_invariants. The schema-side critical_invariants
    // field lands in M3.5 (KZ-M3-R5 cross-story dependency); for this
    // perf benchmark we keep the manifest within the M2.5 schema surface.
    const yaml =
      'description: "celula maior para benchmark"\n' +
      'boot:\n' +
      '  - "boot-1"\n' +
      '  - "boot-2"\n' +
      '  - "boot-3"\n' +
      'tiers:\n' +
      '  worker:\n' +
      '    role: "executor"\n' +
      '  helper:\n' +
      '    role: "support"\n' +
      'commands:\n' +
      '  - name: "help"\n' +
      '    description: "ajuda"\n' +
      '  - name: "status"\n' +
      '    description: "estado"\n' +
      'components:\n' +
      '  templates:\n' +
      '    - "tmpl-a"\n' +
      '    - "tmpl-b"\n' +
      '  checklists:\n' +
      '    - "checklist-a"\n' +
      '  kbs:\n' +
      '    - "kb-a"\n';
    const yamlPath = path.join(tmp, 'celula.yaml');
    fs.writeFileSync(yamlPath, yaml, { encoding: 'utf8' });

    // Warm-up call (loads schema, primes module cache).
    schema.validate(yamlPath, SCHEMA_PATH);

    // Measured call.
    const start = process.hrtime.bigint();
    const out = schema.validate(yamlPath, SCHEMA_PATH);
    const ms = Number((process.hrtime.bigint() - start) / 1000000n);

    assert.strictEqual(out.verdict, 'PASS', JSON.stringify(out.errors));
    assert.ok(out.durationMs >= 0);
    assert.ok(ms < 500, 'expected <500ms, got ' + ms + 'ms');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});

test('R5 hook: tier-1 cell missing critical_invariants → FAIL', () => {
  const logs = helpers.mkTmpLogs('sg-r5');
  const tmp = helpers.mkTmpDir('sg-r5-art');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const yaml =
      'description: "tier-1 sem critical_invariants"\n' +
      'boot:\n' +
      '  - "x"\n' +
      'tiers:\n' +
      '  chief:\n' +
      '    role: "coordinator"\n' +
      'commands:\n' +
      '  - name: "x"\n' +
      '    description: "x"\n' +
      'components:\n' +
      '  templates: []\n' +
      '  checklists: []\n' +
      '  kbs: []\n';
    const yamlPath = path.join(tmp, 'celula.yaml');
    fs.writeFileSync(yamlPath, yaml, { encoding: 'utf8' });
    const out = schema.validate(yamlPath, SCHEMA_PATH);
    assert.strictEqual(out.verdict, 'FAIL');
    const msgs = out.errors.map((e) => e.message).join(' | ');
    assert.match(msgs, /critical_invariants/);
    assert.match(msgs, /tier-1/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(tmp);
  }
});
