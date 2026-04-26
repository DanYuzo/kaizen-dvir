'use strict';

/*
 * test-snapshot-prune.js — M6.4 unit test for pruneSnapshots.
 * Validates the retention policy: keepLast=N retains the N most recent
 * snapshots and removes older ones.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SNAPSHOT_MOD = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

function loadFresh() {
  delete require.cache[require.resolve(SNAPSHOT_MOD)];
  return require(SNAPSHOT_MOD);
}

function makeSandboxWithSnapshots(count) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-prune-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), 'v1\n', 'utf8');
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );

  const snapshot = loadFresh();
  // Pre-create snapshots with strictly increasing timestamps so list
  // ordering is deterministic.
  const created = [];
  for (let i = 0; i < count; i++) {
    const day = String(i + 1).padStart(2, '0');
    const result = snapshot.createSnapshot({
      projectRoot: root,
      version: '1.4.0',
      timestamp: '2026-04-' + day + 'T10:00:00.000Z',
    });
    created.push(result.snapshotPath);
  }
  return { root: root, snapshot: snapshot, created: created };
}

test('M6.4 — pruneSnapshots({keepLast:5}) keeps 5 most recent and removes older', () => {
  const { root, snapshot } = makeSandboxWithSnapshots(8);
  try {
    const result = snapshot.pruneSnapshots({ projectRoot: root, keepLast: 5 });
    assert.equal(result.kept.length, 5);
    assert.equal(result.removed.length, 3);
    const remaining = snapshot.listSnapshots({ projectRoot: root });
    assert.equal(remaining.length, 5);
    // Newest first — the kept set must be the 5 most recent timestamps.
    assert.ok(remaining[0].timestamp >= remaining[4].timestamp);
    // All kept paths still exist on disk.
    for (const k of result.kept) {
      assert.ok(fs.existsSync(k), 'kept snapshot must remain on disk: ' + k);
    }
    // All removed paths are gone.
    for (const r of result.removed) {
      assert.ok(!fs.existsSync(r), 'removed snapshot must be deleted: ' + r);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — pruneSnapshots({keepLast:3}) keeps 3 most recent', () => {
  const { root, snapshot } = makeSandboxWithSnapshots(7);
  try {
    snapshot.pruneSnapshots({ projectRoot: root, keepLast: 3 });
    const remaining = snapshot.listSnapshots({ projectRoot: root });
    assert.equal(remaining.length, 3);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — pruneSnapshots is a no-op when count <= keepLast', () => {
  const { root, snapshot } = makeSandboxWithSnapshots(2);
  try {
    const result = snapshot.pruneSnapshots({ projectRoot: root, keepLast: 5 });
    assert.equal(result.removed.length, 0);
    assert.equal(snapshot.listSnapshots({ projectRoot: root }).length, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — pruneSnapshots default keepLast is 5', () => {
  const { root, snapshot } = makeSandboxWithSnapshots(7);
  try {
    snapshot.pruneSnapshots({ projectRoot: root });
    assert.equal(snapshot.listSnapshots({ projectRoot: root }).length, 5);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
