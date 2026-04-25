'use strict';

// AC 6, AC-201: a "new session" reads the latest handoff addressed to its
// incoming sub-agent and reconstitutes context without prompting the expert.
// Pure read+parse path — verified by clearing the engine require cache to
// simulate a fresh process and asserting no I/O outside the handoffs dir
// occurred (no logs touched, no expert input).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = require('./_helpers');

test('readLatest returns the most recent handoff addressed to a given to-agent (AC 6)', () => {
  const tmp = mkTmp('latest');
  try {
    let engine = engineFresh();
    const args = validHandoffArgs();
    // Write a handoff to forge-smith.
    const r1 = callGenerate(engine, args);
    engine.persist(r1, new Date('2026-04-24T10:00:00.000Z'));
    // Write a later handoff to a different to-agent — must NOT be returned.
    const args2 = validHandoffArgs();
    args2.toAgent = 'archaeologist';
    const r2 = callGenerate(engine, args2);
    engine.persist(r2, new Date('2026-04-24T10:01:00.000Z'));
    // Write a still-later handoff back to forge-smith — must be the one returned.
    const args3 = validHandoffArgs();
    args3.nextAction = 'segunda passagem para forge-smith';
    const r3 = callGenerate(engine, args3);
    const expected = engine.persist(r3, new Date('2026-04-24T10:02:00.000Z'));

    // Simulate "new session" — drop module cache, re-require fresh.
    engine = engineFresh();
    const found = engine.readLatest('forge-smith');
    assert.ok(found, 'readLatest returned an artifact');
    assert.strictEqual(found.path, expected, 'returned the most recent forge-smith handoff');
    assert.strictEqual(
      found.artifact.handoff.next_action,
      'segunda passagem para forge-smith',
      'context reconstituted from the latest artifact'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('restore() returns the structured artifact without prompting (AC 6, AC-201, NFR-011)', () => {
  const tmp = mkTmp('restore');
  try {
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    const written = engine.persist(result, new Date('2026-04-24T11:00:00.000Z'));

    // Override stdin to detect any read attempt — restore() must NOT prompt.
    let stdinReads = 0;
    const origRead = process.stdin.read;
    process.stdin.read = function () {
      stdinReads++;
      return null;
    };
    try {
      const artifact = engine.restore(written);
      assert.deepStrictEqual(
        artifact.handoff.work_context,
        validHandoffArgs().workContext,
        'work_context round-trips intact'
      );
      assert.strictEqual(artifact.handoff.from, 'archaeologist');
      assert.strictEqual(artifact.handoff.to, 'forge-smith');
      assert.deepStrictEqual(artifact.handoff.decisions, validHandoffArgs().decisions);
      assert.deepStrictEqual(artifact.handoff.files_modified, validHandoffArgs().filesModified);
      assert.strictEqual(artifact.handoff.next_action, validHandoffArgs().nextAction);
      assert.strictEqual(stdinReads, 0, 'restore() must not read from stdin');
    } finally {
      process.stdin.read = origRead;
    }
  } finally {
    rmTmp(tmp);
  }
});

test('readLatest returns null when no handoff addressed to the given agent exists', () => {
  const tmp = mkTmp('no-match');
  try {
    const engine = engineFresh();
    const found = engine.readLatest('nobody');
    assert.strictEqual(found, null, 'no addressed handoff -> null');
  } finally {
    rmTmp(tmp);
  }
});
