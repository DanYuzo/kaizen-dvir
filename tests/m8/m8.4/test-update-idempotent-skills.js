'use strict';

/**
 * test-update-idempotent-skills.js — running `kaizen update` twice with an
 * unchanged canonical produces zero filesystem changes to skill files.
 *
 * Strategy: build a canonical at v1.5.0 with NO mutations, run update once
 * (1.4.0 → 1.5.0), then build another canonical at v1.6.0 (still unmuted),
 * run update again (1.5.0 → 1.6.0). Skill files must have identical
 * content + size + mtime across all three states.
 *
 * Story:  M8.4 — wire kaizen update to re-register cell skills
 * Traces: AC line 86 (idempotency from M8.2 propagated to update)
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const H = require('./_helpers.js');

test('M8.4: re-running update keeps skill files byte-identical (idempotent)', () => {
  const project = H.mkProject('idem');
  const canon15 = H.mkCanonical({ label: 'idem-1', toVersion: '1.5.0' });
  const canon16 = H.mkCanonical({ label: 'idem-2', toVersion: '1.6.0' });
  try {
    // Snapshot after init (skills already registered by init via the
    // shared helper).
    const afterInit = H.snapshotSkills(project);

    // Update 1: 1.4.0 -> 1.5.0
    const r1 = H.runUpdateInProc(['--canonical-root', canon15], project);
    assert.equal(r1.exitCode, 0, 'update 1 must succeed; stderr=' + r1.stderr);
    const afterUpd1 = H.snapshotSkills(project);

    for (const rel of Object.keys(afterInit)) {
      assert.equal(
        afterUpd1[rel].sha,
        afterInit[rel].sha,
        rel + ': content hash changed across update 1'
      );
      assert.equal(
        afterUpd1[rel].mtimeMs,
        afterInit[rel].mtimeMs,
        rel + ': mtime advanced — helper rewrote unchanged content (update 1)'
      );
    }

    // Update 2: 1.5.0 -> 1.6.0 (still no celula mutations)
    const r2 = H.runUpdateInProc(['--canonical-root', canon16], project);
    assert.equal(r2.exitCode, 0, 'update 2 must succeed; stderr=' + r2.stderr);
    const afterUpd2 = H.snapshotSkills(project);

    for (const rel of Object.keys(afterInit)) {
      assert.equal(
        afterUpd2[rel].sha,
        afterInit[rel].sha,
        rel + ': content hash changed across update 2'
      );
      assert.equal(
        afterUpd2[rel].mtimeMs,
        afterInit[rel].mtimeMs,
        rel + ': mtime advanced — helper rewrote unchanged content (update 2)'
      );
    }

    // Summary must report all skills as preservadas, zero atualizadas.
    assert.match(
      r2.stdout,
      /yotzer\s+\(0\s+atualizadas,\s+\d+\s+preservadas\)/,
      'second update with no manifest change must show 0 atualizadas'
    );
  } finally {
    H.rmTmp(project);
    H.rmTmp(canon15);
    H.rmTmp(canon16);
  }
});
