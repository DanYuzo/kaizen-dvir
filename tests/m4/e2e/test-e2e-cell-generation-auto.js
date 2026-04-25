'use strict';

// AC 4, 5, 9 (M4.6) — full 10-phase auto run. Critical invariants F1/F2/F10
// still pause (asserted explicitly in test-e2e-critical-invariants-paused.js).
// Time budget measured via the harness with deterministic clock.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e auto: synthetic 10-phase run publishes cell with AC-118 structure under measured time budget (AC 4, 5, 9)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-auto');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-e2e-auto',
      cellName: 'test-cell',
      mode: 'automatico',
    });
    assert.ok(pipeline.events.every((e) => !e.error), 'no pipeline errors in auto mode');
    // All 10 phases stamped (none skipped).
    const stamped = pipeline.events.filter((e) => !e.skipped);
    assert.strictEqual(stamped.length, 10, 'all 10 phases must be stamped in auto mode');

    const bin = helpers.freshKaizenBin();
    const code = bin.runYotzerPublish([pipeline.workId]);
    assert.strictEqual(code, 0, 'publish must succeed in auto-mode pipeline');

    const cellPath = path.join(sandbox.celulasDir, pipeline.cellName);
    assert.ok(fs.existsSync(cellPath), 'auto-mode cell published');

    // Time budget aggregate must be within 4h.
    const tb = helpers.freshTimeBudget();
    const agg = tb.aggregate({ workId: pipeline.workId });
    assert.ok(agg.withinBudget, 'auto-mode aggregate must be within 4h budget');
    assert.strictEqual(agg.intervals.length, 10, '10 paired intervals in auto mode');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
