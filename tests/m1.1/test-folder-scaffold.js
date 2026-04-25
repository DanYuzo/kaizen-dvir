'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

const REQUIRED_DIRS = [
  '.kaizen-dvir',
  '.kaizen-dvir/dvir',
  '.kaizen-dvir/instructions',
  '.kaizen-dvir/celulas',
  '.kaizen-dvir/infra',
  '.kaizen-dvir/refs',
  'bin',
];

test('L1/L2 folder scaffold exists with v1.4 names', () => {
  for (const rel of REQUIRED_DIRS) {
    const abs = path.join(ROOT, rel);
    assert.ok(fs.existsSync(abs), 'missing directory: ' + rel);
    const stat = fs.statSync(abs);
    assert.ok(stat.isDirectory(), rel + ' exists but is not a directory');
  }
});

test('no legacy (pre-v1.4) folder names are present', () => {
  const legacy = ['.kaizen-dvir/core', '.kaizen-dvir/development', '.kaizen-dvir/infrastructure', '.kaizen-dvir/docs', '.kaizen-dvir/knowledge'];
  for (const rel of legacy) {
    const abs = path.join(ROOT, rel);
    assert.ok(!fs.existsSync(abs), 'legacy v1.3 path should not exist: ' + rel);
  }
});
