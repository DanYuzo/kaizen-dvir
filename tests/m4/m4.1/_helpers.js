'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const YOTZER_CELL_ROOT = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer'
);
const GATES_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'gates');
const MEMORY_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.1-' + label + '-'));
}

function mkTmpTarget(label) {
  const dir = mkTmpDir(label + '-target');
  process.env.KAIZEN_TARGET_DIR = dir;
  return dir;
}

function mkTmpState(label) {
  const dir = mkTmpDir(label + '-state');
  process.env.KAIZEN_STATE_DIR = dir;
  return dir;
}

function mkTmpLogs(label) {
  const dir = mkTmpDir(label + '-logs');
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function mkTmpReuseRoots(label) {
  const dir = mkTmpDir(label + '-reuse');
  process.env.KAIZEN_REUSE_ROOTS = dir;
  return dir;
}

function mkTmpHandoffs(label) {
  const dir = mkTmpDir(label + '-handoffs');
  process.env.KAIZEN_HANDOFFS_DIR = dir;
  return dir;
}

function rm(dir) {
  if (typeof dir !== 'string') return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort cleanup
  }
}

function clearEnv() {
  delete process.env.KAIZEN_TARGET_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_REUSE_ROOTS;
  delete process.env.KAIZEN_HANDOFFS_DIR;
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // ignore
  }
}

function freshGate(name) {
  const drops = [
    path.join(GATES_DIR, name),
    path.join(GATES_DIR, 'mode-engine.js'),
    path.join(GATES_DIR, 'reuse-gate.js'),
    path.join(GATES_DIR, 'schema-gate.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(MEMORY_DIR, 'handoff-engine.js'),
    path.join(SCHEMAS_DIR, 'validator.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(GATES_DIR, name));
}

function freshMemory(name) {
  const drops = [
    path.join(MEMORY_DIR, name),
    path.join(MEMORY_DIR, 'handoff-engine.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(SCHEMAS_DIR, 'validator.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(MEMORY_DIR, name));
}

function freshKaizenInit() {
  const p = path.join(PROJECT_ROOT, 'bin', 'kaizen-init.js');
  dropCache(p);
  return require(p);
}

function readFileText(abs) {
  return fs.readFileSync(abs, 'utf8');
}

module.exports = {
  PROJECT_ROOT,
  YOTZER_CELL_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  HOOKS_DIR,
  SCHEMAS_DIR,
  mkTmpDir,
  mkTmpTarget,
  mkTmpState,
  mkTmpLogs,
  mkTmpReuseRoots,
  mkTmpHandoffs,
  rm,
  clearEnv,
  dropCache,
  freshGate,
  freshMemory,
  freshKaizenInit,
  readFileText,
};
