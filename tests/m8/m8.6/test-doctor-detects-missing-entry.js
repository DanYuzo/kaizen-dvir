'use strict';

/**
 * test-doctor-detects-missing-entry.js — when the entry skill file is
 * deleted from `.claude/commands/Kaizen/`, doctor emits a pt-BR AVISO
 * containing the cell path, the expected skill path, and the fix
 * suggestion. Exit code remains 0 (M2/M3 doctor semantics preserved).
 *
 * Story: M8.6
 * Trace: AC line 82 (AVISO format), AC line 84 (exit 0 on WARN), AC-026,
 *        NFR-101, NFR-102.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.6: missing entry skill emits AVISO with cell path, expected path, and fix suggestion', () => {
  const tmp = H.mkProject('missing-entry');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);

    const entryPath = path.join(
      tmp,
      '.claude',
      'commands',
      'Kaizen',
      'Yotzer.md'
    );
    assert.ok(H.fileExists(entryPath), 'pre-condition: entry skill present');
    fs.unlinkSync(entryPath);
    assert.ok(!H.fileExists(entryPath), 'pre-condition: entry skill removed');

    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(
      doc.status,
      0,
      'AVISO must NOT change exit code; status=' + doc.status + ' stderr=' + doc.stderr
    );

    // The AVISO line must contain: "AVISO: celula em <cellPath> sem skill
    // registrada em <expectedSkillPath>. Rode 'kaizen update' ou 'kaizen
    // init' para registrar." — single line in pt-BR.
    const lines = doc.stdout.split(/\r?\n/);
    const aviso = lines.find(
      (l) => l.indexOf('AVISO:') !== -1 && l.indexOf('sem skill registrada em') !== -1
    );
    assert.ok(aviso, 'must emit AVISO line for missing entry; stdout=' + doc.stdout);

    assert.match(aviso, /AVISO: celula em /, 'AVISO opens with pt-BR prefix');
    assert.match(
      aviso,
      /celulas[\\\/]yotzer/,
      'AVISO names the cell directory'
    );
    assert.match(
      aviso,
      /Kaizen[\\\/]Yotzer\.md/,
      'AVISO names the expected entry skill path'
    );
    assert.match(
      aviso,
      /Rode 'kaizen update' ou 'kaizen init' para registrar\./,
      'AVISO includes the pt-BR fix suggestion'
    );

    // No OK line for yotzer when its entry is missing.
    assert.ok(
      doc.stdout.indexOf('OK: yotzer') === -1,
      'no OK line should appear when entry skill is missing; stdout=' + doc.stdout
    );
  } finally {
    H.rmProject(tmp);
  }
});
