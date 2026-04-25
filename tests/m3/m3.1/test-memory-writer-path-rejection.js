'use strict';

// AC 5: writes outside `.kaizen-dvir/celulas/{name}/MEMORY.md` fail with a
// pt-BR error citing the runtime L2 exception (D-v1.1-09).

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpCelulas, rmTmp, requireFresh } = require('./_helpers');

test('appendPattern rejects path traversal in celulaName (AC 5)', async () => {
  const tmp = mkTmpCelulas('traverse');
  try {
    const writer = requireFresh('memory-writer.js');
    await assert.rejects(
      () => writer.appendPattern('../escape', 'p', 'low'),
      /escrita rejeitada/i,
      'must reject `../escape` celulaName'
    );
    await assert.rejects(
      () => writer.appendPattern('subdir/cell', 'p', 'low'),
      /escrita rejeitada/i,
      'must reject celulaName containing `/`'
    );
    await assert.rejects(
      () => writer.appendPattern('subdir\\cell', 'p', 'low'),
      /escrita rejeitada/i,
      'must reject celulaName containing backslash'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('rejection error cites D-v1.1-09 runtime exception (AC 5)', async () => {
  const tmp = mkTmpCelulas('cite-decision');
  try {
    const writer = requireFresh('memory-writer.js');
    let caught = null;
    try {
      await writer.appendPattern('../bad', 'p', 'low');
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'must throw');
    assert.ok(
      /D-v1\.1-09/.test(caught.message),
      'error must cite D-v1.1-09: ' + caught.message
    );
    assert.ok(
      /\.kaizen-dvir\/celulas\/\{nome\}\/MEMORY\.md/.test(caught.message),
      'error must mention the allow-listed path: ' + caught.message
    );
  } finally {
    rmTmp(tmp);
  }
});

test('all 4 append methods enforce the same allow-list (AC 5)', async () => {
  const tmp = mkTmpCelulas('all-methods');
  try {
    const writer = requireFresh('memory-writer.js');
    await assert.rejects(
      () => writer.appendException('../x', 'c', 'h'),
      /escrita rejeitada/i
    );
    await assert.rejects(
      () => writer.appendCrossRef('../x', 'refs/ikigai/quem-sou.md', 'w'),
      /escrita rejeitada/i
    );
    await assert.rejects(
      () => writer.appendChangeLog('../x', 'a', 'c'),
      /escrita rejeitada/i
    );
  } finally {
    rmTmp(tmp);
  }
});

test('empty celulaName is rejected with pt-BR error (AC 5 input contract)', async () => {
  const tmp = mkTmpCelulas('empty-name');
  try {
    const writer = requireFresh('memory-writer.js');
    await assert.rejects(
      () => writer.appendPattern('', 'p', 'low'),
      /nome da célula obrigatório/
    );
  } finally {
    rmTmp(tmp);
  }
});
