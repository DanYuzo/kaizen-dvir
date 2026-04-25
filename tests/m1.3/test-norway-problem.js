'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const loader = require(path.join(ROOT, '.kaizen-dvir', 'dvir', 'config-loader.js'));

function expectAmbiguousError(fixture, field) {
  assert.throws(
    () => loader.loadFromPath(path.join(__dirname, 'fixtures', fixture)),
    (err) => {
      assert.ok(
        /Valor ambíguo/.test(err.message),
        'expected "Valor ambíguo" pt-BR error, got: ' + err.message
      );
      assert.ok(
        err.message.includes("'" + field + "'"),
        "error should name field '" + field + "', got: " + err.message
      );
      assert.ok(
        /Use aspas/.test(err.message),
        'error should instruct user to use quotes, got: ' + err.message
      );
      return true;
    }
  );
}

test('rejects unquoted "no" in frameworkProtection (Norway Problem)', () => {
  expectAmbiguousError('norway-no.yaml', 'frameworkProtection');
});

test('rejects unquoted "yes" in frameworkProtection', () => {
  expectAmbiguousError('norway-yes.yaml', 'frameworkProtection');
});

test('rejects unquoted "on" in frameworkProtection', () => {
  expectAmbiguousError('norway-on.yaml', 'frameworkProtection');
});

test('rejects unquoted "off" in frameworkProtection', () => {
  expectAmbiguousError('norway-off.yaml', 'frameworkProtection');
});

test('rejects unquoted float (1.0) in version', () => {
  expectAmbiguousError('norway-version.yaml', 'version');
});

test('rejects unquoted date-like scalar in version', () => {
  expectAmbiguousError('norway-version-date.yaml', 'version');
});
