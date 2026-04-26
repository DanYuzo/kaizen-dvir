'use strict';

/**
 * test-orphan-warning.js — orphan .md files under the cell folder are
 * reported as warnings but never deleted (D.5 — WARN-only policy).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('orphan .md file in specialists folder is preserved and reported', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    // Pre-create a stale specialist that does NOT exist in the manifest.
    const specialistsDir = path.join(claudeDir, 'Kaizen', 'Yotzer');
    fs.mkdirSync(specialistsDir, { recursive: true });
    const stalePath = path.join(specialistsDir, 'stale-agent.md');
    const staleContent =
      '---\ndescription: "stale"\n---\n\n# Stale specialist (expert custom)\n';
    fs.writeFileSync(stalePath, staleContent, 'utf8');

    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);

    // The stale file must STILL exist on disk (no auto-delete).
    assert.ok(H.fileExists(stalePath), 'orphan file must be preserved on disk');
    assert.strictEqual(
      H.readFileUtf8(stalePath),
      staleContent,
      'orphan file content must NOT be modified'
    );

    // A pt-BR warning naming the orphan must be present.
    assert.ok(
      result.warnings.some((w) => /Skill orfa detectada/.test(w) && /stale-agent\.md/.test(w)),
      'warnings must name the orphan file; got: ' + JSON.stringify(result.warnings)
    );

    // Expected files were still written.
    assert.strictEqual(result.entryWritten, true);
    assert.strictEqual(result.specialistsWritten.length, 9);
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('non-chief specialist persona missing produces a warning, not a throw', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    // Remove a non-chief persona to trigger the soft-failure path.
    const removed = path.join(cellRoot, 'agents', 'publisher.md');
    fs.unlinkSync(removed);

    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);

    assert.strictEqual(result.entryWritten, true);
    assert.ok(
      result.specialistsWritten.includes('publisher'),
      'helper must still emit a publisher.md skill referencing the missing persona'
    );
    assert.ok(
      result.warnings.some(
        (w) => /Persona do especialista ausente/.test(w) && /publisher/.test(w)
      ),
      'warnings must name the missing persona; got: ' + JSON.stringify(result.warnings)
    );
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});
