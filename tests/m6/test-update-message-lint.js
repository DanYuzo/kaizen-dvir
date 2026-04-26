'use strict';

/*
 * test-update-message-lint.js — M6.2 Language Policy gate.
 *
 * Verifies that every console.log / console.error string emitted by
 * `kaizen update` (across the full layered policy walk in --dry-run mode)
 * is in pt-BR. Greps stdout/stderr for high-confidence English-only
 * phrases and fails if any are present.
 *
 * The list of forbidden English phrases is intentionally narrow: it only
 * targets words that have NO false-positive overlap with pt-BR vocabulary
 * or technical identifiers. Module names, library identifiers, and
 * technical tokens (e.g., "snapshot", "manifest", "merge", "L1", "sha256")
 * are tolerated because they are loanwords used identically in pt-BR
 * developer-facing prose.
 *
 * Reference: D-v1.4-06 (Language Policy), Commandment IV (Quality First),
 * NFR-104, NFR-101.
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-2-msglint-'));
}

function setupSandbox() {
  const project = makeRoot();
  const canonical = makeRoot();

  fs.mkdirSync(path.join(project, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(project, 'bin', 'kaizen.js'), 'old\n', 'utf8');
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.4.0',
      files: {
        'bin/kaizen.js': {
          hash: sha256(Buffer.from('old\n')),
          layer: 'L1',
          size: 4,
        },
      },
    }) + '\n',
    'utf8'
  );

  fs.mkdirSync(path.join(canonical, 'bin'), { recursive: true });
  fs.writeFileSync(path.join(canonical, 'bin', 'kaizen.js'), 'new\n', 'utf8');
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.5.0',
      files: {
        'bin/kaizen.js': {
          hash: sha256(Buffer.from('new\n')),
          layer: 'L1',
          size: 4,
        },
      },
    }) + '\n',
    'utf8'
  );
  return { project, canonical };
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

// Forbidden English phrases. Each entry is a regex applied case-insensitively
// to combined stdout+stderr. Picked for high pt-BR ↔ EN distinctness.
const FORBIDDEN_EN_PHRASES = [
  /\bupdate complete\b/i,
  /\bdry run mode\b/i,
  /\bsnapshot created\b/i,
  /\bsnapshot failed\b/i,
  /\bnothing to do\b/i,
  /\bplease run\b/i,
  /\babort(ed|ing)\b/i,
  /\bunable to\b/i,
  /\berror:\s/i, // pt-BR uses "erro:" lowercase per diretrizes-escrita.md
  /\bwarning:\s/i, // pt-BR uses "aviso:"
  /\bsuccess(?:fully)?\b/i,
  /\boverwriting\b/i,
  /\bpreserved file\b/i,
  /\bconflict detected\b/i,
  /\bcontinuing\b/i,
  /\bmigration started\b/i,
  /\bmigration finished\b/i,
];

test('M6.2 Language Policy — no English phrases in update output (--dry-run)', () => {
  const { project, canonical } = setupSandbox();
  const result = runUpdate(['--canonical-root', canonical, '--dry-run'], project);
  assert.equal(result.exitCode, 0);
  const combined = result.stdout + '\n' + result.stderr;
  for (const re of FORBIDDEN_EN_PHRASES) {
    assert.doesNotMatch(
      combined,
      re,
      'forbidden English phrase ' + re + ' detected in update output:\n' + combined
    );
  }
});

test('M6.2 Language Policy — pt-BR vocabulary present in summary', () => {
  const { project, canonical } = setupSandbox();
  const result = runUpdate(['--canonical-root', canonical, '--dry-run'], project);
  // pt-BR keywords expected.
  assert.match(result.stdout, /Resumo do kaizen update/);
  assert.match(result.stdout, /Bloco A/);
  assert.match(result.stdout, /Bloco B/);
  assert.match(result.stdout, /Bloco C/);
  assert.match(result.stdout, /Resultado/);
});

test('M6.2 Language Policy — N-1 abort message is pt-BR', () => {
  const project = makeRoot();
  const canonical = makeRoot();
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.3.0', files: {} }) + '\n',
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.5.0', files: {} }) + '\n',
    'utf8'
  );
  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 2);
  // pt-BR keywords; no English-only phrases.
  assert.match(result.stderr, /minor por vez|Atualize|N-1/);
  for (const re of FORBIDDEN_EN_PHRASES) {
    assert.doesNotMatch(
      result.stderr,
      re,
      'forbidden English phrase ' + re + ' detected in N-1 abort message'
    );
  }
});

test('M6.2 Language Policy — help text is pt-BR', () => {
  const { HELP_TEXT_PT_BR } = loadUpdate();
  assert.match(HELP_TEXT_PT_BR, /Uso: kaizen update/);
  assert.match(HELP_TEXT_PT_BR, /Opcoes:/);
  for (const re of FORBIDDEN_EN_PHRASES) {
    assert.doesNotMatch(
      HELP_TEXT_PT_BR,
      re,
      'forbidden English phrase ' + re + ' in HELP_TEXT_PT_BR'
    );
  }
});
