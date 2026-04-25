'use strict';

// AC 2 — Playback Gate auto-approves in auto mode when the underlying
// Quality Gate verdict is PASS and the phase is NOT critical-invariant.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('auto mode + qualityVerdict PASS + non-critical phase → AUTO_PASS without prompt', () => {
  const logs = helpers.mkTmpLogs('pb-auto-pass');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-1', type: 'cell', intent: 'rotina' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'F5',
        cellManifest: { critical_invariants: ['F1', 'F2', 'F10'] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 0, 'prompt must NOT be called on AUTO_PASS');
    assert.strictEqual(out.verdict, 'AUTO_PASS');
    assert.strictEqual(out.option, null);
    assert.strictEqual(out.paused, false);
    assert.strictEqual(out.mode, 'automatico');
    assert.strictEqual(out.critical_invariant, false);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('auto mode + qualityVerdict CONCERNS → falls through to prompt', () => {
  const logs = helpers.mkTmpLogs('pb-auto-concerns');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-2', type: 'cell', intent: 'revisar' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'CONCERNS',
        phase: 'F5',
        cellManifest: { critical_invariants: [] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1, 'prompt must run when verdict is not PASS');
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.option, 'sim');
    assert.strictEqual(out.paused, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('auto mode + qualityVerdict missing → falls through to prompt', () => {
  const logs = helpers.mkTmpLogs('pb-auto-missing');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-3', type: 'cell', intent: 'sem verdict' },
      null,
      {
        mode: 'automatico',
        phase: 'F5',
        cellManifest: { critical_invariants: [] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1);
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
