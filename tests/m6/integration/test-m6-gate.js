'use strict';

/*
 * test-m6-gate.js — M6.7 integration gate.
 *
 * End-to-end verification of the four M6 PRD § Gate de passagem criteria
 * plus all M6 DoD checkpoints, exercised against a deterministic v1.4
 * fixture and a synthetic v1.5 canonical package. The unit-level coverage
 * already lives in tests/m6/test-update-layered-policy.js,
 * tests/m6/test-rollback-*, tests/m6/test-migrations.js, and the merge3
 * suite. M6.7 wires those libs together as the user experiences them.
 *
 * Test groupings (mapped to gate criteria and ACs):
 *
 *   Gate 2 — L4 preservation + L1/L2 overwrite + MEMORY.md exception
 *     ✓ test-update-l4-preservation     (AC-022, FR-044)
 *     ✓ test-update-l1-l2-overwrite     (FR-044, KZ-M6-R4)
 *     ✓ test-update-memory-md-exception (FR-044, D-v1.1-09)
 *
 *   Gate 3 — L3 conflict UX
 *     ✓ test-update-l3-conflict         (AC-023)
 *
 *   Gate 4 — Rollback round-trip + idempotency
 *     ✓ test-rollback-restore           (AC-024, NFR-105)
 *     ✓ test-rollback-no-snapshot       (AC-024)
 *
 *   Migration framework
 *     ✓ test-migration-idempotency      (AC-028)
 *     ✓ test-n-minus-1-violation        (CON-010)
 *
 *   Language Policy audit
 *     ✓ test-language-policy-audit      (NFR-101, D-v1.4-06)
 *
 * Gate 1 (init <30s, both channels) is exercised separately in
 *   - tests/m6/integration/test-init-perf.js (Gate 1 / NFR-103)
 *   - tests/m6/test-channel-*.js             (FR-052, channel parity)
 *
 * Performance baseline writes happen in test-init-perf.js + this file
 * (rollback timing). Both contribute to perf-baseline.json.
 *
 * Stdlib only (CON-003). No external deps. CommonJS (CON-002).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  sha256,
  mkSandbox,
  rmSandbox,
  hrtimeMs,
  treeHash,
  buildV14Project,
  buildV15Canonical,
  runUpdate,
  runRollback,
} = require('./_helpers-integration');

// -- Shared performance baseline accumulator -----------------------------
//
// Each test that produces a measurement writes to this map. The final
// teardown in this file persists the accumulator to perf-baseline.json
// (best-effort — failures here do not fail the gate). Other integration
// files (e.g., test-init-perf.js) can read the existing file and merge.

const PERF = {};

function _flushPerfBaseline() {
  const baselinePath = path.join(__dirname, 'perf-baseline.json');
  let existing = {};
  if (fs.existsSync(baselinePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) || {};
    } catch (_) {
      existing = {};
    }
  }
  const merged = Object.assign({}, existing, PERF, {
    measuredAt: new Date().toISOString(),
    environment: 'M6.7 integration gate; node ' + process.version + '; ' + process.platform,
  });
  try {
    fs.writeFileSync(baselinePath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  } catch (_) {
    // Non-fatal: the gate report is the authoritative artifact.
  }
}

// =========================================================================
// Gate 2 — L4 preservation, L1/L2 overwrite, MEMORY.md exception
// =========================================================================

test('M6.7 Gate 2 — L4 tree hash is identical before and after kaizen update (AC-022)', () => {
  const project = mkSandbox('l4');
  const canonical = mkSandbox('canon-l4');
  try {
    buildV14Project(project);
    buildV15Canonical(canonical);

    const l4Before = treeHash(project, {
      includePrefixes: ['celulas', 'refs'],
    });

    const r = runUpdate({ project, canonical });
    assert.equal(r.exitCode, 0, 'update must exit 0; stderr=' + r.stderr);

    const l4After = treeHash(project, {
      includePrefixes: ['celulas', 'refs'],
    });
    assert.equal(l4After, l4Before, 'L4 tree hash MUST be preserved (AC-022)');
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

test('M6.7 Gate 2 — L1 file is overwritten with canonical bytes (FR-044, KZ-M6-R4)', () => {
  const project = mkSandbox('l1');
  const canonical = mkSandbox('canon-l1');
  try {
    buildV14Project(project);
    buildV15Canonical(canonical);

    // Mutate L1 — simulating local drift the engine should heal.
    fs.writeFileSync(
      path.join(project, 'bin', 'kaizen.js'),
      '// drifted\n',
      'utf8'
    );

    const r = runUpdate({ project, canonical });
    assert.equal(r.exitCode, 0, 'update must exit 0; stderr=' + r.stderr);

    const final = fs.readFileSync(
      path.join(project, 'bin', 'kaizen.js'),
      'utf8'
    );
    assert.equal(
      final,
      '// v1.5 dispatcher\n',
      'L1 file MUST be overwritten with canonical bytes (FR-044)'
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

test('M6.7 Gate 2 — célula MEMORY.md sentinel is preserved byte-for-byte (FR-044, D-v1.1-09)', () => {
  const project = mkSandbox('mem');
  const canonical = mkSandbox('canon-mem');
  try {
    buildV14Project(project);
    buildV15Canonical(canonical);

    const memPath = path.join(
      project,
      '.kaizen-dvir',
      'celulas',
      'yotzer',
      'MEMORY.md'
    );
    const sentinel =
      '# Yotzer MEMORY v1.4\n\nSentinel: PRESERVED-BY-MIGRATION\n';
    assert.equal(
      fs.readFileSync(memPath, 'utf8'),
      sentinel,
      'fixture sanity — MEMORY.md must hold the sentinel pre-update'
    );

    const r = runUpdate({ project, canonical });
    assert.equal(r.exitCode, 0, 'update must exit 0; stderr=' + r.stderr);

    assert.equal(
      fs.readFileSync(memPath, 'utf8'),
      sentinel,
      'MEMORY.md MUST be preserved byte-for-byte (D-v1.1-09)'
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

// =========================================================================
// Gate 3 — L3 conflict UX (AC-023)
// =========================================================================

test('M6.7 Gate 3 — L3 conflict emits .ours/.theirs, exits non-zero, pt-BR --continue guidance (AC-023)', () => {
  const project = mkSandbox('l3');
  const canonical = mkSandbox('canon-l3');
  try {
    buildV14Project(project);
    // Pre-edit the local L3 file so it diverges from the v1.4 baseline AND
    // from the canonical v1.5 — overlapping change to the same line forces
    // a conflict in the line-based merge.
    fs.writeFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      '# CLAUDE LOCAL EDIT\n\nLocal changes here.\n',
      'utf8'
    );
    // Canonical also rewrites the same line.
    buildV15Canonical(canonical, {
      '.claude/CLAUDE.md':
        '# CLAUDE CANONICAL v1.5\n\nFramework section.\n',
    });

    const r = runUpdate({ project, canonical });
    assert.notEqual(r.exitCode, 0, 'L3 conflict MUST exit non-zero (AC-023)');

    const oursExists = fs.existsSync(
      path.join(project, '.claude', 'CLAUDE.md.ours')
    );
    const theirsExists = fs.existsSync(
      path.join(project, '.claude', 'CLAUDE.md.theirs')
    );
    assert.ok(oursExists, '.ours sidecar MUST be emitted for conflict (AC-023)');
    assert.ok(theirsExists, '.theirs sidecar MUST be emitted for conflict (AC-023)');

    const combined = r.stdout + r.stderr;
    assert.match(
      combined,
      /kaizen update --continue/,
      'pt-BR guidance MUST mention `kaizen update --continue` (AC-023)'
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

// =========================================================================
// Gate 4 — Rollback round-trip and idempotency (AC-024, NFR-105)
// =========================================================================

test('M6.7 Gate 4 — kaizen rollback restores pre-update state in <5s (AC-024, NFR-105)', () => {
  const project = mkSandbox('rb');
  const canonical = mkSandbox('canon-rb');
  try {
    buildV14Project(project);
    buildV15Canonical(canonical);

    // Capture pre-update tree hash for L1/L2/L3 paths (the layers snapshot
    // covers).
    const preHash = treeHash(project, {
      includePrefixes: ['bin', '.kaizen-dvir', '.claude'],
      excludePrefixes: ['.kaizen-dvir/manifest.json'], // refreshed by update
    });

    const u = runUpdate({ project, canonical });
    assert.equal(u.exitCode, 0, 'update must succeed; stderr=' + u.stderr);

    // Sanity — L1 actually changed post-update.
    assert.equal(
      fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8'),
      '// v1.5 dispatcher\n'
    );

    // Now rollback. Measure wall-clock duration.
    const start = process.hrtime.bigint();
    const r = runRollback({ project });
    const ms = hrtimeMs(start);
    PERF.rollbackTime_ms = Math.round(ms);
    PERF.rollbackTime_threshold_ms = 5000;

    assert.equal(r.exitCode, 0, 'rollback must exit 0; stderr=' + r.stderr);
    assert.ok(
      ms < 5000,
      'rollback must complete in <5000ms; observed=' + ms + 'ms (NFR-105)'
    );

    // Post-rollback: L1 reverted.
    assert.equal(
      fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8'),
      '// v1.4 dispatcher\n',
      'rollback MUST restore L1 file content'
    );

    // Post-rollback tree hash matches pre-update (modulo manifest.json
    // which the update refreshed and rollback restores).
    const postHash = treeHash(project, {
      includePrefixes: ['bin', '.kaizen-dvir', '.claude'],
      excludePrefixes: ['.kaizen-dvir/manifest.json'],
    });
    assert.equal(
      postHash,
      preHash,
      'post-rollback tree hash MUST equal pre-update tree hash (AC-024)'
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

test('M6.7 Gate 4 — kaizen rollback on virgin install emits pt-BR warn and exits 0 (AC-024)', () => {
  const project = mkSandbox('rb-virgin');
  try {
    buildV14Project(project);
    // No update was run → no snapshot exists.

    const r = runRollback({ project });
    assert.equal(
      r.exitCode,
      0,
      'no-snapshot rollback MUST exit 0; stderr=' + r.stderr
    );
    const combined = r.stdout + r.stderr;
    assert.match(
      combined,
      /Nada a restaurar|nenhum snapshot|sem snapshot/i,
      'no-snapshot rollback MUST emit pt-BR warn'
    );
  } finally {
    rmSandbox(project);
  }
});

// =========================================================================
// Migration framework — idempotency + N-1 violation
// =========================================================================

test('M6.7 — v1.4-to-v1.5 migration is idempotent (AC-028)', async () => {
  const project = mkSandbox('mig-idem');
  try {
    buildV14Project(project);

    const migration = require(
      path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        '.kaizen-dvir',
        'dvir',
        'migrations',
        'v1.4-to-v1.5.js'
      )
    );

    const manifestPath = path.join(project, '.kaizen-dvir', 'manifest.json');

    // First migration pass.
    let manifest1 = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await migration.forward({
      projectRoot: project,
      manifest: manifest1,
      log: () => {},
    });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest1, null, 2) + '\n',
      'utf8'
    );
    const hash1 = treeHash(project, {
      includePrefixes: ['bin', '.kaizen-dvir', '.claude', 'celulas', 'refs'],
    });

    // Second migration pass — must be a no-op.
    let manifest2 = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    await migration.forward({
      projectRoot: project,
      manifest: manifest2,
      log: () => {},
    });
    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest2, null, 2) + '\n',
      'utf8'
    );
    const hash2 = treeHash(project, {
      includePrefixes: ['bin', '.kaizen-dvir', '.claude', 'celulas', 'refs'],
    });

    assert.equal(
      hash2,
      hash1,
      'migration MUST be idempotent — re-execution produces equivalent state (AC-028)'
    );
  } finally {
    rmSandbox(project);
  }
});

test('M6.7 — N-1 violation aborts with pt-BR message and non-zero exit (CON-010)', () => {
  const project = mkSandbox('n1');
  const canonical = mkSandbox('canon-n1');
  try {
    // Build project at v1.3 and canonical at v1.5 — skip-violation.
    buildV14Project(project);
    // Mutate the project manifest version to 1.3.0.
    const localManifestPath = path.join(
      project,
      '.kaizen-dvir',
      'manifest.json'
    );
    const localManifest = JSON.parse(
      fs.readFileSync(localManifestPath, 'utf8')
    );
    localManifest.version = '1.3.0';
    fs.writeFileSync(
      localManifestPath,
      JSON.stringify(localManifest, null, 2) + '\n',
      'utf8'
    );

    buildV15Canonical(canonical);

    const r = runUpdate({ project, canonical });
    assert.notEqual(
      r.exitCode,
      0,
      'N-1 violation MUST exit non-zero (CON-010)'
    );
    const combined = r.stdout + r.stderr;
    // Message must be pt-BR (Portuguese stop-words).
    assert.match(
      combined,
      /(versao|versão|atualize|atualização|N-1|N-?1|incompat|sequencial|sequência)/i,
      'N-1 abort message MUST be pt-BR'
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

// =========================================================================
// Language Policy audit (NFR-101, D-v1.4-06)
// =========================================================================

// English stop-words / common error words. Any of these appearing in
// user-facing terminal output streams from M6 commands is a Language Policy
// violation. Structured event names in the log file are exempt — those go
// to .kaizen/logs/updates/*.log, not stdout/stderr.
const ENGLISH_VIOLATION_WORDS = [
  'error:',
  'warning:',
  'failed',
  'success',
  'completed',
  ' the ',
  ' and ',
  ' is missing',
  'not found',
];

function _scanForEnglish(text, label) {
  const offenders = [];
  const lines = (text || '').split(/\r?\n/);
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const w of ENGLISH_VIOLATION_WORDS) {
      if (lower.indexOf(w) !== -1) {
        offenders.push({ source: label, line, word: w.trim() });
        break;
      }
    }
  }
  return offenders;
}

test('M6.7 — kaizen update / rollback emit pt-BR strings only (NFR-101, D-v1.4-06)', () => {
  const project = mkSandbox('lang');
  const canonical = mkSandbox('canon-lang');
  try {
    buildV14Project(project);
    buildV15Canonical(canonical);

    const u = runUpdate({ project, canonical });
    assert.equal(u.exitCode, 0, 'update must succeed; stderr=' + u.stderr);

    const r = runRollback({ project });
    assert.equal(r.exitCode, 0, 'rollback must succeed; stderr=' + r.stderr);

    const offenders = []
      .concat(_scanForEnglish(u.stdout, 'update.stdout'))
      .concat(_scanForEnglish(u.stderr, 'update.stderr'))
      .concat(_scanForEnglish(r.stdout, 'rollback.stdout'))
      .concat(_scanForEnglish(r.stderr, 'rollback.stderr'));

    assert.equal(
      offenders.length,
      0,
      'Language Policy violation — English stop-words detected in user-facing output: ' +
        JSON.stringify(offenders, null, 2)
    );
  } finally {
    rmSandbox(project);
    rmSandbox(canonical);
  }
});

// =========================================================================
// Final teardown — flush perf baseline
// =========================================================================

test('M6.7 — flush perf-baseline.json (advisory)', () => {
  _flushPerfBaseline();
  // Non-blocking: this test always passes. The baseline file is committed
  // alongside gate-report.md by the gate ritual.
  assert.ok(true);
});

/*
 * Change Log (append-only)
 *
 * - 2026-04-25 — @qa (Quinn) — Story M6.7 — Initial integration gate suite.
 *   Wires M6.2-M6.5 libraries together via the runUpdate / runRollback
 *   helpers in _helpers-integration.js. Covers all 4 PRD § M6 Gate
 *   criteria + AC-028 idempotency + CON-010 N-1 violation + Language
 *   Policy audit. Init/channel-parity coverage lives in
 *   tests/m6/integration/test-init-perf.js and the existing
 *   tests/m6/test-channel-* suite.
 */
