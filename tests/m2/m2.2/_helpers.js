'use strict';

/**
 * Shared test helpers for M2.2 integration tests.
 *
 * Parallel-safe with M2.4: each test allocates a unique tmp dir via
 * `mkTmpLogs(label)` and sets `KAIZEN_LOGS_DIR` before requiring the
 * hook modules, isolating log writes from other concurrent suites.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const CLAUDE_HOOKS_DIR = path.join(PROJECT_ROOT, '.claude', 'hooks');

function mkTmpLogs(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2.2-' + label + '-')
  );
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function rmTmp(dir) {
  delete process.env.KAIZEN_LOGS_DIR;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // Best-effort cleanup.
  }
}

function requireFresh(absPath) {
  delete require.cache[require.resolve(absPath)];
  // Also bust dependent hook modules so KAIZEN_LOGS_DIR is re-read.
  const lw = path.join(HOOKS_DIR, 'log-writer.js');
  const runner = path.join(HOOKS_DIR, 'hook-runner.js');
  const cie = path.join(HOOKS_DIR, 'cie.js');
  for (const p of [lw, runner, cie]) {
    try {
      delete require.cache[require.resolve(p)];
    } catch (_) {
      /* not yet loaded — ignore */
    }
  }
  return require(absPath);
}

function cieFresh() {
  return requireFresh(path.join(HOOKS_DIR, 'cie.js'));
}

function hookEntryFresh() {
  return requireFresh(path.join(CLAUDE_HOOKS_DIR, 'UserPromptSubmit.js'));
}

function hookRunnerFresh() {
  return requireFresh(path.join(HOOKS_DIR, 'hook-runner.js'));
}

function readLogFiles(tmpDir) {
  const hookCallsDir = path.join(tmpDir, 'hook-calls');
  if (!fs.existsSync(hookCallsDir)) return [];
  const files = fs.readdirSync(hookCallsDir);
  const lines = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(hookCallsDir, f), 'utf8');
    for (const line of content.split('\n')) {
      if (line.trim()) lines.push(JSON.parse(line));
    }
  }
  return lines;
}

module.exports = {
  PROJECT_ROOT,
  HOOKS_DIR,
  CLAUDE_HOOKS_DIR,
  mkTmpLogs,
  rmTmp,
  requireFresh,
  cieFresh,
  hookEntryFresh,
  hookRunnerFresh,
  readLogFiles,
};
