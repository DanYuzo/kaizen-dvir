'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const MEMORY_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'memory'
);

function mkTmpCelulas(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.1-' + label + '-')
  );
  process.env.KAIZEN_CELULAS_DIR = dir;
  return dir;
}

function mkTmpLogs(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.1-logs-' + label + '-')
  );
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function mkTmpIkigai(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.1-ikigai-' + label + '-')
  );
  process.env.KAIZEN_IKIGAI_DIR = dir;
  return dir;
}

function rmTmp(dir) {
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_IKIGAI_DIR;
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function requireFresh(relToMemory) {
  const full = path.join(MEMORY_DIR, relToMemory);
  delete require.cache[require.resolve(full)];
  return require(full);
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  MEMORY_DIR: MEMORY_DIR,
  mkTmpCelulas: mkTmpCelulas,
  mkTmpLogs: mkTmpLogs,
  mkTmpIkigai: mkTmpIkigai,
  rmTmp: rmTmp,
  requireFresh: requireFresh,
};
