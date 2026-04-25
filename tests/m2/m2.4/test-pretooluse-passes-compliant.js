'use strict';

// AC 4 / AC 6 — a compliant tool call proceeds. PASS verdict logged with
// tool_name, verdict, session_id, and NO `reason` field.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, requireFreshHook, readAllJsonlEntries } = require('./_helpers');

test('PreToolUse passes a compliant call and logs PASS verdict (AC 4)', () => {
  const tmp = mkTmp('pass');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const result = hook.handle({
      tool_name: 'Read',
      parameters: { file_path: '/tmp/example.txt' },
      session_id: 'sess-pass',
      active_cell: null, // no active cell → no Commandment II check
    });
    assert.strictEqual(result.verdict, 'PASS');
    assert.strictEqual(result.reason, undefined, 'PASS has no reason field');
    assert.strictEqual(result.commandment, undefined, 'PASS has no commandment tag');

    const entries = readAllJsonlEntries(tmp.logs, 'gate-verdicts');
    assert.strictEqual(entries.length, 1, 'one verdict entry logged');
    const e = entries[0];
    assert.strictEqual(e.hook_name, 'PreToolUse');
    assert.strictEqual(e.verdict, 'PASS');
    assert.strictEqual(e.tool_name, 'Read');
    assert.strictEqual(e.session_id, 'sess-pass');
    assert.ok(e.timestamp, 'timestamp present');
    // Must NOT carry a reason field on PASS.
    assert.ok(
      !('reason' in e),
      'PASS log entry must not carry a reason field'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('PreToolUse evaluate returns PASS for a call inside authorities.exclusive', () => {
  const tmp = mkTmp('pass-authority');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const result = hook.evaluate({
      tool_name: 'Bash',
      parameters: { command: 'git push origin main' },
      active_cell: 'ops',
      authorities_exclusive: ['git push', 'gh pr create'],
    });
    assert.strictEqual(result.verdict, 'PASS');
  } finally {
    rmTmp(tmp);
  }
});
