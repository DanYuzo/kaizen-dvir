'use strict';

/**
 * test-update-malformed-cell-fails.js — when the canonical's bundled
 * `celula.yaml` is malformed (missing required `slashPrefix`), the update
 * propagates the malformed manifest via L2 overwrite, then aborts on the
 * skill-resync step with a non-zero exit code and a pt-BR error message
 * naming the offending cell.
 *
 * Strategy: init the project, build a canonical whose celula.yaml has its
 * `slashPrefix:` line stripped, run update. The layered policy will
 * overwrite the local manifest (L2), then the M8.4 resync step will throw
 * the M8.2 helper's pt-BR "slashPrefix obrigatorio" error.
 *
 * Story:  M8.4 — wire kaizen update to re-register cell skills
 * Traces: failure-mode (story Test Strategy § 3 + helper contract)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const H = require('./_helpers.js');

test('M8.4: update aborts non-zero with pt-BR stderr when canonical celula.yaml is malformed', () => {
  const project = H.mkProject('malformed');
  const canonical = H.mkCanonical({
    label: 'malformed',
    mutateCellManifest: function (manifestPath) {
      const original = fs.readFileSync(manifestPath, 'utf8');
      const stripped = original
        .split(/\r?\n/)
        .filter((line) => !/^\s*slashPrefix\s*:/.test(line))
        .join('\n');
      fs.writeFileSync(manifestPath, stripped, 'utf8');
    },
  });
  try {
    const result = H.runUpdateInProc(
      ['--canonical-root', canonical],
      project
    );
    assert.notEqual(
      result.exitCode,
      0,
      'update must exit non-zero on malformed cell manifest'
    );
    assert.match(
      result.stderr,
      /erro ao registrar skills das celulas:/,
      'stderr must include the pt-BR error preamble'
    );
    assert.match(
      result.stderr,
      /celula 'yotzer'/,
      'stderr must name the offending cell'
    );
    assert.match(
      result.stderr,
      /slashPrefix/,
      'stderr must mention the missing field (helper message preserved)'
    );
    assert.match(
      result.stderr,
      /Update interrompido para preservar estado consistente/,
      'stderr must declare the half-state guard in pt-BR'
    );
  } finally {
    H.rmTmp(project);
    H.rmTmp(canonical);
  }
});
