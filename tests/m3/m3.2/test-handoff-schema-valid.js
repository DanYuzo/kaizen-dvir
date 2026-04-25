'use strict';

// AC 1, AC 2: well-formed Handoff Artifact passes schema validation.
// Verifies the full shape declared in the schema (handoff envelope, all
// required nested fields, list caps), and that generate() returns the
// validated artifact + serialized YAML + token count.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate, loadSchema } =
  require('./_helpers');

test('schema requires the documented top-level and nested fields (AC 1, AC 2)', () => {
  const schema = loadSchema();
  // top-level
  assert.deepStrictEqual(schema.required, ['handoff'], 'top-level requires handoff');
  // handoff envelope
  const handoff = schema.properties.handoff;
  assert.deepStrictEqual(
    handoff.required.sort(),
    [
      'blockers',
      'decisions',
      'files_modified',
      'from',
      'next_action',
      'to',
      'work_context',
    ].sort(),
    'handoff envelope requires the 7 contract fields'
  );
  // work_context nested
  const wc = handoff.properties.work_context;
  assert.deepStrictEqual(
    wc.required.sort(),
    ['artifact_id', 'artifact_path', 'branch', 'current_phase'].sort(),
    'work_context requires its 4 nested fields'
  );
  // list caps
  assert.strictEqual(handoff.properties.decisions.maxItems, 5, 'decisions cap = 5');
  assert.strictEqual(handoff.properties.files_modified.maxItems, 10, 'files_modified cap = 10');
  assert.strictEqual(handoff.properties.blockers.maxItems, 3, 'blockers cap = 3');
});

test('generate() builds, validates, and returns a well-formed artifact (AC 1)', () => {
  const tmp = mkTmp('valid');
  try {
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    assert.ok(result.artifact, 'returns artifact');
    assert.ok(typeof result.yaml === 'string' && result.yaml.length > 0, 'returns YAML');
    assert.ok(typeof result.tokenCount === 'number' && result.tokenCount > 0, 'returns tokenCount');
    assert.strictEqual(result.artifact.handoff.from, 'archaeologist');
    assert.strictEqual(result.artifact.handoff.to, 'forge-smith');
    assert.strictEqual(result.artifact.handoff.work_context.current_phase, '2');
    assert.strictEqual(result.artifact.handoff.decisions.length, 2);
    assert.strictEqual(result.artifact.handoff.next_action, 'Iniciar fase 3 (stress test) com playback gate');
  } finally {
    rmTmp(tmp);
  }
});

test('emitted YAML always quotes string scalars (R-015 strict-mode write side)', () => {
  const tmp = mkTmp('quoted');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.decisions = ['no', 'yes', 'off'];
    const result = callGenerate(engine, args);
    // Each Norway-Problem-prone value must appear quoted, never bare.
    assert.ok(result.yaml.includes('"no"'), 'string "no" must be quoted');
    assert.ok(result.yaml.includes('"yes"'), 'string "yes" must be quoted');
    assert.ok(result.yaml.includes('"off"'), 'string "off" must be quoted');
    assert.ok(!/-\s+no\s*$/mu.test(result.yaml), 'no bare "no" item');
    assert.ok(!/-\s+yes\s*$/mu.test(result.yaml), 'no bare "yes" item');
  } finally {
    rmTmp(tmp);
  }
});
