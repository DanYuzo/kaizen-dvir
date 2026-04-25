'use strict';

// AC 11, FR-121 — welcome message follows diretrizes-escrita.md: short
// sentences, present tense, active voice, no adverbs. Also does not induce
// proactive cell creation (CON-105, FR-118).

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

function getBodyLines(text) {
  // Strip HTML comments (template notes).
  const noComments = text.replace(/<!--[\s\S]*?-->/g, '');
  return noComments
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

test('template exists and has rendered body (AC 11)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const lines = getBodyLines(text);
  assert.ok(lines.length >= 4, 'body should have at least a greeting + 3 options');
});

test('short sentences — each prose line is under 180 chars (AC 11, diretrizes)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const lines = getBodyLines(text);
  for (const line of lines) {
    assert.ok(
      line.length <= 180,
      'linha longa demais (' + line.length + ' chars): ' + line
    );
  }
});

test('active voice — no passive constructions "foi/sera + participle" (AC 11)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  // A narrow heuristic: flag "foi " or "sera " followed by a 4+ char word
  // ending in -ado/-ido (past participle). False positives are acceptable
  // because the template should avoid all of these anyway.
  const passivePattern = /\b(foi|sera|sao|eram)\s+\w{3,}(ado|ido|ada|ida|ados|idos|adas|idas)\b/i;
  assert.ok(
    !passivePattern.test(text),
    'passiva detectada: ' + text.match(passivePattern)
  );
});

test('no adverbs in -mente (AC 11, diretrizes)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  // Strip HTML comments before scanning.
  const noComments = text.replace(/<!--[\s\S]*?-->/g, '');
  const adverbMatches = noComments.match(/\b\w{4,}mente\b/gi) || [];
  assert.strictEqual(
    adverbMatches.length,
    0,
    'adverbios em -mente detectados: ' + adverbMatches.join(', ')
  );
});

test('does not induce proactive creation — no imperative "crie / comece / faca agora" (AC 11, CON-105, FR-118)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8').toLowerCase();
  // The template invites; it must not push.
  const inducingPatterns = [
    /\bcomece agora\b/,
    /\bcrie ja\b/,
    /\bvamos criar\b/,
    /\bclique aqui\b/,
  ];
  for (const p of inducingPatterns) {
    assert.ok(!p.test(text), 'padrao inducivo detectado: ' + p);
  }
});

test('3 options present by keyword (AC 11)', () => {
  const text = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  assert.match(text, /gerar celula nova/i);
  assert.match(text, /editar celula existente/i);
  assert.match(text, /explicar o metodo/i);
});
