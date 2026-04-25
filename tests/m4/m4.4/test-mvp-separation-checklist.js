'use strict';

// AC 19 (M4.4) — mvp-vs-roadmap-separation.md checklist fires on F7
// Quality Gate. AC-108A, FR-105, AC-117.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('mvp-vs-roadmap-separation.md checklist exists (AC 19)', () => {
  assert.ok(
    fs.existsSync(helpers.MVP_VS_ROADMAP_CHECKLIST),
    'mvp-vs-roadmap-separation.md missing at ' + helpers.MVP_VS_ROADMAP_CHECKLIST
  );
});

test('checklist surfaces F7 invocation explicitly (AC 19)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(
    raw.includes('Quality Gate F7'),
    'checklist must declare Quality Gate F7 invocation'
  );
});

test('checklist enumerates ICE per PU rationale (AC 19)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(raw.includes('ICE'));
  assert.ok(raw.includes('Impact'));
  assert.ok(raw.includes('Confidence'));
  assert.ok(raw.includes('Ease'));
  assert.ok(
    raw.includes('rationale') || raw.includes('razao'),
    'checklist must require rationale alongside score'
  );
});

test('checklist enumerates explicit MVP block items with justification (AC 19)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(raw.includes('mvp-backlog.yaml'));
  assert.ok(raw.includes('justificativa'));
  assert.ok(
    raw.includes('Outcome') || raw.includes('outcome'),
    'checklist must tie MVP item to Outcome'
  );
});

test('checklist enumerates explicit roadmap block items with justification (AC 19)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(raw.includes('roadmap.yaml'));
  assert.ok(
    raw.includes('amplia') || raw.includes('enriquecimento'),
    'checklist must declare roadmap as enrichment, not blocker'
  );
});

test('checklist requires OST Solutions marked mvp/roadmap (AC 19, AC-117)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(raw.includes('OST'));
  assert.ok(raw.includes('mvp'));
  assert.ok(raw.includes('roadmap'));
  assert.ok(raw.includes('marca'), 'checklist must mention mark/marcacao');
});

test('checklist forbids ICE-less items (AC 19)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  assert.ok(
    raw.includes('nenhum item entra') ||
      raw.includes('sem rationale ICE') ||
      raw.includes('sem ICE'),
    'checklist must forbid items without ICE rationale'
  );
});

test('checklist follows diretrizes-escrita: short pt-BR sentences (AC 19, FR-121)', () => {
  const raw = helpers.readFileText(helpers.MVP_VS_ROADMAP_CHECKLIST);
  // Each "- [ ] ..." line should be under 130 chars (short sentences).
  const lines = raw.split(/\r?\n/u).filter((l) => l.trim().startsWith('- [ ]'));
  for (const line of lines) {
    assert.ok(
      line.length <= 130,
      'checklist line too long (' + line.length + '): ' + line
    );
  }
});
