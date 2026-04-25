'use strict';

// AC 9 (M4.6) — F1, F2, F10 Playback Gates pause for expert approval in
// BOTH interactive AND automatic mode (AC-102). Critical invariants
// always pause regardless of mode. Routes through M3.4 playback-gate.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

function manifestWithCriticalPhases() {
  return {
    name: 'test-cell',
    critical_invariants: ['F1', 'F2', 'F10'],
  };
}

function runPlaybackForPhase(mode, phase) {
  const playbackGate = helpers.freshPlaybackGate();
  let prompted = false;
  const result = playbackGate.present(
    { id: 'artifact-' + phase, path: '/tmp/' + phase },
    'fase ' + phase + ' aguarda decisao do expert.',
    {
      mode: mode,
      qualityVerdict: 'PASS',
      cellManifest: manifestWithCriticalPhases(),
      phase: phase,
      prompt: function () {
        prompted = true;
        return 'sim';
      },
      gateId: 'e2e-critical-' + phase,
    }
  );
  return { result, prompted };
}

test('e2e critical invariants: F1 pauses in interactive mode (AC 9, AC-102)', () => {
  const r = runPlaybackForPhase('interativo', 'F1');
  assert.strictEqual(r.prompted, true, 'F1 must prompt expert (interactive)');
  assert.strictEqual(r.result.paused, true, 'F1 paused');
  assert.strictEqual(r.result.critical_invariant, true, 'F1 marked critical');
  assert.strictEqual(r.result.verdict, 'PASS', 'expert said sim');
});

test('e2e critical invariants: F1 pauses in automatic mode despite Quality PASS (AC 9, AC-102)', () => {
  const r = runPlaybackForPhase('automatico', 'F1');
  assert.strictEqual(r.prompted, true, 'F1 must STILL prompt expert in auto mode');
  assert.strictEqual(r.result.paused, true, 'F1 paused in auto');
  assert.strictEqual(r.result.critical_invariant, true, 'F1 critical regardless of mode');
  assert.notStrictEqual(r.result.verdict, 'AUTO_PASS', 'auto-pass forbidden for F1');
});

test('e2e critical invariants: F2 pauses in BOTH modes (AC 9, AC-102)', () => {
  for (const mode of ['interativo', 'automatico']) {
    const r = runPlaybackForPhase(mode, 'F2');
    assert.strictEqual(r.prompted, true, 'F2 must prompt expert in ' + mode);
    assert.strictEqual(r.result.paused, true, 'F2 paused in ' + mode);
    assert.strictEqual(r.result.critical_invariant, true, 'F2 critical in ' + mode);
  }
});

test('e2e critical invariants: F10 pauses in BOTH modes (AC 9, AC-102)', () => {
  for (const mode of ['interativo', 'automatico']) {
    const r = runPlaybackForPhase(mode, 'F10');
    assert.strictEqual(r.prompted, true, 'F10 must prompt expert in ' + mode);
    assert.strictEqual(r.result.paused, true, 'F10 paused in ' + mode);
    assert.strictEqual(r.result.critical_invariant, true, 'F10 critical in ' + mode);
  }
});

test('e2e critical invariants: non-critical phase F5 may auto-pass in automatic mode (negative control)', () => {
  // Confirms the regime is enforced narrowly — F5 is NOT in critical_invariants
  // so auto mode + Quality PASS auto-passes without prompt.
  const playbackGate = helpers.freshPlaybackGate();
  let prompted = false;
  const r = playbackGate.present(
    { id: 'artifact-F5', path: '/tmp/F5' },
    'fase F5 aguarda decisao.',
    {
      mode: 'automatico',
      qualityVerdict: 'PASS',
      cellManifest: manifestWithCriticalPhases(),
      phase: 'F5',
      prompt: function () {
        prompted = true;
        return 'sim';
      },
      gateId: 'e2e-noncritical-F5',
    }
  );
  assert.strictEqual(prompted, false, 'F5 must NOT prompt in auto + Quality PASS');
  assert.strictEqual(r.verdict, 'AUTO_PASS', 'F5 auto-passes');
  assert.strictEqual(r.critical_invariant, false, 'F5 not critical');
});
