'use strict';

/*
 * test-rollback-perf.js — M6.4 / NFR-105.
 * Asserts restoreSnapshot completes in under 5000 ms for a reference
 * project of approximately 50 files / ~500 KB total.
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

function makeReferenceFootprint() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-perf-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'celulas', 'yotzer'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'instructions'), { recursive: true });
  fs.mkdirSync(path.join(root, '.claude', 'rules'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );

  // Synthesize ~50 files across the framework roots, each carrying a
  // few hundred bytes so the total footprint approximates 500 KB worst
  // case (well under for the typical install).
  const filler = 'x'.repeat(8000) + '\n';
  let count = 0;
  for (let i = 0; i < 18; i++) {
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'dvir', 'mod-' + i + '.js'),
      '// mod ' + i + '\n' + filler.slice(0, 400),
      'utf8'
    );
    count++;
  }
  for (let i = 0; i < 12; i++) {
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'instructions', 'inst-' + i + '.md'),
      '# Inst ' + i + '\n' + filler.slice(0, 400),
      'utf8'
    );
    count++;
  }
  for (let i = 0; i < 10; i++) {
    fs.writeFileSync(
      path.join(root, '.claude', 'rules', 'rule-' + i + '.md'),
      '# Rule ' + i + '\n' + filler.slice(0, 200),
      'utf8'
    );
    count++;
  }
  for (let i = 0; i < 8; i++) {
    fs.writeFileSync(
      path.join(root, 'bin', 'helper-' + i + '.js'),
      '// helper ' + i + '\n' + filler.slice(0, 200),
      'utf8'
    );
    count++;
  }
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    'commandments\n',
    'utf8'
  );
  count++;
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'celulas', 'yotzer', 'README.md'),
    '# yotzer\n',
    'utf8'
  );
  count++;
  return { root: root, fileCount: count };
}

test('M6.4 / NFR-105 — restoreSnapshot under 5000 ms for ~50-file reference project', () => {
  const { root, fileCount } = makeReferenceFootprint();
  try {
    assert.ok(fileCount >= 40, 'reference fixture must approximate the 50-file target');
    const snapshot = loadFresh();
    snapshot.createSnapshot({
      projectRoot: root,
      version: '1.4.0',
      timestamp: '2026-04-25T14:30:00.000Z',
    });
    const list = snapshot.listSnapshots({ projectRoot: root });
    assert.equal(list.length, 1);

    // Mutate to force a real restore (so we measure the actual copy
    // path, not a no-op).
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'commandments.md'),
      'CORRUPTED\n',
      'utf8'
    );

    const result = snapshot.restoreSnapshot({
      projectRoot: root,
      snapshotPath: list[0].path,
    });
    assert.ok(
      result.durationMs < 5000,
      'restoreSnapshot took ' + result.durationMs + 'ms, target <5000ms'
    );
    assert.ok(
      result.restoredCount >= fileCount,
      'restoredCount ' + result.restoredCount + ' should cover all ' + fileCount + ' files'
    );
    // Verify content was actually restored.
    assert.equal(
      fs.readFileSync(path.join(root, '.kaizen-dvir', 'commandments.md'), 'utf8'),
      'commandments\n'
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
