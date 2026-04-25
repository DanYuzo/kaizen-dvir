'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const GATES_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'gates'
);
const MEMORY_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'memory'
);

function mkTmpLogs(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.3-' + label + '-')
  );
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function rmTmp(dir) {
  delete process.env.KAIZEN_LOGS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
}

function mkTmpDir(label) {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m3.3-' + label + '-')
  );
}

function requireFreshGate(name) {
  const full = path.join(GATES_DIR, name);
  // Drop dependent modules from cache so KAIZEN_LOGS_DIR is honored.
  const drop = [
    full,
    path.join(GATES_DIR, 'quality-gate.js'),
    path.join(GATES_DIR, 'self-healing.js'),
    path.join(GATES_DIR, 'waiver.js'),
    path.join(GATES_DIR, 'executor-judge-validator.js'),
    path.join(MEMORY_DIR, 'change-log-guard.js'),
    path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks', 'log-writer.js'),
  ];
  for (const p of drop) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_) {
      // module not yet required — fine
    }
  }
  return require(full);
}

function requireFreshMemory(name) {
  const full = path.join(MEMORY_DIR, name);
  const drop = [
    full,
    path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks', 'log-writer.js'),
  ];
  for (const p of drop) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_) {}
  }
  return require(full);
}

/**
 * Build a deterministic executor stub that returns a scripted sequence of
 * verdicts when wrapped together with a scripted gate. Each call advances
 * the script by one step and returns `{ revisedArtifact: <new> }`.
 */
function makeScriptedExecutor() {
  let calls = 0;
  return {
    invoke: function (payload) {
      calls += 1;
      return {
        revisedArtifact: Object.assign({}, payload.artifact, {
          revision: calls,
        }),
      };
    },
    callCount: function () {
      return calls;
    },
  };
}

/**
 * Build a fake gate whose `evaluate()` returns scripted verdicts in order.
 * Each call shifts the next entry off `verdicts`. Last entry repeats if
 * the loop overshoots.
 */
function makeScriptedGate(verdicts) {
  let i = 0;
  return {
    evaluate: function () {
      const v = verdicts[Math.min(i, verdicts.length - 1)];
      i += 1;
      return v;
    },
    callCount: function () {
      return i;
    },
  };
}

module.exports = {
  PROJECT_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  mkTmpLogs,
  rmTmp,
  mkTmpDir,
  requireFreshGate,
  requireFreshMemory,
  makeScriptedExecutor,
  makeScriptedGate,
};
