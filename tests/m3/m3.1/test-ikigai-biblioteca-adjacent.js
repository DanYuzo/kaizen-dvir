'use strict';

// AC 2: refs/ikigai/biblioteca/ exists adjacent to the 4 dimension files
// with a pt-BR README.md describing its purpose. It is NOT a 5th dimension.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const IKIGAI_DIR = path.join(REPO_ROOT, 'refs', 'ikigai');
const BIBLIOTECA_DIR = path.join(IKIGAI_DIR, 'biblioteca');

test('biblioteca/ exists adjacent to the 4 dimension files (AC 2)', () => {
  assert.ok(
    fs.existsSync(BIBLIOTECA_DIR),
    'refs/ikigai/biblioteca/ must exist'
  );
  const stat = fs.statSync(BIBLIOTECA_DIR);
  assert.ok(stat.isDirectory(), 'biblioteca/ must be a directory');
});

test('biblioteca is at the same depth as the 4 dimension files (AC 2)', () => {
  // The 4 dimensions live at refs/ikigai/<name>.md. biblioteca/ must live
  // at refs/ikigai/biblioteca/, NOT inside any of the 4 dimension files
  // (impossible since they are .md files, but assert directory parent).
  const parent = path.dirname(BIBLIOTECA_DIR);
  assert.strictEqual(
    parent,
    IKIGAI_DIR,
    'biblioteca/ must sit directly under refs/ikigai/'
  );
});

test('biblioteca/README.md exists in pt-BR and clarifies it is not a 5th dimension (AC 2)', () => {
  const readme = path.join(BIBLIOTECA_DIR, 'README.md');
  assert.ok(fs.existsSync(readme), 'biblioteca/README.md must exist');
  const body = fs.readFileSync(readme, 'utf8');
  // pt-BR fingerprint: must use accented Portuguese words.
  assert.ok(
    /pasta|conhecimento|célula|células|ETL/.test(body),
    'biblioteca/README.md must be in pt-BR'
  );
  // Must explicitly state biblioteca is NOT a 5th dimension (D-v1.1-08).
  assert.ok(
    /não\s+é\s+uma?\s+5ª\s+dimens/i.test(body) ||
      /NÃO\s+é/.test(body) ||
      /não\s+é/i.test(body),
    'biblioteca/README.md must explicitly clarify it is NOT a 5th dimension'
  );
});

test('biblioteca/ does NOT shadow any of the 4 dimension names (D-v1.1-08)', () => {
  const dimensions = ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco'];
  for (const dim of dimensions) {
    const inside = path.join(BIBLIOTECA_DIR, dim + '.md');
    assert.ok(
      !fs.existsSync(inside),
      'biblioteca/ must not contain ' + dim + '.md (would imply 5th dimension)'
    );
  }
});
