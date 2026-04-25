'use strict';

// AC 3, AC 9: artifact over the 500-token ceiling rejected with pt-BR error
// naming the field that contributed most to the overflow (FR-008,
// AC-103 prerequisite, R-010, M3.2-R1 mitigation).
//
// Also exercises token-counter behavior to lock the heuristic against drift
// (M3.2-R1).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate, requireFresh } = helpers;

const tokenCounter = requireFresh(helpers.TOKEN_COUNTER_PATH);

test('token-counter is deterministic and safe on empty input (AC 9)', () => {
  assert.strictEqual(tokenCounter.count(''), 0, 'empty string -> 0');
  assert.strictEqual(tokenCounter.count(null), 0, 'null -> 0');
  assert.strictEqual(tokenCounter.count(undefined), 0, 'undefined -> 0');
  assert.strictEqual(tokenCounter.count('   \n  \t  '), 0, 'whitespace only -> 0');
  // Determinism: same input twice -> same count.
  const sample = 'handoff:\n  from: "x"\n  to: "y"\n';
  assert.strictEqual(tokenCounter.count(sample), tokenCounter.count(sample));
});

test('token-counter scales monotonically with content', () => {
  const small = tokenCounter.count('a b c');
  const large = tokenCounter.count('a b c d e f g h i j');
  assert.ok(large > small, 'more words -> higher count');
});

test('artifact within 500-token ceiling is accepted (AC 3 baseline)', () => {
  const tmp = mkTmp('within');
  try {
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    assert.ok(result.tokenCount <= engine.TOKEN_CEILING, 'baseline payload < 500 tokens, got ' + result.tokenCount);
  } finally {
    rmTmp(tmp);
  }
});

test('over-budget artifact is rejected with pt-BR error citing heaviest field (AC 3, FR-008, R-010)', () => {
  const tmp = mkTmp('overflow');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    // Schema caps: decisions <=5, files_modified <=10, blockers <=3. Item
    // values are unbounded — we balloon list-item content with many
    // whitespace-separated words so the token-counter (whitespace split +
    // structural overhead per non-empty line) crosses the 500 ceiling.
    //
    // files_modified is the natural place to stress (largest cap = 10).
    // Each entry is a long, space-padded "decision rationale" sentence that
    // a real cell would never write — exactly the situation the gate is
    // designed to catch (R-010 — authors pushed to keep handoffs compact).
    // Each entry contributes ~50 word tokens; 10 entries -> ~500 from
    // words alone, plus structural overhead pushes us safely over 500.
    const longSentence = (
      'lorem ipsum dolor sit amet consectetur adipiscing elit sed do ' +
      'eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ' +
      'ad minim veniam quis nostrud exercitation ullamco laboris nisi ut ' +
      'aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit'
    );
    args.filesModified = [];
    for (let i = 0; i < 10; i++) {
      args.filesModified.push(longSentence + ' item-' + i);
    }
    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw on over-budget payload');
    assert.strictEqual(caught.code, 'HANDOFF_OVER_BUDGET');
    assert.ok(/excede 500 tokens/.test(caught.message), 'pt-BR ceiling phrase: ' + caught.message);
    assert.ok(/files_modified/.test(caught.message), 'message names heaviest field: ' + caught.message);
    assert.ok(typeof caught.tokens === 'number' && caught.tokens > 500, 'attached tokens count');
    assert.strictEqual(caught.field, 'files_modified', 'field attribute names files_modified');
  } finally {
    rmTmp(tmp);
  }
});
