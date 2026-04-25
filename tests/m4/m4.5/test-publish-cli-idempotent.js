'use strict';

// AC 17, 18 (M4.5) — /Kaizen:Yotzer publish {work-id} CLI is idempotent:
// re-publish appends new version row to CHANGELOG, does not overwrite
// expert edits without confirmation. AC-111, FR-114.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

function setupWorkAndCelulas(label, manifestOverrides) {
  const work = helpers.mkTmpDir(label + '-work');
  const celulas = helpers.mkTmpDir(label + '-celulas');
  process.env.KAIZEN_YOTZER_WORK_DIR = work;
  process.env.KAIZEN_CELULAS_DIR = celulas;
  const workId = 'wrk-' + label;
  const workIdDir = path.join(work, workId);
  fs.mkdirSync(workIdDir, { recursive: true });
  // F9 PASS state
  fs.writeFileSync(
    path.join(workIdDir, 'f9-state.json'),
    JSON.stringify({ verdict: 'PASS' }),
    'utf8'
  );
  const manifest = helpers.buildValidManifest(manifestOverrides || {});
  // Spec consumed by the publisher CLI. seedFiles ship pre-populated
  // OST.md (closed chain), kbs/success-examples.md (3+ entries), and a
  // task with inline Actions — all artifacts produced by F1-F9 in
  // production.
  const seedFiles = {
    'OST.md': [
      '# OST',
      '',
      '## Outcome',
      '',
      '- id: OUT-001 tipo: melhoria descricao: x.',
      '',
      '## Opportunities',
      '',
      '- id: OPP-001 descricao: y. pus: PU-001.',
      '',
      '## Solutions',
      '',
      '- id: SOL-001 descricao: z.',
      '',
      '## Links',
      '',
      '- SOL-001 resolve OPP-001.',
      '',
      '## Tasks',
      '',
      '- id: TASK-001 descricao: w. solution: SOL-001.',
      '',
      '## Change Log',
      '',
      '- 2026-04-25 — @publisher — closed.',
      '',
    ].join('\n'),
    'kbs/success-examples.md': [
      '# Exemplos de sucesso',
      '',
      '## Exemplo 1 — titulo 1',
      '',
      '**Fonte:** ref 1.',
      '',
      '## Exemplo 2 — titulo 2',
      '',
      '**Fonte:** ref 2.',
      '',
      '## Exemplo 3 — titulo 3',
      '',
      '**Fonte:** ref 3.',
      '',
    ].join('\n'),
    'tasks/task-001.md': [
      '---',
      'task_id: TASK-001',
      'solution_id: SOL-001',
      '---',
      '',
      '# Task 001',
      '',
      '## Actions',
      '',
      '1. abra o painel.',
      '',
    ].join('\n'),
  };
  fs.writeFileSync(
    path.join(workIdDir, 'spec.json'),
    JSON.stringify({
      name: manifest.name,
      author: 'expert',
      manifest: manifest,
      seedFiles: seedFiles,
    }),
    'utf8'
  );
  return { work, celulas, workId, manifest };
}

test('CLI publish creates the cell at celulas/{nome}/ on first run (AC 17)', () => {
  const { work, celulas, workId, manifest } = setupWorkAndCelulas('first-run');
  try {
    const bin = helpers.freshKaizenBin();
    const code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'first publish must succeed');
    const cellPath = path.join(celulas, manifest.name);
    assert.ok(fs.existsSync(cellPath), 'cell must be created at ' + cellPath);
    assert.ok(fs.existsSync(path.join(cellPath, 'celula.yaml')));
    assert.ok(fs.existsSync(path.join(cellPath, 'CHANGELOG.md')));
    const changelog = fs.readFileSync(path.join(cellPath, 'CHANGELOG.md'), 'utf8');
    assert.ok(/##\s+1\.0\.0/u.test(changelog));
  } finally {
    helpers.clearEnv();
    helpers.rm(work);
    helpers.rm(celulas);
  }
});

test('CLI publish FAIL when F9 state missing (AC 17)', () => {
  const { work, celulas, workId } = setupWorkAndCelulas('no-f9');
  try {
    const f9Path = path.join(work, workId, 'f9-state.json');
    fs.unlinkSync(f9Path);
    const bin = helpers.freshKaizenBin();
    const code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 1, 'publish must FAIL when F9 missing');
  } finally {
    helpers.clearEnv();
    helpers.rm(work);
    helpers.rm(celulas);
  }
});

test('CLI publish idempotent — second run with overwrite confirm appends 1.0.1 (AC 18)', () => {
  const { work, celulas, workId, manifest } = setupWorkAndCelulas('idempotent');
  try {
    const bin = helpers.freshKaizenBin();
    let code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'first publish');

    const cellPath = path.join(celulas, manifest.name);
    const changelogPath = path.join(cellPath, 'CHANGELOG.md');
    const before = fs.readFileSync(changelogPath, 'utf8');

    // Simulate expert edit by appending custom line to README.
    const readmePath = path.join(cellPath, 'README.md');
    const readmeBefore = fs.readFileSync(readmePath, 'utf8');
    fs.writeFileSync(readmePath, readmeBefore + '\n<!-- expert edit -->\n', 'utf8');
    const readmeWithEdit = fs.readFileSync(readmePath, 'utf8');

    // Second publish with overwrite confirm = 'a'.
    process.env.KAIZEN_PUBLISH_CONFIRM = 'a';
    code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'second publish with confirm "a" must succeed');

    const after = fs.readFileSync(changelogPath, 'utf8');
    assert.ok(after.startsWith(before), 'CHANGELOG must preserve prior content');
    assert.ok(/##\s+1\.0\.1/u.test(after), 'must append 1.0.1 row');

    // Expert edit on README is preserved (overwrite path appends to CHANGELOG only).
    const readmeAfter = fs.readFileSync(readmePath, 'utf8');
    assert.ok(
      readmeAfter.includes('expert edit'),
      'overwrite path must NOT silently destroy expert edits to README.md (only CHANGELOG appends)'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(work);
    helpers.rm(celulas);
  }
});

test('CLI publish branched version (option b) creates celulas/{nome}-v2/ (AC 18)', () => {
  const { work, celulas, workId, manifest } = setupWorkAndCelulas('branch');
  try {
    const bin = helpers.freshKaizenBin();
    let code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'first publish');

    process.env.KAIZEN_PUBLISH_CONFIRM = 'b';
    code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'branched publish must succeed');
    assert.ok(
      fs.existsSync(path.join(celulas, manifest.name + '-v2')),
      'celulas/<nome>-v2/ must exist'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(work);
    helpers.rm(celulas);
  }
});

test('CLI publish cancel (option c) preserves the cell unchanged (AC 18)', () => {
  const { work, celulas, workId, manifest } = setupWorkAndCelulas('cancel');
  try {
    const bin = helpers.freshKaizenBin();
    let code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0);

    const changelogPath = path.join(celulas, manifest.name, 'CHANGELOG.md');
    const before = fs.readFileSync(changelogPath, 'utf8');

    process.env.KAIZEN_PUBLISH_CONFIRM = 'c';
    code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'cancel returns 0 without mutating');

    const after = fs.readFileSync(changelogPath, 'utf8');
    assert.strictEqual(after, before, 'cancel must not mutate CHANGELOG');
  } finally {
    helpers.clearEnv();
    helpers.rm(work);
    helpers.rm(celulas);
  }
});
