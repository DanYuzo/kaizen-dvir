'use strict';

// AC 15, FR-111 — archaeologist consumes ikigai-reader.readDimension()
// from M3.1 before the first elicit in F1. All 4 dimensions are read.
// Skipping the read blocks the first elicit.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const helpers = require('./_helpers');

const DIMENSIONS = ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco'];

test('ikigai-reader exposes readDimension for all 4 dimensions (AC 15, FR-111)', () => {
  const ikigaiDir = helpers.mkTmpIkigai('reader-basic');
  try {
    const reader = helpers.freshMemory('ikigai-reader.js');
    assert.strictEqual(reader.VALID_DIMENSIONS.length, 4);
    for (const d of DIMENSIONS) {
      assert.ok(reader.VALID_DIMENSIONS.includes(d));
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(ikigaiDir);
  }
});

test('archaeologist simulation: F1 reads all 4 dimensions before first elicit (AC 15, FR-111)', () => {
  const ikigaiDir = helpers.mkTmpIkigai('f1-reads-all');
  try {
    const reader = helpers.freshMemory('ikigai-reader.js');
    const reads = [];
    for (const d of DIMENSIONS) {
      const parsed = reader.readDimension(d);
      reads.push(parsed);
    }
    assert.strictEqual(reads.length, 4);
    for (let i = 0; i < reads.length; i++) {
      assert.strictEqual(reads[i].dimension, DIMENSIONS[i]);
      assert.ok(reads[i].title);
      assert.ok(reads[i].sections);
    }
  } finally {
    helpers.clearEnv();
    helpers.rm(ikigaiDir);
  }
});

test('missing Ikigai dimension blocks the first elicit with pt-BR error (AC 15)', () => {
  const ikigaiDir = helpers.mkTmpIkigai('f1-missing-dim');
  try {
    // Delete one of the 4 files to simulate the missing dimension.
    fs.unlinkSync(path.join(ikigaiDir, 'quem-sou.md'));
    const reader = helpers.freshMemory('ikigai-reader.js');
    let err = null;
    try {
      reader.readDimension('quem-sou');
    } catch (e) {
      err = e;
    }
    assert.notStrictEqual(err, null);
    assert.ok(
      err.message.includes('não encontrado') || err.message.includes('nao encontrado'),
      'error must guide correction in pt-BR: got ' + err.message
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(ikigaiDir);
  }
});

test('phase-1-objective.md references ikigai-reader.readDimension (AC 15, FR-111)', () => {
  const raw = helpers.readFileText(helpers.PHASE_1_TASK);
  assert.ok(raw.includes('ikigai-reader.readDimension'));
  for (const d of DIMENSIONS) {
    assert.ok(raw.includes(d), 'phase-1 must name dimension ' + d);
  }
});

test('archaeologist.md declares ikigai consumption contract (AC 15, FR-111)', () => {
  const raw = helpers.readFileText(helpers.ARCHAEOLOGIST_PATH);
  assert.ok(raw.includes('ikigai-reader'));
  for (const d of DIMENSIONS) {
    assert.ok(raw.includes(d), 'archaeologist persona must declare dimension ' + d);
  }
});
