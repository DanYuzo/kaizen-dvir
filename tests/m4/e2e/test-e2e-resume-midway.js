'use strict';

// AC 1, 10, 11 (M4.6) — simulate session change at F5; /Kaizen:Yotzer
// resume reconstitutes state and continues to publish; idempotency
// asserted by double-invoke (FR-112, AC-110).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e resume: session change at F5; resume reconstitutes state and continues to publish (AC 1, 10)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-resume-midway');
  try {
    // Run F1..F5 then stop (simulates session change).
    const pipelinePart1 = helpers.runSyntheticPipeline({
      workId: 'wrk-resume',
      cellName: 'test-cell',
      mode: 'interativo',
      skipPhases: ['F6', 'F7', 'F8', 'F9', 'F10'],
    });
    const phase5Events = pipelinePart1.events.filter(
      (e) => !e.skipped && e.phase === 'F5'
    );
    assert.strictEqual(phase5Events.length, 1, 'F5 handoff must exist');

    // Resume with sim confirmation.
    process.env.KAIZEN_RESUME_CONFIRM = 'sim';
    const bin = helpers.freshKaizenBin();
    const cap = helpers.captureOutput(() => bin.runYotzerResume([pipelinePart1.workId]));
    assert.strictEqual(cap.result, 0, 'resume must succeed');
    assert.ok(/Trabalho wrk-resume retomado/u.test(cap.stdout), 'resume must surface pt-BR notice');
    assert.ok(/F5/u.test(cap.stdout), 'resume must surface phase F5');

    // Now continue F6..F10 then publish.
    helpers.runSyntheticPipeline({
      workId: pipelinePart1.workId,
      cellName: pipelinePart1.cellName,
      mode: 'interativo',
      skipPhases: ['F1', 'F2', 'F3', 'F4', 'F5'],
    });

    const code = bin.runYotzerPublish([pipelinePart1.workId]);
    assert.strictEqual(code, 0, 'publish after resume must succeed');
    const cellPath = path.join(sandbox.celulasDir, pipelinePart1.cellName);
    assert.ok(fs.existsSync(cellPath), 'resumed cell published');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e resume: idempotent — second invoke does not duplicate state (AC 11, FR-112)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-resume-idempotent');
  try {
    helpers.runSyntheticPipeline({
      workId: 'wrk-resume-idem',
      cellName: 'test-cell',
      skipPhases: ['F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'],
    });
    process.env.KAIZEN_RESUME_CONFIRM = 'sim';
    const bin = helpers.freshKaizenBin();

    // First resume — RESUMED.
    const cap1 = helpers.captureOutput(() => bin.runYotzerResume(['wrk-resume-idem']));
    assert.strictEqual(cap1.result, 0);
    assert.ok(/retomado/u.test(cap1.stdout), 'first resume reports retomado');

    // Second resume — idempotent NOOP.
    const cap2 = helpers.captureOutput(() => bin.runYotzerResume(['wrk-resume-idem']));
    assert.strictEqual(cap2.result, 0, 'second resume must exit 0 (idempotent)');
    assert.ok(
      /Retomada ja registrada/u.test(cap2.stdout),
      'second resume must announce idempotent no-op in pt-BR'
    );
    assert.ok(
      /Nenhuma duplicacao/u.test(cap2.stdout),
      'second resume must declare no state duplication'
    );

    // Resume-events file must contain exactly one entry.
    const resumeEventsPath = path.join(
      sandbox.stateDir,
      'yotzer',
      'wrk-resume-idem',
      'resume-events.yaml'
    );
    assert.ok(fs.existsSync(resumeEventsPath), 'resume-events.yaml must exist');
    const text = fs.readFileSync(resumeEventsPath, 'utf8');
    const entries = text.match(/^-\s+handoff:/gmu) || [];
    assert.strictEqual(entries.length, 1, 'exactly one resume entry — no duplication');

    // Gate-verdict log must contain RESUMED + NOOP entries (logged on both invocations).
    const logPath = path.join(
      sandbox.logsDir,
      'gate-verdicts',
      'resume-wrk-resume-idem.log'
    );
    assert.ok(fs.existsSync(logPath), 'resume-event log must exist');
    const logLines = fs.readFileSync(logPath, 'utf8').trim().split(/\n/u);
    assert.strictEqual(logLines.length, 2, 'two log entries — one per invocation');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e resume: no handoff for chief returns FAIL with pt-BR hint (NFR-101)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-resume-no-handoff');
  try {
    process.env.KAIZEN_RESUME_CONFIRM = 'sim';
    const bin = helpers.freshKaizenBin();
    const cap = helpers.captureOutput(() => bin.runYotzerResume(['wrk-empty']));
    assert.strictEqual(cap.result, 1, 'no handoff returns 1');
    assert.ok(/nenhum handoff/u.test(cap.stderr), 'pt-BR hint surfaced');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
