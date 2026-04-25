'use strict';

// AC 8 (M4.6) — every phase handoff in the e2e run is under 500 tokens
// in YAML; histogram of sizes is captured for the M4 sign-off report.
// AC-103.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const TOKEN_CEILING = 500;

function buildHistogram(handoffsDir) {
  const tokenCounter = require(
    path.join(helpers.PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory', 'token-counter.js')
  );
  const out = {};
  if (!fs.existsSync(handoffsDir)) return out;
  for (const name of fs.readdirSync(handoffsDir)) {
    if (!name.startsWith('handoff-') || !name.endsWith('.yaml')) continue;
    if (name.indexOf('.tmp-') !== -1) continue;
    const text = fs.readFileSync(path.join(handoffsDir, name), 'utf8');
    out[name] = tokenCounter.count(text);
  }
  return out;
}

test('e2e handoff size: every phase handoff under 500 tokens (AC 8, AC-103)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-handoff-size');
  try {
    helpers.runSyntheticPipeline({
      workId: 'wrk-handoff-size',
      cellName: 'test-cell',
    });
    const histogram = buildHistogram(sandbox.handoffsDir);
    const filenames = Object.keys(histogram);
    // M3.2 retention is 3 — assert at least the 3 most recent are within budget.
    assert.ok(filenames.length >= 3, 'at least 3 handoffs retained');
    for (const name of filenames) {
      const tokens = histogram[name];
      assert.ok(
        tokens > 0,
        'handoff ' + name + ' must have a positive token count'
      );
      assert.ok(
        tokens < TOKEN_CEILING,
        'handoff ' + name + ' has ' + tokens + ' tokens (exceeds ' + TOKEN_CEILING + ')'
      );
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});

test('e2e handoff size: histogram artifact emitted for sign-off report (AC 14 surface)', () => {
  const sandbox = helpers.setupEnvSandbox('e2e-handoff-histogram');
  try {
    helpers.runSyntheticPipeline({
      workId: 'wrk-handoff-histogram',
      cellName: 'test-cell',
    });
    const histogram = buildHistogram(sandbox.handoffsDir);
    // Persist as JSON for the sign-off report consumer.
    const jsonPath = path.join(sandbox.tmp, 'handoff-histogram.json');
    fs.writeFileSync(jsonPath, JSON.stringify(histogram, null, 2), 'utf8');
    const reread = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.strictEqual(typeof reread, 'object', 'histogram is a JSON object');
    assert.ok(Object.keys(reread).length > 0, 'histogram has entries');
    for (const v of Object.values(reread)) {
      assert.ok(typeof v === 'number' && v > 0, 'all entries are positive numbers');
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(sandbox.tmp);
  }
});
