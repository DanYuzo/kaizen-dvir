'use strict';

// AC 4: `kaizen doctor --hooks` exits 0 and renders pt-BR sections for
// the 3 hooks (load state + circuit breaker) plus the last 5 entries from
// .kaizen/logs/hook-calls/. We invoke via child_process.spawnSync against
// the real CLI so routing and I/O are covered end-to-end.

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, PROJECT_ROOT } = require('./_helpers');

const CLI = path.join(PROJECT_ROOT, 'bin', 'kaizen.js');

function runCli(args, env) {
  return spawnSync(process.execPath, [CLI, ...args], {
    env: Object.assign({}, process.env, env || {}),
    encoding: 'utf8',
  });
}

test('kaizen doctor --hooks exits 0 and prints pt-BR sections (AC 4)', () => {
  const tmp = mkTmp('doctor');
  try {
    const r = runCli(['doctor', '--hooks'], {
      KAIZEN_LOGS_DIR: tmp.logs,
      KAIZEN_STATE_DIR: tmp.state,
    });
    assert.strictEqual(r.status, 0, 'stderr=' + r.stderr + ' stdout=' + r.stdout);
    assert.ok(/KaiZen doctor — hooks/.test(r.stdout));
    assert.ok(/Hooks carregados:/.test(r.stdout), 'missing "Hooks carregados" header');
    assert.ok(/Circuit breakers:/.test(r.stdout), 'missing "Circuit breakers" header');
    assert.ok(
      /Últimas 5 entradas/.test(r.stdout),
      'missing "Últimas 5 entradas" header'
    );
    for (const name of ['UserPromptSubmit', 'PreCompact', 'PreToolUse']) {
      assert.ok(new RegExp(name).test(r.stdout), 'missing hook row: ' + name);
    }
    // All 3 breakers start closed with 0 failures in a fresh process.
    assert.ok(/fechado \(0 falhas\)/.test(r.stdout), 'missing fechado (0 falhas) label');
    assert.ok(/\(sem entradas\)/.test(r.stdout), 'empty log tail should render "(sem entradas)"');
  } finally {
    rmTmp(tmp);
  }
});

test('doctor --hooks renders log tail in pt-BR when entries exist (AC 4)', () => {
  const tmp = mkTmp('doctor-tail');
  try {
    // Seed 2 entries in the isolated logs dir.
    const dir = path.join(tmp.logs, 'hook-calls');
    fs.mkdirSync(dir, { recursive: true });
    const day = new Date().toISOString().slice(0, 10);
    const entries = [
      {
        timestamp: '2026-04-23T10:00:00Z',
        event_type: 'invoked',
        hook_name: 'UserPromptSubmit',
        session_id: 's-test',
        verdict: 'ok',
      },
      {
        timestamp: '2026-04-23T10:00:01Z',
        event_type: 'invoked',
        hook_name: 'PreToolUse',
        session_id: 's-test',
        verdict: 'ok',
      },
    ];
    const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(path.join(dir, day + '.jsonl'), lines, 'utf8');

    const r = runCli(['doctor', '--hooks'], {
      KAIZEN_LOGS_DIR: tmp.logs,
      KAIZEN_STATE_DIR: tmp.state,
    });
    assert.strictEqual(r.status, 0, 'stderr=' + r.stderr);
    assert.ok(/UserPromptSubmit/.test(r.stdout));
    assert.ok(/session=s-test/.test(r.stdout));
    assert.ok(!/\(sem entradas\)/.test(r.stdout), 'tail should not render empty marker');
  } finally {
    rmTmp(tmp);
  }
});
