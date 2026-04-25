'use strict';

// AC 2 — snapshot contains `session_booted_cells` reflecting the state
// file contents. Covers: populated file, empty file, absent file. All
// three cases must produce a valid snapshot (never crash).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, requireFreshHook } = require('./_helpers');

test('PreCompact includes populated session_booted_cells (AC 2)', () => {
  const tmp = mkTmp('booted-populated');
  try {
    const bootedFile = path.join(tmp.state, 'session-booted-cells.json');
    fs.writeFileSync(
      bootedFile,
      JSON.stringify({
        yotzer: { booted_at: '2026-04-23T14:05:02Z' },
        'another-cell': { booted_at: '2026-04-23T14:21:48Z' },
      })
    );

    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-populated' });
    assert.strictEqual(result.verdict, 'PASS');

    const text = fs.readFileSync(result.snapshot_path, 'utf8');
    assert.ok(
      text.includes('yotzer:'),
      'snapshot must include yotzer cell key'
    );
    assert.ok(
      text.includes('another-cell:'),
      'snapshot must include another-cell key'
    );
    assert.ok(
      text.includes('"2026-04-23T14:05:02Z"'),
      'booted_at quoted and preserved'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact survives absent booted-cells file with empty object (AC 2)', () => {
  const tmp = mkTmp('booted-absent');
  try {
    // No state file written — absent case.
    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-absent' });
    assert.strictEqual(result.verdict, 'PASS');

    const text = fs.readFileSync(result.snapshot_path, 'utf8');
    // Empty object: serialized as `session_booted_cells: {}`.
    assert.match(
      text,
      /session_booted_cells:\s*\{\}/,
      'session_booted_cells must be an empty object when file absent'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact tolerates malformed booted-cells JSON (AC 2)', () => {
  const tmp = mkTmp('booted-malformed');
  try {
    const bootedFile = path.join(tmp.state, 'session-booted-cells.json');
    fs.writeFileSync(bootedFile, 'not valid json{{{');

    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-malformed' });
    assert.strictEqual(result.verdict, 'PASS', 'malformed file must not crash snapshot');
    const text = fs.readFileSync(result.snapshot_path, 'utf8');
    assert.match(text, /session_booted_cells:\s*\{\}/);
  } finally {
    rmTmp(tmp);
  }
});
