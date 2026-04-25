'use strict';

// AC 4, 11, 12: appendPattern, appendException, appendCrossRef, appendChangeLog
// are append-only — prior content is preserved byte-for-byte after each call.
// Module is CommonJS / stdlib only.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpCelulas, mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

test('appendPattern preserves all prior content byte-for-byte (AC 4)', async () => {
  const tmp = mkTmpCelulas('append-pattern');
  try {
    const writer = requireFresh('memory-writer.js');
    const target = path.join(tmp, 'demo-cell', 'MEMORY.md');

    await writer.appendPattern('demo-cell', 'primeiro padrão', 'low');
    const after1 = fs.readFileSync(target, 'utf8');

    await writer.appendPattern('demo-cell', 'segundo padrão', 'medium');
    const after2 = fs.readFileSync(target, 'utf8');

    assert.ok(
      after2.startsWith(after1),
      'second append must keep first append intact at the prefix'
    );
    assert.ok(
      after2.includes('primeiro padrão') && after2.includes('segundo padrão'),
      'both patterns must be present after the second call'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('appendException, appendCrossRef, appendChangeLog all preserve prior bytes (AC 4)', async () => {
  const tmp = mkTmpCelulas('append-all');
  try {
    const writer = requireFresh('memory-writer.js');
    const target = path.join(tmp, 'cellx', 'MEMORY.md');

    await writer.appendPattern('cellx', 'p1', 'high');
    const a = fs.readFileSync(target, 'utf8');

    await writer.appendException('cellx', 'contexto x', 'tratar y');
    const b = fs.readFileSync(target, 'utf8');
    assert.ok(b.startsWith(a), 'exception append must keep pattern bytes');

    await writer.appendCrossRef('cellx', 'refs/ikigai/quem-sou.md', 'antes de copy');
    const c = fs.readFileSync(target, 'utf8');
    assert.ok(c.startsWith(b), 'crossref append must keep prior bytes');

    await writer.appendChangeLog('cellx', '@dev', 'criou primeira entrada');
    const d = fs.readFileSync(target, 'utf8');
    assert.ok(c.length < d.length, 'change log append must add bytes');
    assert.ok(d.startsWith(c), 'change log append must keep prior bytes');
  } finally {
    rmTmp(tmp);
  }
});

test('appendPattern rejects invalid confidence (AC 4 input contract)', async () => {
  const tmp = mkTmpCelulas('badconf');
  try {
    const writer = requireFresh('memory-writer.js');
    await assert.rejects(
      () => writer.appendPattern('cell', 'p', 'extreme'),
      /confiança inválida/
    );
  } finally {
    rmTmp(tmp);
  }
});

test('flagForPromotion writes a candidate row to promotion-candidates.yaml (AC 10, FR-025)', async () => {
  const tmpCelulas = mkTmpCelulas('flag-celulas');
  const tmpLogs = mkTmpLogs('flag-logs');
  try {
    const writer = requireFresh('memory-writer.js');
    const result = await writer.flagForPromotion('hook curto converte mais', 'yotzer');
    assert.ok(result.path.endsWith('promotion-candidates.yaml'));
    assert.strictEqual(result.entry.status, 'candidate');
    assert.strictEqual(result.entry.celula, 'yotzer');
    assert.strictEqual(result.entry.pattern, 'hook curto converte mais');

    const body = fs.readFileSync(result.path, 'utf8');
    const lines = body.trim().split('\n').map((l) => JSON.parse(l));
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].status, 'candidate');

    // A second flag must append (not overwrite).
    await writer.flagForPromotion('cta direta funciona', 'yotzer');
    const body2 = fs.readFileSync(result.path, 'utf8');
    const lines2 = body2.trim().split('\n').map((l) => JSON.parse(l));
    assert.strictEqual(lines2.length, 2, 'second flag must append, not overwrite');
  } finally {
    rmTmp(tmpCelulas);
    rmTmp(tmpLogs);
  }
});

test('flagForPromotion does NOT promote — only flags (AC 10)', async () => {
  const tmpCelulas = mkTmpCelulas('no-promote');
  const tmpLogs = mkTmpLogs('no-promote-logs');
  try {
    const writer = requireFresh('memory-writer.js');
    const result = await writer.flagForPromotion('p', 'yotzer');
    // Status must be `candidate` — not `approved` or `promoted`.
    assert.strictEqual(
      result.entry.status,
      'candidate',
      'flag must mark as candidate; promotion is M3.5 expert-gated'
    );
  } finally {
    rmTmp(tmpCelulas);
    rmTmp(tmpLogs);
  }
});

test('module is stdlib-only (AC 11, 12)', () => {
  const src = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      '.kaizen-dvir',
      'dvir',
      'memory',
      'memory-writer.js'
    ),
    'utf8'
  );
  const requires = src.match(/require\(['"][^'"]+['"]\)/g) || [];
  for (const r of requires) {
    const m = r.match(/require\(['"]([^'"]+)['"]\)/);
    const target = m[1];
    const isNodeCore =
      target.startsWith('node:') ||
      ['fs', 'path', 'os', 'util', 'process'].includes(target);
    const isRelative = target.startsWith('.') || target.startsWith('/');
    assert.ok(
      isNodeCore || isRelative,
      'memory-writer requires only stdlib or relative; found: ' + target
    );
  }
  // CommonJS — uses module.exports, not export
  assert.ok(/module\.exports/.test(src), 'must use module.exports (CommonJS)');
  assert.ok(!/^export\s/m.test(src), 'must not use ES module export keyword');
  assert.ok(!/^import\s/m.test(src), 'must not use ES module import keyword');
});
