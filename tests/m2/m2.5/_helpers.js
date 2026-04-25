'use strict';

/**
 * Shared test helpers for M2.5 (schema + doctor) integration tests.
 *
 * Isolation strategy (mirrors M2.1/M2.2/M2.3/M2.4):
 *   - `KAIZEN_LOGS_DIR`  → tmpdir under os.tmpdir()/kaizen-m2.5-<label>-<rand>
 *   - `KAIZEN_STATE_DIR` → sibling tmpdir
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');
const SCHEMA_PATH = path.join(SCHEMAS_DIR, 'celula-schema.json');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkTmp(label) {
  const random = _rand();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2.5-' + label + '-' + random + '-')
  );
  const logs = path.join(root, 'logs');
  const state = path.join(root, 'state');
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_STATE_DIR = state;
  return { root: root, logs: logs, state: state, label: label };
}

function rmTmp(sandbox) {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function requireFresh(absPath) {
  delete require.cache[require.resolve(absPath)];
  return require(absPath);
}

function validatorFresh() {
  return requireFresh(path.join(SCHEMAS_DIR, 'validator.js'));
}

/**
 * Canonical well-formed expanded v1.4 manifest (as a parsed object) used
 * across accept / timing / gate-4 tests.
 */
function validManifestObject() {
  return {
    description: 'Celula de exemplo v1.4',
    boot: ['README.md', 'agents/chief/MEMORY.md'],
    tiers: {
      'tier-1': { name: 'chief' },
      'tier-2': { name: 'specialists' },
    },
    commands: [
      { name: 'start', description: 'Inicia fluxo' },
      { name: 'generate', description: 'Gera artefato' },
    ],
    components: {
      agents: ['chief.md'],
      tasks: ['start.md'],
      workflows: ['wf.yaml'],
      templates: [],
      checklists: ['quality.md'],
      kbs: [],
    },
    authorities: { exclusive: ['generate'] },
    dependencies: { celulas: [] },
  };
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  SCHEMAS_DIR: SCHEMAS_DIR,
  SCHEMA_PATH: SCHEMA_PATH,
  mkTmp: mkTmp,
  rmTmp: rmTmp,
  loadSchema: loadSchema,
  validatorFresh: validatorFresh,
  validManifestObject: validManifestObject,
};
