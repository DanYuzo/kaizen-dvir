'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const GATES_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'gates');
const MEMORY_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m3.4-' + label + '-'));
}

function mkTmpLogs(label) {
  const dir = mkTmpDir(label + '-logs');
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function mkTmpState(label) {
  const dir = mkTmpDir(label + '-state');
  process.env.KAIZEN_STATE_DIR = dir;
  return dir;
}

function mkTmpIkigai(label) {
  const dir = mkTmpDir(label + '-ikigai');
  process.env.KAIZEN_IKIGAI_DIR = dir;
  return dir;
}

function mkTmpCelulas(label) {
  const dir = mkTmpDir(label + '-celulas');
  process.env.KAIZEN_CELULAS_DIR = dir;
  return dir;
}

function mkTmpReuseRoots(label) {
  const dir = mkTmpDir(label + '-reuse');
  process.env.KAIZEN_REUSE_ROOTS = dir;
  return dir;
}

function rm(dir) {
  if (typeof dir !== 'string') return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function clearEnv() {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_IKIGAI_DIR;
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_REUSE_ROOTS;
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // ignore
  }
}

function freshGate(name) {
  // Drop the gate plus all dependent modules so env overrides take effect.
  const drops = [
    path.join(GATES_DIR, name),
    path.join(GATES_DIR, 'mode-engine.js'),
    path.join(GATES_DIR, 'playback-gate.js'),
    path.join(GATES_DIR, 'schema-gate.js'),
    path.join(GATES_DIR, 'authority-gate.js'),
    path.join(GATES_DIR, 'reuse-gate.js'),
    path.join(GATES_DIR, 'quality-gate.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(MEMORY_DIR, 'ikigai-writer.js'),
    path.join(SCHEMAS_DIR, 'validator.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(GATES_DIR, name));
}

function freshIkigaiWriter() {
  const drops = [
    path.join(MEMORY_DIR, 'ikigai-writer.js'),
    path.join(GATES_DIR, 'playback-gate.js'),
    path.join(GATES_DIR, 'mode-engine.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(MEMORY_DIR, 'ikigai-writer.js'));
}

function readJsonl(logsDir, channel) {
  const dir = path.join(logsDir, channel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const raw = fs.readFileSync(full, 'utf8');
    for (const line of raw.split(/\r?\n/u)) {
      if (line.trim().length === 0) continue;
      try {
        out.push(JSON.parse(line));
      } catch (_) {
        // skip
      }
    }
  }
  return out;
}

function writeCelulaYaml(celulasDir, cellName, body) {
  const cellDir = path.join(celulasDir, cellName);
  fs.mkdirSync(cellDir, { recursive: true });
  fs.writeFileSync(path.join(cellDir, 'celula.yaml'), body, { encoding: 'utf8' });
  return path.join(cellDir, 'celula.yaml');
}

module.exports = {
  PROJECT_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  HOOKS_DIR,
  SCHEMAS_DIR,
  mkTmpDir,
  mkTmpLogs,
  mkTmpState,
  mkTmpIkigai,
  mkTmpCelulas,
  mkTmpReuseRoots,
  rm,
  clearEnv,
  dropCache,
  freshGate,
  freshIkigaiWriter,
  readJsonl,
  writeCelulaYaml,
};
