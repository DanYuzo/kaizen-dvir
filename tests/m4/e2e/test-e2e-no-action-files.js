'use strict';

// AC 7 (M4.6) — generated cell's tasks/ has zero action-*.md files.
// AC-119, D-v1.3-04. Recursive walk to surface any pattern violation.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const ACTION_RE = /^action-.*\.md$/iu;

test('e2e no-action-files: generated cell tasks/ contains zero action-*.md files (AC 7, AC-119)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-no-actions');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-noactions',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const tasksDir = path.join(sandbox.celulasDir, pipeline.cellName, 'tasks');
    const files = helpers.walkFiles(tasksDir);
    const offenders = files.filter((f) => ACTION_RE.test(path.basename(f)));
    assert.deepStrictEqual(
      offenders,
      [],
      'tasks/ must have zero action-*.md files (D-v1.3-04). offenders: ' +
        JSON.stringify(offenders)
    );

    // Sanity: at least one Task.md is present (Actions live inline within it).
    const taskMdFiles = files.filter(
      (f) => /\.md$/u.test(f) && !ACTION_RE.test(path.basename(f))
    );
    assert.ok(taskMdFiles.length >= 1, 'at least one task .md file present');

    // Confirm Actions are inline — at least one task contains a "## Actions" heading.
    let inlineActionsFound = false;
    for (const f of taskMdFiles) {
      const text = fs.readFileSync(f, 'utf8');
      if (/^##\s+Actions\b/mu.test(text)) {
        inlineActionsFound = true;
        break;
      }
    }
    assert.ok(inlineActionsFound, 'at least one task carries inline ## Actions section');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e no-action-files: publisher.actionsInlineValidator catches a planted action-*.md', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-no-actions-negative');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-noactions-neg',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const tasksDir = path.join(sandbox.celulasDir, pipeline.cellName, 'tasks');
    fs.writeFileSync(path.join(tasksDir, 'action-instalar-importador.md'), '# action\n', 'utf8');

    const publisher = helpers.freshPublisher();
    const r = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(r.verdict, 'FAIL', 'planted action-*.md must FAIL');
    assert.ok(r.offenders.length === 1, 'exactly one offender detected');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
