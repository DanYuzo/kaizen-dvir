'use strict';

// AC 8: PreCompact snapshot embeds latest_handoff_path; post-compact restore
// reads both the snapshot AND the handoff artifact via the embedded pointer.
// Cooperation contract with M2.4 PreCompact (additive — no breaking change).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, engineFresh, preCompactFresh, validHandoffArgs, callGenerate } =
  require('./_helpers');

test('PreCompact snapshot includes latest_handoff_path field (AC 8)', () => {
  const tmp = mkTmp('precompact-pointer');
  try {
    // Persist a handoff so handoff-engine.listRetained() has something.
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    const handoffPath = engine.persist(result, new Date('2026-04-24T12:00:00.000Z'));

    // Fire PreCompact and inspect the snapshot.
    const hook = preCompactFresh();
    const ret = hook.handle({ session_id: 'sess-coop' });
    assert.strictEqual(ret.verdict, 'PASS');

    const snapText = fs.readFileSync(ret.snapshot_path, 'utf8');
    assert.ok(snapText.includes('latest_handoff_path:'), 'snapshot has latest_handoff_path key');
    // The pointer is double-quoted (every string scalar quoted in PreCompact).
    assert.ok(snapText.includes('"' + handoffPath.replace(/\\/gu, '\\\\') + '"'),
      'snapshot embeds full handoff path. snapshot:\n' + snapText);
  } finally {
    rmTmp(tmp);
  }
});

test('snapshot emits latest_handoff_path: null when no handoff exists (graceful degradation)', () => {
  const tmp = mkTmp('precompact-empty');
  try {
    const hook = preCompactFresh();
    const ret = hook.handle({ session_id: 'sess-empty' });
    assert.strictEqual(ret.verdict, 'PASS');
    const snapText = fs.readFileSync(ret.snapshot_path, 'utf8');
    assert.ok(/latest_handoff_path:\s*null/.test(snapText),
      'no handoffs -> latest_handoff_path is null in snapshot');
  } finally {
    rmTmp(tmp);
  }
});

test('post-compact restore: snapshot pointer + restore() rehydrate the handoff (AC 8, NFR-011)', () => {
  const tmp = mkTmp('post-compact-restore');
  try {
    // Step 1: write handoff.
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.nextAction = 'continuar fase 3 apos compact';
    const result = callGenerate(engine, args);
    engine.persist(result, new Date('2026-04-24T13:00:00.000Z'));

    // Step 2: PreCompact captures the pointer.
    const hook = preCompactFresh();
    const ret = hook.handle({ session_id: 'sess-restore' });
    assert.strictEqual(ret.verdict, 'PASS');

    // Step 3: simulate "post-compact" — read snapshot, extract pointer line,
    // call engine.restore() with the resolved path. We grep the YAML rather
    // than re-parsing the full snapshot (test cooperation, not parser).
    const snapText = fs.readFileSync(ret.snapshot_path, 'utf8');
    const match = snapText.match(/latest_handoff_path:\s*"([^"]+)"/u);
    assert.ok(match, 'snapshot exposes a non-null latest_handoff_path');
    const recoveredPath = match[1];

    // Drop module cache to simulate a "fresh process" reading the snapshot.
    const engine2 = engineFresh();
    const restored = engine2.restore(recoveredPath);
    assert.strictEqual(restored.handoff.next_action, 'continuar fase 3 apos compact',
      'handoff context reconstituted from snapshot pointer');
  } finally {
    rmTmp(tmp);
  }
});

test('PreCompact ignores in-flight .tmp- handoff files (M3.2-R2 mitigation)', () => {
  const tmp = mkTmp('precompact-skip-tmp');
  try {
    // Manually drop ONLY a .tmp- file in the handoffs dir — no real handoff.
    const stale = path.join(
      tmp.handoffs,
      'handoff-x-to-y-2026-04-24T14-00-00.000Z.yaml.tmp-9999-1'
    );
    fs.writeFileSync(stale, 'partial: write\n', { encoding: 'utf8' });

    const hook = preCompactFresh();
    const ret = hook.handle({ session_id: 'sess-tmp' });
    const snapText = fs.readFileSync(ret.snapshot_path, 'utf8');
    // No real handoff exists, only a .tmp- file -> pointer must be null.
    assert.ok(/latest_handoff_path:\s*null/.test(snapText),
      'temp files must NOT be picked up as latest handoff');
  } finally {
    rmTmp(tmp);
  }
});
