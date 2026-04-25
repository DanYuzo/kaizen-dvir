'use strict';

// AC 9, AC-207: change-log-guard.validateAppendOnly emits FAIL in 100% of
// cases where a historical change-log row is rewritten or removed; emits
// PASS when the new content is the prior content plus appended rows; does
// NOT emit FAIL on whitespace-only normalization (semantic comparison).

const { test } = require('node:test');
const assert = require('node:assert');
const { requireFresh } = require('./_helpers');

function makeBody(rows) {
  return [
    '# Demo Artifact',
    '',
    '## Body',
    '',
    'irrelevant prose here.',
    '',
    '## Change Log',
    '',
    ...rows,
    '',
  ].join('\n');
}

test('PASS when new content appends rows in order (AC 9)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = makeBody(['- 2026-04-23 — @sm — criou', '- 2026-04-24 — @dev — implementou']);
  const next = makeBody([
    '- 2026-04-23 — @sm — criou',
    '- 2026-04-24 — @dev — implementou',
    '- 2026-04-25 — @qa — revisou',
  ]);
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(out.verdict, 'PASS');
  assert.strictEqual(out.issues.length, 0);
});

test('FAIL when a historical row is rewritten (AC 9, AC-207)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = makeBody(['- 2026-04-23 — @sm — criou', '- 2026-04-24 — @dev — implementou']);
  const next = makeBody([
    '- 2026-04-23 — @sm — criou agora com texto diferente',
    '- 2026-04-24 — @dev — implementou',
  ]);
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(out.verdict, 'FAIL');
  assert.ok(out.issues.length >= 1);
  assert.ok(out.issues.some((i) => i.type === 'row_modified'));
});

test('FAIL when a historical row is removed (AC 9, AC-207)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = makeBody(['- 2026-04-23 — @sm — criou', '- 2026-04-24 — @dev — implementou']);
  const next = makeBody(['- 2026-04-24 — @dev — implementou']);
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(out.verdict, 'FAIL');
  assert.ok(
    out.issues.some((i) => i.type === 'rows_removed' || i.type === 'row_modified'),
    'must flag rows_removed or row_modified'
  );
});

test('FAIL when the entire Change Log section is removed (AC 9)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = makeBody(['- 2026-04-23 — @sm — criou']);
  const next = '# Demo Artifact\n\n## Body\n\nbody only.\n';
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(out.verdict, 'FAIL');
  assert.ok(out.issues.some((i) => i.type === 'section_removed'));
});

test('PASS on whitespace-only normalization of historical rows (M3.1-R3)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = makeBody(['- 2026-04-23 — @sm — criou']);
  // Same row but with extra trailing spaces and double internal spaces.
  const next = makeBody([
    '- 2026-04-23   —   @sm   —   criou   ',
    '- 2026-04-24 — @dev — implementou',
  ]);
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(
    out.verdict,
    'PASS',
    'whitespace-only edits must NOT trigger FAIL (semantic comparison)'
  );
});

test('PASS when previous body had no Change Log at all (AC 9 baseline)', () => {
  const guard = requireFresh('change-log-guard.js');
  const prev = '# Demo\n\nbody.\n';
  const next = makeBody(['- 2026-04-24 — @dev — criou']);
  const out = guard.validateAppendOnly(prev, next);
  assert.strictEqual(out.verdict, 'PASS');
});

test('check(artifactPath) keeps the M3.3 quality-gate contract', () => {
  const guard = requireFresh('change-log-guard.js');
  // Public surface for M3.3 must continue to expose `check` and BASELINE_SUFFIX.
  assert.strictEqual(typeof guard.check, 'function');
  assert.strictEqual(typeof guard.BASELINE_SUFFIX, 'string');
});
