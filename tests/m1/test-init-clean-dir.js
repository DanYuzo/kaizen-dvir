'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 1, 3: init on a clean dir creates the complete structure including .claude/CLAUDE.md.

const REQUIRED_FILES = [
  '.kaizen-dvir/commandments.md',
  '.kaizen-dvir/dvir-config.yaml',
  '.kaizen-dvir/dvir/config-loader.js',
  '.kaizen-dvir/dvir/boundary-toggle.js',
  '.claude/settings.json',
  '.claude/README.md',
  '.claude/CLAUDE.md',
  'bin/kaizen.js',
  'bin/kaizen-init.js',
  'package.json',
  '.gitignore',
  'refs/ikigai/quem-sou.md',
  'refs/ikigai/o-que-faco.md',
  'refs/ikigai/para-quem.md',
  'refs/ikigai/como-faco.md',
];

const REQUIRED_DIRS = [
  '.kaizen-dvir',
  '.kaizen-dvir/dvir',
  '.kaizen-dvir/instructions',
  '.kaizen-dvir/celulas',
  '.kaizen-dvir/infra',
  '.kaizen-dvir/refs',
  '.claude',
  '.kaizen',
  'bin',
  'refs',
  'refs/ikigai',
  'refs/ikigai/biblioteca',
];

test('kaizen init creates the complete v1.4 structure in a clean dir (AC 1, 3)', () => {
  const tmp = mkTmp('clean');
  try {
    const result = runInit(tmp);
    assert.strictEqual(result.status, 0, 'exit 0; stderr=' + result.stderr);
    assert.match(result.stdout, /concluído/, 'pt-BR success marker');

    for (const dir of REQUIRED_DIRS) {
      const abs = path.join(tmp, dir);
      assert.ok(fs.existsSync(abs), 'missing dir: ' + dir);
      assert.ok(fs.statSync(abs).isDirectory(), dir + ' is not a directory');
    }
    for (const rel of REQUIRED_FILES) {
      const abs = path.join(tmp, rel);
      assert.ok(fs.existsSync(abs), 'missing file: ' + rel);
      assert.ok(fs.statSync(abs).isFile(), rel + ' is not a file');
    }
  } finally {
    rmTmp(tmp);
  }
});
