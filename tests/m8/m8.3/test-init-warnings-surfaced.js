'use strict';

/**
 * test-init-warnings-surfaced.js — when `registerCellSkills()` returns
 * non-empty `warnings[]`, `kaizen init` prints them in the post-init
 * summary block under a pt-BR header.
 *
 * Strategy: run init once to populate `.claude/commands/Kaizen/Yotzer/`,
 * then create an orphan `.md` file in that folder (a file the helper did
 * not produce). On the next init the helper detects the orphan, returns
 * a warning, and init must surface it in pt-BR.
 *
 * Story:  M8.3 — wire kaizen init to register cell skills
 * Traces: NFR-101 (actionable pt-BR warnings on stdout)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.3: init surfaces helper warnings in pt-BR (orphan skill detected)', () => {
  const tmp = H.mkTmp('warn');
  try {
    // First init: produce the canonical skill set.
    const first = H.runInit(tmp);
    assert.strictEqual(first.status, 0, 'first init exits 0; stderr=' + first.stderr);

    // Inject an orphan skill file the helper did not write. M8.2 detects
    // these via `readdirSync` of the specialists folder and emits a pt-BR
    // warning ("Skill orfa detectada em ...").
    const orphan = path.join(
      tmp,
      '.claude', 'commands', 'Kaizen', 'Yotzer', 'orphan-stale.md'
    );
    fs.writeFileSync(orphan, '---\ndescription: "stale"\n---\n# stale\n');
    assert.ok(fs.existsSync(orphan), 'orphan file pre-created');

    // Second init: helper detects the orphan and returns a warning. Init
    // must surface it in pt-BR under the "Avisos" header.
    const second = H.runInit(tmp);
    assert.strictEqual(
      second.status,
      0,
      'second init exits 0 (warnings are non-fatal); stderr=' + second.stderr
    );

    assert.match(
      second.stdout,
      /Avisos durante registro de skills:/,
      'summary must contain the pt-BR warnings header'
    );
    assert.match(
      second.stdout,
      /\[yotzer\]/,
      'warning must be tagged with the cell name'
    );
    assert.match(
      second.stdout,
      /Skill orfa detectada/,
      'warning text must match the M8.2 pt-BR orphan message'
    );
    assert.match(
      second.stdout,
      /orphan-stale\.md/,
      'warning must mention the orphan file name'
    );
  } finally {
    H.rmTmp(tmp);
  }
});
