'use strict';

/**
 * test-update-dry-run-skips.js — `kaizen update --dry-run` must NOT touch
 * `.claude/commands/`, even when the canonical celula.yaml has changed.
 *
 * Strategy: snapshot the skills directory after init, build a canonical
 * whose celula.yaml renames a specialist (would normally cause a write),
 * run update with `--dry-run`, snapshot again. Every file must be
 * byte-identical (same sha + same mtime).
 *
 * Story:  M8.4 — wire kaizen update to re-register cell skills
 * Traces: dry-run safety (story Deliverables § "Skip on --dry-run"),
 *         CON-005 (no L4 writes; .claude/commands is L3 but dry-run is
 *         even stricter — zero writes on disk).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.4: --dry-run does not write to .claude/commands/ even when canonical changed', () => {
  const project = H.mkProject('dry');
  const canonical = H.mkCanonical({
    label: 'dry',
    mutateCellManifest: function (manifestPath) {
      const raw = fs.readFileSync(manifestPath, 'utf8');
      // Provoke a change the registrar would normally write through.
      fs.writeFileSync(
        manifestPath,
        raw.replace(/risk-mapper/g, 'gap-finder'),
        'utf8'
      );
    },
    mutateCellTree: function (cellRoot) {
      const oldP = path.join(cellRoot, 'agents', 'risk-mapper.md');
      const newP = path.join(cellRoot, 'agents', 'gap-finder.md');
      fs.copyFileSync(oldP, newP);
      fs.unlinkSync(oldP);
    },
  });
  try {
    const before = H.snapshotSkills(project);

    const result = H.runUpdateInProc(
      ['--canonical-root', canonical, '--dry-run'],
      project
    );
    assert.equal(
      result.exitCode,
      0,
      '--dry-run must exit 0; stderr=' + result.stderr
    );

    const after = H.snapshotSkills(project);

    // Same set of files (no creations / deletions).
    assert.deepEqual(
      Object.keys(after).sort(),
      Object.keys(before).sort(),
      '--dry-run must not add or remove files under .claude/commands/Kaizen/'
    );
    for (const rel of Object.keys(before)) {
      assert.equal(
        after[rel].sha, before[rel].sha,
        rel + ': content sha changed during --dry-run'
      );
      assert.equal(
        after[rel].mtimeMs, before[rel].mtimeMs,
        rel + ': mtime advanced during --dry-run'
      );
      assert.equal(
        after[rel].size, before[rel].size,
        rel + ': size changed during --dry-run'
      );
    }

    // Summary must declare that the resync was skipped.
    assert.match(
      result.stdout,
      /modo --dry-run: registro de skills nao executado/,
      'pt-BR --dry-run notice must appear in the Skills sincronizadas block'
    );

    // gap-finder.md must NOT have been created on disk.
    const newSkill = path.join(
      project,
      '.claude', 'commands', 'Kaizen', 'Yotzer', 'gap-finder.md'
    );
    assert.ok(
      !fs.existsSync(newSkill),
      '--dry-run must not write the new specialist skill'
    );
  } finally {
    H.rmTmp(project);
    H.rmTmp(canonical);
  }
});
