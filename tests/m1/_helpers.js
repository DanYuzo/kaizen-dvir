'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

function mkTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m1-' + label + '-'));
}

function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runInit(cwd, extraArgs = []) {
  return spawnSync(process.execPath, [CLI, 'init', ...extraArgs], {
    cwd,
    encoding: 'utf8',
  });
}

module.exports = { SOURCE_ROOT, CLI, mkTmp, rmTmp, runInit };
