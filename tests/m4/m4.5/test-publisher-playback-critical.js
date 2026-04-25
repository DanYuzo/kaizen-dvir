'use strict';

// AC 16 (M4.5) — F10 Playback Gate is a CRITICAL INVARIANT that ALWAYS
// pauses, even in automatic mode. AC-102. Three-place enforcement:
//   1. AC 16 of story M4.5 (asserted via existence of phase-10-publication.md task)
//   2. Dev Notes (asserted via persona prose mention)
//   3. This test (the third place itself)

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

function freshPlaybackGate() {
  const gatePath = path.join(helpers.GATES_DIR, 'playback-gate.js');
  const modeEnginePath = path.join(helpers.GATES_DIR, 'mode-engine.js');
  helpers.dropCache(gatePath);
  helpers.dropCache(modeEnginePath);
  return require(gatePath);
}

test('phase-10-publication.md declares critical_invariant: true (AC 16, AC-102)', () => {
  assert.ok(fs.existsSync(helpers.PHASE_10_TASK), 'phase-10-publication.md missing');
  const text = helpers.readFileText(helpers.PHASE_10_TASK);
  const { frontmatter } = helpers.parseFrontmatter(text);
  assert.strictEqual(
    String(frontmatter.critical_invariant),
    'true',
    'phase-10-publication.md frontmatter must declare critical_invariant: true'
  );
});

test('phase-10-publication.md prose declares CRITICAL INVARIANT in 3-place rule (AC 16)', () => {
  const text = helpers.readFileText(helpers.PHASE_10_TASK);
  assert.ok(
    /CRITICAL INVARIANT/u.test(text) || /invariante critico/u.test(text),
    'phase-10-publication.md must mention CRITICAL INVARIANT or invariante critico'
  );
  // Three-place rule mentioned.
  assert.ok(
    /AC 16/u.test(text) || /three-place/u.test(text) || /tres lugares/u.test(text),
    'phase-10-publication.md must mention the three-place enforcement rule'
  );
});

test('publisher persona declares critical_invariant: true (AC 16)', () => {
  const text = helpers.readFileText(helpers.PUBLISHER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(text);
  assert.strictEqual(
    String(frontmatter.critical_invariant),
    'true',
    'publisher.md frontmatter must declare critical_invariant: true'
  );
});

test('playback-gate pauses when phase-10-publication is critical_invariant in auto mode (AC 16, AC-102)', () => {
  const stateDir = helpers.mkTmpDir('pb-state');
  const logsDir = helpers.mkTmpDir('pb-logs');
  try {
    process.env.KAIZEN_STATE_DIR = stateDir;
    process.env.KAIZEN_LOGS_DIR = logsDir;
    const gate = freshPlaybackGate();
    const cellManifest = {
      tiers: { tier_1: { chief: true, agents: ['chief'] } },
      critical_invariants: ['phase-10-publication'],
    };
    let promptCalled = false;
    const result = gate.present(
      { id: 'celula-x', type: 'celula', intent: 'F10 publish' },
      'F10 fechou. publiquei a celula.',
      {
        mode: 'automatico',
        phase: 'phase-10-publication',
        cellManifest: cellManifest,
        qualityVerdict: 'PASS',
        prompt: () => {
          promptCalled = true;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalled, true, 'playback prompt MUST be invoked even in auto mode');
    assert.strictEqual(result.paused, true, 'gate MUST pause in critical invariant');
    assert.strictEqual(result.critical_invariant, true);
    assert.strictEqual(result.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
    helpers.rm(logsDir);
  }
});

test('playback-gate AUTO_PASSes only when phase NOT critical (control case, AC 16)', () => {
  const stateDir = helpers.mkTmpDir('pb-state-auto');
  const logsDir = helpers.mkTmpDir('pb-logs-auto');
  try {
    process.env.KAIZEN_STATE_DIR = stateDir;
    process.env.KAIZEN_LOGS_DIR = logsDir;
    const gate = freshPlaybackGate();
    const cellManifest = {
      tiers: { tier_1: { chief: true, agents: ['chief'] } },
      critical_invariants: ['phase-1-objective', 'phase-10-publication'],
    };
    let promptCalled = false;
    const result = gate.present(
      { id: 'art', type: 'art', intent: 'phase 5' },
      'fase 5 ok.',
      {
        mode: 'automatico',
        phase: 'phase-5-risk-map',
        cellManifest: cellManifest,
        qualityVerdict: 'PASS',
        prompt: () => {
          promptCalled = true;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalled, false, 'non-critical phase auto-passes (no prompt)');
    assert.strictEqual(result.verdict, 'AUTO_PASS');
    assert.strictEqual(result.paused, false);
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
    helpers.rm(logsDir);
  }
});
