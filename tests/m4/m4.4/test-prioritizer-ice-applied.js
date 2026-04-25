'use strict';

// AC 2 (M4.4) — prioritizer applies simplified ICE per To-be PU. Each
// item carries Impact x Confidence x Ease rationale in pt-BR. Numbers
// alone do not decide; rationale alongside numbers decides. AC-108A,
// FR-105.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('prioritizer persona declares ICE simplified as heuristic, not formula (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(raw.includes('ICE'), 'persona must name ICE');
  assert.ok(
    raw.includes('heuristica') || raw.includes('heuristic'),
    'persona must frame ICE as heuristic, not advanced model'
  );
  assert.ok(
    raw.includes('razao') || raw.includes('Razao') || raw.includes('rationale'),
    'persona must frame rationale next to score'
  );
});

test('phase-7 task lists ICE dimensions in frontmatter (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_7_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.ok(Array.isArray(frontmatter.ice_dimensions), 'ice_dimensions must be a list');
  assert.deepStrictEqual(frontmatter.ice_dimensions, ['impact', 'confidence', 'ease']);
});

test('isIceItem helper accepts well-formed ICE item (AC 2)', () => {
  const item = {
    pu_id: 'PU-001',
    ice: { impact: 'alto', confidence: 'alto', ease: 'medio' },
    rationale: 'desbloqueia tres outras PUs',
  };
  assert.strictEqual(helpers.isIceItem(item), true);
});

test('isIceItem helper rejects item without rationale (AC 2)', () => {
  const item = {
    pu_id: 'PU-001',
    ice: { impact: 'alto', confidence: 'alto', ease: 'medio' },
  };
  assert.strictEqual(helpers.isIceItem(item), false);
});

test('isIceItem helper rejects item with invalid ICE level (AC 2)', () => {
  const item = {
    pu_id: 'PU-001',
    ice: { impact: 'extreme', confidence: 'alto', ease: 'medio' },
    rationale: 'razao curta',
  };
  assert.strictEqual(helpers.isIceItem(item), false);
});

test('phase-7 task instructs per-PU ICE rationale in pt-BR (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_7_TASK);
  // Persona prose must instruct rationale-in-pt-BR for each dimension.
  assert.ok(
    raw.includes('em pt-BR'),
    'phase-7 task must instruct pt-BR rationale'
  );
  assert.ok(
    raw.includes('baixa') || raw.includes('alta') || raw.includes('media'),
    'phase-7 task must enumerate ICE level labels'
  );
});

test('mvp-backlog.yaml structural example present in phase-7 task (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_7_TASK);
  assert.ok(raw.includes('rationale'), 'phase-7 example must show rationale field');
  assert.ok(raw.includes('ice'), 'phase-7 example must show ice block');
});
