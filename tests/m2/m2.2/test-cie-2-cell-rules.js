'use strict';

// AC 4, 6: CIE-2 loads cell-specific rules when `sessionCtx.activeCell` is
// set. Silent no-op when no cell is active or the cell directory is missing.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmpLogs,
  rmTmp,
  cieFresh,
  readLogFiles,
  PROJECT_ROOT,
} = require('./_helpers');

const CELULAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');
const TEST_CELL = 'm2_2_test_cell';
const CELL_RULES_DIR = path.join(CELULAS_DIR, TEST_CELL, 'rules');

function cleanup() {
  const full = path.join(CELULAS_DIR, TEST_CELL);
  try {
    fs.rmSync(full, { recursive: true, force: true });
  } catch (_) {
    /* best-effort */
  }
}

test('CIE-2 is a silent no-op when no cell is active (AC 4)', () => {
  const tmp = mkTmpLogs('cie2-noop-null');
  try {
    const cie = cieFresh();
    const result = cie.injectCellRules({ sessionId: 's-cie2-null' });
    assert.strictEqual(result.layer, 'CIE-2');
    assert.strictEqual(result.payload, '');
    assert.deepStrictEqual(result.warnings, []);
    assert.deepStrictEqual(readLogFiles(tmp), []);
  } finally {
    rmTmp(tmp);
  }
});

test('CIE-2 silent no-op when activeCell is set but rules dir missing (AC 4)', () => {
  const tmp = mkTmpLogs('cie2-noop-missing');
  cleanup();
  try {
    const cie = cieFresh();
    const result = cie.injectCellRules({
      sessionId: 's-cie2-missing',
      activeCell: TEST_CELL,
    });
    assert.strictEqual(result.payload, '');
    assert.deepStrictEqual(result.warnings, []);
    assert.deepStrictEqual(
      readLogFiles(tmp),
      [],
      'missing cell rules dir must not log'
    );
  } finally {
    cleanup();
    rmTmp(tmp);
  }
});

test('CIE-2 loads cell rules in alphabetical order when active (AC 4)', () => {
  const tmp = mkTmpLogs('cie2-load');
  cleanup();
  fs.mkdirSync(CELL_RULES_DIR, { recursive: true });
  fs.writeFileSync(path.join(CELL_RULES_DIR, 'b.md'), '# b rule', 'utf8');
  fs.writeFileSync(path.join(CELL_RULES_DIR, 'a.md'), '# a rule', 'utf8');
  try {
    const cie = cieFresh();
    const result = cie.injectCellRules({
      sessionId: 's-cie2-load',
      activeCell: TEST_CELL,
    });
    assert.strictEqual(result.layer, 'CIE-2');
    assert.ok(result.payload.includes('a rule'));
    assert.ok(result.payload.includes('b rule'));
    assert.ok(
      result.payload.indexOf('a rule') < result.payload.indexOf('b rule'),
      'a precedes b'
    );
    assert.deepStrictEqual(result.warnings, []);
  } finally {
    cleanup();
    rmTmp(tmp);
  }
});

test('CIE-2 accepts empty-string activeCell as "no cell" (AC 4)', () => {
  const tmp = mkTmpLogs('cie2-empty-str');
  try {
    const cie = cieFresh();
    const result = cie.injectCellRules({
      sessionId: 's-cie2-empty-str',
      activeCell: '   ',
    });
    assert.strictEqual(result.payload, '');
    assert.deepStrictEqual(result.warnings, []);
  } finally {
    rmTmp(tmp);
  }
});
