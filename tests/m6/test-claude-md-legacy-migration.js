'use strict';

/*
 * test-claude-md-legacy-migration.js — M6.5 dedicated test for the
 * legacy `.claude/CLAUDE.md` migration step. Validates:
 *
 *   1. Clean migration of a v1.4 17-line scaffold into the v1.5 delimiter
 *      structure with content preserved verbatim inside the EXPERT block.
 *   2. Idempotency — second run is byte-for-byte identical to the first.
 *   3. No-op on already-migrated input — running against a file that
 *      already contains `KAIZEN:FRAMEWORK:START` does not mutate it.
 *   4. Bootstrap — running against a fresh project with no `.claude/CLAUDE.md`
 *      creates the v1.5-shaped file with an empty expert block.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const MIGRATION_MOD = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'migrations',
  'v1.4-to-v1.5.js'
);

const FIXTURE_LEGACY = path.resolve(
  __dirname,
  'fixtures',
  'legacy-claude-md',
  'claude-md-v14.md'
);

function loadFresh() {
  delete require.cache[require.resolve(MIGRATION_MOD)];
  return require(MIGRATION_MOD);
}

function makeSandbox(initialClaudeMd) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-5-claude-'));
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  if (typeof initialClaudeMd === 'string') {
    fs.writeFileSync(path.join(root, '.claude', 'CLAUDE.md'), initialClaudeMd, 'utf8');
  }
  return root;
}

function noopLog() {}

function readClaudeMd(root) {
  return fs.readFileSync(path.join(root, '.claude', 'CLAUDE.md'), 'utf8');
}

function readLegacyFixture() {
  return fs.readFileSync(FIXTURE_LEGACY, 'utf8');
}

test('M6.5 CLAUDE.md migration — clean migration produces v1.5 delimiter structure', async () => {
  const legacy = readLegacyFixture();
  const root = makeSandbox(legacy);
  const migration = loadFresh();

  const result = await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });

  assert.equal(result.claudeMdResult, 'migrated');

  const out = readClaudeMd(root);

  // All four delimiter markers present.
  assert.match(out, /<!-- KAIZEN:FRAMEWORK:START -->/);
  assert.match(out, /<!-- KAIZEN:FRAMEWORK:END -->/);
  assert.match(out, /<!-- KAIZEN:EXPERT:START -->/);
  assert.match(out, /<!-- KAIZEN:EXPERT:END -->/);

  // Correct order: FRAMEWORK:START < FRAMEWORK:END < EXPERT:START < EXPERT:END.
  const idxFs = out.indexOf('<!-- KAIZEN:FRAMEWORK:START -->');
  const idxFe = out.indexOf('<!-- KAIZEN:FRAMEWORK:END -->');
  const idxEs = out.indexOf('<!-- KAIZEN:EXPERT:START -->');
  const idxEe = out.indexOf('<!-- KAIZEN:EXPERT:END -->');
  assert.ok(idxFs < idxFe, 'FRAMEWORK:START must precede FRAMEWORK:END');
  assert.ok(idxFe < idxEs, 'FRAMEWORK:END must precede EXPERT:START');
  assert.ok(idxEs < idxEe, 'EXPERT:START must precede EXPERT:END');

  // The legacy body is preserved verbatim inside the EXPERT block.
  const expertBlock = out.substring(
    idxEs + '<!-- KAIZEN:EXPERT:START -->'.length,
    idxEe
  );
  assert.ok(
    expertBlock.indexOf(legacy) !== -1,
    'Legacy v1.4 content must be preserved verbatim inside the EXPERT block'
  );

  // The FRAMEWORK block contains a placeholder comment.
  const frameworkBlock = out.substring(
    idxFs + '<!-- KAIZEN:FRAMEWORK:START -->'.length,
    idxFe
  );
  assert.match(
    frameworkBlock,
    /Espaco reservado/,
    'FRAMEWORK block must contain the placeholder body'
  );
});

test('M6.5 CLAUDE.md migration — second run is byte-for-byte identical (idempotent)', async () => {
  const legacy = readLegacyFixture();
  const root = makeSandbox(legacy);
  const migration = loadFresh();

  await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });
  const firstRun = readClaudeMd(root);

  const secondResult = await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });
  const secondRun = readClaudeMd(root);

  assert.equal(firstRun, secondRun, 'second run must be byte-identical to first');
  assert.equal(secondResult.claudeMdResult, 'skipped');
});

test('M6.5 CLAUDE.md migration — already-migrated file is a no-op', async () => {
  const alreadyMigrated = [
    '<!-- KAIZEN:FRAMEWORK:START -->',
    'framework body',
    '<!-- KAIZEN:FRAMEWORK:END -->',
    '',
    '<!-- KAIZEN:EXPERT:START -->',
    'expert content the user wrote earlier',
    '<!-- KAIZEN:EXPERT:END -->',
    '',
  ].join('\n');

  const root = makeSandbox(alreadyMigrated);
  const migration = loadFresh();

  const result = await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });

  const after = readClaudeMd(root);
  assert.equal(after, alreadyMigrated, 'no mutation on already-migrated input');
  assert.equal(result.claudeMdResult, 'skipped');
});

test('M6.5 CLAUDE.md migration — missing file is bootstrapped with empty expert block', async () => {
  // No initial CLAUDE.md.
  const root = makeSandbox();
  const migration = loadFresh();

  const result = await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });

  assert.equal(result.claudeMdResult, 'created');
  const out = readClaudeMd(root);
  assert.match(out, /<!-- KAIZEN:FRAMEWORK:START -->/);
  assert.match(out, /<!-- KAIZEN:EXPERT:START -->/);
  assert.match(out, /<!-- KAIZEN:EXPERT:END -->/);
});

test('M6.5 CLAUDE.md migration — second run after bootstrap is also idempotent', async () => {
  const root = makeSandbox();
  const migration = loadFresh();

  await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });
  const first = readClaudeMd(root);
  const second = await migration.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: {} },
    log: noopLog,
  });
  const after = readClaudeMd(root);
  assert.equal(after, first);
  assert.equal(second.claudeMdResult, 'skipped');
});
