'use strict';

// AC 19 (M4.5) — wf-yotzer-generate-celula.yaml chains all 10 phases in
// order with per-step agent, gate_type, critical_invariant flag,
// handoff_schema, and pre/post-conditions. AC-103, FR-100, FR-117.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

const EXPECTED_PHASES = [
  'phase-1-objective',
  'phase-2-sources-and-examples',
  'phase-3-as-is',
  'phase-4-stress-test',
  'phase-5-risk-map',
  'phase-6-to-be',
  'phase-7-prioritize',
  'phase-8-granulate',
  'phase-9-contracts',
  'phase-10-publication',
];

test('wf-yotzer-generate-celula.yaml exists at expected path (AC 19)', () => {
  assert.ok(
    fs.existsSync(helpers.WF_GENERATE),
    'wf-yotzer-generate-celula.yaml missing at ' + helpers.WF_GENERATE
  );
});

test('wf-yotzer-generate-celula.yaml lists all 10 phases in order (AC 19)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  let lastIdx = -1;
  for (const phase of EXPECTED_PHASES) {
    const idx = text.indexOf('"' + phase + '"');
    assert.ok(idx > -1, 'workflow must reference phase ' + phase);
    assert.ok(
      idx > lastIdx,
      'phase ' + phase + ' must appear after previous phase (chain order)'
    );
    lastIdx = idx;
  }
});

test('wf-yotzer-generate-celula.yaml declares per-step agent + gate_type + critical_invariant (AC 19)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  // Each step block must declare agent (or agents), gate_type, critical_invariant.
  const stepCount = (text.match(/^\s+- id: /gmu) || []).length;
  assert.ok(stepCount === 10, 'workflow must declare exactly 10 steps, got ' + stepCount);
  const gateCount = (text.match(/gate_type:/gu) || []).length;
  assert.ok(gateCount >= 10, 'each step must declare gate_type');
  const ciCount = (text.match(/critical_invariant:/gu) || []).length;
  assert.ok(ciCount >= 10, 'each step must declare critical_invariant flag');
  const hsCount = (text.match(/handoff_schema:/gu) || []).length;
  assert.ok(hsCount >= 10, 'each step must declare handoff_schema');
  const preCount = (text.match(/pre_condition:/gu) || []).length;
  assert.ok(preCount >= 10, 'each step must declare pre_condition');
  const postCount = (text.match(/post_condition:/gu) || []).length;
  assert.ok(postCount >= 10, 'each step must declare post_condition');
});

test('wf-yotzer-generate-celula.yaml marks F1, F2, F10 as critical_invariant: true (AC 19, AC-102)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  // For each phase id, find its block and check critical_invariant value.
  function ciFor(phaseId) {
    const re = new RegExp(
      '- id: "' + phaseId + '"[\\s\\S]*?critical_invariant:\\s*(true|false)',
      'u'
    );
    const m = re.exec(text);
    return m ? m[1] : null;
  }
  assert.strictEqual(ciFor('phase-1-objective'), 'true', 'F1 must be critical_invariant');
  assert.strictEqual(ciFor('phase-2-sources-and-examples'), 'true', 'F2 must be critical_invariant');
  assert.strictEqual(ciFor('phase-10-publication'), 'true', 'F10 must be critical_invariant');
  assert.strictEqual(ciFor('phase-3-as-is'), 'false', 'F3 not critical_invariant');
});

test('wf-yotzer-generate-celula.yaml declares phase-10-publication with both sub-agents (AC 19)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  // The phase-10 step must reference progressive-systemizer and publisher.
  const block = /- id: "phase-10-publication"[\s\S]*$/mu.exec(text);
  assert.ok(block, 'phase-10-publication step block must exist');
  assert.ok(/progressive-systemizer/u.test(block[0]));
  assert.ok(/publisher/u.test(block[0]));
});

test('wf-yotzer-generate-celula.yaml header carries KaiZen Precedence clause (AC 19)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  assert.ok(
    text.includes('PRIORITY FOR KAIZEN CONDITIONS ABOVE ADDITIONAL REFERENCES'),
    'workflow must carry KaiZen Precedence clause in header'
  );
});

test('wf-yotzer-generate-celula.yaml declares inputs, outputs, error_handling (AC 19, FR-117)', () => {
  const text = helpers.readFileText(helpers.WF_GENERATE);
  assert.ok(/^inputs:/mu.test(text), 'must declare inputs');
  assert.ok(/^outputs:/mu.test(text), 'must declare outputs');
  assert.ok(/^error_handling:/mu.test(text), 'must declare error_handling');
});
