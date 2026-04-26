'use strict';

/*
 * test-manifest.js — M6.2 unit tests for the local manifest loader/writer.
 *
 * Validates:
 *   - readManifest returns null when the file is absent.
 *   - writeManifest produces a deterministic body (sorted keys, trailing
 *     newline, 2-space indent) matching the canonical builder.
 *   - Round-trip readManifest(writeManifest(...)) equals the data written
 *     (modulo generator default).
 *   - computeHash returns a "sha256:<64-hex>" string.
 *   - computeFileEntry returns { hash, size, layer? }.
 *   - resolveCanonicalManifest returns null when no canonical reachable
 *     and the parsed manifest when an explicit canonicalRoot is provided.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const MANIFEST_LIB = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'manifest.js'
);

function loadFresh() {
  delete require.cache[require.resolve(MANIFEST_LIB)];
  return require(MANIFEST_LIB);
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-2-manifest-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir'), { recursive: true });
  return root;
}

test('M6.2 — manifest.js exists at the canonical path', () => {
  assert.ok(fs.existsSync(MANIFEST_LIB), 'manifest.js missing');
});

test('M6.2 — readManifest returns null when file absent', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  assert.equal(lib.readManifest(root), null);
});

test('M6.2 — writeManifest then readManifest round-trip', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  const data = {
    version: '1.5.0',
    generatedAt: '2026-04-25T12:00:00.000Z',
    files: {
      'b.txt': { hash: 'sha256:bb', layer: 'L1', size: 2 },
      'a.txt': { hash: 'sha256:aa', layer: 'L1', size: 1 },
    },
  };
  const written = lib.writeManifest(root, data);
  assert.ok(fs.existsSync(written), 'manifest file should exist after write');

  const parsed = lib.readManifest(root);
  assert.equal(parsed.version, '1.5.0');
  assert.equal(parsed.generatedAt, '2026-04-25T12:00:00.000Z');
  assert.equal(parsed.generator, 'kaizen-update@1');

  const keys = Object.keys(parsed.files);
  assert.deepEqual(keys, ['a.txt', 'b.txt'], 'files must be sorted by key');
});

test('M6.2 — writeManifest output ends with a trailing newline', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  lib.writeManifest(root, { version: '1.5.0', files: {} });
  const raw = fs.readFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    'utf8'
  );
  assert.ok(raw.endsWith('\n'), 'manifest must end with newline');
});

test('M6.2 — computeHash returns sha256-prefixed hex', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  const f = path.join(root, 'sample.txt');
  fs.writeFileSync(f, 'hello\n', 'utf8');
  const h = lib.computeHash(f);
  assert.match(h, /^sha256:[a-f0-9]{64}$/);
});

test('M6.2 — computeFileEntry includes hash + size and optional layer', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  const f = path.join(root, 'data.bin');
  fs.writeFileSync(f, Buffer.from('xyz'));
  const without = lib.computeFileEntry(f);
  assert.equal(without.size, 3);
  assert.match(without.hash, /^sha256:/);
  assert.equal(without.layer, undefined);

  const withLayer = lib.computeFileEntry(f, 'L1');
  assert.equal(withLayer.layer, 'L1');
});

test('M6.2 — resolveCanonicalManifest with explicit canonicalRoot', () => {
  const root = makeSandbox();
  const canonRoot = makeSandbox();
  const lib = loadFresh();
  // Plant a fake canonical manifest in canonRoot.
  const canonPath = path.join(canonRoot, '.kaizen-dvir', 'manifest.json');
  fs.mkdirSync(path.dirname(canonPath), { recursive: true });
  fs.writeFileSync(
    canonPath,
    JSON.stringify({
      version: '1.5.0',
      files: { 'foo.md': { hash: 'sha256:00', layer: 'L1' } },
    }) + '\n',
    'utf8'
  );
  const r = lib.resolveCanonicalManifest({
    projectRoot: root,
    canonicalRoot: canonRoot,
  });
  assert.ok(r, 'should resolve when canonicalRoot is explicit');
  assert.equal(r.manifest.version, '1.5.0');
  assert.equal(r.canonicalRoot, canonRoot);
});

test('M6.2 — resolveCanonicalManifest returns null when nothing found', () => {
  const root = makeSandbox();
  const lib = loadFresh();
  // Wipe both env and project node_modules; pass a non-existent canonicalRoot.
  delete process.env.KAIZEN_CANONICAL_ROOT;
  const r = lib.resolveCanonicalManifest({
    projectRoot: root,
    canonicalRoot: path.join(root, 'does-not-exist'),
  });
  assert.equal(r, null);
});

test('M6.2 — example manifest fixture parses cleanly and matches schema', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'manifest-example.json');
  assert.ok(fs.existsSync(fixturePath), 'fixture must exist');
  const parsed = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.equal(typeof parsed.version, 'string');
  assert.equal(typeof parsed.generatedAt, 'string');
  assert.equal(typeof parsed.files, 'object');
  for (const [rel, entry] of Object.entries(parsed.files)) {
    assert.match(entry.hash, /^sha256:/, rel + ' must have sha256 hash');
    assert.ok(
      entry.layer === 'L1' ||
        entry.layer === 'L2' ||
        entry.layer === 'L3' ||
        entry.layer === 'L4-readonly',
      rel + ' must have a valid layer'
    );
  }
});
