'use strict';

// AC 1, 2 (M4.4) — prioritizer.md exists with EN frontmatter and pt-BR
// persona prose declaring the two explicit output blocks
// (mvp-backlog.yaml + roadmap.yaml) with per-item ICE rationale.
// AC-108A, FR-105.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('prioritizer.md persona exists at expected path (AC 1)', () => {
  assert.ok(
    fs.existsSync(helpers.PRIORITIZER_PATH),
    'prioritizer.md missing at ' + helpers.PRIORITIZER_PATH
  );
});

test('prioritizer frontmatter declares agent_id, tier 3, phases [7] (AC 1)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'prioritizer');
  assert.ok(
    String(frontmatter.tier) === '3',
    'tier expected 3, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['7']);
});

test('prioritizer references diretrizes-escrita.md (FR-121)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(
    raw.includes('diretrizes-escrita.md'),
    'prioritizer persona must reference diretrizes-escrita.md (FR-121)'
  );
});

test('prioritizer body declares two explicit blocks: MVP + roadmap (AC 2, AC-108A)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(raw.includes('mvp-backlog.yaml'), 'must name mvp-backlog.yaml');
  assert.ok(raw.includes('roadmap.yaml'), 'must name roadmap.yaml');
  assert.ok(
    raw.includes('MVP essencial') || raw.includes('MVP'),
    'must declare MVP block'
  );
  assert.ok(
    raw.includes('Roadmap') || raw.includes('roadmap'),
    'must declare roadmap block'
  );
});

test('prioritizer persona ties each block item to ICE rationale in pt-BR (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(raw.includes('rationale'), 'must mention rationale');
  assert.ok(raw.includes('Impact'), 'must name Impact dimension');
  assert.ok(raw.includes('Confidence'), 'must name Confidence dimension');
  assert.ok(raw.includes('Ease'), 'must name Ease dimension');
});

test('prioritizer authority declares does-not-execute and does-not-granulate (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(
    raw.includes('nao executa') || raw.includes('NAO granulariza'),
    'persona must declare scope boundary against execution/granularization'
  );
  assert.ok(raw.includes('D-v1.2-03'), 'must cite D-v1.2-03 on granularization block');
});

test('phase-7 task references mvp-backlog.yaml + roadmap.yaml + ICE per item (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_7_TASK);
  assert.ok(raw.includes('mvp-backlog.yaml'));
  assert.ok(raw.includes('roadmap.yaml'));
  assert.ok(raw.includes('Impact'));
  assert.ok(raw.includes('Confidence'));
  assert.ok(raw.includes('Ease'));
});
