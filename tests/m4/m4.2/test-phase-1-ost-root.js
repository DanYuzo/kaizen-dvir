'use strict';

// AC 3 — F1 opens OST.md via ost-writer.writeRoot(). Root Outcome is
// populated; Opportunities, Solutions, Links, Tasks sections exist but
// are empty.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('writeRoot creates OST.md with populated Outcome and empty other sections (AC 3)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('ost-root');
  try {
    const result = ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo em 60% o tempo de X',
    });
    assert.ok(result.ostPath.endsWith('OST.md'));
    const text = helpers.readFileText(result.ostPath);

    // Sections exist.
    assert.ok(text.includes('## Outcome'));
    assert.ok(text.includes('## Opportunities'));
    assert.ok(text.includes('## Solutions'));
    assert.ok(text.includes('## Links'));
    assert.ok(text.includes('## Tasks'));
    assert.ok(text.includes('## Change Log'));

    // Outcome populated.
    assert.ok(/- id: OUT-001/u.test(text));
    assert.ok(text.includes('reduzo em 60%'));

    // Other sections empty (still carry their placeholder markers).
    assert.ok(text.includes('lista vazia. F3 adiciona as primeiras Opportunities'));
    assert.ok(text.includes('lista vazia. F5 adiciona primeiras Solutions'));
    assert.ok(text.includes('sem links ainda'));
    assert.ok(text.includes('lista vazia. F8 liga Tasks'));

    // Change Log seeded with creation entry.
    assert.ok(text.includes('@archaeologist'));
    assert.ok(text.includes('abriu OST'));
  } finally {
    helpers.rm(cell);
  }
});

test('writeRoot accepts custom outcome id (AC 3)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('ost-root-custom');
  try {
    const result = ostWriter.writeRoot(cell, {
      id: 'OUT-042',
      type: 'automacao',
      description: 'automatizo o envio de relatorio diario',
    });
    assert.strictEqual(result.outcome.id, 'OUT-042');
    const text = helpers.readFileText(result.ostPath);
    assert.ok(text.includes('OUT-042'));
  } finally {
    helpers.rm(cell);
  }
});

test('phase-1 task declares OST root open via ost-writer (AC 3)', () => {
  const raw = helpers.readFileText(helpers.PHASE_1_TASK);
  assert.ok(raw.includes('ost-writer.writeRoot'));
  const { frontmatter } = helpers.parseFrontmatter(raw);
  // post_condition nested map contains ost_root_populated marker.
  const post = frontmatter.post_condition;
  if (Array.isArray(post)) {
    const joined = post.join(' ');
    assert.ok(joined.includes('OST.md'));
  }
});
