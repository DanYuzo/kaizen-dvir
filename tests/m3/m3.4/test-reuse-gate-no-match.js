'use strict';

// AC 10 — Reuse Gate is silent when no candidates are found. No verdict
// written, no message surfaced.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('empty scan roots → silent OK, no log entry', () => {
  const logs = helpers.mkTmpLogs('rg-quiet-empty');
  const root = helpers.mkTmpReuseRoots('rg-quiet-empty');
  try {
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('cell', 'yotzer');
    assert.strictEqual(out.verdict, 'OK');
    assert.strictEqual(out.candidates.length, 0);
    assert.strictEqual(out.message, undefined);
    const entries = helpers.readJsonl(logs, 'gate-verdicts');
    const reuseEntries = entries.filter(
      (e) => e.gate_id === 'reuse-gate' || e.hook_name === 'reuse-gate'
    );
    assert.strictEqual(reuseEntries.length, 0, 'silent pass writes nothing');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});

test('non-matching directories → silent OK', () => {
  const logs = helpers.mkTmpLogs('rg-quiet-nomatch');
  const root = helpers.mkTmpReuseRoots('rg-quiet-nomatch');
  try {
    fs.mkdirSync(path.join(root, 'completamente-diferente'), { recursive: true });
    fs.mkdirSync(path.join(root, 'outra-coisa'), { recursive: true });
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('cell', 'yotzer');
    assert.strictEqual(out.verdict, 'OK');
    assert.strictEqual(out.candidates.length, 0);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});

test('insufficient input → silent OK', () => {
  const logs = helpers.mkTmpLogs('rg-quiet-noinput');
  const root = helpers.mkTmpReuseRoots('rg-quiet-noinput');
  try {
    fs.mkdirSync(path.join(root, 'yotzer-cell'), { recursive: true });
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('', '');
    assert.strictEqual(out.verdict, 'OK');
    assert.strictEqual(out.candidates.length, 0);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});
