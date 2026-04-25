'use strict';

// AC 5, 6: Missing celula.yaml emits a pt-BR error log entry, CIE-3
// bypasses (empty payload, no block), and `markBooted` is NOT called —
// allowing a later corrected manifest to boot. A declared boot file that
// fails to load emits a pt-BR WARN, skips only the failing file, and the
// remaining boot files still load.

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
  readLogFiles,
} = require('./_helpers');

test('missing celula.yaml logs pt-BR error and bypasses (AC 5)', () => {
  const tmp = mkTmp('missing-manifest');
  const fixture = seedFixtureCell(
    'test-cell-broken',
    [], // no boot files
    { missingManifest: true }
  );
  try {
    const cie = cieFresh();
    const result = cie.cie3Boot({
      sessionId: 's-broken',
      prompt: '/Kaizen:' + fixture.cellName,
    });

    assert.strictEqual(result.payload, '', 'bypass with empty payload');
    assert.strictEqual(result.warnings.length, 1);
    assert.match(
      result.warnings[0].message,
      /não tem celula\.yaml/u,
      'pt-BR error mentions missing manifest'
    );

    // markBooted NOT called — state file must not record this cell.
    assert.strictEqual(
      cie.hasBooted(fixture.cellName),
      false,
      'missing manifest does not mark cell booted (allow retry)'
    );

    const entries = readLogFiles(tmp.logs, 'hook-calls');
    const cie3 = entries.filter((e) => e.layer === 'CIE-3');
    assert.ok(cie3.length >= 1);
    assert.strictEqual(cie3[0].event_type, 'cie_3_failure');
    assert.strictEqual(cie3[0].hook_name, 'UserPromptSubmit');
    assert.ok(
      /não|nao/u.test(cie3[0].message),
      'log message is pt-BR'
    );
    assert.doesNotMatch(
      cie3[0].message,
      /^(failed|error|could not) /i,
      'log message must not start with English-only error words'
    );

    // Retry after fixing the manifest: cell boots normally.
    fs.writeFileSync(
      path.join(fixture.dir, 'celula.yaml'),
      'description: "repaired"\nboot:\n  - README.md\n'
    );
    fs.writeFileSync(path.join(fixture.dir, 'README.md'), '# readme');
    const retry = cie.cie3Boot({
      sessionId: 's-broken',
      prompt: '/Kaizen:' + fixture.cellName,
    });
    assert.ok(retry.payload.includes('# readme'));
    assert.strictEqual(cie.hasBooted(fixture.cellName), true);
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});

test('boot file read failure logs pt-BR WARN but loads remaining files (AC 6)', () => {
  const tmp = mkTmp('boot-file-fail');
  const fixture = seedFixtureCell('test-cell-a', [
    { path: 'README.md', content: '# readme' },
    { path: 'MEMORY.md', content: 'memoria' },
  ]);
  try {
    // Remove MEMORY.md so the loader hits ENOENT for one declared file.
    fs.unlinkSync(path.join(fixture.dir, 'MEMORY.md'));

    const cie = cieFresh();
    const result = cie.cie3Boot({
      sessionId: 's-partial',
      prompt: '/Kaizen:' + fixture.cellName,
    });

    assert.ok(
      result.payload.includes('# readme'),
      'remaining boot file still loaded'
    );
    assert.strictEqual(
      result.warnings.length,
      1,
      'one warning for the failing file'
    );
    assert.match(
      result.warnings[0].message,
      /não carregou|nao carregou/u,
      'warning is pt-BR'
    );
    assert.match(result.warnings[0].message, /MEMORY\.md/);

    // Manifest was valid — cell IS marked booted despite partial file failure.
    assert.strictEqual(cie.hasBooted(fixture.cellName), true);

    const entries = readLogFiles(tmp.logs, 'hook-calls');
    const cie3 = entries.filter((e) => e.layer === 'CIE-3');
    assert.ok(cie3.length >= 1);
    assert.strictEqual(cie3[0].event_type, 'cie_3_failure');
    assert.strictEqual(cie3[0].payload.reason, 'boot_file_load_failure');
  } finally {
    clearFixtureCell(fixture);
    rmTmp(tmp);
  }
});
