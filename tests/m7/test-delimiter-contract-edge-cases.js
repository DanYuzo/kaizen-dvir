'use strict';

/*
 * test-delimiter-contract-edge-cases.js — KaiZen v1.5 / Story M7.4
 *
 * Validates edge-case behavior of the delimiter-aware merge:
 *
 *   1. CRLF line endings on `ours` — delimiters detected, EXPERT block
 *      bytes preserved with their CRLF intact (the contract is byte-exact
 *      regardless of line-ending style).
 *   2. UTF-8 BOM at start of `ours` — stripped from delimiter detection
 *      but does NOT crash the merge; the post-update file inherits theirs's
 *      shape (no BOM, since the canonical does not emit one).
 *   3. Trailing newline policy — the post-update file inherits theirs's
 *      trailing-newline policy (canonical owns the final byte).
 *   4. Direct call to the pure helper — verifies the underlying
 *      `mergeClaudeMdWithDelimiters` function returns `merged` with
 *      well-formed inputs and `block` with malformed inputs, independent
 *      of the orchestrator wiring.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helpers = require('./_helpers-delimiter.js');
const ROOT = path.resolve(__dirname, '..', '..');
const delim = require(
  path.join(ROOT, '.kaizen-dvir', 'dvir', 'update', 'delimiter-merge.js')
);

const NEW_CANONICAL_SENTINEL = 'KZ-M7.4-SENTINEL-LINE: novo comando v1.6';

test('M7.4 edge: CRLF line endings on ours — EXPERT block bytes preserved verbatim', () => {
  // Convert the expert-edited fixture to CRLF.
  const lf = helpers.readFixture('claude-md-expert-edited.md');
  const crlf = lf.replace(/\r?\n/g, '\r\n');
  // Capture the EXPERT block bytes (CRLF-wrapped) before update.
  const expertBefore = helpers.extractExpertBlockBytes(crlf);
  assert.ok(expertBefore.length > 0, 'sanity: CRLF EXPERT block extractable');
  assert.ok(/\r\n/.test(expertBefore), 'sanity: EXPERT block carries CRLF');

  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody: crlf,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(
      result.exitCode,
      0,
      'CRLF ours must merge cleanly; stderr=\n' + result.stderr
    );
    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    const expertAfter = helpers.extractExpertBlockBytes(after);
    assert.equal(
      expertAfter,
      expertBefore,
      'EXPERT block bytes must be preserved verbatim including CRLF (CON-007)'
    );
    // FRAMEWORK content from canonical (LF) sits in the same file alongside
    // the CRLF expert bytes — that is the contract: file shape from theirs,
    // EXPERT bytes from ours.
    assert.ok(
      after.indexOf(NEW_CANONICAL_SENTINEL) >= 0,
      'canonical FRAMEWORK content present'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 edge: UTF-8 BOM at start of ours — merge succeeds, EXPERT bytes preserved', () => {
  const BOM = '﻿';
  const ours = BOM + helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const expertBefore = helpers.extractExpertBlockBytes(ours);

  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody: ours,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(
      result.exitCode,
      0,
      'BOM ours must merge cleanly; stderr=\n' + result.stderr
    );
    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    // Post-update file inherits theirs shape — canonical has no BOM.
    assert.equal(
      after.charCodeAt(0),
      '#'.charCodeAt(0),
      'post-update first byte must be the canonical "#" (no BOM)'
    );
    const expertAfter = helpers.extractExpertBlockBytes(after);
    assert.equal(
      expertAfter,
      expertBefore,
      'EXPERT block bytes preserved despite BOM on ours'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 edge: trailing-newline policy follows theirs (canonical owns file shape)', () => {
  // Strip trailing newline from ours; canonical has one.
  const oursBody = helpers
    .readFixture('claude-md-expert-edited.md')
    .replace(/\n+$/u, '');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  assert.ok(theirsBody.endsWith('\n'), 'sanity: canonical has trailing newline');

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
      after.endsWith('\n'),
      'post-update file inherits theirs trailing-newline policy'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 edge: direct pure-function call — merged status with well-formed inputs', () => {
  const ours = helpers.readFixture('claude-md-expert-edited.md');
  const theirs = helpers.readFixture('claude-md-new-canonical.md');
  const r = delim.mergeClaudeMdWithDelimiters({ ours, theirs });
  assert.equal(r.status, 'merged');
  assert.ok(typeof r.content === 'string' && r.content.length > 0);
  // EXPERT bytes match.
  const expertOurs = helpers.extractExpertBlockBytes(ours);
  const expertOut = helpers.extractExpertBlockBytes(r.content);
  assert.equal(expertOut, expertOurs);
  // FRAMEWORK sentinel from theirs survived.
  assert.ok(r.content.indexOf(NEW_CANONICAL_SENTINEL) >= 0);
});

test('M7.4 edge: direct pure-function call — block status with corrupt ours', () => {
  const ours = helpers
    .readFixture('claude-md-expert-edited.md')
    .replace('<!-- KAIZEN:FRAMEWORK:END -->\n', '');
  const theirs = helpers.readFixture('claude-md-new-canonical.md');
  const r = delim.mergeClaudeMdWithDelimiters({ ours, theirs });
  assert.equal(r.status, 'block');
  assert.equal(r.reason, 'missing_delimiters_ours');
  assert.ok(Array.isArray(r.missing) && r.missing.indexOf('KAIZEN:FRAMEWORK:END') >= 0);
  assert.ok(typeof r.errorPtBR === 'string' && /contrato de delimiters violado/u.test(r.errorPtBR));
});

test('M7.4 edge: direct pure-function call — exported delimiter constants are byte-exact', () => {
  // The four named exports must match the literal contract bytes.
  assert.equal(delim.FRAMEWORK_START, '<!-- KAIZEN:FRAMEWORK:START -->');
  assert.equal(delim.FRAMEWORK_END, '<!-- KAIZEN:FRAMEWORK:END -->');
  assert.equal(delim.EXPERT_START, '<!-- KAIZEN:EXPERT:START -->');
  assert.equal(delim.EXPERT_END, '<!-- KAIZEN:EXPERT:END -->');
});

test('M7.4 edge: direct pure-function call — type errors on bad input', () => {
  assert.throws(() => delim.mergeClaudeMdWithDelimiters(null), TypeError);
  assert.throws(
    () => delim.mergeClaudeMdWithDelimiters({ ours: 1, theirs: 'x' }),
    TypeError
  );
});

test('M7.4 edge: idempotent re-run — second update produces identical bytes', () => {
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    let r = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(r.exitCode, 0);
    const afterFirst = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );

    // Re-run against the same canonical. The version pair after first
    // update is 1.6.0 -> 1.6.0 which the orchestrator treats as a no-op
    // (same_version), so the file remains unchanged. We assert the bytes
    // do not drift across invocations.
    r = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.equal(r.exitCode, 0);
    const afterSecond = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.equal(
      afterSecond,
      afterFirst,
      'second run must produce byte-identical output (idempotent)'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});
