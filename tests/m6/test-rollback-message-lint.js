'use strict';

/*
 * test-rollback-message-lint.js — M6.4 Language Policy / NFR-101.
 * Greps stdout/stderr from `kaizen rollback` variants for English
 * phrases that would indicate a Language Policy violation. The test
 * intentionally allows machine-only tokens (paths, version strings,
 * timestamps) and accents-bearing pt-BR words — it only flags well-known
 * English words that are forbidden in expert-facing output.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KAIZEN_BIN = path.join(REPO_ROOT, 'bin', 'kaizen.js');
const SNAPSHOT_MOD = path.join(
  REPO_ROOT,
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

// Only flag word-boundary English tokens that have no overlap with
// pt-BR vocabulary. Tokens that double as pt-BR (e.g., 'falha') are NOT
// included. Path-only tokens like 'snapshot' are allowed because they
// are lexically borrowed and used in pt-BR technical writing.
const ENGLISH_OFFENDERS = [
  /\bSuccess\b/,
  /\bFailed\b/,
  /\bError:\s/i,
  /\bnot found\b/i,
  /\bavailable\b/i,
  /\bcompleted in\b/i,
  /\brestored from\b/i,
  /\bWarning:\s/i,
  /\bsnapshots? available\b/i,
  /\bnone available\b/i,
];

function makeSandboxNoSnapshot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-lint-no-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// stub\n', 'utf8');
  return root;
}

function makeSandboxWithSnapshot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-lint-yes-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    'commandments v1.4\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// stub\n', 'utf8');

  delete require.cache[require.resolve(SNAPSHOT_MOD)];
  const snapshot = require(SNAPSHOT_MOD);
  snapshot.createSnapshot({
    projectRoot: root,
    version: '1.4.0',
    timestamp: '2026-04-25T14:30:00.000Z',
  });
  return root;
}

function rollback(projectRoot, args) {
  return spawnSync(
    process.execPath,
    [KAIZEN_BIN, 'rollback', ...args],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: projectRoot }),
    }
  );
}

function assertNoEnglishOffenders(streams, label) {
  const all = (streams.stdout || '') + '\n' + (streams.stderr || '');
  for (const re of ENGLISH_OFFENDERS) {
    assert.ok(
      !re.test(all),
      label + ' leaked English token matching ' + re + '\nfull output:\n' + all
    );
  }
}

test('M6.4 / NFR-101 — rollback (no snapshot) emits only pt-BR', () => {
  const root = makeSandboxNoSnapshot();
  try {
    const r = rollback(root, []);
    assertNoEnglishOffenders(r, 'rollback no-snapshot');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 / NFR-101 — rollback --list (no snapshot) emits only pt-BR', () => {
  const root = makeSandboxNoSnapshot();
  try {
    const r = rollback(root, ['--list']);
    assertNoEnglishOffenders(r, 'rollback --list empty');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('M6.4 / NFR-101 — rollback (success path, idempotent) emits only pt-BR', () => {
  const root = makeSandboxWithSnapshot();
  try {
    // Mutate so the first rollback exercises the success path.
    fs.writeFileSync(
      path.join(root, '.kaizen-dvir', 'commandments.md'),
      'corrompido\n',
      'utf8'
    );
    const r1 = rollback(root, []);
    assertNoEnglishOffenders(r1, 'rollback success');
    // Second call exercises the idempotent path.
    const r2 = rollback(root, []);
    assertNoEnglishOffenders(r2, 'rollback idempotent');
    // --list with snapshot present.
    const r3 = rollback(root, ['--list']);
    assertNoEnglishOffenders(r3, 'rollback --list populated');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
