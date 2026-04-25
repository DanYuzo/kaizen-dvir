'use strict';

// AC 8 (M4.4) — task-granulator enforces observable-behavior Actions.
// Inferential descriptions ("seja carismatico") trigger Quality Gate
// FAIL; behavioral descriptions ("levante o tom de voz") PASS.
// AC-108B.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('isInferentialAction flags "seja carismatico" as inferential (AC 8, AC-108B)', () => {
  assert.strictEqual(helpers.isInferentialAction('seja carismatico'), true);
});

test('isInferentialAction flags "mostre confianca" as inferential (AC 8, AC-108B)', () => {
  assert.strictEqual(helpers.isInferentialAction('mostre confianca'), true);
});

test('isInferentialAction passes "levante o tom de voz" as observable (AC 8, AC-108B)', () => {
  assert.strictEqual(
    helpers.isInferentialAction('levante o tom de voz'),
    false
  );
});

test('isInferentialAction passes "aumente 20% a velocidade ao descrever o beneficio" (AC 8)', () => {
  assert.strictEqual(
    helpers.isInferentialAction('aumente 20% a velocidade ao descrever o beneficio'),
    false
  );
});

test('isInferentialAction passes "pause 2 segundos antes de revelar o preco" (AC 8)', () => {
  assert.strictEqual(
    helpers.isInferentialAction('pause 2 segundos antes de revelar o preco'),
    false
  );
});

test('task-granulator persona surfaces both PASS and FAIL examples (AC 8)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(
    raw.includes('levante o tom de voz'),
    'persona must surface "levante o tom de voz" as PASS example'
  );
  assert.ok(
    raw.includes('seja carismatico'),
    'persona must surface "seja carismatico" as FAIL example'
  );
});

test('phase-8 task instructs FAIL on inferential adjective (AC 8, AC-108B)', () => {
  const raw = helpers.readFileText(helpers.PHASE_8_TASK);
  assert.ok(
    raw.includes('inferencial') && raw.includes('FAIL'),
    'phase-8 task must declare FAIL on inferential adjectives'
  );
  assert.ok(
    raw.includes('observavel') || raw.includes('comportamento observavel'),
    'phase-8 task must declare observable-behavior requirement'
  );
});
