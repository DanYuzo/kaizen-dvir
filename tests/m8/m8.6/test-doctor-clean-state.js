'use strict';

/**
 * test-doctor-clean-state.js — fully registered project produces an OK
 * line per cell and zero AVISO lines in the skill-check section.
 *
 * Story: M8.6 — Extend `kaizen doctor --cells` to detect cells without
 *               registered skills.
 * Trace: AC line 83 (OK format), AC-026, NFR-102.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const H = require('./_helpers.js');

test('M8.6: clean state — every cell shows OK with name and slash command', () => {
  const tmp = H.mkProject('clean');
  try {
    const init = H.runInit(tmp);
    assert.strictEqual(init.status, 0, 'init must succeed; stderr=' + init.stderr);

    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(doc.status, 0, 'doctor exits 0; stderr=' + doc.stderr);

    assert.match(
      doc.stdout,
      /Skills Claude Code:/,
      'skill-check section header must appear'
    );
    assert.match(
      doc.stdout,
      /OK: yotzer -> \/Kaizen:Yotzer/,
      'OK line must include cell name and the slash command'
    );
    assert.ok(
      doc.stdout.indexOf('AVISO:') === -1,
      'no AVISO lines expected on clean state; stdout=' + doc.stdout
    );
  } finally {
    H.rmProject(tmp);
  }
});
