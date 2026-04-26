'use strict';

/*
 * test-migration-snapshot-contract.js — M6.5 contract test for the
 * snapshot <-> migration integration order that M6.2's update flow
 * will implement.
 *
 * Per the story Dev Notes and the Acceptance Criteria, the canonical
 * `kaizen update` pipeline is:
 *
 *   1. validateN1                  (M6.5 — abort on CON-010 violation;
 *                                   no snapshot created on abort)
 *   2. createSnapshot              (M6.4 — pre-update safety net)
 *   3. migration.forward(...)      (M6.5 — runs in the middle slot)
 *   4. layered policy + manifest refresh (M6.2)
 *
 * This test stitches those steps together against fixture sandboxes and
 * validates two contracts:
 *
 *   A. On a happy path: snapshot is created BEFORE forward(), forward()
 *      mutates the project tree, and the snapshot still holds the
 *      pre-mutation state (so rollback would restore it cleanly).
 *
 *   B. On a forward() failure: the snapshot is intact and a manual
 *      restoreSnapshot() reverts the project to its pre-migration state
 *      byte-for-byte. This is the failure-rollback contract M6.2 will
 *      surface to the expert via the existing `kaizen rollback` command.
 *
 * The test does not require M6.2 to be implemented — it directly invokes
 * the snapshot module from M6.4 and the migration module from M6.5,
 * mirroring the integration order M6.2 will adopt.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const SNAPSHOT_MOD = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

const MIGRATIONS_MOD = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'migrations.js'
);

function loadFresh(modPath) {
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

function makeV14Sandbox() {
  // Build a minimal v1.4-shaped install: a few framework files plus a
  // legacy `.claude/CLAUDE.md` (no delimiters). This matches the input
  // M6.2 will see when it calls into the migration runner.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-5-snap-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'celulas', 'yotzer'), {
    recursive: true,
  });
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });

  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: '1.4.0',
        files: {
          'bin/kaizen.js': { hash: 'sha256:x', size: 1 },
          '.kaizen-dvir/celulas/yotzer/celula.yaml': {
            hash: 'sha256:y',
            size: 2,
          },
          '.claude/CLAUDE.md': { hash: 'sha256:z', size: 3 },
        },
      },
      null,
      2
    ),
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), 'pre-update bin\n', 'utf8');
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    '# Commandments v1.4\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'celulas', 'yotzer', 'celula.yaml'),
    'name: yotzer\n',
    'utf8'
  );
  // Legacy v1.4 CLAUDE.md (no delimiters).
  fs.writeFileSync(
    path.join(root, '.claude', 'CLAUDE.md'),
    '# CLAUDE.md\n\nLegacy v1.4 expert content.\n',
    'utf8'
  );
  return root;
}

function fileHash(absPath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(absPath))
    .digest('hex');
}

function noopLog() {}

// -- Contract A: snapshot is created before migration runs --------------

test('M6.5 contract — snapshot captures pre-migration state, then migration mutates the tree', async () => {
  const root = makeV14Sandbox();
  const snapMod = loadFresh(SNAPSHOT_MOD);
  const migLoader = loadFresh(MIGRATIONS_MOD);

  // Capture pre-migration hashes.
  const claudeMdPath = path.join(root, '.claude', 'CLAUDE.md');
  const preHash = fileHash(claudeMdPath);

  // Step 2: snapshot first.
  const snap = snapMod.createSnapshot({
    projectRoot: root,
    version: '1.4.0',
    timestamp: '2026-04-25T14-30-00Z',
  });
  assert.ok(snap.snapshotPath);

  const snapClaudeMd = path.join(snap.snapshotPath, '.claude', 'CLAUDE.md');
  assert.equal(fileHash(snapClaudeMd), preHash, 'snapshot must hold pre-migration content');

  // Step 3: migration.
  const mig = migLoader.loadMigration({ from: '1.4.0', to: '1.5.0' });
  assert.ok(mig);
  await mig.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });

  // The live file is now mutated.
  const postHash = fileHash(claudeMdPath);
  assert.notEqual(postHash, preHash, 'migration must mutate CLAUDE.md');

  // The snapshot is still untouched.
  assert.equal(
    fileHash(snapClaudeMd),
    preHash,
    'snapshot must remain byte-identical after migration'
  );
});

// -- Contract B: failure-rollback restores from snapshot ----------------

test('M6.5 contract — restoreSnapshot reverts a failed migration to the pre-migration state', async () => {
  const root = makeV14Sandbox();
  const snapMod = loadFresh(SNAPSHOT_MOD);

  // Capture pre-migration full state hash.
  const preState = snapMod.computeStateFingerprint({ projectRoot: root });

  // Snapshot first (M6.4 contract — always before any mutation).
  const snap = snapMod.createSnapshot({
    projectRoot: root,
    version: '1.4.0',
    timestamp: '2026-04-25T14-31-00Z',
  });

  // Simulate a buggy migration that partially mutates the tree and then
  // throws. M6.2 catches this, surfaces a pt-BR error, and offers
  // rollback. This test exercises only the rollback half.
  const claudeMd = path.join(root, '.claude', 'CLAUDE.md');
  const commandments = path.join(root, '.kaizen-dvir', 'commandments.md');

  let threw = false;
  try {
    fs.writeFileSync(claudeMd, 'CORRUPTED PARTIAL WRITE\n', 'utf8');
    fs.writeFileSync(commandments, 'CORRUPTED COMMANDMENTS\n', 'utf8');
    throw new Error('synthetic migration failure');
  } catch (err) {
    threw = true;
    // Rollback path — restore the snapshot.
    const restored = snapMod.restoreSnapshot({
      projectRoot: root,
      snapshotPath: snap.snapshotPath,
    });
    assert.ok(restored.restoredCount >= 2, 'must restore at least the two corrupted files');
  }
  assert.equal(threw, true);

  // After rollback, full state hash should match the pre-migration baseline.
  const postState = snapMod.computeStateFingerprint({ projectRoot: root });
  assert.equal(
    postState,
    preState,
    'state after rollback must equal pre-migration state byte-for-byte'
  );
});

// -- Contract C: N-1 abort happens BEFORE snapshot creation -------------

test('M6.5 contract — N-1 abort path does not create a snapshot', () => {
  const root = makeV14Sandbox();
  const snapMod = loadFresh(SNAPSHOT_MOD);
  const migLoader = loadFresh(MIGRATIONS_MOD);

  // Simulate the M6.2 update flow's pre-snapshot guard.
  const result = migLoader.validateN1({ installed: '1.3.0', target: '1.5.0' });
  if (!result.ok) {
    // Abort before snapshot — exit non-zero, write pt-BR error.
    // (The test just asserts the contract: no snapshot directory is
    // created. It does not invoke createSnapshot.)
  } else {
    snapMod.createSnapshot({
      projectRoot: root,
      version: '1.5.0',
      timestamp: '2026-04-25T14-32-00Z',
    });
  }

  const snapsDir = path.join(root, '.kaizen', 'snapshots');
  const snaps = fs.existsSync(snapsDir) ? fs.readdirSync(snapsDir) : [];
  assert.equal(snaps.length, 0, 'no snapshot must be created on N-1 abort');
});
