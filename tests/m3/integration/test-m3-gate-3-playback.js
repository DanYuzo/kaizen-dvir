'use strict';

// M3 Gate Criterion 3 (Epic KZ-M3 § Gate Criteria):
//   "Playback Gate interrupts execution for human validation in interactive
//   mode; auto-approves in auto mode when underlying Quality Gate verdict
//   is PASS but always pauses at declared critical-invariant points
//   (skipping in auto mode = Quality Gate FAIL)."
//
// AC 13, AC-102 prerequisite, FR-021, FR-038. 3 sub-cases in one file.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  mkSandbox,
  rmSandbox,
  loadPlaybackGate,
} = require('./_helpers');

test('Gate 3a — interactive mode pauses and runs the prompt (FR-021)', () => {
  const sb = mkSandbox('gate3-interactive');
  try {
    const playback = loadPlaybackGate();
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-int', type: 'cell', intent: 'criar célula' },
      null,
      {
        mode: 'interativo',
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1, 'prompt invoked exactly once');
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.option, 'sim');
    assert.strictEqual(out.paused, true);
    assert.strictEqual(out.mode, 'interativo');
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 3b — auto mode + Quality Gate PASS + non-critical phase auto-approves (no prompt)', () => {
  const sb = mkSandbox('gate3-autopass');
  try {
    const playback = loadPlaybackGate();
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-auto', type: 'cell', intent: 'criar célula' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'phase-1',
        cellManifest: { critical_invariants: ['F1', 'F2'] },
        prompt: function () {
          promptCalls += 1;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 0, 'prompt MUST NOT be invoked in auto-pass path');
    assert.strictEqual(out.verdict, 'AUTO_PASS');
    assert.strictEqual(out.paused, false);
    assert.strictEqual(out.mode, 'automatico');
    assert.strictEqual(out.critical_invariant, false);
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 3c — auto mode at critical-invariant phase ALWAYS pauses (AC-102 mitigation)', () => {
  const sb = mkSandbox('gate3-critical');
  try {
    const playback = loadPlaybackGate();
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-crit', type: 'cell', intent: 'criar célula' },
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
    assert.strictEqual(promptCalls, 1, 'prompt MUST be invoked at critical-invariant phase');
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.paused, true, 'critical-invariant pause is mandatory');
    assert.strictEqual(out.critical_invariant, true);
    assert.strictEqual(out.mode, 'automatico');
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 3 — auto mode + Quality Gate FAIL falls through to prompt (does NOT auto-approve)', () => {
  const sb = mkSandbox('gate3-failauto');
  try {
    const playback = loadPlaybackGate();
    let promptCalls = 0;
    const out = playback.present(
      { id: 'art-fail', type: 'cell' },
      null,
      {
        mode: 'automatico',
        qualityVerdict: 'FAIL',
        phase: 'phase-x',
        cellManifest: { critical_invariants: [] },
        prompt: function () {
          promptCalls += 1;
          return 'nao';
        },
        reasonCollector: () => 'gate falhou.',
      }
    );
    assert.strictEqual(promptCalls, 1, 'prompt invoked because qualityVerdict != PASS');
    assert.strictEqual(out.verdict, 'HALT');
    assert.strictEqual(out.option, 'nao');
    assert.strictEqual(out.paused, true);
  } finally {
    rmSandbox(sb);
  }
});
