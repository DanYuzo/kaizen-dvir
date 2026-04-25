'use strict';

// AC 3: schema rejects ambiguous implicit types (Norway Problem, numeric
// coercion, implicit booleans) with explicit pt-BR type errors.
//
// Approach: we validate the JS-object shape that a YAML 1.1 / permissive
// parser would hand us AFTER coercing (e.g. `description: no` -> boolean
// `false`; `description: 1.0` -> number). The schema declares string-typed
// fields; the validator's strict type check surfaces the coercion. This
// tests the end-to-end contract the way it actually fails in production:
// the moment a non-string value reaches the schema for a string-typed
// field, the validator must reject in pt-BR naming the field.
// (R-015, AC-013.)

const { test } = require('node:test');
const assert = require('node:assert');
const {
  loadSchema,
  validatorFresh,
  validManifestObject,
} = require('./_helpers');

test('Norway Problem: description coerced to boolean false is rejected in pt-BR (R-015)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.description = false; // what a YAML 1.1 parser emits for `description: no`
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /description/.test(e.path));
  assert.ok(err, 'expected error on description; got ' + JSON.stringify(result.errors));
  assert.ok(
    /Tipo invalido/.test(err.message) && /texto/.test(err.message) && /booleano/.test(err.message),
    'pt-BR type error must name expected "texto" and received "booleano"; got: ' + err.message
  );
});

test('Numeric coercion: description as number is rejected in pt-BR', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.description = 1.0; // what a permissive parser emits for `description: 1.0`
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /description/.test(e.path));
  assert.ok(err);
  assert.ok(
    /Tipo invalido/.test(err.message) && /numero/.test(err.message),
    'pt-BR type error must name received "numero"; got: ' + err.message
  );
});

test('Implicit boolean: boot item coerced to boolean is rejected', () => {
  // `value: yes` under boot would yield boolean true in YAML 1.1.
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.boot = ['README.md', true];
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  const err = result.errors.find((e) => /boot\.\[1\]/.test(e.path));
  assert.ok(err, 'expected error on boot[1]; got ' + JSON.stringify(result.errors));
  assert.ok(/Tipo invalido/.test(err.message) && /texto/.test(err.message));
});

test('Nested Norway in authorities.exclusive is rejected', () => {
  // PO-validated Norway example: authorities.exclusive[0] = "no" vs false.
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  manifest.authorities = { exclusive: [false] }; // Norway coercion of `- no`
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some(
      (e) => /authorities\.exclusive\.\[0\]/.test(e.path) && /Tipo invalido/.test(e.message)
    ),
    JSON.stringify(result.errors)
  );
});
