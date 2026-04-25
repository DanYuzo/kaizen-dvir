'use strict';

// AC 9, AC-102 — F2 Playback Gate pauses in interactive AND automatic
// mode (critical invariant). Uses real playback-gate + mode-engine.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const helpers = require('./_helpers');

const MANIFEST_PATH = path.join(helpers.YOTZER_CELL_ROOT, 'celula.yaml');

function parseManifest() {
  const schema = helpers.freshGate('schema-gate.js');
  return schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
}

test('F2 phase is listed as critical invariant (AC 9, AC-102)', () => {
  const manifest = parseManifest();
  assert.ok(Array.isArray(manifest.critical_invariants));
  assert.ok(manifest.critical_invariants.includes('phase-2-sources-and-examples'));
});

test('F2 Playback Gate pauses in auto mode (AC 9, AC-102)', () => {
  const state = helpers.mkTmpState('f2-pause-auto');
  const logs = helpers.mkTmpLogs('f2-pause-auto-logs');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const manifest = parseManifest();
    let promptCalled = false;
    const result = playback.present(
      { id: 'f2-artifact', type: 'sources' },
      'narrativa F2 em pt-BR.',
      {
        mode: 'automatico',
        qualityVerdict: 'PASS',
        phase: 'phase-2-sources-and-examples',
        cellManifest: manifest,
        prompt: () => {
          promptCalled = true;
          return 'sim';
        },
      }
    );
    assert.strictEqual(result.paused, true, 'F2 must pause in auto mode');
    assert.strictEqual(result.critical_invariant, true);
    assert.strictEqual(promptCalled, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('F2 Playback Gate pauses in interactive mode (AC 9)', () => {
  const state = helpers.mkTmpState('f2-pause-interactive');
  const logs = helpers.mkTmpLogs('f2-pause-interactive-logs');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const manifest = parseManifest();
    const result = playback.present(
      { id: 'f2-artifact' },
      'narrativa F2.',
      {
        mode: 'interativo',
        phase: 'phase-2-sources-and-examples',
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

test('phase-2-sources-and-examples.md declares critical_invariant true (AC 9)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.critical_invariant), 'true');
});
