'use strict';

// AC 1: Two different cells boot independently. Cell A booted does NOT
// cause cell B to be treated as booted. Both land in the state file under
// their own keys.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const {
  mkTmp,
  rmTmp,
  seedFixtureCell,
  clearFixtureCell,
  cieFresh,
} = require('./_helpers');

test('cell A booted does not affect cell B boot state', () => {
  const tmp = mkTmp('different-cells');
  const cellA = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# readme A' },
  ]);
  const cellB = seedFixtureCell('test-cell-b', [
    { path: 'README.md', content: '# readme B' },
    { path: 'MEMORY.md', content: 'memoria B' },
  ]);
  try {
    const cie = cieFresh();

    const rA = cie.cie3Boot({
      sessionId: 's-AB',
      prompt: '/Kaizen:' + cellA.cellName,
    });
    assert.ok(rA.payload.includes('# readme A'));
    assert.strictEqual(cie.hasBooted(cellA.cellName), true);
    assert.strictEqual(
      cie.hasBooted(cellB.cellName),
      false,
      'cell B stays unbooted after cell A boots'
    );

    const rB = cie.cie3Boot({
      sessionId: 's-AB',
      prompt: '/Kaizen:' + cellB.cellName,
    });
    assert.ok(rB.payload.includes('# readme B'));
    assert.ok(rB.payload.includes('memoria B'));
    assert.strictEqual(cie.hasBooted(cellA.cellName), true);
    assert.strictEqual(cie.hasBooted(cellB.cellName), true);

    // State file has both entries with distinct booted_at values.
    const state = JSON.parse(
      fs.readFileSync(process.env.KAIZEN_BOOTED_CELLS_FILE, 'utf8')
    );
    assert.ok(state[cellA.cellName]);
    assert.ok(state[cellB.cellName]);
    assert.ok(state[cellA.cellName].booted_at);
    assert.ok(state[cellB.cellName].booted_at);

    // Re-prompt for cell A — still skipped even after cell B booted.
    const rAAgain = cie.cie3Boot({
      sessionId: 's-AB',
      prompt: '/Kaizen:' + cellA.cellName,
    });
    assert.strictEqual(rAAgain.payload, '');
  } finally {
    clearFixtureCell(cellA);
    clearFixtureCell(cellB);
    rmTmp(tmp);
  }
});
