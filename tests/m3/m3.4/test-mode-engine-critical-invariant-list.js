'use strict';

// AC 13 — isCriticalInvariant() reads critical_invariants from the cell
// manifest and returns true when the phase is listed.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('top-level critical_invariants list — match returns true', () => {
  const state = helpers.mkTmpState('ci-top-true');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const manifest = { critical_invariants: ['F1', 'F2', 'F10'] };
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F1'), true);
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F2'), true);
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F10'), true);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('top-level critical_invariants list — non-match returns false', () => {
  const state = helpers.mkTmpState('ci-top-false');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const manifest = { critical_invariants: ['F1', 'F2', 'F10'] };
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F3'), false);
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F5'), false);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('missing critical_invariants → permissive default false', () => {
  const state = helpers.mkTmpState('ci-missing');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    assert.strictEqual(mode.isCriticalInvariant({}, 'F1'), false);
    assert.strictEqual(mode.isCriticalInvariant({ tiers: {} }, 'F1'), false);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('nested-by-tier critical_invariants honored', () => {
  const state = helpers.mkTmpState('ci-nested');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const manifest = {
      tiers: {
        chief: { critical_invariants: ['F1'] },
        worker: { critical_invariants: ['F5'] },
      },
    };
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F1'), true);
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F5'), true);
    assert.strictEqual(mode.isCriticalInvariant(manifest, 'F9'), false);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('invalid arguments return false (defensive)', () => {
  const state = helpers.mkTmpState('ci-bad');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    assert.strictEqual(mode.isCriticalInvariant(null, 'F1'), false);
    assert.strictEqual(mode.isCriticalInvariant({}, ''), false);
    assert.strictEqual(mode.isCriticalInvariant({}, null), false);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});
