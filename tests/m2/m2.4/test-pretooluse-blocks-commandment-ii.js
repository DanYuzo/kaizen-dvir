'use strict';

// AC 4 / AC 5 / AC 6 / AC 7 — PreToolUse blocks a tool call outside the
// active cell's authorities.exclusive (Commandment II). Uses a fixture
// celula.yaml in a tmpdir — cells not yet materialized in the repo, so
// we stub by pointing KAIZEN_ACTIVE_CELL at a fixture cell AND seeding
// the .kaizen-dvir/celulas/<fixture>/celula.yaml. To avoid polluting the
// repo, we test via the pure `evaluate()` API for the BLOCK path and via
// the full `handle()` flow for the log-entry assertion (using the
// parsed exclusive list directly).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, requireFreshHook, readAllJsonlEntries } = require('./_helpers');

test('PreToolUse.evaluate blocks Commandment II violation (AC 4, AC 5)', () => {
  const tmp = mkTmp('cmd-ii-evaluate');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    // yotzer-like cell: only allows `kaizen`, `Read`, `Grep`. `git push`
    // is NOT in exclusive — must BLOCK.
    const result = hook.evaluate({
      tool_name: 'Bash',
      parameters: { command: 'git push origin main' },
      active_cell: 'yotzer',
      authorities_exclusive: ['kaizen', 'Read', 'Grep'],
    });
    assert.strictEqual(result.verdict, 'BLOCK');
    assert.strictEqual(result.commandment, 'II');
    assert.match(
      result.reason,
      /Mandamento II — Authority Boundaries/,
      'pt-BR message must cite "Mandamento II — Authority Boundaries"'
    );
    assert.match(
      result.reason,
      /authorities\.exclusive/,
      'reason must mention authorities.exclusive'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('PreToolUse.parseAuthoritiesExclusive reads exclusive list from celula.yaml fixture (AC 5)', () => {
  const tmp = mkTmp('cmd-ii-parse');
  try {
    const hook = requireFreshHook('PreToolUse.js');
    const yaml = [
      'name: ops',
      'authorities:',
      '  exclusive:',
      '    - "git push"',
      '    - "gh pr create"',
      '    - npm publish',
      'boot:',
      '  - README.md',
      '',
    ].join('\n');
    const parsed = hook.parseAuthoritiesExclusive(yaml);
    assert.deepStrictEqual(parsed, ['git push', 'gh pr create', 'npm publish']);
  } finally {
    rmTmp(tmp);
  }
});

test('PreToolUse.handle logs BLOCK for Commandment II with ref "II" (AC 6)', () => {
  const tmp = mkTmp('cmd-ii-log');
  try {
    // Seed a fixture cell in the project's celulas dir so
    // loadAuthoritiesExclusive reads it. Clean it up in finally.
    const projectRoot = path.resolve(__dirname, '..', '..', '..');
    const cellName = '__m2_4_fixture_cell__';
    const cellDir = path.join(projectRoot, '.kaizen-dvir', 'celulas', cellName);
    fs.mkdirSync(cellDir, { recursive: true });
    fs.writeFileSync(
      path.join(cellDir, 'celula.yaml'),
      ['name: fixture', 'authorities:', '  exclusive:', '    - "Read"', ''].join('\n')
    );

    try {
      const hook = requireFreshHook('PreToolUse.js');
      const result = hook.handle({
        tool_name: 'Bash',
        parameters: { command: 'git push origin main' },
        session_id: 'sess-cmd-ii',
        active_cell: cellName,
      });
      assert.strictEqual(result.verdict, 'BLOCK');
      assert.strictEqual(result.commandment, 'II');
      assert.match(result.reason, /Mandamento II — Authority Boundaries/);

      const entries = readAllJsonlEntries(tmp.logs, 'gate-verdicts');
      assert.strictEqual(entries.length, 1, 'one verdict entry logged');
      const e = entries[0];
      assert.strictEqual(e.verdict, 'BLOCK');
      assert.strictEqual(e.commandment_ref, 'II');
      assert.strictEqual(e.tool_name, 'Bash');
      assert.strictEqual(e.active_cell, cellName);
    } finally {
      fs.rmSync(cellDir, { recursive: true, force: true });
    }
  } finally {
    rmTmp(tmp);
  }
});
