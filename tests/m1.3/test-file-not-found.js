'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const loader = require(path.join(ROOT, '.kaizen-dvir', 'dvir', 'config-loader.js'));

test('loadFromPath on a missing file emits pt-BR actionable error', () => {
  const ghost = path.join(os.tmpdir(), 'kaizen-nonexistent-' + Date.now() + '.yaml');
  assert.throws(
    () => loader.loadFromPath(ghost),
    (err) => {
      assert.ok(
        /Arquivo de configuração não encontrado/.test(err.message),
        'expected pt-BR not-found error, got: ' + err.message
      );
      assert.ok(
        /\.kaizen-dvir\/dvir-config\.yaml/.test(err.message),
        'error should name the canonical path, got: ' + err.message
      );
      assert.ok(
        /kaizen init/.test(err.message),
        "error should suggest 'kaizen init', got: " + err.message
      );
      return true;
    }
  );
});
