'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.join(__dirname, '..', '..', 'bin', 'kaizen.js');

test('kaizen <unknown> exits non-zero with pt-BR actionable error', () => {
  const result = spawnSync(process.execPath, [CLI, 'foobar'], { encoding: 'utf8' });
  assert.notStrictEqual(result.status, 0, 'exit code must be non-zero');
  assert.match(result.stderr, /Comando desconhecido/, 'pt-BR error marker');
  assert.match(result.stderr, /foobar/, 'should echo the offending command');
  assert.match(result.stderr, /kaizen --help/, 'should guide user to --help (NFR-101)');
});
