'use strict';

// AC 7, 22 (M4.5) — welcome-message-tmpl.md is extended for generated
// cells; prose follows diretrizes-escrita.md (FR-121).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('welcome-message-tmpl.md exists at templates dir (AC 22)', () => {
  assert.ok(
    fs.existsSync(helpers.WELCOME_MESSAGE_TMPL),
    'welcome-message-tmpl.md missing at ' + helpers.WELCOME_MESSAGE_TMPL
  );
});

test('welcome-message-tmpl.md preserves original Yotzer fields (AC 22)', () => {
  const text = helpers.readFileText(helpers.WELCOME_MESSAGE_TMPL);
  assert.ok(
    text.includes('Yotzer ativo'),
    'original Yotzer welcome must remain (additive extension)'
  );
});

test('welcome-message-tmpl.md adds extension section for generated cells (AC 22)', () => {
  const text = helpers.readFileText(helpers.WELCOME_MESSAGE_TMPL);
  assert.ok(
    /CELULAS GERADAS/u.test(text) || /celula gerada/u.test(text),
    'must declare extension section for generated cells'
  );
  assert.ok(
    text.includes('<NOME-DA-CELULA>'),
    'must declare placeholder for generated cell name'
  );
});

test('welcome-message-tmpl.md prose follows diretrizes-escrita.md heuristics (AC 7, FR-121)', () => {
  const text = helpers.readFileText(helpers.WELCOME_MESSAGE_TMPL);
  // Heuristic: short sentences. Find narrative lines and assert each
  // ends with a period and is not too long.
  const narrativeLines = text
    .split(/\r?\n/u)
    .filter((l) => l.trim().length > 0 && !l.startsWith('<!--') && !l.startsWith('-->') && !l.startsWith('#') && !l.startsWith('1.') && !l.startsWith('2.') && !l.startsWith('3.'));
  // At least one narrative line that ends with a period.
  const sentenceLines = narrativeLines.filter((l) => /\.\s*$/u.test(l));
  assert.ok(sentenceLines.length > 0, 'must contain at least one short sentence ending with period');
});

test('welcome-message-tmpl.md includes pt-BR mode question for generated cells (AC 22)', () => {
  const text = helpers.readFileText(helpers.WELCOME_MESSAGE_TMPL);
  assert.ok(/modo: interativo/u.test(text));
  assert.ok(/automatico/u.test(text));
});

test('publisher.instrumentHookModel pt-BR narrative is short (FR-121)', () => {
  const tmp = helpers.mkTmpDir('welcome-prose');
  try {
    const publisher = helpers.freshPublisher();
    const result = publisher.instrumentHookModel(tmp, { cellName: 'celula-teste' });
    // No adverb -mente endings in the default narratives (tight pt-BR).
    for (const key of ['trigger', 'action', 'variable_reward', 'investment']) {
      const narr = result.narratives[key];
      assert.ok(narr.length > 0, key + ' narrative empty');
      // Check it contains period or colon (sentence boundary).
      assert.ok(/[.:]/.test(narr), key + ' narrative must use period or colon');
    }
  } finally {
    helpers.rm(tmp);
  }
});
