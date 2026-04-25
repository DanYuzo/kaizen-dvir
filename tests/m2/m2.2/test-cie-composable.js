'use strict';

// AC 6, 7: Each CIE layer is independently callable. `inject()` orchestrates
// them without tight coupling. The hook entry point delegates through the
// M2.1 hook-runner.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, cieFresh, hookEntryFresh } = require('./_helpers');

test('exports three composable layer functions plus inject (AC 6)', () => {
  const tmp = mkTmpLogs('compose-api');
  try {
    const cie = cieFresh();
    assert.strictEqual(typeof cie.inject, 'function');
    assert.strictEqual(typeof cie.injectCommandments, 'function');
    assert.strictEqual(typeof cie.injectGlobalRules, 'function');
    assert.strictEqual(typeof cie.injectCellRules, 'function');
    assert.deepStrictEqual(Array.from(cie.LAYER_IDS), [
      'CIE-0',
      'CIE-1',
      'CIE-2',
    ]);
  } finally {
    rmTmp(tmp);
  }
});

test('each layer can be invoked in isolation (AC 6)', () => {
  const tmp = mkTmpLogs('compose-iso');
  try {
    const cie = cieFresh();
    const ctx = { sessionId: 's-compose-iso' };

    const r0 = cie.injectCommandments(ctx);
    const r1 = cie.injectGlobalRules(ctx);
    const r2 = cie.injectCellRules(ctx);

    for (const [name, r] of [
      ['CIE-0', r0],
      ['CIE-1', r1],
      ['CIE-2', r2],
    ]) {
      assert.strictEqual(r.layer, name, name + ' returns correct layer id');
      assert.strictEqual(
        typeof r.payload,
        'string',
        name + ' returns a string payload'
      );
      assert.ok(
        typeof r.elapsedMs === 'number' && r.elapsedMs >= 0,
        name + ' returns a non-negative elapsedMs'
      );
      assert.ok(Array.isArray(r.warnings), name + ' returns warnings array');
    }
  } finally {
    rmTmp(tmp);
  }
});

test('inject() concatenates CIE-0+1+2 in requested order (AC 6)', () => {
  const tmp = mkTmpLogs('compose-orch');
  try {
    const cie = cieFresh();
    const result = cie.inject({ sessionId: 's-compose-orch' }, [
      'CIE-0',
      'CIE-1',
      'CIE-2',
    ]);
    assert.strictEqual(typeof result.combinedPayload, 'string');
    assert.ok(Array.isArray(result.perLayer));
    assert.strictEqual(result.perLayer.length, 3);
    assert.strictEqual(result.perLayer[0].layer, 'CIE-0');
    assert.strictEqual(result.perLayer[1].layer, 'CIE-1');
    assert.strictEqual(result.perLayer[2].layer, 'CIE-2');
    assert.ok(
      typeof result.totalMs === 'number' && result.totalMs >= 0,
      'totalMs is a non-negative number'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('inject() accepts case-insensitive layer ids (AC 6)', () => {
  const tmp = mkTmpLogs('compose-case');
  try {
    const cie = cieFresh();
    const result = cie.inject({ sessionId: 's-compose-case' }, [
      'cie-0',
      'CIE_1',
    ]);
    assert.strictEqual(result.perLayer.length, 2);
    assert.strictEqual(result.perLayer[0].layer, 'CIE-0');
    assert.strictEqual(result.perLayer[1].layer, 'CIE-1');
  } finally {
    rmTmp(tmp);
  }
});

test('inject() rejects empty / non-array layers with a clear error (AC 6)', () => {
  const tmp = mkTmpLogs('compose-bad');
  try {
    const cie = cieFresh();
    assert.throws(() => cie.inject({}, []), /non-empty array/);
    assert.throws(() => cie.inject({}, null), /non-empty array/);
  } finally {
    rmTmp(tmp);
  }
});

test('hook entry registers with hook-runner and dispatch returns payload (AC 1, 7)', () => {
  const tmp = mkTmpLogs('compose-hook');
  try {
    // Load the entry point first — `_helpers.requireFresh` invalidates both
    // hook-runner.js and cie.js caches, and the entry point re-requires
    // hook-runner.js on its own require graph, picking up a fresh instance.
    // We then pull that same instance from require.cache via a plain require
    // (no fresh load) so dispatch() sees the registration the entry made.
    const entry = hookEntryFresh();
    assert.strictEqual(entry.EVENT, 'UserPromptSubmit');
    // DEFAULT_LAYERS preserved from the M2.2 contract (3 static layers).
    // M2.3 wired CIE-3 into the handler via `ALL_LAYERS` — the dispatch
    // output below now contains 4 entries.
    assert.deepStrictEqual(entry.DEFAULT_LAYERS, ['CIE-0', 'CIE-1', 'CIE-2']);
    assert.deepStrictEqual(entry.ALL_LAYERS, [
      'CIE-0',
      'CIE-1',
      'CIE-2',
      'CIE-3',
    ]);
    assert.strictEqual(typeof entry.handler, 'function');

    const path = require('node:path');
    const { HOOKS_DIR } = require('./_helpers');
    // Plain require — reuse the cached instance the entry point just loaded.
    const runner = require(path.join(HOOKS_DIR, 'hook-runner.js'));

    const result = runner.dispatch('UserPromptSubmit', {
      sessionCtx: { sessionId: 's-compose-hook' },
    });
    assert.strictEqual(typeof result.combinedPayload, 'string');
    // M2.3 extension: handler now dispatches CIE-0+1+2+3.
    assert.strictEqual(result.perLayer.length, 4);
    assert.strictEqual(result.perLayer[3].layer, 'CIE-3');
    assert.strictEqual(
      runner._getFailureCount('UserPromptSubmit'),
      0,
      'successful dispatch leaves failure counter at 0'
    );
  } finally {
    rmTmp(tmp);
  }
});
