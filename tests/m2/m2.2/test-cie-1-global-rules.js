'use strict';

// AC 3, 6: CIE-1 loads `.kaizen-dvir/instructions/*.md` in alphabetical order.
// When the directory is empty or absent, CIE-1 is a silent no-op — no log,
// no warning.

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

const INSTRUCTIONS_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'instructions'
);

function resetDir() {
  // The instructions/ directory is expected to exist (M1 scaffold). We only
  // touch its contents — never delete the directory itself.
  if (!fs.existsSync(INSTRUCTIONS_DIR)) {
    fs.mkdirSync(INSTRUCTIONS_DIR, { recursive: true });
  }
  for (const name of fs.readdirSync(INSTRUCTIONS_DIR)) {
    const full = path.join(INSTRUCTIONS_DIR, name);
    // Skip nested dirs to be safe; only remove our test fixtures (.md).
    const st = fs.statSync(full);
    if (st.isFile() && name.endsWith('.md')) {
      fs.unlinkSync(full);
    }
  }
}

test('CIE-1 is a silent no-op when instructions/ is empty (AC 3)', () => {
  const tmp = mkTmpLogs('cie1-empty');
  resetDir();
  try {
    const cie = cieFresh();
    const result = cie.injectGlobalRules({ sessionId: 's-cie1-empty' });
    assert.strictEqual(result.layer, 'CIE-1');
    assert.strictEqual(result.payload, '');
    assert.deepStrictEqual(result.warnings, []);
    assert.deepStrictEqual(
      readLogFiles(tmp),
      [],
      'empty directory must not emit any log entry'
    );
  } finally {
    resetDir();
    rmTmp(tmp);
  }
});

test('CIE-1 loads .md files in alphabetical order (AC 3, AC 6)', () => {
  const tmp = mkTmpLogs('cie1-load');
  resetDir();
  try {
    // Seed deliberately out of alphabetical creation order.
    fs.writeFileSync(
      path.join(INSTRUCTIONS_DIR, 'zeta.md'),
      '# zeta\nregra zeta',
      'utf8'
    );
    fs.writeFileSync(
      path.join(INSTRUCTIONS_DIR, 'alpha.md'),
      '# alpha\nregra alpha',
      'utf8'
    );
    fs.writeFileSync(
      path.join(INSTRUCTIONS_DIR, 'mid.md'),
      '# mid\nregra mid',
      'utf8'
    );

    const cie = cieFresh();
    const result = cie.injectGlobalRules({ sessionId: 's-cie1-load' });

    assert.strictEqual(result.layer, 'CIE-1');
    assert.ok(
      result.payload.indexOf('alpha') < result.payload.indexOf('mid'),
      'alpha precedes mid in the combined payload'
    );
    assert.ok(
      result.payload.indexOf('mid') < result.payload.indexOf('zeta'),
      'mid precedes zeta in the combined payload'
    );
    assert.deepStrictEqual(result.warnings, []);
    assert.deepStrictEqual(
      readLogFiles(tmp),
      [],
      'happy path emits no log entry'
    );
  } finally {
    resetDir();
    rmTmp(tmp);
  }
});

test('CIE-1 ignores non-.md files (AC 3)', () => {
  const tmp = mkTmpLogs('cie1-filter');
  resetDir();
  try {
    fs.writeFileSync(
      path.join(INSTRUCTIONS_DIR, 'note.txt'),
      'nao e markdown',
      'utf8'
    );
    fs.writeFileSync(
      path.join(INSTRUCTIONS_DIR, 'rule.md'),
      '# rule\nvalid',
      'utf8'
    );
    const cie = cieFresh();
    const result = cie.injectGlobalRules({ sessionId: 's-cie1-filter' });
    assert.ok(result.payload.includes('valid'));
    assert.ok(!result.payload.includes('nao e markdown'));
  } finally {
    resetDir();
    rmTmp(tmp);
  }
});
