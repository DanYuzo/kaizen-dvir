'use strict';

/**
 * test-doctor-readonly.js — `kaizen doctor --cells` MUST NOT modify any
 * file under `.claude/commands/`. Verified with a recursive byte-content
 * snapshot taken before vs. after doctor runs across three fixture
 * states: clean, missing-entry, orphan-planted.
 *
 * Story: M8.6
 * Trace: Scope OUT line 105 (doctor read-only — fix is `kaizen update`
 *        or `kaizen init`).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

function _commandsDir(projectDir) {
  return path.join(projectDir, '.claude', 'commands');
}

function _runAndAssertReadOnly(projectDir, label) {
  const before = H.snapshotDir(_commandsDir(projectDir));
  const doc = H.runDoctorCells(projectDir);
  assert.strictEqual(doc.status, 0, label + ': doctor exit 0');
  const after = H.snapshotDir(_commandsDir(projectDir));
  const cmp = H.compareSnapshot(before, after);
  assert.ok(
    cmp.equal,
    label + ': .claude/commands/ must be byte-identical before/after; reason=' + cmp.reason
  );
}

test('M8.6: doctor is read-only — clean state preserves .claude/commands/', () => {
  const tmp = H.mkProject('readonly-clean');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    _runAndAssertReadOnly(tmp, 'clean');
  } finally {
    H.rmProject(tmp);
  }
});

test('M8.6: doctor is read-only — missing-entry state preserves remaining files', () => {
  const tmp = H.mkProject('readonly-missing');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    fs.unlinkSync(path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md'));
    _runAndAssertReadOnly(tmp, 'missing-entry');
  } finally {
    H.rmProject(tmp);
  }
});

test('M8.6: doctor is read-only — orphan file is NEVER removed', () => {
  const tmp = H.mkProject('readonly-orphan');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    fs.writeFileSync(
      path.join(tmp, '.claude', 'commands', 'Kaizen', 'Stale.md'),
      '# Stale skill\n',
      'utf8'
    );
    _runAndAssertReadOnly(tmp, 'orphan');
  } finally {
    H.rmProject(tmp);
  }
});
