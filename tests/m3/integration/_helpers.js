'use strict';

/**
 * Shared helpers for M3 gate integration tests (tests/m3/integration/).
 * Each gate test maps 1:1 to an Epic KZ-M3 § Gate Criterion.
 *
 * Isolation: per-test tmpdir with KAIZEN_LOGS_DIR + KAIZEN_HANDOFFS_DIR +
 * KAIZEN_STATE_DIR + KAIZEN_IKIGAI_DIR + KAIZEN_CELULAS_DIR + KAIZEN_RULES_DIR
 * + KAIZEN_COMMANDMENTS_PATH set so M3.1–M3.5 modules write into a sandbox.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const GATES_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'gates');
const MEMORY_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');
const DOCTOR_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'doctor');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkSandbox(label) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3int-' + label + '-' + _rand() + '-')
  );
  const logs = path.join(root, 'logs');
  const handoffs = path.join(root, 'handoffs');
  const state = path.join(root, 'state');
  const ikigai = path.join(root, 'ikigai');
  const celulas = path.join(root, 'celulas');
  const rules = path.join(root, 'rules');
  const commandments = path.join(root, 'commandments.md');
  for (const d of [logs, handoffs, state, ikigai, celulas, rules]) {
    fs.mkdirSync(d, { recursive: true });
  }
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_HANDOFFS_DIR = handoffs;
  process.env.KAIZEN_STATE_DIR = state;
  process.env.KAIZEN_IKIGAI_DIR = ikigai;
  process.env.KAIZEN_CELULAS_DIR = celulas;
  process.env.KAIZEN_RULES_DIR = rules;
  process.env.KAIZEN_COMMANDMENTS_PATH = commandments;
  return {
    root: root,
    logs: logs,
    handoffs: handoffs,
    state: state,
    ikigai: ikigai,
    celulas: celulas,
    rules: rules,
    commandments: commandments,
    label: label,
  };
}

function rmSandbox(sandbox) {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_IKIGAI_DIR;
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_RULES_DIR;
  delete process.env.KAIZEN_COMMANDMENTS_PATH;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // not yet loaded
  }
}

const _ALL_M3_MODULES = [
  path.join(MEMORY_DIR, 'handoff-engine.js'),
  path.join(MEMORY_DIR, 'token-counter.js'),
  path.join(MEMORY_DIR, 'memory-writer.js'),
  path.join(MEMORY_DIR, 'ikigai-reader.js'),
  path.join(MEMORY_DIR, 'ikigai-writer.js'),
  path.join(MEMORY_DIR, 'change-log-guard.js'),
  path.join(MEMORY_DIR, 'pattern-promoter.js'),
  path.join(GATES_DIR, 'quality-gate.js'),
  path.join(GATES_DIR, 'self-healing.js'),
  path.join(GATES_DIR, 'waiver.js'),
  path.join(GATES_DIR, 'executor-judge-validator.js'),
  path.join(GATES_DIR, 'playback-gate.js'),
  path.join(GATES_DIR, 'mode-engine.js'),
  path.join(GATES_DIR, 'schema-gate.js'),
  path.join(GATES_DIR, 'authority-gate.js'),
  path.join(GATES_DIR, 'reuse-gate.js'),
  path.join(HOOKS_DIR, 'log-writer.js'),
  path.join(SCHEMAS_DIR, 'validator.js'),
  path.join(DOCTOR_DIR, 'messages.js'),
];

function freshAll() {
  for (const p of _ALL_M3_MODULES) dropCache(p);
}

function freshModule(absPath) {
  freshAll();
  return require(absPath);
}

function loadHandoffEngine() {
  return freshModule(path.join(MEMORY_DIR, 'handoff-engine.js'));
}

function loadQualityGate() {
  return freshModule(path.join(GATES_DIR, 'quality-gate.js'));
}

function loadSelfHealing() {
  return freshModule(path.join(GATES_DIR, 'self-healing.js'));
}

function loadPlaybackGate() {
  return freshModule(path.join(GATES_DIR, 'playback-gate.js'));
}

function loadModeEngine() {
  return freshModule(path.join(GATES_DIR, 'mode-engine.js'));
}

function loadIkigaiWriter() {
  return freshModule(path.join(MEMORY_DIR, 'ikigai-writer.js'));
}

function loadMemoryWriter() {
  return freshModule(path.join(MEMORY_DIR, 'memory-writer.js'));
}

function loadPromoter() {
  return freshModule(path.join(MEMORY_DIR, 'pattern-promoter.js'));
}

function loadWaiver() {
  return freshModule(path.join(GATES_DIR, 'waiver.js'));
}

function readJsonl(logsDir, channel) {
  const dir = path.join(logsDir, channel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    let raw;
    try {
      raw = fs.readFileSync(full, 'utf8');
    } catch (_) {
      continue;
    }
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

function seedAllIkigai(sandbox) {
  for (const d of ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco']) {
    fs.writeFileSync(
      path.join(sandbox.ikigai, d + '.md'),
      '# ' + d + '\n\nplaceholder\n\n## Change Log\n',
      { encoding: 'utf8' }
    );
  }
  fs.mkdirSync(path.join(sandbox.ikigai, 'biblioteca'), { recursive: true });
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  GATES_DIR: GATES_DIR,
  MEMORY_DIR: MEMORY_DIR,
  HOOKS_DIR: HOOKS_DIR,
  DOCTOR_DIR: DOCTOR_DIR,
  mkSandbox: mkSandbox,
  rmSandbox: rmSandbox,
  dropCache: dropCache,
  freshAll: freshAll,
  freshModule: freshModule,
  loadHandoffEngine: loadHandoffEngine,
  loadQualityGate: loadQualityGate,
  loadSelfHealing: loadSelfHealing,
  loadPlaybackGate: loadPlaybackGate,
  loadModeEngine: loadModeEngine,
  loadIkigaiWriter: loadIkigaiWriter,
  loadMemoryWriter: loadMemoryWriter,
  loadPromoter: loadPromoter,
  loadWaiver: loadWaiver,
  readJsonl: readJsonl,
  seedAllIkigai: seedAllIkigai,
};
