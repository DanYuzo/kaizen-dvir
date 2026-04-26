'use strict';

/**
 * test-idempotent.js — registerCellSkills produces zero net writes on
 * a second run with identical inputs (byte-equal idempotency, AC).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

function snapshotMtimes(dir) {
  const out = {};
  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.isFile()) {
        const stat = fs.statSync(full);
        out[full] = { mtimeMs: stat.mtimeMs, size: stat.size };
      }
    }
  }
  walk(dir);
  return out;
}

test('registerCellSkills is idempotent — second run does not rewrite files', async () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    const { registerCellSkills } = H.loadRegistry();
    registerCellSkills(cellRoot, claudeDir);

    const before = snapshotMtimes(claudeDir);
    assert.ok(Object.keys(before).length >= 10,
      'expected at least 10 generated files (entry + 9 specialists)');

    // Sleep a hair to ensure mtime granularity would differ if we wrote.
    await new Promise((r) => setTimeout(r, 50));

    const result2 = registerCellSkills(cellRoot, claudeDir);
    assert.strictEqual(result2.entryWritten, true);
    assert.strictEqual(result2.warnings.length, 0,
      'no warnings on second run; got: ' + JSON.stringify(result2.warnings));

    const after = snapshotMtimes(claudeDir);
    assert.deepStrictEqual(
      Object.keys(after).sort(),
      Object.keys(before).sort(),
      'no files added or removed on second run'
    );
    for (const f of Object.keys(before)) {
      assert.strictEqual(
        after[f].mtimeMs,
        before[f].mtimeMs,
        'mtime unchanged for ' + f + ' (idempotency requires zero writes)'
      );
      assert.strictEqual(
        after[f].size,
        before[f].size,
        'size unchanged for ' + f
      );
    }
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('registerCellSkills rewrites only the file whose desired content changed', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    const { registerCellSkills } = H.loadRegistry();
    registerCellSkills(cellRoot, claudeDir);

    // Pre-existing identical file should NOT be rewritten on next call.
    const archPath = path.join(claudeDir, 'Kaizen', 'Yotzer', 'archaeologist.md');
    const original = fs.readFileSync(archPath, 'utf8');
    // Mutate the file on disk to simulate drift.
    fs.writeFileSync(archPath, original + '\n<!-- expert customization -->\n');
    const tampered = fs.statSync(archPath);

    registerCellSkills(cellRoot, claudeDir);

    // Helper must overwrite tampered file back to canonical content
    // (idempotency is content-based: desired === current).
    const restored = fs.readFileSync(archPath, 'utf8');
    assert.strictEqual(
      restored,
      original,
      'helper must rewrite drifted file back to canonical content'
    );
    const restat = fs.statSync(archPath);
    assert.notStrictEqual(
      restat.mtimeMs,
      tampered.mtimeMs,
      'mtime must have moved since the helper rewrote the file'
    );
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});
