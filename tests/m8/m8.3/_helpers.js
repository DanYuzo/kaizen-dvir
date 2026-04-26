'use strict';

/**
 * tests/m8/m8.3/_helpers.js — shared fixture helpers for M8.3 init tests.
 *
 * Spawns `kaizen init` (via `bin/kaizen.js`) inside a temp directory and
 * returns stdout/stderr/status for assertions. Mirrors the M1/M7 init test
 * helpers — same spawnSync pattern, same temp-dir lifecycle.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

function mkTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m8.3-' + label + '-'));
}

function rmTmp(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort cleanup
  }
}

function runInit(cwd) {
  return spawnSync(process.execPath, [CLI, 'init'], {
    cwd,
    encoding: 'utf8',
  });
}

function fileExists(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

function listDirFiles(abs) {
  try {
    return fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
  } catch (_) {
    return [];
  }
}

module.exports = {
  SOURCE_ROOT,
  CLI,
  mkTmp,
  rmTmp,
  runInit,
  fileExists,
  listDirFiles,
};
