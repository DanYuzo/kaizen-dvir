'use strict';

// AC 1, 8: hook-runner dispatches to a registered handler and returns the
// handler result to the caller. CommonJS module surface.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

test('dispatch invokes registered handler and returns its result (AC 1)', () => {
  const tmp = mkTmpLogs('dispatch');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    let seen = null;
    runner.register('UserPromptSubmit', (payload) => {
      seen = payload;
      return { ok: true, echoed: payload };
    });

    const result = runner.dispatch('UserPromptSubmit', { prompt: 'oi' });

    assert.deepStrictEqual(seen, { prompt: 'oi' }, 'handler received payload');
    assert.deepStrictEqual(
      result,
      { ok: true, echoed: { prompt: 'oi' } },
      'dispatch returns handler result'
    );
    assert.strictEqual(
      runner._getFailureCount('UserPromptSubmit'),
      0,
      'successful dispatch leaves failure counter at 0'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('dispatch throws for an unregistered event (contract)', () => {
  const tmp = mkTmpLogs('unregistered');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    assert.throws(
      () => runner.dispatch('NoSuchEvent', {}),
      /no handler registered/,
      'unregistered event surfaces explicit error'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('register rejects duplicate handler for same event (contract)', () => {
  const tmp = mkTmpLogs('duplicate');
  try {
    const runner = requireFresh('hook-runner.js');
    runner._resetForTests();

    runner.register('PreCompact', () => 1);
    assert.throws(
      () => runner.register('PreCompact', () => 2),
      /duplicate registration/,
      'duplicate registration is rejected'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('module exports CommonJS surface only (AC 8)', () => {
  const tmp = mkTmpLogs('cjs');
  try {
    const runner = requireFresh('hook-runner.js');
    assert.strictEqual(typeof runner.register, 'function');
    assert.strictEqual(typeof runner.dispatch, 'function');
    assert.strictEqual(typeof runner.FAILURE_THRESHOLD, 'number');
  } finally {
    rmTmp(tmp);
  }
});
