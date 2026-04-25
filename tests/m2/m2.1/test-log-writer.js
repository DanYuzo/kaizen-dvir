'use strict';

// AC 5, 6, 7: log-writer writes entries with the required fields to the
// correct sub-directory under .kaizen/logs/. Zero external deps (stdlib).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpLogs, rmTmp, requireFresh } = require('./_helpers');

function readJsonLines(file) {
  return fs
    .readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
}

test('write creates sub-dir and appends entry with required fields (AC 5, 6)', () => {
  const tmp = mkTmpLogs('writer');
  try {
    const logWriter = requireFresh('log-writer.js');

    const ts = '2026-04-23T10:00:00.000Z';
    const entry = {
      timestamp: ts,
      event_type: 'dispatch',
      hook_name: 'UserPromptSubmit',
      session_id: 'sess-42',
      payload: { prompt: 'teste' },
    };

    const written = logWriter.write('hook-calls', entry);
    assert.ok(fs.existsSync(written), 'file was created at returned path');
    assert.ok(
      written.includes(path.join('hook-calls', '2026-04-23.jsonl')),
      'file lives under hook-calls/YYYY-MM-DD.jsonl'
    );

    const lines = readJsonLines(written);
    assert.strictEqual(lines.length, 1, 'one line written');
    assert.deepStrictEqual(lines[0], entry, 'entry round-trips intact');

    // Optional `verdict` field is preserved when present.
    const gateEntry = {
      timestamp: ts,
      event_type: 'gate',
      hook_name: 'PreToolUse',
      session_id: 'sess-42',
      verdict: 'BLOCK',
      payload: { tool: 'Bash', reason: 'deny-rule' },
    };
    const gateFile = logWriter.write('gate-verdicts', gateEntry);
    assert.ok(fs.existsSync(gateFile));
    assert.ok(
      gateFile.includes(path.join('gate-verdicts', '2026-04-23.jsonl'))
    );
    const gateLines = readJsonLines(gateFile);
    assert.strictEqual(gateLines[0].verdict, 'BLOCK');
  } finally {
    rmTmp(tmp);
  }
});

test('write appends on repeated calls within the same day (AC 6)', () => {
  const tmp = mkTmpLogs('append');
  try {
    const logWriter = requireFresh('log-writer.js');
    const base = {
      timestamp: '2026-04-23T12:00:00.000Z',
      event_type: 'dispatch',
      hook_name: 'PreCompact',
      session_id: 'sess-1',
    };
    logWriter.write('handoffs', { ...base, payload: { n: 1 } });
    const file = logWriter.write('handoffs', { ...base, payload: { n: 2 } });
    const lines = readJsonLines(file);
    assert.strictEqual(lines.length, 2, 'appended second entry');
    assert.strictEqual(lines[1].payload.n, 2);
  } finally {
    rmTmp(tmp);
  }
});

test('write rejects invalid type (contract)', () => {
  const tmp = mkTmpLogs('badtype');
  try {
    const logWriter = requireFresh('log-writer.js');
    assert.throws(
      () =>
        logWriter.write('not-a-type', {
          timestamp: new Date().toISOString(),
          event_type: 'x',
          hook_name: 'y',
          session_id: 'z',
        }),
      /invalid type/
    );
  } finally {
    rmTmp(tmp);
  }
});

test('write rejects entries missing required fields (AC 5)', () => {
  const tmp = mkTmpLogs('missing');
  try {
    const logWriter = requireFresh('log-writer.js');
    assert.throws(
      () =>
        logWriter.write('waivers', {
          timestamp: new Date().toISOString(),
          event_type: 'waiver',
          // missing hook_name and session_id
        }),
      /missing required field/
    );
  } finally {
    rmTmp(tmp);
  }
});

test('log-writer uses stdlib only — inspects module source (AC 7)', () => {
  const tmp = mkTmpLogs('stdlib');
  try {
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        '.kaizen-dvir',
        'dvir',
        'hooks',
        'log-writer.js'
      ),
      'utf8'
    );
    // Any require(...) must target a node: core module or a relative path.
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
        'log-writer imports non-stdlib module: ' + target
      );
    }
  } finally {
    rmTmp(tmp);
  }
});
