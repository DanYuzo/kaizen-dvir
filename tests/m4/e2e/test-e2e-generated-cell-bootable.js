'use strict';

// AC 4, 5 (M4.6) — generated cell is loadable: workflows/ unconditional
// per D-v1.4-07; kbs/success-examples.md with 3+ entries per D-v1.4-09;
// boot list resolves; agents in tiers reachable.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e bootable: workflows/ unconditional per D-v1.4-07 (AC 5)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-bootable-wf');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-e2e-bootable-wf',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const cellPath = path.join(sandbox.celulasDir, pipeline.cellName);
    const wfDir = path.join(cellPath, 'workflows');
    assert.ok(fs.existsSync(wfDir), 'workflows/ must be present unconditionally (D-v1.4-07)');
    assert.ok(fs.statSync(wfDir).isDirectory(), 'workflows/ must be a directory');
    // Empty workflows/ with README.md is acceptable.
    const wfReadme = path.join(wfDir, 'README.md');
    assert.ok(fs.existsSync(wfReadme), 'empty workflows/ must include README.md');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e bootable: kbs/success-examples.md exists with 3+ entries (D-v1.4-09, AC 5)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-bootable-se');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-e2e-bootable-se',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const sePath = path.join(
      sandbox.celulasDir,
      pipeline.cellName,
      'kbs',
      'success-examples.md'
    );
    assert.ok(fs.existsSync(sePath), 'kbs/success-examples.md must exist (D-v1.4-09)');
    const text = fs.readFileSync(sePath, 'utf8');
    const matches = text.match(/^##\s+Exemplo\b/gmu) || [];
    assert.ok(matches.length >= 3, 'must have 3+ Exemplo entries (D-v1.4-09)');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e bootable: manifest declares boot list, tiers, and chief reachable (AC 4)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-bootable-tiers');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-e2e-bootable-tiers',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const manifestPath = path.join(sandbox.celulasDir, pipeline.cellName, 'celula.yaml');
    const text = fs.readFileSync(manifestPath, 'utf8');
    assert.ok(/boot:\n\s+-\s+"README\.md"/u.test(text), 'boot list declared with README.md first');
    assert.ok(/tier_1:\n[\s\S]+chief:\s+true/u.test(text), 'tier_1 declares chief: true');
    assert.ok(/agents:\n\s+-\s+"chief"/u.test(text), 'tier_1 lists chief agent');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
