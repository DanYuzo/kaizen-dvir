'use strict';

/**
 * Shared test helpers for M3.5 doctor tests (tests/m3/m3.5/).
 *
 * Isolation strategy mirrors M2.5/M3.1/M3.2/M3.3/M3.4: per-test tmp dirs
 * with KAIZEN_LOGS_DIR + KAIZEN_HANDOFFS_DIR + KAIZEN_IKIGAI_DIR +
 * KAIZEN_CELULAS_DIR + KAIZEN_RULES_DIR + KAIZEN_COMMANDMENTS_PATH so the
 * doctor never touches the real project state.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(PROJECT_ROOT, 'bin', 'kaizen.js');
const DOCTOR_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'doctor');
const MEMORY_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkSandbox(label) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.5-' + label + '-' + _rand() + '-')
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

function freshDoctorReporter(name) {
  // name examples: 'gates-reporter.js', 'memory-reporter.js'
  const drops = [
    path.join(DOCTOR_DIR, name),
    path.join(DOCTOR_DIR, 'messages.js'),
    path.join(MEMORY_DIR, 'pattern-promoter.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(DOCTOR_DIR, name));
}

function freshPromoter() {
  const drops = [
    path.join(MEMORY_DIR, 'pattern-promoter.js'),
    path.join(DOCTOR_DIR, 'messages.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(MEMORY_DIR, 'pattern-promoter.js'));
}

function seedIkigai(sandbox, dimension, body) {
  fs.mkdirSync(sandbox.ikigai, { recursive: true });
  // body === '' is intentional (test the `vazio` status). Only fall back to
  // default content when body is undefined.
  const content = body === undefined ? '# ' + dimension + '\n\nplaceholder\n' : body;
  fs.writeFileSync(
    path.join(sandbox.ikigai, dimension + '.md'),
    content,
    { encoding: 'utf8' }
  );
}

function seedIkigaiBiblioteca(sandbox) {
  fs.mkdirSync(path.join(sandbox.ikigai, 'biblioteca'), { recursive: true });
}

function seedAllIkigai(sandbox) {
  for (const d of ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco']) {
    seedIkigai(sandbox, d);
  }
  seedIkigaiBiblioteca(sandbox);
}

function seedCellManifest(sandbox, name, body) {
  const dir = path.join(sandbox.celulas, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'celula.yaml'), body, { encoding: 'utf8' });
  return path.join(dir, 'celula.yaml');
}

function seedCellMemory(sandbox, name, body) {
  const dir = path.join(sandbox.celulas, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), body || '# Memory\n', {
    encoding: 'utf8',
  });
  return path.join(dir, 'MEMORY.md');
}

function seedHandoff(sandbox, filename, body) {
  fs.mkdirSync(sandbox.handoffs, { recursive: true });
  const target = path.join(sandbox.handoffs, filename);
  fs.writeFileSync(target, body || 'handoff: {}\n', { encoding: 'utf8' });
  return target;
}

function seedWaiver(sandbox, filename, body) {
  const dir = path.join(sandbox.logs, 'waivers');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, filename);
  fs.writeFileSync(target, body || 'gate_id: "x"\n', { encoding: 'utf8' });
  return target;
}

function seedVerdict(sandbox, dayIso, entries) {
  const dir = path.join(sandbox.logs, 'gate-verdicts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, dayIso + '.jsonl');
  const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(file, lines, { encoding: 'utf8' });
  return file;
}

function seedCandidate(sandbox, cell, pattern) {
  const file = path.join(sandbox.logs, 'promotion-candidates.yaml');
  const entry = {
    timestamp: new Date().toISOString(),
    celula: cell,
    pattern: pattern,
    status: 'candidate',
  };
  fs.appendFileSync(file, JSON.stringify(entry) + '\n', { encoding: 'utf8' });
  return entry;
}

function runCli(args, env) {
  const { spawnSync } = require('node:child_process');
  return spawnSync(process.execPath, [CLI, ...args], {
    env: Object.assign({}, process.env, env || {}),
    encoding: 'utf8',
  });
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  CLI: CLI,
  DOCTOR_DIR: DOCTOR_DIR,
  MEMORY_DIR: MEMORY_DIR,
  HOOKS_DIR: HOOKS_DIR,
  SCHEMAS_DIR: SCHEMAS_DIR,
  mkSandbox: mkSandbox,
  rmSandbox: rmSandbox,
  dropCache: dropCache,
  freshDoctorReporter: freshDoctorReporter,
  freshPromoter: freshPromoter,
  seedIkigai: seedIkigai,
  seedIkigaiBiblioteca: seedIkigaiBiblioteca,
  seedAllIkigai: seedAllIkigai,
  seedCellManifest: seedCellManifest,
  seedCellMemory: seedCellMemory,
  seedHandoff: seedHandoff,
  seedWaiver: seedWaiver,
  seedVerdict: seedVerdict,
  seedCandidate: seedCandidate,
  runCli: runCli,
};
