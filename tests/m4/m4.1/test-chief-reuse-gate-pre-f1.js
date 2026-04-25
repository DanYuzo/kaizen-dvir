'use strict';

// AC 14, AC-112, FR-116 — chief invokes Reuse Gate before entering F1.
// WARN surfaces candidates in pt-BR when a similar cell exists.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('reuse-gate.check returns OK when no candidate exists (silent pass)', () => {
  const reuseDir = helpers.mkTmpReuseRoots('reuse-ok');
  const logs = helpers.mkTmpLogs('reuse-ok-logs');
  try {
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('celula', 'relatorio-semanal-unico');
    assert.strictEqual(out.verdict, 'OK');
    assert.deepStrictEqual(out.candidates, []);
  } finally {
    helpers.clearEnv();
    helpers.rm(reuseDir);
    helpers.rm(logs);
  }
});

test('reuse-gate.check returns WARN with pt-BR message when candidate exists (AC 14, AC-112)', () => {
  const reuseDir = helpers.mkTmpReuseRoots('reuse-warn');
  const logs = helpers.mkTmpLogs('reuse-warn-logs');
  try {
    // Seed a candidate directory that matches the intent token.
    const candidate = path.join(reuseDir, 'relatorio-semanal');
    fs.mkdirSync(candidate, { recursive: true });
    fs.writeFileSync(
      path.join(candidate, 'celula.yaml'),
      'description: "x"\n',
      'utf8'
    );
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('celula', 'relatorio semanal');
    assert.strictEqual(out.verdict, 'WARN');
    assert.ok(out.candidates.length >= 1);
    assert.match(out.message || '', /atencao/);
    assert.match(out.message || '', /candidatos/);
  } finally {
    helpers.clearEnv();
    helpers.rm(reuseDir);
    helpers.rm(logs);
  }
});

test('chief.md declares invoke_reuse_gate_pre_f1 authority (AC 14)', () => {
  const chiefPath = path.join(
    helpers.YOTZER_CELL_ROOT,
    'agents',
    'chief.md'
  );
  const text = fs.readFileSync(chiefPath, 'utf8');
  assert.match(text, /invoke_reuse_gate_pre_f1/);
});
