'use strict';

// AC 4 (AC-006 complete, NFR-002): CIE-0 + CIE-1 + CIE-2 + CIE-3 full
// injection measured over 10 reference prompts. CIE layers — excluding
// boot file I/O — stay under 200ms per run. Boot I/O is reported
// additively alongside, NOT included in the 200ms budget.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmp,
  rmTmp,
  seedFixtureCell,
  clearFixtureCell,
  cieFresh,
  PROJECT_ROOT,
} = require('./_helpers');

const INSTRUCTIONS_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'instructions'
);

function resetInstructionsDir() {
  if (!fs.existsSync(INSTRUCTIONS_DIR)) {
    fs.mkdirSync(INSTRUCTIONS_DIR, { recursive: true });
  }
  for (const name of fs.readdirSync(INSTRUCTIONS_DIR)) {
    const full = path.join(INSTRUCTIONS_DIR, name);
    if (fs.statSync(full).isFile() && name.endsWith('.md')) {
      fs.unlinkSync(full);
    }
  }
}

function seedGlobals() {
  const body =
    '# regra global\n\n' +
    'Regra universal de path e naming.\n' +
    'Linha com acentuacao: execucao deterministica.\n'.repeat(60);
  for (const name of ['01-paths.md', '02-naming.md', '03-language.md']) {
    fs.writeFileSync(path.join(INSTRUCTIONS_DIR, name), body, 'utf8');
  }
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.floor((p / 100) * sortedAsc.length)
  );
  return sortedAsc[idx];
}

test('CIE-0+1+2+3 — CIE-layer overhead stays under 200ms across 10 runs, boot I/O additive (AC 4)', () => {
  const tmp = mkTmp('timing-full');
  resetInstructionsDir();
  seedGlobals();
  const bootBody =
    '# boot file\n' +
    'Conteudo representativo.\n'.repeat(40);
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: bootBody },
    { path: 'MEMORY.md', content: bootBody },
    { path: 'refs/contexto-ativo.md', content: bootBody },
  ]);
  try {
    const cie = cieFresh();

    // 10 runs. For runs 2..10 CIE-3 is short-circuited (cell already
    // booted) — the reference workload for the 200ms budget is the full
    // 4-layer injection on every run, so we reset session state at the
    // top of each iteration to keep CIE-3 in its hot path.
    const layerMsRuns = [];
    const bootIoRuns = [];
    const totalRuns = [];

    // Warm-up to amortize cold-cache variance (same approach as M2.2).
    cie._resetSessionStateForTests();
    cie.inject(
      { sessionId: 's-warm', prompt: '/Kaizen:' + fixture.cellName },
      ['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3']
    );

    for (let i = 0; i < 10; i++) {
      cie._resetSessionStateForTests();
      const r = cie.inject(
        { sessionId: 's-run-' + i, prompt: '/Kaizen:' + fixture.cellName },
        ['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3']
      );
      const cie3 = r.perLayer.find((l) => l.layer === 'CIE-3');
      const bootIo = (cie3 && cie3.bootIoMs) || 0;
      // CIE-layer overhead = total − CIE-3 boot I/O. The 200ms budget
      // excludes boot I/O per AC-006 complete (additive reporting).
      const layerMs = r.totalMs - bootIo;
      layerMsRuns.push(layerMs);
      bootIoRuns.push(bootIo);
      totalRuns.push(r.totalMs);

      assert.strictEqual(r.perLayer.length, 4, 'all 4 layers executed');
      assert.ok(
        layerMs < 200,
        'run ' + (i + 1) + ' CIE-layer overhead exceeded 200ms (' + layerMs.toFixed(2) + 'ms)'
      );
    }

    const sortedLayer = layerMsRuns.slice().sort((a, b) => a - b);
    const meanLayer =
      layerMsRuns.reduce((a, b) => a + b, 0) / layerMsRuns.length;
    const meanBootIo =
      bootIoRuns.reduce((a, b) => a + b, 0) / bootIoRuns.length;
    const meanTotal =
      totalRuns.reduce((a, b) => a + b, 0) / totalRuns.length;

    process.stdout.write(
      '  [M2.3 full-timing] runs=10 layer_overhead mean=' +
        meanLayer.toFixed(2) +
        'ms p50=' +
        percentile(sortedLayer, 50).toFixed(2) +
        'ms p95=' +
        percentile(sortedLayer, 95).toFixed(2) +
        'ms max=' +
        sortedLayer[sortedLayer.length - 1].toFixed(2) +
        'ms | boot_io_mean=' +
        meanBootIo.toFixed(2) +
        'ms | total_mean=' +
        meanTotal.toFixed(2) +
        'ms (budget: layer<200ms, boot_io additive)\n'
    );
  } finally {
    clearFixtureCell(fixture);
    resetInstructionsDir();
    rmTmp(tmp);
  }
});
