'use strict';

/**
 * test-init-malformed-cell-fails.js — when a bundled cell's `celula.yaml`
 * is malformed (missing required `slashPrefix`), `kaizen init` aborts with
 * exit code != 0 and prints a pt-BR error message on stderr.
 *
 * Strategy: run init once on a clean dir to land the Yotzer scaffold, then
 * corrupt `.kaizen-dvir/celulas/yotzer/celula.yaml` (strip `slashPrefix:`)
 * and run init again. The second run must abort.
 *
 * Note: the M8.2 helper guards `slashPrefix`. Stripping it triggers the
 * `slashPrefix obrigatorio` pt-BR error message — the cleanest malformation
 * proxy that lives entirely in the shipped fixture surface.
 *
 * Story:  M8.3 — wire kaizen init to register cell skills
 * Traces: AC line 83 (non-zero exit + pt-BR stderr), NFR-101
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('M8.3: init aborts non-zero with pt-BR stderr when a cell manifest is malformed', () => {
  const tmp = H.mkTmp('malformed');
  try {
    // First init: scaffold the Yotzer cell so its manifest is on disk.
    const first = H.runInit(tmp);
    assert.strictEqual(first.status, 0, 'first init exits 0; stderr=' + first.stderr);

    // Corrupt the manifest: strip the slashPrefix line entirely. The M8.2
    // helper raises "campo slashPrefix obrigatorio ausente" — pt-BR.
    const manifestPath = path.join(
      tmp, '.kaizen-dvir', 'celulas', 'yotzer', 'celula.yaml'
    );
    const original = fs.readFileSync(manifestPath, 'utf8');
    const corrupted = original
      .split(/\r?\n/)
      .filter((line) => !/^\s*slashPrefix\s*:/.test(line))
      .join('\n');
    assert.notStrictEqual(
      corrupted,
      original,
      'sanity: stripping slashPrefix changed the file'
    );
    fs.writeFileSync(manifestPath, corrupted, 'utf8');

    // Second init: must abort with non-zero exit and a pt-BR error.
    const second = H.runInit(tmp);
    assert.notStrictEqual(
      second.status,
      0,
      'second init must exit non-zero on malformed manifest'
    );
    assert.match(
      second.stderr,
      /erro ao registrar skills das celulas:/,
      'stderr must include the pt-BR error preamble'
    );
    assert.match(
      second.stderr,
      /celula 'yotzer'/,
      'stderr must name the offending cell'
    );
    assert.match(
      second.stderr,
      /slashPrefix/,
      'stderr must mention the missing field (helper message preserved)'
    );
    assert.match(
      second.stderr,
      /Init abortado para preservar estado consistente/,
      'stderr must declare the half-state guard in pt-BR'
    );
  } finally {
    H.rmTmp(tmp);
  }
});
