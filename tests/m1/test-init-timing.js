'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 1: init completes in under 5 seconds (CI-generous ceiling).

test('kaizen init completes under 5 seconds on a clean dir (AC 1 budget)', () => {
  const tmp = mkTmp('timing');
  try {
    const started = Date.now();
    const result = runInit(tmp);
    const elapsed = Date.now() - started;
    assert.strictEqual(result.status, 0, 'exit 0');
    assert.ok(elapsed < 5000, 'init took ' + elapsed + 'ms — exceeds 5000ms budget');
  } finally {
    rmTmp(tmp);
  }
});
