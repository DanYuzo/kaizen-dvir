'use strict';

/*
 * test-canonical-manifest.js — M6.1 AC verification (T4b)
 *
 * Validates that bin/build-canonical-manifest.js:
 *   - Emits .kaizen-dvir/manifest.json with the correct schema (Q1).
 *   - Is idempotent — re-runs produce identical file entries (excluding the
 *     timestamp at the manifest root).
 *   - Hashes only files inside the package.json `files` whitelist.
 *   - Stamps each entry with a layer (L1 or L2) per the layer rules.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BUILDER = path.join(ROOT, 'bin', 'build-canonical-manifest.js');
const MANIFEST = path.join(ROOT, '.kaizen-dvir', 'manifest.json');

function buildManifest() {
  const result = spawnSync(process.execPath, [BUILDER], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return result;
}

function readManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
}

test('M6.1 AC9 — builder script exists and is invokable', () => {
  assert.ok(fs.existsSync(BUILDER), 'bin/build-canonical-manifest.js must exist');
  const r = buildManifest();
  assert.equal(r.status, 0, 'builder exited non-zero: ' + r.stderr);
});

test('M6.1 AC9 — manifest has version + generatedAt + generator + files', () => {
  buildManifest();
  const m = readManifest();
  assert.equal(typeof m.version, 'string');
  assert.equal(typeof m.generatedAt, 'string');
  assert.match(m.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(typeof m.generator, 'string');
  assert.equal(typeof m.files, 'object');
  assert.ok(Object.keys(m.files).length > 0, 'manifest should contain hashed files');
});

test('M6.1 AC9 — version mirrors package.json version', () => {
  buildManifest();
  const m = readManifest();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(m.version, pkg.version);
});

test('M6.1 AC9 — every file entry has hash, layer, size', () => {
  buildManifest();
  const m = readManifest();
  for (const [p, entry] of Object.entries(m.files)) {
    assert.ok(/^sha256:[0-9a-f]{64}$/.test(entry.hash), 'bad hash for ' + p);
    assert.ok(['L1', 'L2'].includes(entry.layer), 'bad layer for ' + p + ': ' + entry.layer);
    assert.equal(typeof entry.size, 'number', 'size missing for ' + p);
    assert.ok(entry.size >= 0, 'negative size for ' + p);
  }
});

test('M6.1 AC9 — manifest is idempotent on file entries (excluding timestamp)', () => {
  buildManifest();
  const a = readManifest();
  buildManifest();
  const b = readManifest();
  // generatedAt may differ; everything else must match exactly.
  delete a.generatedAt;
  delete b.generatedAt;
  assert.deepEqual(a, b);
});

test('M6.1 AC9 — manifest hashes only files inside the publish whitelist', () => {
  buildManifest();
  const m = readManifest();
  const banned = ['tests/', 'docs/', '.github/', '.kaizen/'];
  for (const p of Object.keys(m.files)) {
    for (const b of banned) {
      assert.ok(
        !p.startsWith(b),
        'manifest leaked an excluded path: ' + p
      );
    }
  }
});

test('M6.1 AC9 — bin/ and .kaizen-dvir/dvir/ files are tagged L1', () => {
  buildManifest();
  const m = readManifest();
  for (const [p, entry] of Object.entries(m.files)) {
    if (p.startsWith('bin/') || p.startsWith('.kaizen-dvir/dvir/')) {
      assert.equal(entry.layer, 'L1', p + ' should be L1');
    }
  }
});

test('M6.1 AC9 — celulas/ files are tagged L2', () => {
  buildManifest();
  const m = readManifest();
  for (const [p, entry] of Object.entries(m.files)) {
    if (p.startsWith('.kaizen-dvir/celulas/')) {
      assert.equal(entry.layer, 'L2', p + ' should be L2');
    }
  }
});

test('M6.1 AC9 — known critical L1 file is present in manifest', () => {
  buildManifest();
  const m = readManifest();
  assert.ok(
    m.files['.kaizen-dvir/commandments.md'],
    'commandments.md must appear in canonical manifest'
  );
  assert.equal(m.files['.kaizen-dvir/commandments.md'].layer, 'L1');
});
