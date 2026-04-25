'use strict';

// AC 4, AC 15, AC-102 — chief integrates with mode-engine. The manifest's
// critical_invariants list resolves to [phase-1-objective,
// phase-2-sources-and-examples, phase-10-publication] via
// mode-engine.isCriticalInvariant(). Chief can call getMode() and
// switchMode() to manage operational mode.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const helpers = require('./_helpers');

const MANIFEST_PATH = path.join(helpers.YOTZER_CELL_ROOT, 'celula.yaml');

function parseManifest() {
  const schema = helpers.freshGate('schema-gate.js');
  return schema._parseYaml(helpers.readFileText(MANIFEST_PATH));
}

test('isCriticalInvariant returns true for all 3 Yotzer critical phases (AC 4, AC-102)', () => {
  const state = helpers.mkTmpState('chief-ci-true');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const manifest = parseManifest();
    assert.strictEqual(
      mode.isCriticalInvariant(manifest, 'phase-1-objective'),
      true
    );
    assert.strictEqual(
      mode.isCriticalInvariant(manifest, 'phase-2-sources-and-examples'),
      true
    );
    assert.strictEqual(
      mode.isCriticalInvariant(manifest, 'phase-10-publication'),
      true
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('isCriticalInvariant returns false for non-critical Yotzer phases (AC 15)', () => {
  const state = helpers.mkTmpState('chief-ci-false');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const manifest = parseManifest();
    // Non-critical phases must NOT pause auto mode.
    for (const phase of [
      'phase-3-as-is',
      'phase-4-stress-test',
      'phase-5-risk-map',
      'phase-6-to-be',
      'phase-7-prioritize',
      'phase-8-granulate',
      'phase-9-contracts',
    ]) {
      assert.strictEqual(
        mode.isCriticalInvariant(manifest, phase),
        false,
        phase + ' should not be critical'
      );
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('chief reads mode via getMode() at session start (AC 15)', () => {
  const state = helpers.mkTmpState('chief-get-mode');
  const logs = helpers.mkTmpLogs('chief-get-mode-logs');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    // Initial mode is null.
    assert.strictEqual(mode.getMode(), null);
    // After selectMode, getMode returns the chosen mode.
    mode.selectMode('interativo');
    assert.strictEqual(mode.getMode(), 'interativo');
    mode.selectMode('automatico');
    assert.strictEqual(mode.getMode(), 'automatico');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('critical_invariants list has exactly 3 entries (AC 4)', () => {
  const manifest = parseManifest();
  assert.ok(Array.isArray(manifest.critical_invariants));
  assert.strictEqual(manifest.critical_invariants.length, 3);
});
