'use strict';

// AC 24 (M4.5) — progressive-levels-coherence.md exists with pt-BR
// checklist items covering the 4-tier order, expected learning per
// tier, Hook Model completeness, CLI mapping. FR-107, AC-109, AC-109A,
// FR-121.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('progressive-levels-coherence.md exists at checklists dir (AC 24)', () => {
  assert.ok(
    fs.existsSync(helpers.PROGRESSIVE_LEVELS_CHECKLIST),
    'progressive-levels-coherence.md missing at ' +
      helpers.PROGRESSIVE_LEVELS_CHECKLIST
  );
});

test('checklist declares 4 niveis por Task MVP (AC 24)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/Quatro niveis/u.test(text) || /4 niveis/u.test(text));
  assert.ok(/Task MVP/u.test(text));
});

test('checklist declares strict 4-tier order (AC 24, AC-109)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/manual/u.test(text));
  assert.ok(/simplificado/u.test(text));
  assert.ok(/batch/u.test(text));
  assert.ok(/automatizado/u.test(text));
  // The order must appear at least once in the same vicinity.
  const firstM = text.indexOf('manual');
  const firstA = text.indexOf('automatizado');
  assert.ok(firstM > -1 && firstA > -1 && firstM < firstA);
});

test('checklist declares expected_learning per tier item (AC 24, FR-107)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/expected_learning/u.test(text));
  assert.ok(/Aprendizado esperado/u.test(text));
});

test('checklist declares rationale linking tier <N> to tier <N-1> (AC 24)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/rationale/u.test(text));
  assert.ok(/tier anterior/u.test(text) || /aprendizado do tier/u.test(text));
});

test('checklist declares Hook Model 4 components (AC 24, AC-109A)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/Hook Model/u.test(text));
  assert.ok(/Trigger/u.test(text));
  assert.ok(/Action/u.test(text));
  assert.ok(/Variable Reward/u.test(text));
  assert.ok(/Investment/u.test(text));
});

test('checklist declares CLI mapping (/Kaizen + *comandos) (AC 24)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/\/Kaizen/u.test(text), 'must mention /Kaizen prefix');
  assert.ok(/\*comandos/u.test(text), 'must mention *comandos');
});

test('checklist references diretrizes-escrita.md (AC 24, FR-121)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/diretrizes-escrita\.md/u.test(text));
});

test('checklist declares Quality Gate F10a integration (AC 24)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_LEVELS_CHECKLIST);
  assert.ok(/Quality Gate F10a/u.test(text) || /F10a/u.test(text));
});
