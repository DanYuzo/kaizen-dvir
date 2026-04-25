'use strict';

// AC 3 (M4.5) — progressive-systemizer documents the expected_learning
// for each of the 4 tiers; missing learning triggers Quality Gate FAIL
// (FR-107).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('progressive-systemizer declares expected_learning per tier (AC 3, FR-107)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    text.includes('expected_learning'),
    'persona must declare expected_learning field'
  );
});

test('progressive-systemizer declares rationale field per tier (AC 3, FR-107)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    text.includes('rationale'),
    'persona must declare rationale field linking tier <N> to <N-1>'
  );
});

test('progressive-systemizer Quality Gate F10a declares LEARNING-PER-TIER critical (AC 3)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    /F10a-LEARNING-PER-TIER/u.test(text),
    'Quality Gate criterion F10a-LEARNING-PER-TIER must be declared critical'
  );
});

test('progressive-systemizer pt-BR error message names missing expected_learning (AC 3)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    /sem expected_learning/u.test(text),
    'pt-BR error message must mention "sem expected_learning"'
  );
});

test('progressive-systemizer ties tier <N> rationale to tier <N-1> learning (AC 3)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  // The persona must explain the chain: rationale links to the previous
  // tier's expected_learning. Look for a few keywords that document this.
  assert.ok(
    /tier anterior/u.test(text) ||
      /tier <N-1>/u.test(text) ||
      /aprendizado do tier/u.test(text),
    'persona must explain rationale ties to previous tier learning'
  );
});
