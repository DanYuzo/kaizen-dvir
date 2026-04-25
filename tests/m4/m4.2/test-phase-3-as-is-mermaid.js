'use strict';

// AC 10 — F3 produces mermaid dependency graph with pt-BR labels.
// Verifies the phase-3 task describes mermaid output and that the
// process-map-tmpl.yaml carries a mermaid_render field with pt-BR
// labels.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const PROCESS_MAP_TMPL = path.join(
  helpers.YOTZER_CELL_ROOT,
  'templates',
  'process-map-tmpl.yaml'
);
const PU_TMPL = path.join(
  helpers.YOTZER_CELL_ROOT,
  'templates',
  'pu-tmpl.yaml'
);

test('process-map-tmpl.yaml exists (AC 10, 17)', () => {
  assert.ok(fs.existsSync(PROCESS_MAP_TMPL));
});

test('pu-tmpl.yaml exists with required fields (AC 10, 17)', () => {
  assert.ok(fs.existsSync(PU_TMPL));
  const raw = helpers.readFileText(PU_TMPL);
  // 9 required fields per story.
  for (const field of [
    'id:',
    'name:',
    'phase:',
    'description:',
    'inputs:',
    'outputs:',
    'dependencies:',
    'executor_hint:',
    'estimated_effort:',
    'status:',
  ]) {
    assert.ok(raw.includes(field), 'pu-tmpl must include field ' + field);
  }
});

test('process-map-tmpl.yaml carries mermaid_render field (AC 10)', () => {
  const raw = helpers.readFileText(PROCESS_MAP_TMPL);
  assert.ok(raw.includes('mermaid_render'));
  assert.ok(raw.includes('graph TD'));
});

test('process-map-tmpl mermaid uses pt-BR labels (AC 10, FR-121)', () => {
  const raw = helpers.readFileText(PROCESS_MAP_TMPL);
  // Labels must contain pt-BR phrasing; avoid English tokens like
  // "Next step" / "Begin" / "End".
  assert.ok(
    raw.includes('pt-BR') ||
      raw.includes('proximo passo em pt-BR') ||
      raw.includes('nome curto em pt-BR'),
    'mermaid template must carry pt-BR labels'
  );
});

test('phase-3-as-is.md describes mermaid with pt-BR labels (AC 10)', () => {
  const raw = helpers.readFileText(helpers.PHASE_3_TASK);
  assert.ok(raw.includes('mermaid'));
  assert.ok(raw.toLowerCase().includes('pt-br'));
  assert.ok(raw.includes('graph TD'));
});

test('phase-3-as-is.md prescribes writing process-map-as-is.yaml (AC 10)', () => {
  const raw = helpers.readFileText(helpers.PHASE_3_TASK);
  assert.ok(raw.includes('process-map-as-is.yaml'));
  assert.ok(raw.includes('process-map-tmpl.yaml'));
});
