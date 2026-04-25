'use strict';

// AC 1: schema validates a well-formed expanded v1.4 manifest with all
// required fields present. Optional authorities and dependencies accepted
// when present (forward-compatible for M4 Yotzer).

const { test } = require('node:test');
const assert = require('node:assert');
const {
  loadSchema,
  validatorFresh,
  validManifestObject,
} = require('./_helpers');

test('valid manifest with all required fields passes (AC 1)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const result = validate(schema, validManifestObject());
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
  assert.deepStrictEqual(result.errors, []);
});

test('valid manifest without optional authorities/dependencies passes (AC 1)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  delete manifest.authorities;
  delete manifest.dependencies;
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
});

test('components arrays may be empty (AC 1)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.components = {
    agents: [],
    tasks: [],
    workflows: [],
    templates: [],
    checklists: [],
    kbs: [],
  };
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, true, JSON.stringify(result.errors));
});

test('additionalProperties: false rejects unknown root field (AC 1)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.bogus = 'x';
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some((e) => /bogus/.test(e.message)),
    'error message must name the unknown field'
  );
});
