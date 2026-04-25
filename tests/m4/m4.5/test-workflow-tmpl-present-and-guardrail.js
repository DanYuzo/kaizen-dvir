'use strict';

// AC 23 (M4.5) — workflow-tmpl.yaml is NEW per D-v1.4-08 and its header
// carries the verbatim KaiZen Precedence guard rail clause. Test 16 of
// the M4.5 suite. M4.5-R2 mitigation.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

const VERBATIM_HEADER = 'PRIORITY FOR KAIZEN CONDITIONS ABOVE ADDITIONAL REFERENCES';

test('workflow-tmpl.yaml exists at templates dir (AC 23, D-v1.4-08)', () => {
  assert.ok(
    fs.existsSync(helpers.WORKFLOW_TMPL),
    'workflow-tmpl.yaml missing at ' + helpers.WORKFLOW_TMPL
  );
});

test('workflow-tmpl.yaml header carries verbatim KaiZen Precedence clause (AC 23, D-v1.4-08)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(
    raw.includes(VERBATIM_HEADER),
    'workflow-tmpl.yaml must carry verbatim "' + VERBATIM_HEADER + '"'
  );
});

test('workflow-tmpl.yaml clause appears in header (first 200 chars) (AC 23)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  const headerSlice = raw.slice(0, 200);
  assert.ok(
    headerSlice.includes(VERBATIM_HEADER),
    'KaiZen Precedence clause must appear in first 200 chars'
  );
});

test('workflow-tmpl.yaml cites D-v1.4-08 (AC 23)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(raw.includes('D-v1.4-08'));
});

test('workflow-tmpl.yaml declares external references as conceptual inspiration only (AC 23)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(
    raw.includes('conceptual shape inspiration') ||
      raw.includes('inspiracao de forma conceitual') ||
      raw.includes('inspiracao conceitual'),
    'must declare external refs as conceptual inspiration only'
  );
});

test('workflow-tmpl.yaml declares KaiZen prevails on conflict (AC 23)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(
    raw.includes('prevail') || raw.includes('prevalec'),
    'must declare KaiZen prevails in conflict'
  );
});

test('workflow-tmpl.yaml declares id, name, steps, inputs, outputs, error_handling (AC 23, D-v1.4-08)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(/^id:/mu.test(raw), 'must declare id');
  assert.ok(/^name:/mu.test(raw), 'must declare name');
  assert.ok(/^description:/mu.test(raw), 'must declare description');
  assert.ok(/^inputs:/mu.test(raw), 'must declare inputs');
  assert.ok(/^outputs:/mu.test(raw), 'must declare outputs');
  assert.ok(/^steps:/mu.test(raw), 'must declare steps');
  assert.ok(/^error_handling:/mu.test(raw), 'must declare error_handling');
});

test('workflow-tmpl.yaml declares pre/post-conditions per step (AC 23)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  assert.ok(/pre_condition:/u.test(raw));
  assert.ok(/post_condition:/u.test(raw));
});

test('workflow-tmpl.yaml respects YAML-first and CLI-first (D-v1.1-06, Commandment I, CON-003)', () => {
  const raw = helpers.readFileText(helpers.WORKFLOW_TMPL);
  // Comment block must reference YAML-first and CLI-first.
  assert.ok(/YAML-first/u.test(raw) || /D-v1\.1-06/u.test(raw));
  assert.ok(/CLI-first/u.test(raw) || /Comandamento I/u.test(raw));
});

test('all required templates present in templates dir (AC 21, 22, 23)', () => {
  const required = [
    helpers.CELULA_BLUEPRINT_TMPL,
    helpers.WELCOME_MESSAGE_TMPL,
    helpers.WORKFLOW_TMPL,
  ];
  for (const p of required) {
    assert.ok(fs.existsSync(p), 'required template missing: ' + p);
  }
});

test('celula-blueprint-tmpl.yaml declares minimal manifest fields (AC 21, FR-120)', () => {
  const raw = helpers.readFileText(helpers.CELULA_BLUEPRINT_TMPL);
  assert.ok(/^name:/mu.test(raw));
  assert.ok(/^version:/mu.test(raw));
  assert.ok(/^slashPrefix:/mu.test(raw));
  assert.ok(/^description:/mu.test(raw));
  assert.ok(/^tiers:/mu.test(raw));
  assert.ok(/^commands:/mu.test(raw));
  assert.ok(/^components:/mu.test(raw));
  assert.ok(/^critical_invariants:/mu.test(raw));
});
