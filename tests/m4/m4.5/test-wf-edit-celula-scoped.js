'use strict';

// AC 20 (M4.5) — wf-yotzer-edit-celula.yaml supports scoped edits of an
// existing cell (persona, tasks, templates, checklists) and escalates
// manifest-level structural changes to wf-yotzer-generate-celula.yaml.
// FR-100.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('wf-yotzer-edit-celula.yaml exists at expected path (AC 20)', () => {
  assert.ok(
    fs.existsSync(helpers.WF_EDIT),
    'wf-yotzer-edit-celula.yaml missing at ' + helpers.WF_EDIT
  );
});

test('wf-yotzer-edit-celula.yaml declares scoped-edit entry points (AC 20)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  assert.ok(/edit-persona/u.test(text), 'must declare edit-persona step');
  assert.ok(/edit-task/u.test(text), 'must declare edit-task step');
  assert.ok(/edit-template/u.test(text), 'must declare edit-template step');
  assert.ok(/edit-checklist/u.test(text), 'must declare edit-checklist step');
});

test('wf-yotzer-edit-celula.yaml declares applies_when per scope (AC 20)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  const appliesWhenCount = (text.match(/applies_when:/gu) || []).length;
  assert.ok(
    appliesWhenCount >= 4,
    'each scoped-edit step must declare applies_when, got ' + appliesWhenCount
  );
});

test('wf-yotzer-edit-celula.yaml declares escalation rule for structural changes (AC 20)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  assert.ok(/escalation_rule:/u.test(text), 'must declare escalation_rule block');
  assert.ok(
    /wf-yotzer-generate-celula/u.test(text),
    'escalation must point to wf-yotzer-generate-celula'
  );
});

test('wf-yotzer-edit-celula.yaml header carries KaiZen Precedence clause (AC 20)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  assert.ok(
    text.includes('PRIORITY FOR KAIZEN CONDITIONS ABOVE ADDITIONAL REFERENCES'),
    'edit workflow must carry KaiZen Precedence clause'
  );
});

test('wf-yotzer-edit-celula.yaml declares pt-BR rationale comments (AC 20, FR-121)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  assert.ok(/Quando usar este workflow/u.test(text), 'must declare when-to-use block in pt-BR');
  assert.ok(/Quando NAO usar/u.test(text), 'must declare when-not-to-use block in pt-BR');
});

test('wf-yotzer-edit-celula.yaml ends with publish-edit step (AC 20)', () => {
  const text = helpers.readFileText(helpers.WF_EDIT);
  assert.ok(/- id: "publish-edit"/u.test(text), 'must declare publish-edit final step');
});
