'use strict';

// AC 10, 11, 13 (M4.5) — published cell at celulas/{nome}/ matches
// AC-118 structure including unconditional workflows/ (D-v1.4-07) and
// kbs/success-examples.md (D-v1.4-09). FR-114.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('materializeCell creates AC-118 structure (AC 13)', () => {
  const tmp = helpers.mkTmpDir('structure');
  try {
    const publisher = helpers.freshPublisher();
    const manifest = helpers.buildValidManifest({ name: 'celula-x' });
    const result = publisher.materializeCell(
      { manifest: manifest, name: 'celula-x' },
      tmp
    );
    const cellPath = result.celulaPath;
    assert.ok(fs.existsSync(path.join(cellPath, 'celula.yaml')));
    assert.ok(fs.existsSync(path.join(cellPath, 'README.md')));
    assert.ok(fs.existsSync(path.join(cellPath, 'CHANGELOG.md')));
    assert.ok(fs.existsSync(path.join(cellPath, 'MEMORY.md')));
    assert.ok(fs.existsSync(path.join(cellPath, 'OST.md')));
    assert.ok(fs.statSync(path.join(cellPath, 'agents')).isDirectory());
    assert.ok(fs.statSync(path.join(cellPath, 'tasks')).isDirectory());
    assert.ok(fs.statSync(path.join(cellPath, 'workflows')).isDirectory());
    assert.ok(fs.statSync(path.join(cellPath, 'templates')).isDirectory());
    assert.ok(fs.statSync(path.join(cellPath, 'checklists')).isDirectory());
    assert.ok(fs.statSync(path.join(cellPath, 'kbs')).isDirectory());
  } finally {
    helpers.rm(tmp);
  }
});

test('workflowsDirValidator PASS when workflows/ exists with README.md (AC 10, D-v1.4-07)', () => {
  const tmp = helpers.mkTmpDir('wf-readme');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp);
    const result = publisher.workflowsDirValidator(tmp);
    assert.strictEqual(result.verdict, 'PASS');
  } finally {
    helpers.rm(tmp);
  }
});

test('workflowsDirValidator FAIL when workflows/ missing (AC 10, D-v1.4-07)', () => {
  const tmp = helpers.mkTmpDir('wf-missing');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp);
    fs.rmSync(path.join(tmp, 'workflows'), { recursive: true, force: true });
    const result = publisher.workflowsDirValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(/workflows\/ ausente/u.test(result.errors[0].message));
    assert.ok(/D-v1\.4-07/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('successExamplesValidator PASS when 3+ entries (AC 11, D-v1.4-09)', () => {
  const tmp = helpers.mkTmpDir('se-pass');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp, { successEntries: 3 });
    const result = publisher.successExamplesValidator(tmp);
    assert.strictEqual(result.verdict, 'PASS');
    assert.strictEqual(result.count, 3);
  } finally {
    helpers.rm(tmp);
  }
});

test('successExamplesValidator FAIL when 2 entries (AC 11, D-v1.4-09)', () => {
  const tmp = helpers.mkTmpDir('se-fail-2');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp, { successEntries: 2 });
    const result = publisher.successExamplesValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.strictEqual(result.count, 2);
    assert.ok(/D-v1\.4-09/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('successExamplesValidator FAIL when file missing (AC 11)', () => {
  const tmp = helpers.mkTmpDir('se-missing');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp);
    fs.rmSync(path.join(tmp, 'kbs', 'success-examples.md'));
    const result = publisher.successExamplesValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(/ausente/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('prePublishCheck PASS on valid scaffold (AC 10, 11, 13)', () => {
  const tmp = helpers.mkTmpDir('pre-pass');
  try {
    const publisher = helpers.freshPublisher();
    helpers.makeValidCellScaffold(tmp);
    const result = publisher.prePublishCheck(tmp);
    assert.strictEqual(result.verdict, 'PASS', JSON.stringify(result.failures));
  } finally {
    helpers.rm(tmp);
  }
});

test('materializeCell creates workflows/README.md when no workflows declared (D-v1.4-07)', () => {
  const tmp = helpers.mkTmpDir('wf-default-readme');
  try {
    const publisher = helpers.freshPublisher();
    const manifest = helpers.buildValidManifest({ name: 'celula-y' });
    const result = publisher.materializeCell(
      { manifest: manifest, name: 'celula-y' },
      tmp
    );
    const readmePath = path.join(result.celulaPath, 'workflows', 'README.md');
    assert.ok(fs.existsSync(readmePath), 'workflows/README.md must be created when empty');
    const text = fs.readFileSync(readmePath, 'utf8');
    assert.ok(/D-v1\.4-07/u.test(text), 'workflows/README.md must cite D-v1.4-07');
  } finally {
    helpers.rm(tmp);
  }
});
