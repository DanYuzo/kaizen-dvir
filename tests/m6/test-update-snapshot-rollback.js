'use strict';

/*
 * test-update-snapshot-rollback.js — M6.2 / M6.4 contract.
 *
 * Validates that:
 *   1. `kaizen update` creates a snapshot BEFORE writing any file
 *      (re-asserted at the orchestrator level — already covered in
 *      isolation by tests/m6/test-snapshot-call-order.js for the lib).
 *   2. After a successful update the snapshot is intact and contains the
 *      pre-update content of L1/L2 files (so `kaizen rollback` can revert).
 *   3. Manual restore from the snapshot via snapshot.restoreSnapshot()
 *      returns the project to its pre-update state for L1 paths.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const UPDATE_BIN = path.resolve(__dirname, '..', '..', 'bin', 'kaizen-update.js');
const SNAPSHOT_LIB = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

function loadUpdate() {
  delete require.cache[require.resolve(UPDATE_BIN)];
  return require(UPDATE_BIN);
}

function loadSnapshot() {
  delete require.cache[require.resolve(SNAPSHOT_LIB)];
  return require(SNAPSHOT_LIB);
}

function sha256(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-2-rb-'));
}

function setupFixture() {
  const project = makeRoot();
  const canonical = makeRoot();
  fs.mkdirSync(path.join(project, 'bin'), { recursive: true });
  const preL1 = '// pre-update v1.5\n';
  fs.writeFileSync(path.join(project, 'bin', 'kaizen.js'), preL1, 'utf8');
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.5.0', // use 1.5 -> 1.6 to skip the v1.4-to-v1.5 migration
      files: {
        'bin/kaizen.js': { hash: sha256(Buffer.from(preL1)), layer: 'L1', size: preL1.length },
      },
    }, null, 2) + '\n',
    'utf8'
  );

  fs.mkdirSync(path.join(canonical, 'bin'), { recursive: true });
  const postL1 = '// post-update v1.6\n';
  fs.writeFileSync(path.join(canonical, 'bin', 'kaizen.js'), postL1, 'utf8');
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.6.0',
      files: {
        'bin/kaizen.js': { hash: sha256(Buffer.from(postL1)), layer: 'L1', size: postL1.length },
      },
    }, null, 2) + '\n',
    'utf8'
  );

  return { project, canonical, preL1, postL1 };
}

function runUpdate(args, projectRoot) {
  const { runUpdate } = loadUpdate();
  const stdout = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (s) => {
    stdout.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  const origEnv = process.env.KAIZEN_PROJECT_ROOT;
  process.env.KAIZEN_PROJECT_ROOT = projectRoot;
  let exitCode;
  try {
    exitCode = runUpdate(args);
  } finally {
    process.stdout.write = origStdoutWrite;
    if (origEnv === undefined) delete process.env.KAIZEN_PROJECT_ROOT;
    else process.env.KAIZEN_PROJECT_ROOT = origEnv;
  }
  return { exitCode, stdout: stdout.join('') };
}

test('M6.2 KZ-M6-R3 — snapshot is created before any framework write', () => {
  const { project, canonical, preL1, postL1 } = setupFixture();
  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 0);

  // Live file now has post-update content.
  assert.equal(
    fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8'),
    postL1
  );

  // Snapshot directory exists with exactly one entry.
  const snapsRoot = path.join(project, '.kaizen', 'snapshots');
  assert.ok(fs.existsSync(snapsRoot));
  const entries = fs.readdirSync(snapsRoot);
  assert.equal(entries.length, 1, 'exactly one snapshot expected');
  // Snapshot bin/kaizen.js carries the PRE-update content.
  const snapL1Path = path.join(snapsRoot, entries[0], 'bin', 'kaizen.js');
  assert.ok(fs.existsSync(snapL1Path), 'snapshot must contain bin/kaizen.js');
  assert.equal(fs.readFileSync(snapL1Path, 'utf8'), preL1);
});

test('M6.2 / M6.4 — restoreSnapshot reverts L1 file to pre-update state', () => {
  const { project, canonical, preL1, postL1 } = setupFixture();
  const r1 = runUpdate(['--canonical-root', canonical], project);
  assert.equal(r1.exitCode, 0);
  // Confirm the live file changed.
  assert.equal(
    fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8'),
    postL1
  );
  // Restore the only snapshot manually.
  const snap = loadSnapshot();
  const list = snap.listSnapshots({ projectRoot: project });
  assert.equal(list.length, 1);
  const r = snap.restoreSnapshot({
    projectRoot: project,
    snapshotPath: list[0].path,
  });
  assert.ok(r.restoredCount >= 1);
  // bin/kaizen.js is now back to pre-update content.
  assert.equal(
    fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8'),
    preL1
  );
});
