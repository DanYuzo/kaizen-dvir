'use strict';

// AC 2 + AC 13 — In auto mode, critical-invariant phases ALWAYS pause
// (the AC-102 / R-007 guarantee for Yotzer F1, F2, F10).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('auto + PASS + critical phase F1 → still pauses (prompt invoked)', () => {
  const logs = helpers.mkTmpLogs('pb-auto-crit-f1');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'yotzer-cell', type: 'cell', intent: 'fase critica' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'F1',
        cellManifest: { critical_invariants: ['F1', 'F2', 'F10'] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1, 'critical-invariant phase MUST pause');
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.paused, true);
    assert.strictEqual(out.critical_invariant, true);
    assert.strictEqual(out.mode, 'automatico');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('auto + PASS + critical phase F10 → still pauses', () => {
  const logs = helpers.mkTmpLogs('pb-auto-crit-f10');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'yotzer-cell', type: 'cell', intent: 'publicacao' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'F10',
        cellManifest: { critical_invariants: ['F1', 'F2', 'F10'] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1);
    assert.strictEqual(out.critical_invariant, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('auto + PASS + nested-tier critical_invariants → pauses', () => {
  const logs = helpers.mkTmpLogs('pb-auto-crit-nested');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    const out = playback.present(
      { id: 'cell-x', type: 'cell', intent: 'tier-scoped' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'F2',
        cellManifest: {
          tiers: { chief: { critical_invariants: ['F2'] } },
        },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1);
    assert.strictEqual(out.critical_invariant, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
