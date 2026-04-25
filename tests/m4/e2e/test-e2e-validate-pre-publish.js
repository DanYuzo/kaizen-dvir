'use strict';

// AC 2, 12 (M4.6) — /Kaizen:Yotzer validate {work-id} runs the full
// pre-publish validation suite; all checks PASS on a completed work-id;
// validate is read-only (filesystem byte-compare on cell + state dirs).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e validate: PASS on a completed work-id; pt-BR per-check rendering with summary (AC 2)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-validate-pass');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-validate-pass',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const cap = helpers.captureOutput(() => bin.runYotzerValidate([pipeline.workId]));
    assert.strictEqual(cap.result, 0, 'validate must PASS on a completed work-id');
    // pt-BR rendering with [PASS] tokens for each check.
    assert.ok(/\[PASS\] Schema Gate/u.test(cap.stdout), 'Schema Gate PASS');
    assert.ok(/\[PASS\] OST\.md fecha/u.test(cap.stdout), 'OST closure PASS');
    assert.ok(/\[PASS\] Actions inline/u.test(cap.stdout), 'Actions-inline PASS');
    assert.ok(/\[PASS\] Handoffs sob 500 tokens/u.test(cap.stdout), 'handoff size PASS');
    assert.ok(/\[PASS\] Invariantes criticas/u.test(cap.stdout), 'critical invariants PASS');
    assert.ok(/\[PASS\] Reuse Gate/u.test(cap.stdout), 'Reuse Gate PASS');
    assert.ok(/Validacao wrk-validate-pass: PASS/u.test(cap.stdout), 'summary line PASS');
    // Reminder that validate does NOT publish.
    assert.ok(
      /validate nao publica/u.test(cap.stdout),
      'reminder that validate does not publish'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e validate: read-only — filesystem byte-compare before/after shows no cell mutation (AC 12, FR-113)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-validate-readonly');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-validate-ro',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const cellPath = path.join(sandbox.celulasDir, pipeline.cellName);
    const before = helpers.snapshotDir(cellPath);

    helpers.captureOutput(() => bin.runYotzerValidate([pipeline.workId]));

    const after = helpers.snapshotDir(cellPath);
    assert.ok(
      helpers.snapshotsEqual(before, after),
      'validate must NOT mutate cell content (read-only semantic)'
    );

    // Work-state directory also must not change (only logs/ writes are allowed).
    const workDir = path.join(sandbox.workDir, pipeline.workId);
    const beforeWork = helpers.snapshotDir(workDir);
    helpers.captureOutput(() => bin.runYotzerValidate([pipeline.workId]));
    const afterWork = helpers.snapshotDir(workDir);
    assert.ok(
      helpers.snapshotsEqual(beforeWork, afterWork),
      'validate must NOT mutate work-state'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e validate: detects seeded action-*.md and emits FAIL (M4.6-R3 negative)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-validate-action');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-validate-action',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    // Seed a forbidden action-*.md under tasks/.
    const cellPath = path.join(sandbox.celulasDir, pipeline.cellName);
    fs.writeFileSync(
      path.join(cellPath, 'tasks', 'action-001.md'),
      '# Action 001\n',
      'utf8'
    );

    const cap = helpers.captureOutput(() => bin.runYotzerValidate([pipeline.workId]));
    assert.strictEqual(cap.result, 1, 'seeded action-*.md must FAIL validate');
    assert.ok(/\[FAIL\] Actions inline/u.test(cap.stdout), 'Actions-inline FAIL surfaced');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e validate: missing critical_invariants flag fails the manifest (M4.6-R3 negative)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-validate-ci');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-validate-ci',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    // Strip the critical_invariants line from the manifest.
    const manifestPath = path.join(sandbox.celulasDir, pipeline.cellName, 'celula.yaml');
    const text = fs.readFileSync(manifestPath, 'utf8');
    const stripped = text.replace(/critical_invariants:[^\n]*\n(?:\s+-\s+[^\n]+\n)*/u, '');
    fs.writeFileSync(manifestPath, stripped, 'utf8');

    const cap = helpers.captureOutput(() => bin.runYotzerValidate([pipeline.workId]));
    assert.strictEqual(cap.result, 1, 'missing critical_invariants must FAIL');
    assert.ok(
      /\[FAIL\] Invariantes criticas/u.test(cap.stdout),
      'pt-BR FAIL line for critical invariants'
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
