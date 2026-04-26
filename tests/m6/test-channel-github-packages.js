'use strict';

/*
 * test-channel-github-packages.js — M6.6 primary channel smoke test (D-v1.5-09)
 *
 * Companion to tests/m6/test-channel-npx-github.js. Simulates the GitHub
 * Packages primary distribution channel using the same offline-safe local
 * `npm pack` fixture and asserts the resulting project tree is byte-for-byte
 * identical (modulo manifest.json timestamps) to the fallback channel.
 *
 * Together with the npx-github test, this proves the two channels are
 * interchangeable for the expert: same source tarball, same install
 * procedure, same resulting project state.
 *
 * Story: M6.6 — npx-github Fallback Channel
 * Refs: D-v1.5-09, FR-042, AC-021, NFR-103
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SOURCE_ROOT,
  mkTmp,
  rmTmp,
  packTarball,
  extractTarball,
  runInitFromExtracted,
  treeHash,
  readHashRecord,
  writeHashRecord,
} = require('./_helpers-channels');

const CHANNEL = 'github-packages';

const REQUIRED_FILES = [
  '.kaizen-dvir/commandments.md',
  '.kaizen-dvir/dvir-config.yaml',
  '.kaizen-dvir/dvir/config-loader.js',
  '.kaizen-dvir/dvir/boundary-toggle.js',
  '.claude/settings.json',
  '.claude/README.md',
  '.claude/CLAUDE.md',
  'bin/kaizen.js',
  'bin/kaizen-init.js',
  'package.json',
  '.gitignore',
];

const HASH_INCLUDE_PREFIXES = ['.kaizen-dvir', '.claude', 'bin'];
const HASH_REDACT_JSON = [
  { file: '.kaizen-dvir/manifest.json', fields: ['generatedAt'] },
];

let packDir;
let projectDir;
let extractedRoot;
let installResult;
let computedHash;

test('M6.6 setup — npm pack and extract for github-packages channel', () => {
  packDir = mkTmp('pack-ghpkg');
  const tgz = packTarball(SOURCE_ROOT, packDir);
  assert.ok(fs.existsSync(tgz), 'npm pack must produce a .tgz file');
  const extractDir = path.join(packDir, 'extracted');
  extractedRoot = extractTarball(tgz, extractDir);
  assert.ok(
    fs.existsSync(path.join(extractedRoot, 'bin', 'kaizen.js')),
    'extracted package must contain bin/kaizen.js'
  );
});

test('M6.6 primary channel — kaizen init succeeds against extracted package', () => {
  projectDir = mkTmp('proj-ghpkg');
  installResult = runInitFromExtracted(extractedRoot, projectDir);
  assert.equal(
    installResult.status,
    0,
    'init from github-packages channel must exit 0; stderr=' +
      installResult.stderr
  );
  assert.match(
    installResult.stdout,
    /concluído/,
    'init stdout must contain pt-BR success marker'
  );
});

test('M6.6 primary channel — produces the expected project file set', () => {
  for (const rel of REQUIRED_FILES) {
    const abs = path.join(projectDir, rel);
    assert.ok(
      fs.existsSync(abs),
      'github-packages channel missing file: ' + rel
    );
  }
});

test('M6.6 primary channel — tree hash matches npx-github channel (D-v1.5-09)', () => {
  computedHash = treeHash(projectDir, {
    includePrefixes: HASH_INCLUDE_PREFIXES,
    redactJsonFields: HASH_REDACT_JSON,
  });
  writeHashRecord(CHANNEL, computedHash);

  const record = readHashRecord();
  if (record['npx-github']) {
    assert.equal(
      record['npx-github'],
      computedHash,
      'channel hashes must match: github-packages=' +
        computedHash +
        ' npx-github=' +
        record['npx-github'] +
        ' (D-v1.5-09: channels are interchangeable modulo manifest timestamp)'
    );
  }
  // If the companion test has not yet run, our recorded hash will be picked
  // up by it when it does. Either way, the identity assertion happens
  // exactly once per session in the test that runs second.
});

test('M6.6 teardown — clean up tmp directories', () => {
  rmTmp(projectDir);
  rmTmp(packDir);
});
