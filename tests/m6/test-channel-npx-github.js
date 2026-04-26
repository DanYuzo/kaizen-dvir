'use strict';

/*
 * test-channel-npx-github.js — M6.6 fallback channel smoke test (FR-052)
 *
 * Validates that installing KaiZen via the `npx github:DanYuzo/kaizen-dvir`
 * fallback channel produces the same project structure as a stock `kaizen
 * init` against a clean directory.
 *
 * Offline-safe contract — this test MUST NOT touch the network. The fallback
 * channel is simulated by:
 *   1. Running `npm pack --pack-destination <tmp>` against the project root
 *      to produce the canonical tarball that GitHub-hosted npx would download.
 *   2. Extracting the tarball with a stdlib-only tar reader.
 *   3. Running `bin/kaizen.js init` from the extracted package against a
 *      fresh empty target directory.
 *   4. Asserting the resulting project tree matches the expected layout
 *      (same structural assertion used in tests/m1/test-init-clean-dir.js).
 *   5. Recording the tree hash to a shared file so the companion test
 *      (tests/m6/test-channel-github-packages.js) can assert byte-for-byte
 *      equivalence across channels (D-v1.5-09).
 *
 * Story: M6.6 — npx-github Fallback Channel
 * Refs: FR-052, D-v1.5-09, AC-021, NFR-103
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

const CHANNEL = 'npx-github';

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

const REQUIRED_DIRS = [
  '.kaizen-dvir',
  '.kaizen-dvir/dvir',
  '.kaizen-dvir/instructions',
  '.kaizen-dvir/celulas',
  '.kaizen-dvir/infra',
  '.kaizen-dvir/refs',
  '.claude',
  '.kaizen',
  'bin',
];

// Hash configuration — only the framework-managed surface is part of the
// channel-equivalence claim. `node_modules/`, lockfiles, and runtime data
// (`.kaizen/logs/`, `.kaizen/snapshots/`) are excluded.
const HASH_INCLUDE_PREFIXES = ['.kaizen-dvir', '.claude', 'bin'];

// Per AC: equivalence is asserted "modulo ISO-timestamp fields in
// manifest.json". Redacting `generatedAt` matches the contract from
// bin/build-canonical-manifest.js.
const HASH_REDACT_JSON = [
  { file: '.kaizen-dvir/manifest.json', fields: ['generatedAt'] },
];

let packDir;
let projectDir;
let extractedRoot;
let installResult;
let computedHash;

test('M6.6 setup — npm pack and extract via stdlib tar reader', () => {
  packDir = mkTmp('pack-npxgh');
  const tgz = packTarball(SOURCE_ROOT, packDir);
  assert.ok(fs.existsSync(tgz), 'npm pack must produce a .tgz file');
  assert.match(path.basename(tgz), /\.tgz$/, 'tarball must have .tgz extension');

  const extractDir = path.join(packDir, 'extracted');
  extractedRoot = extractTarball(tgz, extractDir);
  assert.ok(
    fs.existsSync(path.join(extractedRoot, 'package.json')),
    'extracted package must contain package.json'
  );
  assert.ok(
    fs.existsSync(path.join(extractedRoot, 'bin', 'kaizen.js')),
    'extracted package must contain bin/kaizen.js'
  );
});

test('M6.6 fallback channel — kaizen init succeeds against extracted package', () => {
  projectDir = mkTmp('proj-npxgh');
  installResult = runInitFromExtracted(extractedRoot, projectDir);
  assert.equal(
    installResult.status,
    0,
    'init from npx-github channel must exit 0; stderr=' + installResult.stderr
  );
  // Init prints a pt-BR success marker (see bin/kaizen-init.js scaffold).
  assert.match(
    installResult.stdout,
    /concluído/,
    'init stdout must contain pt-BR success marker'
  );
});

test('M6.6 fallback channel — produces the expected project layout (FR-052)', () => {
  for (const dir of REQUIRED_DIRS) {
    const abs = path.join(projectDir, dir);
    assert.ok(fs.existsSync(abs), 'fallback channel missing dir: ' + dir);
    assert.ok(
      fs.statSync(abs).isDirectory(),
      'fallback channel: ' + dir + ' is not a directory'
    );
  }
  for (const rel of REQUIRED_FILES) {
    const abs = path.join(projectDir, rel);
    assert.ok(fs.existsSync(abs), 'fallback channel missing file: ' + rel);
    assert.ok(
      fs.statSync(abs).isFile(),
      'fallback channel: ' + rel + ' is not a file'
    );
  }
});

test('M6.6 fallback channel — records tree hash for cross-channel comparison', () => {
  computedHash = treeHash(projectDir, {
    includePrefixes: HASH_INCLUDE_PREFIXES,
    redactJsonFields: HASH_REDACT_JSON,
  });
  assert.equal(typeof computedHash, 'string');
  assert.equal(
    computedHash.length,
    64,
    'tree hash must be 64-char sha256 hex'
  );
  writeHashRecord(CHANNEL, computedHash);

  // If the companion (github-packages) channel test has already run in this
  // session, assert identity now. Otherwise the companion will perform the
  // assertion when it runs.
  const record = readHashRecord();
  if (record['github-packages']) {
    assert.equal(
      record['github-packages'],
      computedHash,
      'channel hashes must match: github-packages=' +
        record['github-packages'] +
        ' npx-github=' +
        computedHash +
        ' (D-v1.5-09: channels are interchangeable modulo manifest timestamp)'
    );
  }
});

test('M6.6 teardown — clean up tmp directories', () => {
  rmTmp(projectDir);
  rmTmp(packDir);
});
