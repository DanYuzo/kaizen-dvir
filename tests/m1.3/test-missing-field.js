'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const loader = require(path.join(ROOT, '.kaizen-dvir', 'dvir', 'config-loader.js'));

test('missing cli field emits pt-BR actionable error', () => {
  assert.throws(
    () => loader.loadFromPath(path.join(__dirname, 'fixtures', 'missing-field.yaml')),
    (err) => {
      assert.ok(
        /Campo obrigatório ausente/.test(err.message),
        'expected pt-BR "Campo obrigatório ausente" error, got: ' + err.message
      );
      assert.ok(
        /'cli'/.test(err.message),
        "error should name the missing field 'cli', got: " + err.message
      );
      assert.ok(
        /tente novamente/.test(err.message),
        'error should be actionable ("tente novamente"), got: ' + err.message
      );
      return true;
    }
  );
});

test('type mismatch on frameworkProtection emits pt-BR actionable error', () => {
  assert.throws(
    () => loader.loadFromPath(path.join(__dirname, 'fixtures', 'bad-type.yaml')),
    (err) => {
      assert.ok(
        /Tipo inválido/.test(err.message) && /frameworkProtection/.test(err.message),
        'expected pt-BR "Tipo inválido" error mentioning frameworkProtection, got: ' +
          err.message
      );
      return true;
    }
  );
});
