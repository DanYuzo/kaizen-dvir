'use strict';

/*
 * test-package-json-shape.js — M6.1 AC verification
 *
 * Validates that package.json has every key required by Story M6.1 and that
 * v1.4 path renames (D-v1.4-01, D-v1.4-04, D-v1.4-05) are honored in the
 * `files` whitelist (no residual `core/`, `infrastructure/`, `development/`,
 * `docs/`, `knowledge/`).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const PKG_PATH = path.join(ROOT, 'package.json');

function readPkg() {
  const raw = fs.readFileSync(PKG_PATH, 'utf8');
  return JSON.parse(raw); // throws on invalid JSON — covers FR-042 parse AC
}

test('M6.1 AC2 — package.json parses cleanly', () => {
  assert.doesNotThrow(() => readPkg());
});

test('M6.1 AC2 — name is @DanYuzo/kaizen-dvir', () => {
  assert.equal(readPkg().name, '@DanYuzo/kaizen-dvir');
});

test('M6.1 AC2 — version is 1.5.0-rc.0 initial release candidate', () => {
  assert.equal(readPkg().version, '1.5.0-rc.0');
});

test('M6.1 AC2 — publishConfig points at GitHub Packages and is restricted', () => {
  const pkg = readPkg();
  assert.ok(pkg.publishConfig, 'publishConfig must exist');
  assert.equal(pkg.publishConfig.registry, 'https://npm.pkg.github.com');
  assert.equal(pkg.publishConfig.access, 'restricted');
});

test('M6.1 AC2 — repository field is correctly typed', () => {
  const pkg = readPkg();
  assert.ok(pkg.repository, 'repository must exist');
  assert.equal(pkg.repository.type, 'git');
  assert.match(pkg.repository.url, /github\.com\/DanYuzo\/kaizen-dvir/);
});

test('M6.1 AC2 — engines.node is declared', () => {
  const pkg = readPkg();
  assert.ok(pkg.engines && pkg.engines.node, 'engines.node must be declared');
});

test('M6.1 AC2 — bin field preserves kaizen and kaizen-init entry points', () => {
  const pkg = readPkg();
  assert.ok(pkg.bin, 'bin must exist');
  assert.equal(pkg.bin.kaizen, 'bin/kaizen.js');
  assert.equal(pkg.bin['kaizen-init'], 'bin/kaizen-init.js');
});

test('M6.1 AC2 — files whitelist enumerates all required framework paths', () => {
  const pkg = readPkg();
  assert.ok(Array.isArray(pkg.files), 'files must be an array');
  const required = [
    'bin/',
    '.kaizen-dvir/dvir/',
    '.kaizen-dvir/commandments.md',
    '.kaizen-dvir/dvir-config.yaml',
    '.kaizen-dvir/manifest.json',
    '.kaizen-dvir/instructions/',
    '.kaizen-dvir/celulas/',
    '.kaizen-dvir/infra/',
    '.kaizen-dvir/refs/',
  ];
  for (const r of required) {
    assert.ok(
      pkg.files.includes(r),
      'files whitelist missing required entry: ' + r
    );
  }
});

test('M6.1 AC7 — files whitelist contains no v1.3 legacy strings', () => {
  // D-v1.4-01 (core/ -> dvir/), D-v1.4-04 (docs/ -> refs/, knowledge/ -> ikigai/),
  // D-v1.4-05 (infrastructure/ -> infra/, development/ -> instructions/)
  const pkg = readPkg();
  const banned = ['core/', 'infrastructure/', 'development/', 'docs/', 'knowledge/'];
  for (const entry of pkg.files) {
    for (const b of banned) {
      assert.ok(
        !entry.includes(b),
        'files whitelist entry ' + entry + ' still references legacy path ' + b
      );
    }
  }
});

test('M6.1 AC6 — no external runtime or dev dependencies introduced', () => {
  const pkg = readPkg();
  const runtime = Object.keys(pkg.dependencies || {});
  const dev = Object.keys(pkg.devDependencies || {});
  assert.equal(runtime.length, 0, 'unexpected runtime dependencies: ' + runtime.join(', '));
  assert.equal(dev.length, 0, 'unexpected devDependencies: ' + dev.join(', '));
});

test('M6.1 Dev Notes — CON-002 type field is absent or commonjs', () => {
  const pkg = readPkg();
  if (Object.prototype.hasOwnProperty.call(pkg, 'type')) {
    assert.equal(pkg.type, 'commonjs');
  }
});
