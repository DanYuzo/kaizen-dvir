'use strict';

// AC 3 / NFR-013 — PreCompact returns BLOCK on snapshot write failure.
// Must NOT throw and must NOT route through the M2.1 circuit-breaker
// bypass path — even after 3 consecutive failures, the verdict stays
// BLOCK.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, requireFreshHook } = require('./_helpers');

test('PreCompact returns BLOCK when write fails, not bypass (NFR-013)', () => {
  const tmp = mkTmp('fail');
  try {
    // Force a write failure by pointing KAIZEN_STATE_DIR at a path that
    // cannot be a directory — a regular file occupying the target name.
    const blocker = path.join(tmp.root, 'blocker-as-file');
    fs.writeFileSync(blocker, 'occupied');
    // Now KAIZEN_STATE_DIR is a *subpath* of that file — mkdirSync will
    // fail because `blocker-as-file` is a file, not a directory.
    process.env.KAIZEN_STATE_DIR = path.join(blocker, 'state');

    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-fail' });

    assert.strictEqual(result.verdict, 'BLOCK', 'verdict must be BLOCK');
    assert.ok(
      /NFR-013/.test(result.reason),
      'reason cites NFR-013 deviation, got: ' + result.reason
    );
    assert.ok(result.error, 'error field populated');
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact remains BLOCK across 4 consecutive failures — no bypass (NFR-013, M2.4-R3)', () => {
  const tmp = mkTmp('fail-repeat');
  try {
    const blocker = path.join(tmp.root, 'blocker-as-file');
    fs.writeFileSync(blocker, 'occupied');
    process.env.KAIZEN_STATE_DIR = path.join(blocker, 'state');

    const hook = requireFreshHook('PreCompact.js');

    // 4 consecutive calls — if PreCompact threw, the M2.1 runner would
    // open the breaker on the 3rd and bypass the 4th. We avoid that by
    // returning BLOCK inline; the handler must never throw on write
    // failure.
    let allBlock = true;
    let anyBypass = false;
    for (let i = 0; i < 4; i++) {
      const r = hook.handle({ session_id: 'sess-repeat-' + i });
      if (r.verdict !== 'BLOCK') allBlock = false;
      if (r.bypassed === true) anyBypass = true;
    }
    assert.ok(allBlock, 'all 4 invocations must return BLOCK');
    assert.ok(!anyBypass, 'no invocation may report bypassed=true');
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact BLOCK message is pt-BR and names the snapshot failure (Language Policy)', () => {
  const tmp = mkTmp('fail-lang');
  try {
    const blocker = path.join(tmp.root, 'blocker-as-file');
    fs.writeFileSync(blocker, 'occupied');
    process.env.KAIZEN_STATE_DIR = path.join(blocker, 'state');

    const hook = requireFreshHook('PreCompact.js');
    const result = hook.handle({ session_id: 'sess-lang' });
    assert.strictEqual(result.verdict, 'BLOCK');
    assert.match(
      result.reason,
      /Snapshot bloqueado/,
      'pt-BR message must begin with "Snapshot bloqueado"'
    );
    assert.match(
      result.reason,
      /autocompact impedido/,
      'pt-BR message must state autocompact is blocked'
    );
  } finally {
    rmTmp(tmp);
  }
});
