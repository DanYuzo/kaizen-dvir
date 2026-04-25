'use strict';

// AC 2, 3, 4, 5 — Yotzer manifest passes Schema Gate validation in under
// 500ms and declares critical_invariants [phase-1-objective,
// phase-2-sources-and-examples, phase-10-publication] plus exactly 11
// templates (D-v1.4-08).

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const helpers = require('./_helpers');

const MANIFEST_PATH = path.join(helpers.YOTZER_CELL_ROOT, 'celula.yaml');
const SCHEMA_PATH = path.join(helpers.SCHEMAS_DIR, 'celula-schema.json');

test('Yotzer manifest validates as PASS (AC 2, AC 3)', () => {
  const logs = helpers.mkTmpLogs('manifest-pass');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const out = schema.validate(MANIFEST_PATH, SCHEMA_PATH, {
      isCellManifest: true,
    });
    assert.strictEqual(
      out.verdict,
      'PASS',
      'errors: ' + JSON.stringify(out.errors)
    );
    assert.strictEqual(out.errors.length, 0);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('schema validation completes under 500ms (NFR-003)', () => {
  const logs = helpers.mkTmpLogs('manifest-perf');
  try {
    const schema = helpers.freshGate('schema-gate.js');
    const start = process.hrtime.bigint();
    const out = schema.validate(MANIFEST_PATH, SCHEMA_PATH, {
      isCellManifest: true,
    });
    const durationMs = Number(
      (process.hrtime.bigint() - start) / 1000000n
    );
    assert.strictEqual(out.verdict, 'PASS');
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
  }
});

test('critical_invariants lists exactly [phase-1-objective, phase-2-sources-and-examples, phase-10-publication] (AC 4)', () => {
  const schema = helpers.freshGate('schema-gate.js');
  const parsed = schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
  assert.ok(Array.isArray(parsed.critical_invariants));
  assert.strictEqual(parsed.critical_invariants.length, 3);
  assert.deepStrictEqual(parsed.critical_invariants, [
    'phase-1-objective',
    'phase-2-sources-and-examples',
    'phase-10-publication',
  ]);
});

test('components.templates declares exactly 11 entries including agent-tmpl and workflow-tmpl (AC 5, D-v1.4-08)', () => {
  const schema = helpers.freshGate('schema-gate.js');
  const parsed = schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
  assert.ok(parsed.components && Array.isArray(parsed.components.templates));
  assert.strictEqual(
    parsed.components.templates.length,
    11,
    'expected exactly 11 templates; got ' +
      parsed.components.templates.length
  );
  assert.ok(parsed.components.templates.includes('agent-tmpl'));
  assert.ok(parsed.components.templates.includes('workflow-tmpl'));
});

test('manifest declares 9 agents, 16 tasks, 2 workflows, 5 checklists, 1 kbs (AC 2)', () => {
  const schema = helpers.freshGate('schema-gate.js');
  const parsed = schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
  assert.strictEqual(parsed.components.agents.length, 9);
  assert.strictEqual(parsed.components.tasks.length, 16);
  assert.strictEqual(parsed.components.workflows.length, 2);
  assert.strictEqual(parsed.components.checklists.length, 5);
  assert.strictEqual(parsed.components.kbs.length, 1);
  assert.strictEqual(parsed.commands.length, 6);
});

test('manifest declares authorities.exclusive and empty dependencies.celulas (AC 2)', () => {
  const schema = helpers.freshGate('schema-gate.js');
  const parsed = schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
  assert.ok(parsed.authorities && Array.isArray(parsed.authorities.exclusive));
  assert.deepStrictEqual(
    parsed.authorities.exclusive,
    ['generate-celula', 'apply-method-phases']
  );
  assert.ok(parsed.dependencies && Array.isArray(parsed.dependencies.celulas));
  assert.strictEqual(parsed.dependencies.celulas.length, 0);
});

// M4.2 deferred-fix follow-up — internal_helpers declares ost-writer as a
// shared utility module. Keeps `components.agents` reserved for personas
// (preserves the 9-agent invariant above) and surfaces the helper that
// archaeologist (F1/F3/F6), risk-mapper (F5), task-granulator (F8) and
// publisher (F10) consume.
test('manifest declares components.internal_helpers with ost-writer entry (M4.2 deferred fix)', () => {
  const schema = helpers.freshGate('schema-gate.js');
  const parsed = schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
  assert.ok(
    parsed.components && Array.isArray(parsed.components.internal_helpers),
    'components.internal_helpers must be an array'
  );
  assert.ok(
    parsed.components.internal_helpers.length >= 1,
    'expected at least 1 internal helper; got ' +
      parsed.components.internal_helpers.length
  );
  const ostWriter = parsed.components.internal_helpers.find(
    (h) => h && h.id === 'ost-writer'
  );
  assert.ok(ostWriter, 'ost-writer entry missing from internal_helpers');
  assert.strictEqual(ostWriter.path, 'agents/_shared/ost-writer.js');
  assert.strictEqual(ostWriter.type, 'shared_utility');
  assert.ok(
    typeof ostWriter.purpose === 'string' && ostWriter.purpose.length > 0,
    'ost-writer.purpose must be a non-empty pt-BR string'
  );
});
