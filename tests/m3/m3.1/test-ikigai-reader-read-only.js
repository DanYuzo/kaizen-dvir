'use strict';

// AC 8, FR-027 prerequisite: ikigai-reader.js exposes ONLY readDimension
// (and the VALID_DIMENSIONS enum). No write method on module.exports.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpIkigai, rmTmp, requireFresh } = require('./_helpers');

test('ikigai-reader module.exports has no write method (AC 8)', () => {
  const reader = requireFresh('ikigai-reader.js');
  const exported = Object.keys(reader);
  assert.deepStrictEqual(
    exported.sort(),
    ['VALID_DIMENSIONS', 'readDimension'].sort(),
    'module.exports must be exactly { readDimension, VALID_DIMENSIONS }'
  );
  // Defensive — name search.
  for (const key of exported) {
    assert.ok(
      !/write|append|mutate|update|delete|set/i.test(key),
      'no exported key may smell like a write surface: ' + key
    );
  }
});

test('readDimension rejects invalid dimension names (AC 8)', () => {
  const reader = requireFresh('ikigai-reader.js');
  assert.throws(
    () => reader.readDimension('biblioteca'),
    /dimensão inválida/
  );
  assert.throws(
    () => reader.readDimension('extra'),
    /dimensão inválida/
  );
});

test('readDimension parses sections from a real Ikigai dimension (AC 8)', () => {
  const tmp = mkTmpIkigai('parse');
  try {
    const reader = requireFresh('ikigai-reader.js');
    fs.writeFileSync(
      path.join(tmp, 'quem-sou.md'),
      [
        '# Quem sou',
        '',
        '## Identidade',
        '',
        'sou expert em algo.',
        '',
        '## Valores',
        '',
        'honestidade.',
        '',
        '## Change Log',
        '',
        '| Data | Autor | Mudança |',
        '|------|-------|---------|',
        '| 2026-04-24 | @dev | criou |',
        '',
      ].join('\n'),
      'utf8'
    );
    const out = reader.readDimension('quem-sou');
    assert.strictEqual(out.dimension, 'quem-sou');
    assert.strictEqual(out.title, 'Quem sou');
    assert.ok(out.sections.Identidade.includes('sou expert'));
    assert.ok(out.sections.Valores.includes('honestidade'));
    assert.ok('Change Log' in out.sections);
  } finally {
    rmTmp(tmp);
  }
});

test('source code does not declare any write API (AC 8 belt-and-suspenders)', () => {
  const src = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      '.kaizen-dvir',
      'dvir',
      'memory',
      'ikigai-reader.js'
    ),
    'utf8'
  );
  // No exported function name should match a write verb. The exports block
  // appears once at the bottom; assert no write verb appears as a key there.
  // Inspect the trailing module.exports literal — it should only enumerate
  // readDimension and VALID_DIMENSIONS. Use word-boundary checks so the
  // word "read" inside readDimension does not trigger a false positive.
  // Split on the actual `module.exports = {` literal to skip JSDoc mentions.
  const exportsBlock = src.split(/module\.exports\s*=\s*\{/)[1] || '';
  const writeVerbs = [
    /\bwrite\w*\b/i,
    /\bappend\w*\b/i,
    /\bmutate\w*\b/i,
    /\bupdate\w*\b/i,
    /\bdelete\w*\b/i,
    /\bset[A-Z]\w*\b/,
  ];
  for (const re of writeVerbs) {
    assert.ok(
      !re.test(exportsBlock),
      'module.exports block must not name a write surface (' + re + ')'
    );
  }
});
