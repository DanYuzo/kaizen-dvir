'use strict';

// AC 1 / NFR-003: validation of a well-formed manifest completes under
// 500ms per iteration; p95 under 500ms over 10 iterations. Use
// process.hrtime.bigint for nanosecond precision — Date.now() is too
// coarse for this NFR.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  loadSchema,
  validatorFresh,
  validManifestObject,
} = require('./_helpers');

function _percentile(sortedMs, p) {
  if (sortedMs.length === 0) return 0;
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

test('schema validation under 500ms per iteration; p95 under 500ms (AC 1, NFR-003)', () => {
  const schema = loadSchema();
  const { validate } = validatorFresh();
  const manifest = validManifestObject();
  const iterations = 10;
  const timesMs = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const result = validate(schema, manifest);
    const end = process.hrtime.bigint();
    assert.strictEqual(result.valid, true, 'valid manifest must pass on iteration ' + i);
    const ms = Number(end - start) / 1e6;
    timesMs.push(ms);
  }

  // Cold-iteration (index 0) reported separately for tuning visibility.
  const cold = timesMs[0];
  const sorted = timesMs.slice().sort((a, b) => a - b);
  const p95 = _percentile(sorted, 95);
  const max = Math.max(...timesMs);

  // Make measurements visible in test output without Node throwing on warn-only emits.
  process.stdout.write(
    'schema-timing  cold=' + cold.toFixed(3) + 'ms  p95=' + p95.toFixed(3) +
      'ms  max=' + max.toFixed(3) + 'ms\n'
  );

  for (let i = 0; i < iterations; i++) {
    assert.ok(
      timesMs[i] < 500,
      'iteration ' + i + ' took ' + timesMs[i].toFixed(3) + 'ms; budget 500ms'
    );
  }
  assert.ok(p95 < 500, 'p95 ' + p95.toFixed(3) + 'ms exceeds 500ms budget');
});
