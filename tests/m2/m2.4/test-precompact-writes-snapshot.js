'use strict';

// AC 1 / AC 8 — PreCompact writes a valid YAML file at
// .kaizen/state/precompact-{YYYYMMDD-HHMMSS}.yaml. Asserts filename shape,
// round-trip of Norway-Problem-prone scalars, and presence of required
// top-level keys.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, requireFreshHook } = require('./_helpers');

test('PreCompact writes valid YAML snapshot at correct path (AC 1)', () => {
  const tmp = mkTmp('writes');
  try {
    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({
      session_id: 'sess-test-1',
      active_cell: 'yotzer',
      // Norway-Problem-prone values must round-trip as strings, not booleans.
      decisions: [
        { timestamp: '2026-04-23T14:18:00Z', author: '@sm', note: 'no' },
        { timestamp: '2026-04-23T14:19:00Z', author: '@sm', note: 'yes' },
        { timestamp: '2026-04-23T14:20:00Z', author: '@sm', note: '1.0' },
      ],
      files_modified: ['off', 'on'],
      next_action: 'Handoff to @po for validation.',
    });

    assert.strictEqual(result.verdict, 'PASS', 'verdict must be PASS');
    assert.ok(result.snapshot_path, 'snapshot_path present');
    assert.ok(
      /[\/\\]precompact-\d{8}-\d{6}\.yaml$/.test(result.snapshot_path),
      'filename matches precompact-YYYYMMDD-HHMMSS.yaml: ' + result.snapshot_path
    );
    assert.ok(fs.existsSync(result.snapshot_path), 'file exists on disk');

    const text = fs.readFileSync(result.snapshot_path, 'utf8');
    // Required top-level keys present.
    for (const key of [
      'version:',
      'timestamp:',
      'active_session_id:',
      'session_id:',
      'active_cell:',
      'session_booted_cells:',
      'ctx_summary:',
      'decisions:',
      'files_modified:',
      'next_action:',
    ]) {
      assert.ok(text.includes(key), 'missing top-level key: ' + key);
    }

    // Norway-Problem safety: every string value is double-quoted, so
    // `no`, `yes`, `1.0`, `off`, `on` are never bare tokens.
    assert.ok(text.includes('"no"'), 'string "no" must be quoted');
    assert.ok(text.includes('"yes"'), 'string "yes" must be quoted');
    assert.ok(text.includes('"1.0"'), 'string "1.0" must be quoted');
    assert.ok(text.includes('"off"'), 'string "off" must be quoted');
    assert.ok(text.includes('"on"'), 'string "on" must be quoted');

    // No bare boolean-looking scalars should leak through on user data.
    assert.ok(!/note: no\b/.test(text), 'note must not be bare "no"');
    assert.ok(!/note: yes\b/.test(text), 'note must not be bare "yes"');
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact snapshot writes under the overridden state dir (AC 1)', () => {
  const tmp = mkTmp('state-dir');
  try {
    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-dir' });
    assert.strictEqual(result.verdict, 'PASS');
    const rel = path.relative(tmp.state, result.snapshot_path);
    assert.ok(
      !rel.startsWith('..') && !path.isAbsolute(rel),
      'snapshot landed under KAIZEN_STATE_DIR sandbox'
    );
  } finally {
    rmTmp(tmp);
  }
});
