'use strict';

/*
 * test-delimiter-contract-framework-overwrite.js — KaiZen v1.5 / Story M7.4
 *
 * Validates the second half of the CON-007 contract: the FRAMEWORK block
 * is replaced wholesale by the canonical content from `theirs`, and any
 * expert drift inside the FRAMEWORK block is overwritten (NOT preserved,
 * NOT merged).
 *
 * Why this matters
 * ----------------
 * Generic line-based 3-way merge would attempt to merge the expert's
 * drift inside the FRAMEWORK block with the new canonical content, which
 * either preserves the drift (silently violating the contract) or
 * surfaces a conflict (blocking updates that should succeed cleanly).
 * Both behaviors are wrong for `.claude/CLAUDE.md`. The delimiter-aware
 * merge must replace FRAMEWORK content unconditionally.
 *
 * Asserts
 * -------
 *   - The unique sentinel string in the new canonical FRAMEWORK appears
 *     verbatim in the post-update file.
 *   - The drift line that the expert added inside the FRAMEWORK block
 *     does NOT appear in the post-update file.
 *   - The version-bump line ("v1.6") from canonical replaces the
 *     ("v1.5") line that was in the local file.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helpers = require('./_helpers-delimiter.js');

// Sentinel strings — chosen to be unambiguous (cannot appear by coincidence
// in either an expert edit or generic merge output).
const NEW_CANONICAL_SENTINEL = 'KZ-M7.4-SENTINEL-LINE: novo comando v1.6';
const EXPERT_DRIFT_LINE = 'NOTA DE DRIFT DO EXPERT';

test('M7.4: new canonical FRAMEWORK content appears verbatim in post-update file', () => {
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');

  // Sanity check fixtures.
  assert.ok(
    theirsBody.indexOf(NEW_CANONICAL_SENTINEL) >= 0,
    'fixture sanity: new-canonical fixture must contain the sentinel string'
  );
  assert.ok(
    oursBody.indexOf(NEW_CANONICAL_SENTINEL) < 0,
    'fixture sanity: expert-edited fixture must NOT pre-contain the sentinel'
  );

  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(
      result.exitCode,
      0,
      'kaizen update must succeed; stderr=\n' + result.stderr
    );

    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.ok(
      after.indexOf(NEW_CANONICAL_SENTINEL) >= 0,
      'post-update file must contain the new canonical sentinel verbatim'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4: expert drift INSIDE the FRAMEWORK block is discarded after update', () => {
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');

  // Sanity check.
  assert.ok(
    oursBody.indexOf(EXPERT_DRIFT_LINE) >= 0,
    'fixture sanity: expert-edited fixture must contain the drift line'
  );

  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(result.exitCode, 0);

    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.ok(
      after.indexOf(EXPERT_DRIFT_LINE) < 0,
      'expert drift inside FRAMEWORK block must NOT survive update (CON-007)'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4: version-bump line in FRAMEWORK is replaced (v1.5 → v1.6)', () => {
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(result.exitCode, 0);

    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    // The new canonical pins v1.6 inside the FRAMEWORK block; the old
    // pinned v1.5 line must be gone.
    assert.ok(
      /\*\*KaiZen v1\.6\*\*/u.test(after),
      'post-update FRAMEWORK must reflect the new canonical version'
    );
    // Old v1.5 line was within the FRAMEWORK block and must be replaced.
    // Note: the v1.5 token may still appear in fixture comments outside
    // the FRAMEWORK block; we narrow the assertion to the FRAMEWORK slice.
    const fwStart = after.search(/<!--\s*KAIZEN:FRAMEWORK:START\s*-->/);
    const fwEnd = after.search(/<!--\s*KAIZEN:FRAMEWORK:END\s*-->/);
    const fwSlice = after.slice(fwStart, fwEnd);
    assert.ok(
      !/\*\*KaiZen v1\.5\*\*/u.test(fwSlice),
      'old v1.5 pinned line must not survive inside the post-update FRAMEWORK block'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4: EXPERT block sentinel survives even when FRAMEWORK is replaced', () => {
  // Cross-check: the same update that overwrites FRAMEWORK drift must
  // still preserve the expert's deterministic notes inside EXPERT.
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(result.exitCode, 0);

    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.ok(
      after.indexOf('Sistema de gestão de campanhas') >= 0,
      'expert note "Sistema de gestão de campanhas" must survive'
    );
    assert.ok(
      after.indexOf('alvo trimestral: 200 leads qualificados') >= 0,
      'expert sub-bullet must survive'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});
