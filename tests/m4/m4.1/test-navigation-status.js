'use strict';

// AC 7 — *status reports current phase and gate state in pt-BR. M4.1 ships
// the task body; full CLI wiring arrives in M4.6. We assert the task
// declares the right APIs and a pt-BR output format.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const STATUS_PATH = path.join(
  helpers.YOTZER_CELL_ROOT,
  'tasks',
  'status.md'
);

test('status task exists and is non-empty (AC 7)', () => {
  const stat = fs.statSync(STATUS_PATH);
  assert.ok(stat.size > 50);
});

test('status task declares handoff_engine.readLatest and mode_engine.getMode APIs (AC 7)', () => {
  const text = fs.readFileSync(STATUS_PATH, 'utf8');
  assert.match(text, /handoff_engine/);
  assert.match(text, /readLatest/);
  assert.match(text, /mode_engine/);
  assert.match(text, /getMode/);
});

test('status task uses EN machine frontmatter and pt-BR body (AC 7)', () => {
  const text = fs.readFileSync(STATUS_PATH, 'utf8');
  // Frontmatter fields (EN machine).
  assert.match(text, /^---/m);
  assert.match(text, /task_id:\s*status/);
  assert.match(text, /agent:\s*chief/);
  // pt-BR body markers.
  assert.match(text, /fase atual/i);
  assert.match(text, /veredito/i);
});

test('status task pt-BR format template references modo, fase, pendentes (AC 7)', () => {
  const text = fs.readFileSync(STATUS_PATH, 'utf8');
  assert.match(text, /celula:\s*yotzer/);
  assert.match(text, /modo:/);
  assert.match(text, /pendentes:/);
});

test('all 6 navigation tasks are EN frontmatter + pt-BR body (AC 7)', () => {
  const tasksDir = path.join(helpers.YOTZER_CELL_ROOT, 'tasks');
  for (const name of [
    'start.md',
    'edit-celula.md',
    'explain-method.md',
    'switch-mode.md',
    'resume.md',
    'status.md',
  ]) {
    const full = path.join(tasksDir, name);
    const text = fs.readFileSync(full, 'utf8');
    // YAML frontmatter present.
    assert.match(text, /^---/m, name + ' missing frontmatter');
    // task_id field present.
    assert.match(
      text,
      /task_id:\s*\S+/,
      name + ' missing task_id machine field'
    );
  }
});
