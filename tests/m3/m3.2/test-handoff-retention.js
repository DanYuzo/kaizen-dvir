'use strict';

// AC 7: 4th persisted handoff removes the oldest; listRetained() returns
// at most 3 (NFR-011 retention contract per 06-memory-ikigai.md).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = require('./_helpers');

test('listRetained returns up to RETENTION_LIMIT entries (AC 7)', () => {
  const tmp = mkTmp('retention');
  try {
    const engine = engineFresh();
    assert.strictEqual(engine.RETENTION_LIMIT, 3, 'retention limit per PRD = 3');

    // Persist 4 handoffs with monotonic timestamps. Inject Date so we
    // guarantee filename ordering on fast machines (no wall-clock collision).
    const args = validHandoffArgs();
    const written = [];
    for (let i = 0; i < 4; i++) {
      const result = callGenerate(engine, args);
      const date = new Date('2026-04-24T10:0' + i + ':00.000Z');
      written.push(engine.persist(result, date));
    }

    const retained = engine.listRetained();
    assert.strictEqual(retained.length, 3, 'exactly 3 retained after 4th persist');
    // Newest first.
    assert.ok(retained[0].filename > retained[1].filename, 'newest first ordering');
    assert.ok(retained[1].filename > retained[2].filename, 'descending order');

    // The oldest of the 4 written must be gone from disk.
    assert.ok(!fs.existsSync(written[0]), 'oldest file deleted after 4th persist');
    // The 3 most recent must be present.
    assert.ok(fs.existsSync(written[1]), '2nd-oldest still present');
    assert.ok(fs.existsSync(written[2]), '3rd file present');
    assert.ok(fs.existsSync(written[3]), 'newest present');

    // Directory contains exactly the 3 retained files (no temp files left).
    const onDisk = fs.readdirSync(tmp.handoffs).sort();
    assert.strictEqual(onDisk.length, 3, 'no orphan temp files in handoffs dir');
  } finally {
    rmTmp(tmp);
  }
});

test('persist after 4 writes prunes only the oldest (AC 7)', () => {
  const tmp = mkTmp('prune-one');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    const dates = [
      new Date('2026-04-24T10:00:00.000Z'),
      new Date('2026-04-24T10:01:00.000Z'),
      new Date('2026-04-24T10:02:00.000Z'),
      new Date('2026-04-24T10:03:00.000Z'),
      new Date('2026-04-24T10:04:00.000Z'),
    ];
    for (const d of dates) {
      const result = callGenerate(engine, args);
      engine.persist(result, d);
    }
    const onDisk = fs
      .readdirSync(tmp.handoffs)
      .filter((n) => n.startsWith('handoff-'))
      .sort();
    assert.strictEqual(onDisk.length, 3, '5 writes leave 3 most recent');
    // Newest 3 carry the latest 3 timestamps.
    assert.ok(onDisk[0].includes('10-02-00'), 'oldest retained = 10:02');
    assert.ok(onDisk[2].includes('10-04-00'), 'newest retained = 10:04');
  } finally {
    rmTmp(tmp);
  }
});
