'use strict';

/**
 * test-update-warnings-surfaced.js — when an orphan skill file lives under
 * `.claude/commands/Kaizen/Yotzer/`, the post-update summary surfaces a
 * pt-BR WARN naming the file and tagged with the cell name.
 *
 * Strategy: init the project, plant an orphan `.md` in the skills folder,
 * run update against an unchanged canonical. The helper's M8.2 orphan
 * detection emits a pt-BR warning ("Skill orfa detectada em ...") which
 * the update orchestrator must echo into the user-facing summary.
 *
 * Story:  M8.4 — wire kaizen update to re-register cell skills
 * Traces: AC line 83 (orphan WARN, no auto-delete), NFR-101
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.4: update surfaces orphan WARN in pt-BR and does NOT delete the orphan', () => {
  const project = H.mkProject('warn');
  const canonical = H.mkCanonical({ label: 'warn', toVersion: '1.5.0' });
  try {
    const orphan = path.join(
      project,
      '.claude', 'commands', 'Kaizen', 'Yotzer', 'orphan-stale.md'
    );
    fs.writeFileSync(orphan, '---\ndescription: "stale"\n---\n# stale\n', 'utf8');
    assert.ok(fs.existsSync(orphan), 'orphan pre-created');

    const result = H.runUpdateInProc(
      ['--canonical-root', canonical],
      project
    );
    assert.equal(result.exitCode, 0, 'update must succeed; stderr=' + result.stderr);

    assert.match(
      result.stdout,
      /Avisos durante registro de skills:/,
      'pt-BR warnings header must be present'
    );
    assert.match(
      result.stdout,
      /\[yotzer\]/,
      'warning must be tagged with the cell name'
    );
    assert.match(
      result.stdout,
      /Skill orfa detectada/,
      'pt-BR orphan message from M8.2 helper must be quoted verbatim'
    );
    assert.match(
      result.stdout,
      /orphan-stale\.md/,
      'orphan filename must appear in the warning'
    );

    // Orphan must NOT be auto-deleted (preserves expert customization).
    assert.ok(
      fs.existsSync(orphan),
      'orphan file must remain on disk after update'
    );
  } finally {
    H.rmTmp(project);
    H.rmTmp(canonical);
  }
});
