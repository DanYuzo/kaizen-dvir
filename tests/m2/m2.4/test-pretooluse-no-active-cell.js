'use strict';

// AC 5 — with no cell active, Commandment I baseline is enforced but
// Commandment II is skipped. No celula.yaml read is attempted (asserted
// indirectly: the evaluator returns PASS for `git push` when cell=null,
// which would be BLOCK under a cell with no push authority).

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, requireFreshHook } = require('./_helpers');

test('No active cell → Commandment II skipped, baseline passes (AC 5)', () => {
  const tmp = mkTmp('no-cell-pass');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    // Same `git push` that would BLOCK under a cell without push
    // authority is PASS when no cell is active.
    const result = hook.handle({
      tool_name: 'Bash',
      parameters: { command: 'git push origin main' },
      session_id: 'sess-no-cell-pass',
      active_cell: null,
    });
    assert.strictEqual(result.verdict, 'PASS');
  } finally {
    rmTmp(tmp);
  }
});

test('No active cell → Commandment I still fires on UI-only call (AC 5)', () => {
  const tmp = mkTmp('no-cell-block');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const result = hook.handle({
      tool_name: 'Dashboard',
      parameters: { ui_only: true },
      session_id: 'sess-no-cell-block',
      active_cell: null,
    });
    assert.strictEqual(result.verdict, 'BLOCK');
    assert.strictEqual(result.commandment, 'I');
  } finally {
    rmTmp(tmp);
  }
});

test('No active cell → evaluate() with empty authorities skips Commandment II', () => {
  const tmp = mkTmp('no-cell-evaluate');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const result = hook.evaluate({
      tool_name: 'Bash',
      parameters: { command: 'git push origin main' },
      active_cell: null,
      authorities_exclusive: [],
    });
    assert.strictEqual(result.verdict, 'PASS');
  } finally {
    rmTmp(tmp);
  }
});
