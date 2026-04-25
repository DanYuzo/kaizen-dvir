'use strict';

// AC 4, 5 (M4.6) — full 10-phase interactive run; AC-118 cell structure;
// /Kaizen:test-cell activation surface (slashPrefix in manifest).
//
// Synthetic e2e: run the deterministic 10-phase pipeline in interactive
// mode, then exercise /Kaizen:Yotzer publish via the CLI module. Assert
// the published cell has the AC-118 directory layout and a CHANGELOG
// row at 1.0.0.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e interactive: synthetic 10-phase run publishes cell at celulas/test-cell/ with AC-118 structure (AC 4, 5)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-interactive');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-e2e-interactive',
      cellName: 'test-cell',
      mode: 'interativo',
    });
    assert.ok(pipeline.events.every((e) => !e.error), 'no pipeline errors');

    const bin = helpers.freshKaizenBin();
    const code = bin.runYotzerPublish([pipeline.workId]);
    assert.strictEqual(code, 0, 'publish must succeed');

    const cellPath = path.join(sandbox.celulasDir, pipeline.cellName);
    assert.ok(fs.existsSync(cellPath), 'cell must exist at celulas/test-cell/');

    // AC-118 structure assertions.
    const required = [
      'celula.yaml',
      'README.md',
      'CHANGELOG.md',
      'MEMORY.md',
      'OST.md',
      'agents',
      'tasks',
      'workflows',
      'templates',
      'checklists',
      'kbs',
    ];
    for (const r of required) {
      assert.ok(
        fs.existsSync(path.join(cellPath, r)),
        'AC-118: missing ' + r
      );
    }
    // /Kaizen:test-cell slashPrefix surfaced in manifest.
    const manifestText = fs.readFileSync(path.join(cellPath, 'celula.yaml'), 'utf8');
    assert.ok(
      /slashPrefix:\s*"Kaizen:TestCell"/u.test(manifestText),
      'manifest must declare slashPrefix /Kaizen:TestCell for activation'
    );
    // CHANGELOG initialized at 1.0.0.
    const changelogText = fs.readFileSync(path.join(cellPath, 'CHANGELOG.md'), 'utf8');
    assert.ok(/##\s+1\.0\.0/u.test(changelogText), 'CHANGELOG must start at 1.0.0');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
