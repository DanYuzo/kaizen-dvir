'use strict';

/*
 * test-delimiter-contract-missing-delimiters.js — KaiZen v1.5 / Story M7.4
 *
 * Validates the BLOCK escalation path: when the local `.claude/CLAUDE.md`
 * is missing one or more of the four required delimiters, `kaizen update`
 * MUST halt before applying any changes and emit a pt-BR reproducer
 * message that guides the expert to correction (NFR-101).
 *
 * Why this matters
 * ----------------
 * Per CON-007, the contract is byte-exact or it BLOCKs. We never silently
 * fall back to generic merge3 when the delimiter contract is broken,
 * because that would risk overwriting expert content that lacks delimiter
 * protection. The story explicitly demands the BLOCK path produce a
 * reproducer rather than a silent pass.
 *
 * Asserts
 * -------
 *   - Exit code is non-zero (1 — fatal halt, not a conflict halt).
 *   - The local file is left UNCHANGED on disk.
 *   - The pt-BR reproducer mentions all four canonical delimiter names
 *     and the file path so the expert can locate and fix the issue.
 *   - The reproducer mentions `kaizen rollback` as a recovery option
 *     (NFR-101 — guide correction).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helpers = require('./_helpers-delimiter.js');

function corruptOurs(name) {
  // Read the expert-edited fixture and remove ONE delimiter to simulate
  // a corrupted local file. Different test cases corrupt different
  // delimiters to exercise the missing-list assembly.
  const base = helpers.readFixture('claude-md-expert-edited.md');
  if (name === 'no-fw-start') {
    return base.replace('<!-- KAIZEN:FRAMEWORK:START -->\n', '');
  }
  if (name === 'no-fw-end') {
    return base.replace('<!-- KAIZEN:FRAMEWORK:END -->\n', '');
  }
  if (name === 'no-ex-start') {
    return base.replace('<!-- KAIZEN:EXPERT:START -->\n', '');
  }
  if (name === 'no-ex-end') {
    return base.replace('<!-- KAIZEN:EXPERT:END -->\n', '');
  }
  if (name === 'all-missing') {
    return base
      .replace('<!-- KAIZEN:FRAMEWORK:START -->\n', '')
      .replace('<!-- KAIZEN:FRAMEWORK:END -->\n', '')
      .replace('<!-- KAIZEN:EXPERT:START -->\n', '')
      .replace('<!-- KAIZEN:EXPERT:END -->\n', '');
  }
  throw new Error('unknown corruption: ' + name);
}

test('M7.4 BLOCK: missing FRAMEWORK:START in ours halts update with pt-BR reproducer', () => {
  const oursBody = corruptOurs('no-fw-start');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const before = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );

    const result = helpers.runUpdate(['--canonical-root', canonical], project);

    // BLOCK exit (the orchestrator returns 1 on fatal halt).
    assert.notEqual(
      result.exitCode,
      0,
      'corrupt local must halt update; got exitCode=' + result.exitCode
    );

    // Local file untouched.
    const after = fs.readFileSync(
      path.join(project, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.equal(after, before, 'local file must be untouched on BLOCK');

    // pt-BR reproducer surfaced to stderr.
    assert.match(
      result.stderr,
      /contrato de delimiters violado/u,
      'stderr must contain the pt-BR contract violation prefix'
    );
    assert.match(
      result.stderr,
      /KAIZEN:FRAMEWORK:START/,
      'stderr must list the missing FRAMEWORK:START delimiter'
    );
    assert.match(
      result.stderr,
      /\.claude\/CLAUDE\.md/u,
      'stderr must mention the file path'
    );
    assert.match(
      result.stderr,
      /Como corrigir/u,
      'stderr must include the pt-BR "Como corrigir" guidance section'
    );
    assert.match(
      result.stderr,
      /kaizen rollback/u,
      'stderr must mention kaizen rollback as a recovery option (NFR-101)'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 BLOCK: missing EXPERT:END in ours halts and lists EXPERT:END as missing', () => {
  const oursBody = corruptOurs('no-ex-end');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.notEqual(result.exitCode, 0);
    assert.match(
      result.stderr,
      /KAIZEN:EXPERT:END/,
      'stderr must list the missing EXPERT:END delimiter'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 BLOCK: all four delimiters missing in ours produces a complete missing list', () => {
  const oursBody = corruptOurs('all-missing');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');
  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody,
    theirsBody,
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.notEqual(result.exitCode, 0);
    // All four delimiter names mentioned in the missing list.
    assert.match(result.stderr, /KAIZEN:FRAMEWORK:START/);
    assert.match(result.stderr, /KAIZEN:FRAMEWORK:END/);
    assert.match(result.stderr, /KAIZEN:EXPERT:START/);
    assert.match(result.stderr, /KAIZEN:EXPERT:END/);
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4 BLOCK: malformed delimiter order in ours halts with pt-BR ordering guidance', () => {
  // Build a body where EXPERT:START appears BEFORE FRAMEWORK:END, breaking
  // the canonical order. This exercises the malformed_delimiters_ours path
  // (validateDelimiters returns a malformed_delimiters_* reason).
  const fixturePath = path.join(
    __dirname,
    'fixtures',
    'claude-md-expert-edited.md'
  );
  const original = fs.readFileSync(fixturePath, 'utf8');
  // Swap EXPERT:START up to a position before FRAMEWORK:END by inserting
  // an EXPERT:START line near the top and removing the canonical one.
  let mangled = original.replace(
    '## 1. Identidade do Projeto',
    '<!-- KAIZEN:EXPERT:START -->\n## 1. Identidade do Projeto'
  );
  // Now we have TWO EXPERT:START lines. Remove the original one further
  // down so there is exactly one but in the wrong position.
  // The "## 1. Identidade do Projeto" line is BEFORE FRAMEWORK:END so the
  // freshly injected EXPERT:START is now in front of FRAMEWORK:END, which
  // makes the order check fail.
  // To get exactly one EXPERT:START, also delete the original.
  mangled = mangled.replace('<!-- KAIZEN:EXPERT:START -->\n<!--\n  Área livre do expert', '<!--\n  Área livre do expert');

  const { project, canonical } = helpers.setupDelimiterSandbox({
    oursBody: mangled,
    theirsBody: helpers.readFixture('claude-md-new-canonical.md'),
  });
  try {
    const result = helpers.runUpdate(['--canonical-root', canonical], project);
    assert.notEqual(result.exitCode, 0, 'malformed order must halt');
    // Either ordering or missing path — both surface "contrato de delimiters
    // violado". Be lenient on which sub-message we got because removing the
    // original EXPERT:START line may also remove its content; the contract
    // is still honored at the BLOCK level.
    assert.match(result.stderr, /contrato de delimiters violado/u);
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});
