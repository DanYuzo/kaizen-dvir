'use strict';

/**
 * test-doctor-detects-missing-specialist.js — when a specialist sub-skill
 * file is deleted (entry intact), doctor emits a pt-BR AVISO that names
 * the missing specialist agent id, the cell, and the expected path, with
 * the fix suggestion.
 *
 * Story: M8.6
 * Note: Story scope OUT line 106 originally deferred specialist drift to
 *       M8.7. The spawn prompt (Wave directive 8) explicitly requires
 *       per-specialist detection in this wave; the implementation
 *       supports it generically and this test pins the contract so M8.7
 *       integration tests do not need to re-establish it.
 * Trace: AC-026 (per-cell skill check), NFR-101 (actionable pt-BR with
 *        fix suggestion), NFR-102 (pt-BR user-facing).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.6: missing specialist skill emits per-specialist AVISO with fix suggestion', () => {
  const tmp = H.mkProject('missing-specialist');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);

    const targetSpecialist = 'risk-mapper';
    const specialistPath = path.join(
      tmp,
      '.claude',
      'commands',
      'Kaizen',
      'Yotzer',
      targetSpecialist + '.md'
    );
    assert.ok(
      H.fileExists(specialistPath),
      'pre-condition: specialist file present'
    );
    fs.unlinkSync(specialistPath);
    assert.ok(
      !H.fileExists(specialistPath),
      'pre-condition: specialist file removed'
    );

    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(doc.status, 0, 'exit 0 preserved on WARN');

    // Entry still present → OK line for yotzer.
    assert.match(
      doc.stdout,
      /OK: yotzer -> \/Kaizen:Yotzer/,
      'entry skill still present, OK line still emitted'
    );

    const lines = doc.stdout.split(/\r?\n/);
    const aviso = lines.find(
      (l) =>
        l.indexOf('AVISO:') !== -1 &&
        l.indexOf("especialista '" + targetSpecialist + "'") !== -1
    );
    assert.ok(aviso, 'must emit per-specialist AVISO; stdout=' + doc.stdout);
    assert.match(aviso, /AVISO: especialista 'risk-mapper'/);
    assert.match(aviso, /da celula 'yotzer'/);
    assert.match(aviso, /Kaizen[\\\/]Yotzer[\\\/]risk-mapper\.md/);
    assert.match(
      aviso,
      /Rode 'kaizen update' ou 'kaizen init' para registrar\./
    );
  } finally {
    H.rmProject(tmp);
  }
});
