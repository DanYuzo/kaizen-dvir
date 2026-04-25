'use strict';

// AC 1: `kaizen doctor` (no flag) renders 5 section markers in pt-BR and
// exits 0. Section order is fixed: Hooks → Gates → Memory → Cells → Promotion.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkSandbox, rmSandbox, runCli } = require('./_helpers');

test('default doctor output emits 5 section markers in pt-BR and exits 0 (AC 1)', () => {
  const sb = mkSandbox('default');
  try {
    const r = runCli(['doctor']);
    assert.strictEqual(r.status, 0, 'stderr=' + r.stderr + ' stdout=' + r.stdout);
    assert.match(r.stdout, /KaiZen doctor/, 'title present');
    assert.match(r.stdout, /Hooks carregados:/, 'hooks header');
    assert.match(r.stdout, /Gates \(últimos 100 veredictos\):/, 'gates header');
    assert.match(r.stdout, /Memória:/, 'memory header');
    assert.match(r.stdout, /Células instaladas:/, 'cells header');
    assert.match(r.stdout, /Candidatos de promoção:/, 'promotion header');
    // Section order — Hooks must appear before Gates before Memory etc.
    const idxHooks = r.stdout.indexOf('Hooks carregados:');
    const idxGates = r.stdout.indexOf('Gates (últimos 100 veredictos):');
    const idxMem = r.stdout.indexOf('Memória:');
    const idxCells = r.stdout.indexOf('Células instaladas:');
    const idxProm = r.stdout.indexOf('Candidatos de promoção:');
    assert.ok(idxHooks < idxGates, 'Hooks before Gates');
    assert.ok(idxGates < idxMem, 'Gates before Memory');
    assert.ok(idxMem < idxCells, 'Memory before Cells');
    assert.ok(idxCells < idxProm, 'Cells before Promotion');
  } finally {
    rmSandbox(sb);
  }
});
