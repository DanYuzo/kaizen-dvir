'use strict';

// AC 18 — playback-completeness.md checklist exists and covers the 6
// generic items + phase-specific items for F1/F2/F3/F6. All items in
// pt-BR per diretrizes-escrita.md.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('playback-completeness.md exists at yotzer checklists/ (AC 18)', () => {
  assert.ok(fs.existsSync(helpers.PLAYBACK_CHECKLIST));
});

test('checklist covers the 6 common items (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const lower = raw.toLowerCase();
  assert.ok(lower.includes('rastreamento por afirmacao') || lower.includes('rastreamento por afirmação'));
  assert.ok(lower.includes('ausencia de invencao') || lower.includes('ausência de invenção'));
  assert.ok(lower.includes('ikigai'));
  assert.ok(lower.includes('fidelidade ao dominio') || lower.includes('fidelidade ao domínio'));
  assert.ok(lower.includes('change log'));
  assert.ok(lower.includes('500 tokens'));
});

test('checklist carries per-phase sections F1/F2/F3/F6 (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  assert.ok(raw.includes('## F1'), 'missing F1 section');
  assert.ok(raw.includes('## F2'), 'missing F2 section');
  assert.ok(raw.includes('## F3'), 'missing F3 section');
  assert.ok(raw.includes('## F6'), 'missing F6 section');
});

test('F1 section checks measurable objective + OST root + critical pause (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const idx = raw.indexOf('## F1');
  const next = raw.indexOf('## F2', idx);
  const block = raw.slice(idx, next);
  assert.ok(block.toLowerCase().includes('5 tipos') || block.toLowerCase().includes('cinco tipos'));
  assert.ok(block.toLowerCase().includes('ost'));
  assert.ok(block.toLowerCase().includes('invariante'));
});

test('F2 section checks 3+ examples persisted + derived criteria + multi-select (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const idx = raw.indexOf('## F2');
  const next = raw.indexOf('## F3', idx);
  const block = raw.slice(idx, next);
  assert.ok(block.includes('derived-criteria.yaml'));
  assert.ok(block.toLowerCase().includes('3 ou mais'));
  assert.ok(block.toLowerCase().includes('multi-select'));
  assert.ok(block.toLowerCase().includes('kbs/success-examples.md'));
});

test('F3 section checks Opportunities + mermaid + pt-BR labels (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const idx = raw.indexOf('## F3');
  const next = raw.indexOf('## F6', idx);
  const block = raw.slice(idx, next);
  assert.ok(block.toLowerCase().includes('opportunities'));
  assert.ok(block.toLowerCase().includes('mermaid'));
  assert.ok(block.toLowerCase().includes('pt-br'));
});

test('F6 section checks F4+F5 pre-condition + Solutions + Links (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const idx = raw.indexOf('## F6');
  const block = raw.slice(idx);
  assert.ok(block.includes('F4 PASS'));
  assert.ok(block.includes('F5 PASS'));
  assert.ok(block.toLowerCase().includes('solutions'));
  assert.ok(block.toLowerCase().includes('opportunity'));
});

/**
 * Parse the checklist items to verify each is a real list entry — not
 * just prose. M4.2-R3 mitigation: items must be actionable assertions.
 */
function countCheckItems(raw) {
  return (raw.match(/^-\s+\[ \]/gmu) || []).length;
}

test('checklist carries at least 20 actionable items across all sections (AC 18)', () => {
  const raw = helpers.readFileText(helpers.PLAYBACK_CHECKLIST);
  const count = countCheckItems(raw);
  assert.ok(count >= 20, 'expected at least 20 checklist items, got ' + count);
});
