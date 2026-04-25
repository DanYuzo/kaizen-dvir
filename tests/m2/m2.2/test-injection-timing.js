'use strict';

// AC 5 (AC-006 partial, NFR-002): CIE-0 + CIE-1 + CIE-2 combined injection
// must complete in < 200ms per run across 10 reference prompts. Each
// individual run is asserted (not just the mean). p50 / p95 / max reported
// in stdout so @architect can eyeball variance at the quality gate.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmpLogs,
  rmTmp,
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
    const st = fs.statSync(full);
    if (st.isFile() && name.endsWith('.md')) {
      fs.unlinkSync(full);
    }
  }
}

function seedRepresentativeGlobalRules() {
  // Three ~4 KB markdown files — representative of a realistic CIE-1 payload.
  const body =
    '# regra global\n\n' +
    'Esta regra cobre convenções universais de nomenclatura e paths.\n' +
    'Linha de exemplo com acentuação: execução determinística.\n'.repeat(60);
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

test('CIE-0+1+2 combined injection stays under 200ms per run over 10 runs (AC 5)', () => {
  const tmp = mkTmpLogs('timing');
  resetInstructionsDir();
  seedRepresentativeGlobalRules();
  try {
    const cie = cieFresh();
    const ctx = { sessionId: 's-timing' };

    // Warm-up: exercise the fs cache so the first assertion reflects the
    // steady-state cost rather than cold-cache variance. M2.2-R2.
    cie.inject(ctx, ['CIE-0', 'CIE-1', 'CIE-2']);

    const runs = [];
    for (let i = 0; i < 10; i++) {
      const r = cie.inject(ctx, ['CIE-0', 'CIE-1', 'CIE-2']);
      runs.push(r.totalMs);
      assert.ok(
        r.totalMs < 200,
        'run ' + (i + 1) + ' exceeded 200ms budget (' + r.totalMs + 'ms)'
      );
      assert.strictEqual(r.perLayer.length, 3);
      assert.ok(r.combinedPayload.length > 0);
    }

    const sorted = runs.slice().sort((a, b) => a - b);
    const p50 = percentile(sorted, 50);
    const p95 = percentile(sorted, 95);
    const max = sorted[sorted.length - 1];
    const mean = runs.reduce((a, b) => a + b, 0) / runs.length;

    // Feed observability for @architect at the quality gate.
    process.stdout.write(
      '  [M2.2 timing] runs=10 mean=' +
        mean.toFixed(2) +
        'ms p50=' +
        p50.toFixed(2) +
        'ms p95=' +
        p95.toFixed(2) +
        'ms max=' +
        max.toFixed(2) +
        'ms\n'
    );
  } finally {
    resetInstructionsDir();
    rmTmp(tmp);
  }
});
