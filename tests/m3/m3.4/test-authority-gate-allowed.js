'use strict';

// AC 6 — tool call within declared authorities passes without block.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('matched tool name passes', () => {
  const logs = helpers.mkTmpLogs('ag-allow-name');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Read', parameters: { file_path: '/tmp/x' } },
      { authorities: { exclusive: ['Read', 'Write'] } }
    );
    assert.strictEqual(out.verdict, 'PASS');
    assert.ok(typeof out.durationMs === 'number');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('matched composite token passes (e.g. git push)', () => {
  const logs = helpers.mkTmpLogs('ag-allow-composite');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Bash', parameters: { command: 'git push origin main' } },
      { authorities: { exclusive: ['git push'] } }
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('empty authorities list passes (no restriction beyond baseline)', () => {
  const logs = helpers.mkTmpLogs('ag-allow-empty');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Read', parameters: {} },
      { authorities: { exclusive: [] } }
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
