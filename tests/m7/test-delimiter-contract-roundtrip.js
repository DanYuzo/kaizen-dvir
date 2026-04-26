'use strict';

/*
 * test-delimiter-contract-roundtrip.js — KaiZen v1.5 / Story M7.4
 *
 * Validates the primary CON-007 contract: when `kaizen update` runs against
 * a project where the expert has edited content inside the EXPERT block
 * AND added drift inside the FRAMEWORK block, the post-update file must:
 *
 *   - preserve the EXPERT block bytes byte-for-byte (sha256 equality)
 *   - replace the FRAMEWORK block with the new canonical content
 *   - have exactly four delimiters in canonical order
 *
 * This is the M7 Gate criterion 3 validator — re-used by M7.5.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const helpers = require('./_helpers-delimiter.js');

test('M7.4: EXPERT block bytes preserved across kaizen update (sha256 equality)', () => {
  const oursBody = helpers.readFixture('claude-md-expert-edited.md');
  const theirsBody = helpers.readFixture('claude-md-new-canonical.md');

  // Hash the EXPERT block bytes BEFORE the update.
  const expertBefore = helpers.extractExpertBlockBytes(oursBody);
  assert.ok(
    expertBefore.length > 0,
    'fixture sanity: expert-edited fixture must have non-empty EXPERT block'
  );
  const expertHashBefore = helpers.hashString(expertBefore);

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
    const expertAfter = helpers.extractExpertBlockBytes(after);
    const expertHashAfter = helpers.hashString(expertAfter);

    assert.equal(
      expertHashAfter,
      expertHashBefore,
      'EXPERT block sha256 hash must be byte-identical pre/post update (CON-007)'
    );
    // Also assert verbatim equality for a clear failure diff if the hash
    // somehow matches but bytes differ (e.g. hash collision; extremely
    // improbable, but cheap to add).
    assert.equal(
      expertAfter,
      expertBefore,
      'EXPERT block bytes must be verbatim equal pre/post update'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4: post-update file has exactly four delimiters in canonical order', () => {
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

    // Each delimiter appears exactly once.
    function count(re) {
      const r = new RegExp(re.source, 'g');
      let n = 0;
      while (r.exec(after) !== null) n++;
      return n;
    }
    assert.equal(count(/<!--\s*KAIZEN:FRAMEWORK:START\s*-->/), 1, 'FRAMEWORK:START exactly once');
    assert.equal(count(/<!--\s*KAIZEN:FRAMEWORK:END\s*-->/), 1, 'FRAMEWORK:END exactly once');
    assert.equal(count(/<!--\s*KAIZEN:EXPERT:START\s*-->/), 1, 'EXPERT:START exactly once');
    assert.equal(count(/<!--\s*KAIZEN:EXPERT:END\s*-->/), 1, 'EXPERT:END exactly once');

    // And in the canonical order.
    const fwStartIdx = after.search(/<!--\s*KAIZEN:FRAMEWORK:START\s*-->/);
    const fwEndIdx = after.search(/<!--\s*KAIZEN:FRAMEWORK:END\s*-->/);
    const exStartIdx = after.search(/<!--\s*KAIZEN:EXPERT:START\s*-->/);
    const exEndIdx = after.search(/<!--\s*KAIZEN:EXPERT:END\s*-->/);
    assert.ok(fwStartIdx >= 0 && fwEndIdx > fwStartIdx, 'FW:START < FW:END');
    assert.ok(exStartIdx > fwEndIdx, 'EX:START > FW:END');
    assert.ok(exEndIdx > exStartIdx, 'EX:END > EX:START');
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});

test('M7.4: post-update delimiters are byte-exact canonical strings', () => {
  // The contract requires byte-exact delimiter strings (see
  // .claude/rules/boundary.md § Contrato byte-exato). Even if `ours`
  // contained whitespace-padded variants, the post-update file must use
  // the literal canonical bytes from `theirs`.
  const oursBody = helpers
    .readFixture('claude-md-expert-edited.md')
    // Inject a tolerant whitespace variant in ours to test re-emission.
    .replace(
      '<!-- KAIZEN:EXPERT:START -->',
      '<!--  KAIZEN:EXPERT:START  -->'
    );
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
    // The byte-exact canonical strings must appear verbatim in the output.
    assert.ok(
      after.indexOf('<!-- KAIZEN:FRAMEWORK:START -->') >= 0,
      'byte-exact FRAMEWORK:START present'
    );
    assert.ok(
      after.indexOf('<!-- KAIZEN:FRAMEWORK:END -->') >= 0,
      'byte-exact FRAMEWORK:END present'
    );
    assert.ok(
      after.indexOf('<!-- KAIZEN:EXPERT:START -->') >= 0,
      'byte-exact EXPERT:START present'
    );
    assert.ok(
      after.indexOf('<!-- KAIZEN:EXPERT:END -->') >= 0,
      'byte-exact EXPERT:END present'
    );
    // Tolerant variant from ours must NOT survive.
    assert.ok(
      after.indexOf('<!--  KAIZEN:EXPERT:START  -->') < 0,
      'tolerant whitespace variant from ours must be re-canonicalized'
    );
  } finally {
    helpers.rmRoot(project);
    helpers.rmRoot(canonical);
  }
});
