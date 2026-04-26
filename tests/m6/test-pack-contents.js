'use strict';

/*
 * test-pack-contents.js — M6.1 AC1, AC8 verification
 *
 * Validates that:
 *   - `npm pack --dry-run` produces a tarball whose contents match the
 *     `files` whitelist exactly (CON-008, AC1).
 *   - No excluded paths leak (tests/, docs/kaizen/, .github/, .kaizen/).
 *   - The committed baseline tests/m6/expected-package-contents.txt matches
 *     the live `npm pack --dry-run` output (KZ-M6-R5 mitigation, AC8).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(__dirname, 'expected-package-contents.txt');

function actualPackPaths() {
  // npm is the canonical resolver — we must use npm pack so the test mirrors
  // what the publish workflow does. Use shell:false-equivalent via node-style
  // child_process to avoid platform quoting issues.
  const isWin = process.platform === 'win32';
  const npmBin = isWin ? 'npm.cmd' : 'npm';
  const out = execFileSync(npmBin, ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: isWin, // npm.cmd on Windows requires shell
  });
  const parsed = JSON.parse(out);
  return parsed[0].files.map((f) => f.path).sort();
}

function readBaseline() {
  return fs
    .readFileSync(BASELINE, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .sort();
}

test('M6.1 AC1 — pack contents exclude tests/, docs/, .github/, .kaizen/', () => {
  const paths = actualPackPaths();
  const banned = ['tests/', 'docs/', '.github/', '.kaizen/'];
  for (const p of paths) {
    for (const b of banned) {
      assert.ok(
        !p.startsWith(b),
        'pack contents leaked excluded path: ' + p
      );
    }
  }
});

test('M6.1 AC1 — pack contents include commandments.md and dvir-config.yaml', () => {
  const paths = actualPackPaths();
  assert.ok(paths.includes('.kaizen-dvir/commandments.md'));
  assert.ok(paths.includes('.kaizen-dvir/dvir-config.yaml'));
});

test('M6.1 AC1 — pack contents include the canonical manifest', () => {
  const paths = actualPackPaths();
  assert.ok(
    paths.includes('.kaizen-dvir/manifest.json'),
    'canonical manifest must ship in tarball (Q1)'
  );
});

test('M6.1 AC1 — pack contents include bin entry points', () => {
  const paths = actualPackPaths();
  assert.ok(paths.includes('bin/kaizen.js'));
  assert.ok(paths.includes('bin/kaizen-init.js'));
  assert.ok(paths.includes('bin/build-canonical-manifest.js'));
});

test('M6.1 AC8 — pack contents match baseline tests/m6/expected-package-contents.txt', () => {
  const baseline = readBaseline();
  const actual = actualPackPaths();
  if (baseline.length !== actual.length || baseline.some((p, i) => p !== actual[i])) {
    const onlyInBaseline = baseline.filter((p) => !actual.includes(p));
    const onlyInActual = actual.filter((p) => !baseline.includes(p));
    const msg =
      'whitelist drift detected (KZ-M6-R5). \n' +
      'Only in baseline: ' + JSON.stringify(onlyInBaseline) + '\n' +
      'Only in actual:   ' + JSON.stringify(onlyInActual);
    assert.fail(msg);
  }
});
