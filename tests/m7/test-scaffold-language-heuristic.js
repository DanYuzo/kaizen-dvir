'use strict';

// M7.2 — pt-BR language heuristic on the CLAUDE.md scaffold body.
//
// Approach: check for a minimum density of pt-BR stop-words AND check that
// no obvious English-only paragraph slipped in. This is a heuristic, not a
// proof — M7.5's full language audit test is the authoritative gate.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const scaffold = require(path.join(ROOT, 'bin', 'lib', 'claude-md-scaffold.js'));

// pt-BR markers that should appear with high density in user-facing prose.
const PT_BR_MARKERS = [
  /\bnão\b/iu,
  /\bdeve\b/iu,
  /\béum?\b/iu,
  /\bcomo\b/iu,
  /\bquando\b/iu,
  /\bquem\b/iu,
  /\bonde\b/iu,
  /\bcélula\b/iu,
  /\bagente\b/iu,
  /\bvocabulário\b/iu,
  /\bmanualmente\b/iu,
  /\bedite\b/iu,
];

// English red-flag phrases unlikely to appear in faithful pt-BR.
const EN_RED_FLAGS = [
  /\bThis is\b/u,
  /\bThe expert\b/u,
  /\bcellule\b/u, // french leak
  /\bWhich is\b/u,
  /\bdo not edit\b/iu,
  /\bWelcome to\b/iu,
];

test('scaffold contains a strong density of pt-BR markers', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  let hits = 0;
  for (const re of PT_BR_MARKERS) {
    if (re.test(body)) hits++;
  }
  assert.ok(
    hits >= 8,
    'expected at least 8 pt-BR markers, got ' + hits + ' (body may not be pt-BR)'
  );
});

test('scaffold contains no English red-flag phrases', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  for (const re of EN_RED_FLAGS) {
    assert.ok(
      !re.test(body),
      'English red-flag phrase detected in scaffold: ' + re.toString()
    );
  }
});

test('scaffold contains no v1.1/v1.3 legacy path fragments', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  // These are the path fragments that were renamed away in D-v1.4-01.
  // Note: tolerate `core/synapse` style mentions IF wrapped in code spans
  // referencing other tools — but for our scaffold, these should not appear
  // at all because we only describe KaiZen v1.4+ paths.
  // The CLAUDE.md scaffold should have zero such fragments.
  // Specifically check the high-risk ones:
  assert.ok(
    !/\/aiox-core\//u.test(body),
    'must not reference aiox-core'
  );
  assert.ok(
    !/\.bmad-core/u.test(body),
    'must not reference legacy .bmad-core'
  );
});
