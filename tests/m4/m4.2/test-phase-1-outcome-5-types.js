'use strict';

// AC 2 — F1 accepts outcome in one of the 5 types (problema, desejo,
// melhoria, mapeamento, automacao); rejects outcomes outside the 5 types.
// Also verifies the phrasing sample "reduzo em 60% o tempo de X" is
// accepted as a measurable outcome.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

const FIVE_TYPES = ['problema', 'desejo', 'melhoria', 'mapeamento', 'automacao'];

test('phase-1-objective.md declares the 5 accepted outcome types (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_1_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  const types = Array.isArray(frontmatter.outcome_types) ? frontmatter.outcome_types : [];
  assert.strictEqual(types.length, 5, 'expected exactly 5 outcome types');
  for (const t of FIVE_TYPES) {
    assert.ok(types.includes(t), 'missing outcome type: ' + t);
  }
});

test('phase-1 reject message guides correction in pt-BR for out-of-type outcome (AC 2, NFR-101)', () => {
  const raw = helpers.readFileText(helpers.PHASE_1_TASK);
  assert.ok(
    raw.includes('5 tipos') || raw.includes('cinco tipos'),
    'phase-1 must mention the 5 outcome types in its reject copy'
  );
  assert.ok(
    raw.includes('reformule'),
    'reject message must guide correction ("reformule")'
  );
});

test('ost-writer accepts the 5 accepted outcome types and rejects invalid shape', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('five-types');
  try {
    // Accept each of the 5 types for writeRoot.
    for (const type of FIVE_TYPES) {
      // Fresh cell path per iteration — writeRoot overwrites.
      const result = ostWriter.writeRoot(cell, {
        type: type,
        description: 'reduzo em 60% o tempo de X',
      });
      assert.ok(result.ostPath.endsWith('OST.md'));
      assert.strictEqual(result.outcome.type, type);
      assert.ok(/\d+%/u.test(result.outcome.description));
    }
    // Reject invalid outcome shape — missing description.
    assert.throws(
      () => ostWriter.writeRoot(cell, { type: 'melhoria' }),
      /description/u
    );
    // Reject invalid outcome shape — missing type.
    assert.throws(
      () => ostWriter.writeRoot(cell, { description: 'reduzo em 60% o tempo de X' }),
      /type/u
    );
  } finally {
    helpers.rm(cell);
  }
});

test('measurable phrasing "reduzo em 60% o tempo de X" is accepted (AC 2)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('measurable');
  try {
    const result = ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo em 60% o tempo de X',
    });
    const ost = helpers.readFileText(result.ostPath);
    assert.ok(ost.includes('reduzo em 60%'));
    assert.ok(ost.includes('melhoria'));
  } finally {
    helpers.rm(cell);
  }
});
