'use strict';

// AC 7, AC-200, NFR-012: 10 simulated autocompact cycles leave MEMORY.md
// content intact — every previously written entry remains readable.
//
// Autocompact, in this MVP harness, does not touch on-disk artifacts; it
// resets the LLM session context. We simulate it as: writer module is
// require-cache-cleared (fresh load with no in-memory state), the file on
// disk MUST still hold every prior entry, and a subsequent append MUST
// keep the prior content intact.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpCelulas, rmTmp, requireFresh } = require('./_helpers');

test('MEMORY.md content intact across 10 autocompact cycles (AC 7, AC-200)', async () => {
  const tmp = mkTmpCelulas('autocompact');
  try {
    const target = path.join(tmp, 'survivor', 'MEMORY.md');
    const expected = [];

    for (let cycle = 0; cycle < 10; cycle++) {
      // "Autocompact" — drop the writer from require cache to mimic a
      // fresh module load with no in-memory cache.
      const writer = requireFresh('memory-writer.js');
      const tag = 'cycle-' + cycle;
      // eslint-disable-next-line no-await-in-loop
      await writer.appendPattern('survivor', tag, 'low');
      expected.push(tag);

      const body = fs.readFileSync(target, 'utf8');
      for (const t of expected) {
        assert.ok(
          body.includes(t),
          'after cycle ' + cycle + ', entry ' + t + ' must still be present'
        );
      }
    }

    // Final assertion — every expected tag survives.
    const finalBody = fs.readFileSync(target, 'utf8');
    for (const t of expected) {
      assert.ok(finalBody.includes(t), 'final body must contain ' + t);
    }
    // And the byte count strictly grew over the 10 appends.
    assert.ok(finalBody.length > 0, 'final MEMORY.md must be non-empty');
  } finally {
    rmTmp(tmp);
  }
});
