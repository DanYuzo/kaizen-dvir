'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'hooks'
);

function mkTmpLogs(label) {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m2.1-' + label + '-')
  );
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function rmTmp(dir) {
  delete process.env.KAIZEN_LOGS_DIR;
  fs.rmSync(dir, { recursive: true, force: true });
}

function requireFresh(relToHooks) {
  const full = path.join(HOOKS_DIR, relToHooks);
  delete require.cache[require.resolve(full)];
  // Also drop log-writer from cache so KAIZEN_LOGS_DIR is re-read.
  const lw = path.join(HOOKS_DIR, 'log-writer.js');
  delete require.cache[require.resolve(lw)];
  return require(full);
}

module.exports = { PROJECT_ROOT, HOOKS_DIR, mkTmpLogs, rmTmp, requireFresh };
