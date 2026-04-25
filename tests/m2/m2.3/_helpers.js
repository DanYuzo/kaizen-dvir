'use strict';

/**
 * Shared test helpers for M2.3 integration tests.
 *
 * Isolation strategy (mirrors M2.1/M2.2/M2.4):
 *   - `KAIZEN_LOGS_DIR`              → tmpdir under os.tmpdir()/kaizen-m2.3-<label>-<rand>
 *   - `KAIZEN_STATE_DIR`             → sibling tmpdir for `session-booted-cells.json`
 *   - `KAIZEN_BOOTED_CELLS_FILE`     → explicit path to the state file
 *
 * Fixtures:
 *   We seed `.kaizen-dvir/celulas/{fixtureName}/` under the real PROJECT_ROOT
 *   because `cie.js` resolves `CELULAS_DIR` at module load relative to its
 *   own location. The `seedFixtureCell` / `clearFixtureCell` helpers
 *   materialize / tear down fixtures so concurrent M2.3 tests can each use
 *   a unique cell name (e.g. `test-cell-a-<hex>`).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const CLAUDE_HOOKS_DIR = path.join(PROJECT_ROOT, '.claude', 'hooks');
const CELULAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkTmp(label) {
  const random = _rand();
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2.3-' + label + '-' + random + '-')
  );
  const logs = path.join(root, 'logs');
  const state = path.join(root, 'state');
  fs.mkdirSync(logs, { recursive: true });
  fs.mkdirSync(state, { recursive: true });
  process.env.KAIZEN_LOGS_DIR = logs;
  process.env.KAIZEN_STATE_DIR = state;
  process.env.KAIZEN_BOOTED_CELLS_FILE = path.join(
    state,
    'session-booted-cells.json'
  );
  return { root: root, logs: logs, state: state, label: label, random: random };
}

function rmTmp(sandbox) {
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_BOOTED_CELLS_FILE;
  try {
    fs.rmSync(sandbox.root, { recursive: true, force: true });
  } catch (_) {
    // Best-effort — Windows may hold a transient handle.
  }
}

/**
 * Create a fixture cell directory with a celula.yaml declaring `boot:`
 * entries and the declared files on disk. Returns the cell name and
 * absolute directory path so the caller can clean up.
 *
 * @param {string} baseName — e.g. 'test-cell-a'; a unique suffix is appended.
 * @param {Array<{path:string, content:string}>} bootFiles
 * @param {{missingManifest?:boolean}} [opts]
 * @returns {{cellName:string, dir:string}}
 */
function seedFixtureCell(baseName, bootFiles, opts) {
  opts = opts || {};
  const cellName = baseName + '-' + _rand();
  const dir = path.join(CELULAS_DIR, cellName);
  fs.mkdirSync(dir, { recursive: true });

  if (!opts.missingManifest) {
    const lines = ['description: "Fixture cell for M2.3 CIE-3 tests"', 'boot:'];
    for (const bf of bootFiles) {
      lines.push('  - ' + bf.path);
    }
    fs.writeFileSync(path.join(dir, 'celula.yaml'), lines.join('\n') + '\n');

    for (const bf of bootFiles) {
      const full = path.join(dir, bf.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, bf.content, 'utf8');
    }
  }

  return { cellName: cellName, dir: dir };
}

function clearFixtureCell(fixture) {
  try {
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  } catch (_) {
    // Best-effort.
  }
}

function requireFresh(absPath) {
  delete require.cache[require.resolve(absPath)];
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

function readLogFiles(tmpDir, subtype) {
  const type = subtype || 'hook-calls';
  const dir = path.join(tmpDir, type);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  const lines = [];
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      if (line.trim()) lines.push(JSON.parse(line));
    }
  }
  return lines;
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  HOOKS_DIR: HOOKS_DIR,
  CLAUDE_HOOKS_DIR: CLAUDE_HOOKS_DIR,
  CELULAS_DIR: CELULAS_DIR,
  mkTmp: mkTmp,
  rmTmp: rmTmp,
  seedFixtureCell: seedFixtureCell,
  clearFixtureCell: clearFixtureCell,
  requireFresh: requireFresh,
  cieFresh: cieFresh,
  hookEntryFresh: hookEntryFresh,
  readLogFiles: readLogFiles,
};
