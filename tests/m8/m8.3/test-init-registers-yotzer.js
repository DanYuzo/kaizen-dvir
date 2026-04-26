'use strict';

/**
 * test-init-registers-yotzer.js — `kaizen init` produces the Yotzer entry
 * skill plus 9 specialist sub-skills under `.claude/commands/Kaizen/`.
 *
 * Story:  M8.3 — wire kaizen init to register cell skills
 * Traces: AC line 79-80 (entry + sub-skills exist), FR-047, AC-025 setup
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const H = require('./_helpers.js');

const EXPECTED_AGENTS = [
  'archaeologist',
  'chief',
  'contract-builder',
  'prioritizer',
  'progressive-systemizer',
  'publisher',
  'risk-mapper',
  'stress-tester',
  'task-granulator',
];

test('M8.3: init writes .claude/commands/Kaizen/Yotzer.md (entry skill)', () => {
  const tmp = H.mkTmp('entry');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(
      result.status,
      0,
      'init exits 0; stderr=' + result.stderr
    );
    const entryPath = path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md');
    assert.ok(H.fileExists(entryPath), 'entry skill file must exist at Kaizen/Yotzer.md');
  } finally {
    H.rmTmp(tmp);
  }
});

test('M8.3: init writes 9 specialist sub-skills under Kaizen/Yotzer/', () => {
  const tmp = H.mkTmp('specialists');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(result.status, 0, 'init exits 0; stderr=' + result.stderr);

    const subDir = path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer');
    const files = H.listDirFiles(subDir);
    const expected = EXPECTED_AGENTS.map((a) => a + '.md').sort();
    assert.deepStrictEqual(
      files,
      expected,
      'Kaizen/Yotzer/ must contain exactly one .md per Yotzer agent (chief included)'
    );
  } finally {
    H.rmTmp(tmp);
  }
});

test('M8.3: post-init summary lists registered skills in pt-BR (NFR-102)', () => {
  const tmp = H.mkTmp('summary');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(result.status, 0, 'init exits 0; stderr=' + result.stderr);
    // Format from AC line 81: "Skills: {cell-name} (1 entry + {N} specialists)"
    assert.match(
      result.stdout,
      /Skills:\s+yotzer\s+\(1 entry \+ \d+ specialists\)/,
      'summary must include the per-cell skills line in pt-BR'
    );
  } finally {
    H.rmTmp(tmp);
  }
});
