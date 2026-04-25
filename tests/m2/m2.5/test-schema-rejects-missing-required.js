'use strict';

// AC 2: schema rejects manifests missing any required root field, with a
// pt-BR error message that names the missing field. One sub-case per
// required field (description, boot, tiers, commands, components).

const { test } = require('node:test');
const assert = require('node:assert');
const {
  loadSchema,
  validatorFresh,
  validManifestObject,
} = require('./_helpers');

const REQUIRED_FIELDS = ['description', 'boot', 'tiers', 'commands', 'components'];

for (const field of REQUIRED_FIELDS) {
  test("missing required field '" + field + "' is rejected in pt-BR (AC 2)", () => {
    const schema = loadSchema();
    const { validate } = validatorFresh();
    const manifest = validManifestObject();
    delete manifest[field];
    const result = validate(schema, manifest);
    assert.strictEqual(result.valid, false);
    const match = result.errors.find((e) => new RegExp("'" + field + "'").test(e.message));
    assert.ok(match, 'expected error naming field ' + field + '; got ' + JSON.stringify(result.errors));
    assert.ok(
      /Campo obrigatorio ausente/.test(match.message),
      'error message must be pt-BR "Campo obrigatorio ausente"; got: ' + match.message
    );
  });
}

test('missing required sub-field in components is rejected (AC 2)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  // `templates`, `checklists`, `kbs` are required per story Task 1.
  delete manifest.components.templates;
  const result = validate(schema, manifest);
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.errors.some(
      (e) => /Campo obrigatorio ausente/.test(e.message) && /templates/.test(e.message)
    ),
    JSON.stringify(result.errors)
  );
});
