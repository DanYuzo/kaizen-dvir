'use strict';

/*
 * test-rollback-no-snapshot.js — M6.4 / AC-024 / NFR-105.
 * Running `kaizen rollback` in a directory with no `.kaizen/snapshots/`
 * must emit a pt-BR warn and exit 0 (no error).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KAIZEN_BIN = path.join(REPO_ROOT, 'bin', 'kaizen.js');

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-nosnap-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// stub\n', 'utf8');
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    'commandments\n',
    'utf8'
  );
  return root;
}

test('M6.4 / AC-024 — rollback with no snapshots emits pt-BR warn + exits 0', () => {
  const root = makeSandbox();
  try {
    const r = spawnSync(
      process.execPath,
      [KAIZEN_BIN, 'rollback'],
      {
        cwd: root,
        encoding: 'utf8',
        env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: root }),
      }
    );
    assert.equal(r.status, 0, 'no-snapshot rollback must exit 0; got ' + r.status + ' / ' + r.stderr);
    assert.match(r.stdout, /Aviso/u, 'must include pt-BR warn keyword');
    assert.match(r.stdout, /nenhum snapshot/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — rollback --list with no snapshots prints pt-BR empty notice', () => {
  const root = makeSandbox();
  try {
    const r = spawnSync(
      process.execPath,
      [KAIZEN_BIN, 'rollback', '--list'],
      {
        cwd: root,
        encoding: 'utf8',
        env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: root }),
      }
    );
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Nenhum snapshot encontrado/u);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
