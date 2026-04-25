'use strict';

// AC 8, AC-101 — /Kaizen:Yotzer activation triggers the welcome message in
// pt-BR with 3 options and the mode question. We assert the template is
// renderable and carries the three caminhos + modo prompt. Full CLI wiring
// (`/Kaizen:Yotzer` command dispatch) arrives in M4.6; M4.1 ships the
// activation payload that the dispatcher renders.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const TEMPLATE_PATH = path.join(
  helpers.YOTZER_CELL_ROOT,
  'templates',
  'welcome-message-tmpl.md'
);

test('welcome template exists and is non-empty (AC 11)', () => {
  const stat = fs.statSync(TEMPLATE_PATH);
  assert.ok(stat.size > 50, 'template should have real content');
});

test('welcome template offers 3 options (AC 8, AC-101)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.match(text, /1\.\s*gerar celula nova/i);
  assert.match(text, /2\.\s*editar celula existente/i);
  assert.match(text, /3\.\s*explicar o metodo/i);
});

test('welcome template carries the mode question (AC 8, AC-101)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.match(text, /interativo/i);
  assert.match(text, /automatico/i);
  assert.match(text, /modo/i);
});

test('start task declares elicit: true and postcondition to session-mode.yaml (AC 8)', () => {
  const taskPath = path.join(helpers.YOTZER_CELL_ROOT, 'tasks', 'start.md');
  const text = fs.readFileSync(taskPath, 'utf8');
  assert.match(text, /elicit:\s*true/);
  assert.match(text, /session-mode\.yaml/);
});
