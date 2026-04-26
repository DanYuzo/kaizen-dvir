'use strict';

/*
 * test-rollback-idempotent.js — M6.4 / AC-024.
 * Round-trip: snapshot -> mutate -> rollback -> state matches snapshot.
 * Then run rollback a second time and assert no error and state still
 * matches (idempotency).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KAIZEN_BIN = path.join(REPO_ROOT, 'bin', 'kaizen.js');
const SNAPSHOT_MOD = path.join(
  REPO_ROOT,
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

function loadFresh() {
  delete require.cache[require.resolve(SNAPSHOT_MOD)];
  return require(SNAPSHOT_MOD);
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-idem-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    'commandments v1.4 original\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'dvir', 'engine.js'),
    '// engine v1.4\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, '.claude', 'CLAUDE.md'), 'claude\n', 'utf8');
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// stub bin\n', 'utf8');
  return root;
}

function runRollback(projectRoot, args) {
  return spawnSync(
    process.execPath,
    [KAIZEN_BIN, 'rollback', ...args],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: projectRoot }),
    }
  );
}

test('M6.4 / AC-024 — round trip: snapshot, mutate, rollback restores exact state', () => {
  const root = makeSandbox();
  try {
    const snapshot = loadFresh();
    const before = snapshot.computeStateFingerprint({ projectRoot: root });
    snapshot.createSnapshot({
      projectRoot: root,
      version: '1.4.0',
      timestamp: '2026-04-25T14:30:00.000Z',
    });

    // Mutate the project — overwrite an L1 file and add a new one.
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'commandments.md'),
      'CORRUPTED by simulated update\n',
      'utf8'
    );
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'dvir', 'engine.js'),
      '// CORRUPTED engine\n',
      'utf8'
    );
    const mutated = snapshot.computeStateFingerprint({ projectRoot: root });
    assert.notEqual(before, mutated, 'fingerprint must change after mutation');

    // First rollback — restores state.
    const r1 = runRollback(root, []);
    assert.equal(r1.status, 0, 'first rollback exit non-zero: ' + r1.stderr);
    assert.match(r1.stdout, /Rollback concluído/u);
    const restored = snapshot.computeStateFingerprint({ projectRoot: root });
    assert.equal(restored, before, 'state after rollback must match pre-snapshot state');

    // Second rollback — idempotency. Live state already matches the
    // snapshot, so the CLI must short-circuit with a pt-BR warn.
    const r2 = runRollback(root, []);
    assert.equal(r2.status, 0, 'second rollback exit non-zero: ' + r2.stderr);
    assert.match(r2.stdout, /Aviso: estado atual já corresponde/u);
    const afterSecond = snapshot.computeStateFingerprint({ projectRoot: root });
    assert.equal(afterSecond, before, 'state must remain stable across idempotent rollbacks');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
