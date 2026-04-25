'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.join(__dirname, '..', '..', 'bin', 'kaizen.js');

test('kaizen --help lists commands and renders in pt-BR', () => {
  const result = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, 'exit code should be 0');
  assert.match(result.stdout, /Uso:\s+kaizen/, 'pt-BR "Uso" marker');
  assert.match(result.stdout, /init/, 'lists init');
  assert.match(result.stdout, /doctor/, 'lists doctor');
  assert.match(result.stdout, /install/, 'lists install');
  assert.match(result.stdout, /--help/, 'documents --help');
  assert.match(result.stdout, /--version/, 'documents --version');
});

test('kaizen with no args defaults to help', () => {
  const result = spawnSync(process.execPath, [CLI], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, 'no-arg invocation should exit 0');
  assert.match(result.stdout, /Uso:\s+kaizen/, 'shows help');
});
