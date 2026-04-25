'use strict';

// AC 8 — When no cell is active, Authority Gate preserves the M2.4
// PreToolUse baseline (Commandment I/II). No breaking change.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('null cell + Commandment I violation → BLOCK via baseline', () => {
  const logs = helpers.mkTmpLogs('ag-noactive-i');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      {
        tool_name: 'WebUI',
        parameters: { ui_only: true },
      },
      null
    );
    assert.strictEqual(out.verdict, 'BLOCK');
    assert.match(out.message, /Mandamento I|CLI First/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('undefined cell + benign tool call → PASS', () => {
  const logs = helpers.mkTmpLogs('ag-noactive-pass');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Read', parameters: { file_path: '/tmp/x' } },
      undefined
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('empty string cell name → treated as no-active-cell baseline', () => {
  const logs = helpers.mkTmpLogs('ag-noactive-empty');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Read', parameters: {} },
      ''
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
