'use strict';

/**
 * Shared test helpers for M3.2 Handoff Protocol.
 *
 * Isolation strategy (mirrors M2.1 / M2.4 / M2.5):
 *   - KAIZEN_HANDOFFS_DIR -> tmpdir under os.tmpdir()/kaizen-m3.2-<label>-<rand>
 *   - KAIZEN_LOGS_DIR     -> sibling tmpdir (in case engine wires log-writer)
 *   - KAIZEN_STATE_DIR    -> sibling tmpdir (for PreCompact cooperation tests)
 *
 * Each test owns its sandbox and tears it down in finally{}. No reliance on
 * wall-clock ordering beyond monotonic ISO timestamps.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const ENGINE_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'memory',
  'handoff-engine.js'
);
const TOKEN_COUNTER_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'memory',
  'token-counter.js'
);
const SCHEMA_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'schemas',
  'handoff-schema.json'
);
const VALIDATOR_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'schemas',
  'validator.js'
);
const PRECOMPACT_PATH = path.join(PROJECT_ROOT, '.claude', 'hooks', 'PreCompact.js');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkTmp(label) {
  const random = _rand();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.2-' + label + '-' + random + '-')
  );
  const handoffs = path.join(root, 'handoffs');
  const logs = path.join(root, 'logs');
  const state = path.join(root, 'state');
  fs.mkdirSync(handoffs, { recursive: true });
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  process.env.KAIZEN_HANDOFFS_DIR = handoffs;
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_STATE_DIR = state;
  process.env.KAIZEN_BOOTED_CELLS_FILE = path.join(state, 'session-booted-cells.json');
  return { root: root, handoffs: handoffs, logs: logs, state: state, label: label };
}

function rmTmp(sandbox) {
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_BOOTED_CELLS_FILE;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function requireFresh(absPath) {
  delete require.cache[require.resolve(absPath)];
  return require(absPath);
}

function engineFresh() {
  // Drop dependent modules from cache so env-overrides take effect.
  delete require.cache[require.resolve(VALIDATOR_PATH)];
  delete require.cache[require.resolve(TOKEN_COUNTER_PATH)];
  return requireFresh(ENGINE_PATH);
}

function preCompactFresh() {
  delete require.cache[require.resolve(ENGINE_PATH)];
  delete require.cache[require.resolve(VALIDATOR_PATH)];
  delete require.cache[require.resolve(TOKEN_COUNTER_PATH)];
  return requireFresh(PRECOMPACT_PATH);
}

function loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

/**
 * Canonical well-formed handoff payload object (the structured shape passed
 * to engine.generate(...)). Modeled on the PRD example at
 * 06-memory-ikigai.md lines 134-151.
 */
function validHandoffArgs() {
  return {
    fromAgent: 'archaeologist',
    toAgent: 'forge-smith',
    workContext: {
      artifact_id: 'yotzer-generation-abc123',
      artifact_path: 'docs/yotzer/celula-xyz.md',
      current_phase: '2',
      branch: 'main',
    },
    decisions: [
      'Escolhido PU como unidade atomica',
      'Dependency graph validado via playback gate',
    ],
    filesModified: [
      'docs/yotzer/celula-xyz-phase-1.md',
      'docs/yotzer/celula-xyz-phase-2.md',
    ],
    blockers: [],
    nextAction: 'Iniciar fase 3 (stress test) com playback gate',
  };
}

function callGenerate(engine, args) {
  return engine.generate(
    args.fromAgent,
    args.toAgent,
    args.workContext,
    args.decisions,
    args.filesModified,
    args.blockers,
    args.nextAction
  );
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  ENGINE_PATH: ENGINE_PATH,
  TOKEN_COUNTER_PATH: TOKEN_COUNTER_PATH,
  SCHEMA_PATH: SCHEMA_PATH,
  VALIDATOR_PATH: VALIDATOR_PATH,
  PRECOMPACT_PATH: PRECOMPACT_PATH,
  mkTmp: mkTmp,
  rmTmp: rmTmp,
  requireFresh: requireFresh,
  engineFresh: engineFresh,
  preCompactFresh: preCompactFresh,
  loadSchema: loadSchema,
  validHandoffArgs: validHandoffArgs,
  callGenerate: callGenerate,
};
