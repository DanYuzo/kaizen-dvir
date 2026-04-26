'use strict';

/**
 * test-init-idempotent-skills.js — running `kaizen init` twice in the same
 * directory produces zero filesystem changes to the registered skill files.
 *
 * Story:  M8.3 — wire kaizen init to register cell skills
 * Traces: AC line 82 (idempotency), inherits M8.2 helper idempotency
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

const SKILL_FILES = [
  'Kaizen/Yotzer.md',
  'Kaizen/Yotzer/archaeologist.md',
  'Kaizen/Yotzer/chief.md',
  'Kaizen/Yotzer/contract-builder.md',
  'Kaizen/Yotzer/prioritizer.md',
  'Kaizen/Yotzer/progressive-systemizer.md',
  'Kaizen/Yotzer/publisher.md',
  'Kaizen/Yotzer/risk-mapper.md',
  'Kaizen/Yotzer/stress-tester.md',
  'Kaizen/Yotzer/task-granulator.md',
];

function snapshotSkills(targetRoot) {
  const out = {};
  for (const rel of SKILL_FILES) {
    const abs = path.join(targetRoot, '.claude', 'commands', rel);
    const stat = fs.statSync(abs);
    const content = fs.readFileSync(abs);
    out[rel] = {
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      sha: require('node:crypto').createHash('sha256').update(content).digest('hex'),
    };
  }
  return out;
}

test('M8.3: re-running kaizen init does not rewrite skill files (idempotent)', () => {
  const tmp = H.mkTmp('idem');
  try {
    const first = H.runInit(tmp);
    assert.strictEqual(first.status, 0, 'first init exits 0; stderr=' + first.stderr);
    const before = snapshotSkills(tmp);

    const second = H.runInit(tmp);
    assert.strictEqual(second.status, 0, 'second init exits 0; stderr=' + second.stderr);
    const after = snapshotSkills(tmp);

    for (const rel of SKILL_FILES) {
      assert.strictEqual(
        after[rel].sha,
        before[rel].sha,
        rel + ': content hash changed across runs'
      );
      assert.strictEqual(
        after[rel].size,
        before[rel].size,
        rel + ': size changed across runs'
      );
      // mtime must NOT advance — helper short-circuits on byte-equal content.
      assert.strictEqual(
        after[rel].mtimeMs,
        before[rel].mtimeMs,
        rel + ': mtime advanced — helper rewrote unchanged content'
      );
    }
  } finally {
    H.rmTmp(tmp);
  }
});
