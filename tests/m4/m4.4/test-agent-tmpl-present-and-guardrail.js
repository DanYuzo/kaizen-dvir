'use strict';

// AC 17, 18 (M4.4) — agent-tmpl.yaml exists at the templates dir AND
// header carries the verbatim KaiZen Precedence guard rail clause.
// D-v1.4-08.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

const VERBATIM_HEADER = 'PRIORITY FOR KAIZEN CONDITIONS ABOVE ADDITIONAL REFERENCES';

test('agent-tmpl.yaml exists at templates dir (AC 17, D-v1.4-08)', () => {
  assert.ok(
    fs.existsSync(helpers.AGENT_TMPL),
    'agent-tmpl.yaml missing at ' + helpers.AGENT_TMPL
  );
});

test('agent-tmpl.yaml header carries verbatim KaiZen Precedence clause (AC 18, D-v1.4-08)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  // Verbatim string must be present.
  assert.ok(
    raw.includes(VERBATIM_HEADER),
    'agent-tmpl.yaml must carry verbatim "' +
      VERBATIM_HEADER +
      '" string. Found content: ' +
      raw.slice(0, 200)
  );
});

test('agent-tmpl.yaml header opens with the verbatim clause (AC 18, D-v1.4-08)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  // The verbatim clause must appear within the first 200 bytes (header).
  const headerSlice = raw.slice(0, 200);
  assert.ok(
    headerSlice.includes(VERBATIM_HEADER),
    'KaiZen Precedence clause must appear in header (first 200 chars)'
  );
});

test('agent-tmpl.yaml cites D-v1.4-08 (AC 18)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  assert.ok(raw.includes('D-v1.4-08'));
});

test('agent-tmpl.yaml declares external references as conceptual inspiration only (AC 18)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  assert.ok(
    raw.includes('conceptual shape inspiration') ||
      raw.includes('inspiracao de forma conceitual') ||
      raw.includes('inspiracao conceitual'),
    'agent-tmpl.yaml must declare external references as conceptual inspiration only'
  );
});

test('agent-tmpl.yaml declares KaiZen conventions prevail in any conflict (AC 18)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  assert.ok(
    raw.includes('prevail') || raw.includes('prevalec'),
    'agent-tmpl.yaml must declare KaiZen prevails in conflict'
  );
});

test('agent-tmpl.yaml references diretrizes-escrita.md in skeleton (AC 17, FR-121)', () => {
  const raw = helpers.readFileText(helpers.AGENT_TMPL);
  assert.ok(raw.includes('diretrizes-escrita.md'));
});

test('all four templates are present in the templates dir (AC 17)', () => {
  const required = [
    helpers.TASK_TMPL,
    helpers.ACTION_REF_TMPL,
    helpers.CONTRACTS_TMPL,
    helpers.AGENT_TMPL,
  ];
  for (const p of required) {
    assert.ok(fs.existsSync(p), 'required template missing: ' + p);
  }
});

test('task-tmpl.yaml documents inline Actions (AC 17, AC-119)', () => {
  const raw = helpers.readFileText(helpers.TASK_TMPL);
  assert.ok(
    raw.includes('## Actions') || raw.includes('inline'),
    'task-tmpl.yaml must document inline Actions section'
  );
  assert.ok(
    raw.includes('action-*.md'),
    'task-tmpl.yaml must reference action-*.md restriction'
  );
});

test('contracts-tmpl.yaml references task-contract-schema.json (AC 17)', () => {
  const raw = helpers.readFileText(helpers.CONTRACTS_TMPL);
  assert.ok(
    raw.includes('task-contract-schema.json') || raw.includes('schema_reference'),
    'contracts-tmpl.yaml must reference schema_reference field'
  );
  assert.ok(
    raw.includes('FR-020') || raw.includes('D-v1.1-06'),
    'contracts-tmpl.yaml must cite FR-020 / D-v1.1-06 (no JSON conversion)'
  );
});
