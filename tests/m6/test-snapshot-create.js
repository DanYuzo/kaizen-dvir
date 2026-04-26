'use strict';

/*
 * test-snapshot-create.js — M6.4 unit test for createSnapshot.
 * Validates the directory layout schema, the version-timestamp naming
 * convention, the manifest.json companion file, the L4/snapshots
 * exclusion, and the return-value shape.
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

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-create-'));
  // Build a minimal pre-update framework footprint.
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'celulas', 'yotzer'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  // L4 paths that MUST be excluded from the snapshot.
  fs.mkdirSync(path.join(root, 'celulas', 'expert-cell'), { recursive: true });
  fs.mkdirSync(path.join(root, 'refs'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen', 'logs'), { recursive: true });

  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    '# Commandments v1.4\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'celulas', 'yotzer', 'MEMORY.md'),
    'memory content\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.claude', 'rules', 'foo.md'),
    'rule\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// stub\n', 'utf8');
  // L4 sentinel files that must NOT appear in the snapshot.
  fs.writeFileSync(
    path.join(root, 'celulas', 'expert-cell', 'work.md'),
    'expert work\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'refs', 'note.md'), 'ref\n', 'utf8');
  fs.writeFileSync(
    path.join(root, '.kaizen', 'logs', 'old.log'),
    'log\n',
    'utf8'
  );
  return root;
}

test('M6.4 — createSnapshot writes layout under {version}-{timestamp}/', () => {
  const root = makeSandbox();
  try {
    const snapshot = loadFresh();
    const result = snapshot.createSnapshot({
      projectRoot: root,
      version: '1.4.0',
      timestamp: '2026-04-25T14:30:00.000Z',
    });
    assert.ok(
      result.snapshotPath.includes(path.join('.kaizen', 'snapshots')),
      'snapshotPath must live under .kaizen/snapshots/'
    );
    assert.ok(
      result.snapshotPath.endsWith('1.4.0-2026-04-25T14-30-00.000Z'),
      'directory name must use safe (hyphenated) ISO timestamp: ' + result.snapshotPath
    );
    assert.ok(fs.existsSync(result.snapshotPath));
    assert.ok(
      fs.existsSync(path.join(result.snapshotPath, 'manifest.json')),
      'manifest.json companion must be present at snapshot root'
    );
    assert.ok(
      fs.existsSync(path.join(result.snapshotPath, '.kaizen-dvir', 'commandments.md'))
    );
    assert.ok(
      fs.existsSync(path.join(result.snapshotPath, '.claude', 'rules', 'foo.md'))
    );
    assert.ok(fs.existsSync(path.join(result.snapshotPath, 'bin', 'kaizen.js')));
    assert.ok(typeof result.fileCount === 'number' && result.fileCount > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — createSnapshot excludes L4 (celulas/, refs/, .kaizen/)', () => {
  const root = makeSandbox();
  try {
    const snapshot = loadFresh();
    const result = snapshot.createSnapshot({
      projectRoot: root,
      version: '1.4.0',
      timestamp: '2026-04-25T14:30:00.000Z',
    });
    // L4 sentinels must NOT exist inside the snapshot.
    assert.ok(
      !fs.existsSync(path.join(result.snapshotPath, 'celulas')),
      'project-root celulas/ (L4) must not appear in snapshot'
    );
    assert.ok(
      !fs.existsSync(path.join(result.snapshotPath, 'refs')),
      'refs/ (L4) must not appear in snapshot'
    );
    assert.ok(
      !fs.existsSync(path.join(result.snapshotPath, '.kaizen')),
      '.kaizen/ (L4 runtime) must not appear in snapshot — recursive snapshot ban'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — createSnapshot is filesystem-safe on Windows (no colons in dir name)', () => {
  const root = makeSandbox();
  try {
    const snapshot = loadFresh();
    const result = snapshot.createSnapshot({
      projectRoot: root,
      version: '1.5.0-rc.0',
      timestamp: '2026-04-25T14:30:00Z',
    });
    const base = path.basename(result.snapshotPath);
    assert.ok(!base.includes(':'), 'snapshot dir name must not contain ":" — got ' + base);
    assert.ok(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/.test(base));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 — createSnapshot throws when version is missing', () => {
  const root = makeSandbox();
  try {
    const snapshot = loadFresh();
    assert.throws(
      () => snapshot.createSnapshot({ projectRoot: root }),
      /version is required/u
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
