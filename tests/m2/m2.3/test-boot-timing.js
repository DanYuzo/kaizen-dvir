'use strict';

// AC 3 (AC-012, NFR-001): First activation including CIE-3 boot injection
// completes in under 2 seconds end-to-end on a reference cell with 3 boot
// files of typical size.

const { test } = require('node:test');
const assert = require('node:assert');
const { performance } = require('node:perf_hooks');
const {
  mkTmp,
  rmTmp,
  seedFixtureCell,
  clearFixtureCell,
  cieFresh,
} = require('./_helpers');

// Typical-size content: ~4 KB per file, same order of magnitude as the
// CIE-1 timing fixture in M2.2.
const body =
  '# documento de boot\n\n' +
  'Esta secao descreve o estado inicial esperado para a celula.\n' +
  'Linha de exemplo com acentuacao: execucao deterministica.\n'.repeat(60);

test('first activation with 3 boot files under 2s end-to-end (AC 3)', () => {
  const tmp = mkTmp('timing-2s');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: body },
    { path: 'MEMORY.md', content: body },
    { path: 'refs/contexto-ativo.md', content: body },
  ]);
  try {
    const cie = cieFresh();
    const ctx = {
      sessionId: 's-timing-2s',
      prompt: '/Kaizen:' + fixture.cellName,
    };

    const started = performance.now();
    const result = cie.inject(ctx, ['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3']);
    const elapsed = performance.now() - started;

    assert.ok(
      elapsed < 2000,
      'first activation exceeded 2s budget (' + elapsed.toFixed(2) + 'ms)'
    );
    assert.strictEqual(result.perLayer.length, 4);
    assert.strictEqual(result.perLayer[3].layer, 'CIE-3');
    assert.ok(
      result.combinedPayload.includes('documento de boot'),
      'CIE-3 content present in combined payload'
    );

    process.stdout.write(
      '  [M2.3 timing] first activation end-to-end=' +
        elapsed.toFixed(2) +
        'ms (budget 2000ms) boot_io=' +
        result.perLayer[3].bootIoMs.toFixed(2) +
        'ms cie_3_total=' +
        result.perLayer[3].elapsedMs.toFixed(2) +
        'ms\n'
    );
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});
