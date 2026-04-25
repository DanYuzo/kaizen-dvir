'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 2: two consecutive runs produce equivalent state without error or corruption.

test('kaizen init is idempotent — second run exits 0 and preserves file content', () => {
  const tmp = mkTmp('idem');
  try {
    const first = runInit(tmp);
    assert.strictEqual(first.status, 0, 'first run exit 0');

    const sampleRel = '.kaizen-dvir/commandments.md';
    const sampleAbs = path.join(tmp, sampleRel);
    const beforeBytes = fs.readFileSync(sampleAbs);
    const beforeMtime = fs.statSync(sampleAbs).mtimeMs;

    const second = runInit(tmp);
    assert.strictEqual(second.status, 0, 'second run exit 0');

    const afterBytes = fs.readFileSync(sampleAbs);
    assert.ok(Buffer.compare(beforeBytes, afterBytes) === 0, 'content preserved');

    // Idempotent skip: second run should NOT re-write identical files.
    const afterMtime = fs.statSync(sampleAbs).mtimeMs;
    assert.strictEqual(afterMtime, beforeMtime, 'mtime unchanged (skipped, not rewritten)');
  } finally {
    rmTmp(tmp);
  }
});
