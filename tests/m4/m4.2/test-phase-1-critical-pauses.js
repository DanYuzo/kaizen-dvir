'use strict';

// AC 4 — F1 Playback Gate pauses in interactive AND automatic mode
// (critical invariant per AC-102). Verifies that the playback-gate
// consults mode-engine.isCriticalInvariant() and pauses even when
// mode is 'automatico' and qualityVerdict is PASS.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const helpers = require('./_helpers');

const MANIFEST_PATH = path.join(helpers.YOTZER_CELL_ROOT, 'celula.yaml');

function parseManifest() {
  const schema = helpers.freshGate('schema-gate.js');
  return schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
}

test('F1 phase is listed as critical invariant (AC 4, AC-102)', () => {
  const manifest = parseManifest();
  assert.ok(Array.isArray(manifest.critical_invariants));
  assert.ok(manifest.critical_invariants.includes('phase-1-objective'));
});

test('F1 Playback Gate pauses in auto mode (AC 4, AC-102)', () => {
  const state = helpers.mkTmpState('f1-pause-auto');
  const logs = helpers.mkTmpLogs('f1-pause-auto-logs');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const manifest = parseManifest();
    let promptCalled = false;
    const result = playback.present(
      { id: 'outcome-001', type: 'outcome' },
      'narrativa de teste em pt-BR.',
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'phase-1-objective',
        cellManifest: manifest,
        prompt: () => {
          promptCalled = true;
          return 'sim';
        },
      }
    );
    assert.strictEqual(
      result.verdict,
      'PASS',
      'expected PASS (expert chose sim), not AUTO_PASS'
    );
    assert.strictEqual(result.paused, true, 'F1 must pause in auto mode');
    assert.strictEqual(result.critical_invariant, true);
    assert.strictEqual(promptCalled, true, 'prompt must be invoked for critical invariant');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('F1 Playback Gate pauses in interactive mode (AC 4)', () => {
  const state = helpers.mkTmpState('f1-pause-interactive');
  const logs = helpers.mkTmpLogs('f1-pause-interactive-logs');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const manifest = parseManifest();
    const result = playback.present(
      { id: 'outcome-002' },
      'narrativa interativa.',
      {
        mode: 'interativo',
        phase: 'phase-1-objective',
        cellManifest: manifest,
        prompt: () => 'sim',
      }
    );
    assert.strictEqual(result.paused, true);
    assert.strictEqual(result.critical_invariant, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('phase-1-objective.md declares critical_invariant true (AC 4)', () => {
  const raw = helpers.readFileText(helpers.PHASE_1_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.critical_invariant), 'true');
});
