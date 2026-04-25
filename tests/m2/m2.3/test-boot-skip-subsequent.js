'use strict';

// AC 1, 7, 8: Subsequent activations of the same cell short-circuit CIE-3
// entirely. A simulated autocompact cycle (write → restore via
// `restoreBootedCellsFromSnapshot` → re-prompt) still honors the restored
// state — CIE-3 stays skipped (KZ-M2-R2 contract).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmp,
  rmTmp,
  seedFixtureCell,
  clearFixtureCell,
  cieFresh,
} = require('./_helpers');

test('second activation of the same cell skips CIE-3 (AC 1)', () => {
  const tmp = mkTmp('skip-subsequent');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# readme-a' },
  ]);
  try {
    const cie = cieFresh();
    const ctx = {
      sessionId: 's-skip',
      prompt: '/Kaizen:' + fixture.cellName,
    };

    const first = cie.cie3Boot(ctx);
    assert.ok(first.payload.length > 0, 'first activation loads boot files');

    // Delete the manifest after first boot — if CIE-3 tried to re-read,
    // it would log a missing-manifest warning. A clean skip produces no
    // disk I/O at all.
    fs.rmSync(path.join(fixture.dir, 'celula.yaml'), { force: true });

    const second = cie.cie3Boot(ctx);
    assert.strictEqual(second.payload, '', 'second activation returns empty payload');
    assert.deepStrictEqual(second.warnings, [], 'no warnings — no disk read attempted');
    assert.strictEqual(second.bootIoMs, 0, 'no disk I/O on skip');
    assert.strictEqual(second.cell, fixture.cellName);
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});

test('simulated autocompact cycle — restore keeps CIE-3 skipped (KZ-M2-R2)', () => {
  const tmp = mkTmp('compact-cycle');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# readme' },
  ]);
  try {
    const cie = cieFresh();
    const ctx = {
      sessionId: 's-cycle',
      prompt: '/Kaizen:' + fixture.cellName,
    };

    // 1. First activation — cell booted, state file populated.
    cie.cie3Boot(ctx);
    assert.strictEqual(cie.hasBooted(fixture.cellName), true);

    // 2. Simulate PreCompact writing a snapshot YAML. Shape matches what
    //    M2.4 PreCompact.buildYaml emits for `session_booted_cells`.
    const snapshotPath = path.join(tmp.state, 'precompact-20260423-140502.yaml');
    const state = JSON.parse(
      fs.readFileSync(process.env.KAIZEN_BOOTED_CELLS_FILE, 'utf8')
    );
    const bootedAt = state[fixture.cellName].booted_at;
    const snapshot =
      'version: "1.0"\n' +
      'timestamp: "2026-04-23T14:05:02Z"\n' +
      'session_booted_cells:\n' +
      '  ' + fixture.cellName + ':\n' +
      '    booted_at: "' + bootedAt + '"\n';
    fs.writeFileSync(snapshotPath, snapshot, 'utf8');

    // 3. Autocompact wipes the state file.
    fs.unlinkSync(process.env.KAIZEN_BOOTED_CELLS_FILE);
    assert.strictEqual(cie.hasBooted(fixture.cellName), false, 'wipe confirmed');

    // 4. Restore hook rehydrates state from the snapshot.
    const res = cie.restoreBootedCellsFromSnapshot(snapshotPath);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.restoredCount, 1);
    assert.strictEqual(cie.hasBooted(fixture.cellName), true);

    // 5. Re-prompt after "resume" — CIE-3 still skips.
    const after = cie.cie3Boot(ctx);
    assert.strictEqual(after.payload, '', 'post-restore activation skips CIE-3');
    assert.strictEqual(after.bootIoMs, 0);
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});
