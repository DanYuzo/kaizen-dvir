'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const CLI = path.join(ROOT, 'bin', 'kaizen.js');
const pkg = require(path.join(ROOT, 'package.json'));

test('kaizen --version prints the version from package.json', () => {
  const result = spawnSync(process.execPath, [CLI, '--version'], { encoding: 'utf8' });
  assert.strictEqual(result.status, 0, 'exit code should be 0');
  assert.strictEqual(result.stdout.trim(), pkg.version, 'stdout must equal package.json version');
});
