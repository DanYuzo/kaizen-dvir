'use strict';

/*
 * test-init-perf.js — M6.7 Gate 1 / NFR-103 / AC-021.
 *
 * Measures `kaizen init` wall-clock time against an empty sandbox and
 * asserts <30s on the reference environment. Uses the source checkout
 * directly (offline-safe — no npm pack, no registry, no network). The
 * channel-parity tests at tests/m6/test-channel-*.js already cover the
 * tarball-extraction-then-init path; this file specifically focuses on
 * the timing requirement of Gate 1.
 *
 * Stdlib only (CON-003).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  SOURCE_ROOT,
  mkSandbox,
  rmSandbox,
  hrtimeMs,
} = require('./_helpers-integration');

const DISPATCHER = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

function _writePerfMetric(key, valueMs, thresholdMs) {
  const baselinePath = path.join(__dirname, 'perf-baseline.json');
  let existing = {};
  if (fs.existsSync(baselinePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) || {};
    } catch (_) {
      existing = {};
    }
  }
  existing[key] = Math.round(valueMs);
  existing[key + '_threshold_ms'] = thresholdMs;
  existing.measuredAt = new Date().toISOString();
  existing.environment =
    'M6.7 integration gate; node ' + process.version + '; ' + process.platform;
  try {
    fs.writeFileSync(
      baselinePath,
      JSON.stringify(existing, null, 2) + '\n',
      'utf8'
    );
  } catch (_) {
    // Non-fatal.
  }
}

test('M6.7 Gate 1 — kaizen init completes in <30s on empty sandbox (AC-021, NFR-103)', () => {
  const sandbox = mkSandbox('init-perf');
  try {
    const start = process.hrtime.bigint();
    const result = spawnSync(process.execPath, [DISPATCHER, 'init'], {
      cwd: sandbox,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: sandbox }),
    });
    const ms = hrtimeMs(start);

    assert.equal(
      result.status,
      0,
      'init MUST exit 0; stderr=' + (result.stderr || '')
    );

    // Structural sanity — framework directory tree present.
    assert.ok(
      fs.existsSync(path.join(sandbox, '.kaizen-dvir')),
      'init MUST create .kaizen-dvir/'
    );
    assert.ok(
      fs.existsSync(path.join(sandbox, '.kaizen-dvir', 'commandments.md')),
      'init MUST scaffold commandments.md'
    );
    assert.ok(
      fs.existsSync(path.join(sandbox, '.claude', 'CLAUDE.md')),
      'init MUST scaffold .claude/CLAUDE.md (M7.3)'
    );

    // Performance assertion — Gate 1 / NFR-103.
    assert.ok(
      ms < 30000,
      'init MUST complete in <30000ms; observed=' + ms + 'ms (NFR-103)'
    );

    // Manifest gap — flagged for the gate report. M6.2 deliverable D6.5
    // states `kaizen init` must write `.kaizen-dvir/manifest.json` at
    // scaffold time. Current implementation copies framework files but
    // does not initialize the manifest. This is a real M6.2 gap surfaced
    // here so the gate report can call out the remediation owner.
    const manifestPath = path.join(sandbox, '.kaizen-dvir', 'manifest.json');
    const manifestPresent = fs.existsSync(manifestPath);
    if (!manifestPresent) {
      // Document but do not block — the gate report records this as a
      // CONCERNS-level issue with M6.2 as remediation owner. The test
      // surface here writes a marker into perf-baseline so the gate
      // generator can read it.
      _writePerfMetric('initManifestPresent', 0, 1);
    } else {
      _writePerfMetric('initManifestPresent', 1, 1);
    }

    _writePerfMetric('initTime_ms', ms, 30000);
  } finally {
    rmSandbox(sandbox);
  }
});
