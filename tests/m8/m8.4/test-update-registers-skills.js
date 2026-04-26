'use strict';

/**
 * test-update-registers-skills.js — `kaizen update` re-runs registerCellSkills
 * and propagates manifest changes to `.claude/commands/Kaizen/Yotzer/`.
 *
 * Strategy: rename `risk-mapper` → `gap-finder` in the canonical celula.yaml
 * (and add a corresponding agents/gap-finder.md persona). After update, the
 * skills directory must contain `gap-finder.md` (newly written) and a pt-BR
 * orphan WARN must surface for the now-removed `risk-mapper` declaration.
 *
 * Story:  M8.4 — wire kaizen update to re-register cell skills
 * Traces: AC line 81 (re-registers after merge), FR-047, NFR-101
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.4: update propagates renamed specialist to Kaizen/Yotzer/ skills', () => {
  const project = H.mkProject('reg');
  let canonical;
  try {
    canonical = H.mkCanonical({
      label: 'reg',
      mutateCellManifest: function (manifestPath) {
        // Rename `risk-mapper` to `gap-finder` in the tier_3 list.
        let raw = fs.readFileSync(manifestPath, 'utf8');
        raw = raw.replace(/risk-mapper/g, 'gap-finder');
        fs.writeFileSync(manifestPath, raw, 'utf8');
      },
      mutateCellTree: function (cellRoot) {
        // Promote the existing risk-mapper persona to gap-finder.
        const oldPersona = path.join(cellRoot, 'agents', 'risk-mapper.md');
        const newPersona = path.join(cellRoot, 'agents', 'gap-finder.md');
        const buf = fs.readFileSync(oldPersona);
        // Sanity: rewrite the in-file references too so the persona is
        // self-consistent. This is a fixture-only edit — test cares about
        // the registrar, not the prose.
        fs.writeFileSync(
          newPersona,
          Buffer.from(buf.toString('utf8').replace(/risk-mapper/g, 'gap-finder')),
          'utf8'
        );
        // Remove the old persona on the canonical side so the update's
        // L2 walk does not transport it back into the project.
        fs.unlinkSync(oldPersona);
      },
    });

    const result = H.runUpdateInProc(
      ['--canonical-root', canonical],
      project
    );
    assert.equal(
      result.exitCode,
      0,
      'update must succeed; stderr=' + result.stderr
    );

    // The new specialist skill must now exist.
    const newSkill = path.join(
      project, '.claude', 'commands', 'Kaizen', 'Yotzer', 'gap-finder.md'
    );
    assert.ok(
      H.fileExists(newSkill),
      'new specialist skill gap-finder.md must be written by update'
    );

    // The old specialist skill (risk-mapper.md) is preserved on disk
    // (no auto-delete) but flagged as orphan in the pt-BR WARN block.
    const oldSkill = path.join(
      project, '.claude', 'commands', 'Kaizen', 'Yotzer', 'risk-mapper.md'
    );
    assert.ok(
      H.fileExists(oldSkill),
      'orphan skill risk-mapper.md must NOT be auto-deleted (preserves expert customization)'
    );

    // Summary block must list the cell with at least 1 atualizada (gap-finder).
    assert.match(
      result.stdout,
      /Skills sincronizadas:/,
      'pt-BR section header must appear'
    );
    assert.match(
      result.stdout,
      /yotzer\s+\(\d+\s+atualizadas,\s+\d+\s+preservadas\)/,
      'per-cell line must follow the M8.4 NFR-104 format'
    );

    // Orphan WARN must surface in pt-BR.
    assert.match(
      result.stdout,
      /Avisos durante registro de skills:/,
      'pt-BR warnings header must appear when orphans detected'
    );
    assert.match(
      result.stdout,
      /risk-mapper\.md/,
      'orphan filename must be named in the warning'
    );
    assert.match(
      result.stdout,
      /\[yotzer\]/,
      'warning must be tagged with the cell name'
    );
  } finally {
    H.rmTmp(project);
    H.rmTmp(canonical);
  }
});
