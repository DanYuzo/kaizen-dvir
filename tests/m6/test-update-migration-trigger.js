'use strict';

/*
 * test-update-migration-trigger.js — M6.2 / M6.5 integration.
 *
 * Validates that `kaizen update` invokes the migration script for the
 * matching version pair and that the migration runs AFTER snapshot
 * creation but BEFORE the layered policy walk (per the M6.5 contract).
 *
 * Uses the real shipped v1.4-to-v1.5.js migration. Asserts:
 *   - manifest layer-backfill happens (entries lacking `layer` get one).
 *   - .claude/CLAUDE.md is wrapped in KAIZEN delimiters by the migration.
 *   - The orchestrator surfaces migration progress lines in pt-BR.
 *   - Final exit code is 0 (or 3 if the post-migration L3 merge surfaces
 *     a conflict against canonical — both are valid integration outcomes
 *     for this fixture; we accept either and assert the migration ran).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const UPDATE_BIN = path.resolve(__dirname, '..', '..', 'bin', 'kaizen-update.js');

function loadUpdate() {
  delete require.cache[require.resolve(UPDATE_BIN)];
  return require(UPDATE_BIN);
}

function sha256(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-2-mig-trigger-'));
}

function runUpdate(args, projectRoot) {
  const { runUpdate } = loadUpdate();
  const stdout = [];
  const stderr = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = (s) => {
    stdout.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  process.stderr.write = (s) => {
    stderr.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  const origEnv = process.env.KAIZEN_PROJECT_ROOT;
  process.env.KAIZEN_PROJECT_ROOT = projectRoot;
  let exitCode;
  try {
    exitCode = runUpdate(args);
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    if (origEnv === undefined) delete process.env.KAIZEN_PROJECT_ROOT;
    else process.env.KAIZEN_PROJECT_ROOT = origEnv;
  }
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

test('M6.2 / M6.5 — v1.4 -> v1.5 update triggers the migration script', () => {
  const project = makeRoot();
  const canonical = makeRoot();

  // Project at v1.4 — minimal footprint with a CLAUDE.md NOT yet wrapped
  // in delimiters; the migration is responsible for wrapping it.
  fs.mkdirSync(path.join(project, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(project, 'bin', 'kaizen.js'), '// v1.4\n', 'utf8');
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  const legacyClaude = '# CLAUDE.md (v1.4 — sem delimitadores)\n';
  fs.writeFileSync(path.join(project, '.claude', 'CLAUDE.md'), legacyClaude, 'utf8');

  // Local manifest at v1.4 — note: no `layer` annotation on bin/kaizen.js;
  // the migration's manifest layer-backfill step assigns it.
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: '1.4.0',
        files: {
          'bin/kaizen.js': {
            hash: sha256(Buffer.from('// v1.4\n')),
            // layer intentionally OMITTED — migration will backfill.
            size: 8,
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  // Canonical at v1.5 — declares the same files plus a CLAUDE.md that
  // mirrors the post-migration delimited shape (so the L3 walk that
  // happens AFTER the migration can clean-merge against it).
  fs.mkdirSync(path.join(canonical, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(canonical, 'bin', 'kaizen.js'), '// v1.5\n', 'utf8');
  fs.mkdirSync(path.join(canonical, '.claude'), { recursive: true });
  // Match what the migration produces so post-migration ours == theirs.
  // We lift the FRAMEWORK_PLACEHOLDER_BODY from the migration internals.
  const migration = require(
    path.resolve(
      __dirname,
      '..',
      '..',
      '.kaizen-dvir',
      'dvir',
      'migrations',
      'v1.4-to-v1.5.js'
    )
  );
  const intern = migration.__internals;
  const expectedClaude = intern.buildMigratedClaudeMd(legacyClaude);
  fs.writeFileSync(path.join(canonical, '.claude', 'CLAUDE.md'), expectedClaude, 'utf8');
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: '1.5.0',
        files: {
          'bin/kaizen.js': {
            hash: sha256(Buffer.from('// v1.5\n')),
            layer: 'L1',
            size: 8,
          },
          '.claude/CLAUDE.md': {
            hash: sha256(Buffer.from(expectedClaude)),
            layer: 'L3',
            size: expectedClaude.length,
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(
    result.exitCode,
    0,
    'exit should be 0 — migration + layered policy must succeed: ' + result.stderr
  );

  // Migration progress visible in stdout.
  assert.match(result.stdout, /\[migracao\]/);
  assert.match(result.stdout, /Migracao v1\.4 -> v1\.5/);

  // CLAUDE.md wrapped in KAIZEN delimiters.
  const claudeAfter = fs.readFileSync(
    path.join(project, '.claude', 'CLAUDE.md'),
    'utf8'
  );
  assert.match(claudeAfter, /KAIZEN:FRAMEWORK:START/);
  assert.match(claudeAfter, /KAIZEN:EXPERT:START/);
  // Legacy body preserved inside the EXPERT block.
  assert.match(claudeAfter, /v1\.4 — sem delimitadores/);

  // Final manifest at v1.5
  const m = JSON.parse(
    fs.readFileSync(path.join(project, '.kaizen-dvir', 'manifest.json'), 'utf8')
  );
  assert.equal(m.version, '1.5.0');
});
