'use strict';

// AC 9 / FR-022 — Reuse Gate emits WARN with candidate list when
// duplication potential is detected. WARN never blocks advance.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('matching directory name emits WARN with candidate path', () => {
  const logs = helpers.mkTmpLogs('rg-warn-dir');
  const root = helpers.mkTmpReuseRoots('rg-warn-dir');
  try {
    fs.mkdirSync(path.join(root, 'yotzer-cell'), { recursive: true });
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('cell', 'yotzer');
    assert.strictEqual(out.verdict, 'WARN');
    assert.ok(out.candidates.length >= 1);
    assert.match(out.message, /atencao/);
    assert.match(out.message, /yotzer/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});

test('intent token match (>=4 chars) emits WARN', () => {
  const logs = helpers.mkTmpLogs('rg-warn-tok');
  const root = helpers.mkTmpReuseRoots('rg-warn-tok');
  try {
    fs.mkdirSync(path.join(root, 'lancamento-2026'), { recursive: true });
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('campaign', 'lancamento de produto');
    assert.strictEqual(out.verdict, 'WARN');
    assert.ok(out.candidates.length >= 1);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});

test('candidate cap honored at 5 entries', () => {
  const logs = helpers.mkTmpLogs('rg-warn-cap');
  const root = helpers.mkTmpReuseRoots('rg-warn-cap');
  try {
    for (let i = 0; i < 8; i++) {
      fs.mkdirSync(path.join(root, 'yotzer-' + i), { recursive: true });
    }
    const reuse = helpers.freshGate('reuse-gate.js');
    const out = reuse.check('cell', 'yotzer');
    assert.strictEqual(out.verdict, 'WARN');
    assert.strictEqual(out.candidates.length, reuse.CANDIDATE_CAP);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});

test('WARN entries are recorded to gate-verdicts log', () => {
  const logs = helpers.mkTmpLogs('rg-warn-log');
  const root = helpers.mkTmpReuseRoots('rg-warn-log');
  try {
    fs.mkdirSync(path.join(root, 'yotzer-cell'), { recursive: true });
    const reuse = helpers.freshGate('reuse-gate.js');
    reuse.check('cell', 'yotzer');
    const entries = helpers.readJsonl(logs, 'gate-verdicts');
    const warns = entries.filter((e) => e.verdict === 'WARN');
    assert.ok(warns.length >= 1);
    assert.ok(Array.isArray(warns[0].candidates));
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(root);
  }
});
