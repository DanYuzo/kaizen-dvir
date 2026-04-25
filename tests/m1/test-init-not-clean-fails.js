'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 4: fails with pt-BR actionable error when the target has a customized
// scaffold file that would be overwritten. Idempotent re-runs over canonical
// content must still pass (covered by test-init-idempotent.js).

test('kaizen init refuses to overwrite a user-modified scaffold file (AC 4)', () => {
  const tmp = mkTmp('dirty');
  try {
    // Seed with a customized commandments.md at the exact scaffold path.
    fs.mkdirSync(path.join(tmp, '.kaizen-dvir'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.kaizen-dvir', 'commandments.md'),
      '# customização do expert — não sobrescrever\n'
    );

    const result = runInit(tmp);
    assert.notStrictEqual(result.status, 0, 'should exit non-zero');
    assert.match(result.stderr, /não está limpo/i, 'pt-BR not-clean marker');
    assert.match(result.stderr, /commandments\.md/, 'lists the conflicting path');
    assert.match(result.stderr, /Remova ou renomeie/, 'actionable pt-BR guidance');

    // Verify the user content was NOT overwritten.
    const preserved = fs.readFileSync(
      path.join(tmp, '.kaizen-dvir', 'commandments.md'),
      'utf8'
    );
    assert.match(preserved, /customização do expert/, 'user content preserved');
  } finally {
    rmTmp(tmp);
  }
});
