'use strict';

// AC 4 / AC 6 / AC 7 — PreToolUse blocks a tool call violating
// Commandment I (CLI First). BLOCK verdict logged with commandment_ref
// "I"; pt-BR reason references "Mandamento I — CLI First".

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, requireFreshHook, readAllJsonlEntries } = require('./_helpers');

test('PreToolUse blocks Commandment I violation with pt-BR message (AC 4)', () => {
  const tmp = mkTmp('cmd-i');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const result = hook.handle({
      tool_name: 'Dashboard',
      parameters: { ui_only: true, surface: 'ui' },
      session_id: 'sess-cmd-i',
      active_cell: null,
    });

    assert.strictEqual(result.verdict, 'BLOCK', 'verdict must be BLOCK');
    assert.strictEqual(result.commandment, 'I', 'commandment tag must be I');
    assert.match(
      result.reason,
      /Mandamento I — CLI First/,
      'pt-BR message must cite "Mandamento I — CLI First", got: ' + result.reason
    );
    assert.match(
      result.reason,
      /Delegue para quem tem autoridade ou ajuste o escopo da celula/,
      'pt-BR message must include canonical closing sentence'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('PreToolUse logs BLOCK entry with commandment_ref "I" (AC 6)', () => {
  const tmp = mkTmp('cmd-i-log');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    hook.handle({
      tool_name: 'Dashboard',
      parameters: { ui_only: true },
      session_id: 'sess-cmd-i-log',
      active_cell: null,
    });

    const entries = readAllJsonlEntries(tmp.logs, 'gate-verdicts');
    assert.strictEqual(entries.length, 1, 'exactly one verdict entry logged');
    const e = entries[0];
    assert.strictEqual(e.hook_name, 'PreToolUse');
    assert.strictEqual(e.verdict, 'BLOCK');
    assert.strictEqual(e.commandment_ref, 'I');
    assert.strictEqual(e.tool_name, 'Dashboard');
    assert.strictEqual(e.session_id, 'sess-cmd-i-log');
    assert.ok(e.reason && e.reason.length > 0, 'reason field present');
    assert.ok(e.timestamp, 'timestamp field present');
  } finally {
    rmTmp(tmp);
  }
});
