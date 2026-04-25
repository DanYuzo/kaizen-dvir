'use strict';

// AC 19 (M4.4) — action-observability.md checklist fires on F8 Quality
// Gate. AC-108B, AC-117, AC-119.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('action-observability.md checklist exists (AC 19)', () => {
  assert.ok(
    fs.existsSync(helpers.ACTION_OBS_CHECKLIST),
    'action-observability.md missing at ' + helpers.ACTION_OBS_CHECKLIST
  );
});

test('checklist surfaces F8 Quality Gate invocation explicitly (AC 19)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(
    raw.includes('Quality Gate F8'),
    'checklist must declare Quality Gate F8 invocation'
  );
});

test('checklist enforces observable-behavior Actions with PASS/FAIL examples (AC 19, AC-108B)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(raw.includes('observavel') || raw.includes('observavel'));
  assert.ok(raw.includes('inferencial') || raw.includes('adjetivo'));
  assert.ok(
    raw.includes('seja carismatico') || raw.includes('mostre confianca'),
    'checklist must surface FAIL example'
  );
  assert.ok(
    raw.includes('levante o tom de voz') ||
      raw.includes('aumente 20% a velocidade') ||
      raw.includes('pause 2 segundos'),
    'checklist must surface PASS example'
  );
});

test('checklist enforces granularity ≤5-7 Actions or skill extraction (AC 19, FR-108)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(raw.includes('1 e 7') || raw.includes('5 a 7') || raw.includes('5-7'));
  assert.ok(raw.includes('skill'));
  assert.ok(raw.includes('split') || raw.includes('quebr'));
});

test('checklist enforces Task linked to Solution in OST (AC 19, AC-117)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(raw.includes('Task'));
  assert.ok(raw.includes('Solution'));
  assert.ok(raw.includes('OST'));
  assert.ok(raw.includes('Outcome'));
});

test('checklist forbids action-*.md emission (AC 19, AC-119, D-v1.3-04)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(
    raw.includes('action-*.md'),
    'checklist must reference action-*.md filename pattern'
  );
  assert.ok(raw.includes('AC-119'));
  assert.ok(raw.includes('D-v1.3-04'));
});

test('checklist concentrates granularization in F8 only (AC 19)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(raw.includes('F8'));
  assert.ok(
    raw.includes('unica fase') || raw.includes('UNICA fase') || raw.includes('Apenas F8') || raw.includes('apenas F8'),
    'checklist must declare F8 as the only granularization phase'
  );
});

test('checklist follows diretrizes-escrita: short pt-BR sentences (AC 19, FR-121)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  const lines = raw.split(/\r?\n/u).filter((l) => l.trim().startsWith('- [ ]'));
  for (const line of lines) {
    assert.ok(
      line.length <= 130,
      'checklist line too long (' + line.length + '): ' + line
    );
  }
});
