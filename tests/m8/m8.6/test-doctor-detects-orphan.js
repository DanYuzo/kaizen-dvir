'use strict';

/**
 * test-doctor-detects-orphan.js — when a stray `.md` file lives under
 * `.claude/commands/Kaizen/` whose basename does not match any installed
 * cell, doctor reports it as an orphan AVISO. The orphan file is NEVER
 * deleted by doctor (read-only contract).
 *
 * Story: M8.6
 * Trace: AC-026 (drift detection), NFR-101 (actionable pt-BR), Scope OUT
 *        line 105 (doctor read-only — fix is `kaizen update`/`init`).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.6: orphan top-level skill emits AVISO and is preserved on disk', () => {
  const tmp = H.mkProject('orphan');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);

    const orphanPath = path.join(
      tmp,
      '.claude',
      'commands',
      'Kaizen',
      'Stale.md'
    );
    fs.writeFileSync(orphanPath, '# Stale skill\n', 'utf8');
    assert.ok(H.fileExists(orphanPath), 'pre-condition: orphan planted');

    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(doc.status, 0, 'exit 0 preserved on WARN');

    const lines = doc.stdout.split(/\r?\n/);
    const aviso = lines.find(
      (l) =>
        l.indexOf('AVISO:') !== -1 &&
        l.indexOf('skill orfa em') !== -1 &&
        l.indexOf('Stale.md') !== -1
    );
    assert.ok(aviso, 'must emit orphan AVISO; stdout=' + doc.stdout);
    assert.match(aviso, /AVISO: skill orfa em /);
    assert.match(
      aviso,
      /sem celula correspondente\. Remova o arquivo ou registre a celula\./
    );

    // Read-only: orphan must still exist after doctor run.
    assert.ok(
      H.fileExists(orphanPath),
      'orphan file must NOT be deleted by doctor (read-only contract)'
    );
  } finally {
    H.rmProject(tmp);
  }
});
