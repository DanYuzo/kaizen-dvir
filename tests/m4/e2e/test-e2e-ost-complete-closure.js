'use strict';

// AC 6 (M4.6) — generated cell's OST.md has complete Task → Solution →
// Opportunity → Outcome traceability closing F10. AC-117. Direct
// inspection of the published OST.md.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('e2e OST closure: every Task chains back to Outcome via Solution and Opportunity (AC 6, AC-117)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-ost');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-ost',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    const ostPath = path.join(sandbox.celulasDir, pipeline.cellName, 'OST.md');
    assert.ok(fs.existsSync(ostPath), 'OST.md must exist after F10');

    const text = fs.readFileSync(ostPath, 'utf8');
    // Outcome row.
    assert.ok(/^- id: OUT-001/mu.test(text), 'Outcome OUT-001 present');
    // Opportunity row.
    assert.ok(/^- id: OPP-001/mu.test(text), 'Opportunity OPP-001 present');
    // Solution row.
    assert.ok(/^- id: SOL-001/mu.test(text), 'Solution SOL-001 present');
    // Link row connecting SOL-001 to OPP-001.
    assert.ok(/SOL-001 resolve OPP-001/u.test(text), 'Link SOL-001 -> OPP-001 present');
    // Task row referencing SOL-001.
    assert.ok(
      /TASK-001[^\n]*SOL-001/u.test(text),
      'Task TASK-001 references SOL-001'
    );

    // Use the publisher's own ost-closure validator to confirm.
    const publisher = helpers.freshPublisher();
    const r = publisher.ostClosureValidator(
      path.join(sandbox.celulasDir, pipeline.cellName)
    );
    assert.strictEqual(r.verdict, 'PASS', 'ostClosureValidator must PASS');
    assert.strictEqual(r.orphans.length, 0, 'no orphan IDs');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e OST closure: orphan Task (no SOL link) fails the validator (KZ-M4-R8 mitigation)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-ost-orphan');
  try {
    const pipeline = helpers.runSyntheticPipeline({
      workId: 'wrk-ost-orphan',
      cellName: 'test-cell',
    });
    const bin = helpers.freshKaizenBin();
    assert.strictEqual(bin.runYotzerPublish([pipeline.workId]), 0);

    // Inject orphan Task that references no Solution.
    const ostPath = path.join(sandbox.celulasDir, pipeline.cellName, 'OST.md');
    const text = fs.readFileSync(ostPath, 'utf8');
    const broken = text.replace(
      /^- id: TASK-001[^\n]*$/mu,
      '- id: TASK-002 descricao: orfa.'
    );
    fs.writeFileSync(ostPath, broken, 'utf8');

    const publisher = helpers.freshPublisher();
    const r = publisher.ostClosureValidator(
      path.join(sandbox.celulasDir, pipeline.cellName)
    );
    assert.strictEqual(r.verdict, 'FAIL', 'orphan Task must FAIL');
    assert.ok(r.orphans.length > 0, 'orphan list populated');
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
