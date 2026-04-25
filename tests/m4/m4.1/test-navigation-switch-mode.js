'use strict';

// AC 9, AC-113 — *modo interativo / *modo auto toggles session-mode.yaml
// and logs the switch to the audit log.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

function readJsonl(logsDir, channel) {
  const dir = path.join(logsDir, channel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const raw = fs.readFileSync(full, 'utf8');
    for (const line of raw.split(/\r?\n/u)) {
      if (line.trim().length === 0) continue;
      try {
        out.push(JSON.parse(line));
      } catch (_) {
        // skip
      }
    }
  }
  return out;
}

test('switchMode updates session-mode.yaml and logs switch (AC 9, AC-113)', () => {
  const state = helpers.mkTmpState('switch-update');
  const logs = helpers.mkTmpLogs('switch-update-logs');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    mode.selectMode('interativo');
    const out = mode.switchMode('automatico');
    assert.strictEqual(out.mode, 'automatico');
    assert.strictEqual(out.previous, 'interativo');
    assert.strictEqual(out.logged, true);

    // session-mode.yaml updated.
    const modeFile = path.join(state, 'session-mode.yaml');
    const yaml = fs.readFileSync(modeFile, 'utf8');
    assert.match(yaml, /mode:\s*"automatico"/);

    // log entry exists.
    const entries = readJsonl(logs, 'gate-verdicts');
    const switches = entries.filter((e) => e.event_type === 'mode_switch');
    assert.ok(switches.length >= 1, 'expected >=1 mode_switch entry');
    const last = switches[switches.length - 1];
    assert.strictEqual(last.new_mode, 'automatico');
    assert.strictEqual(last.previous_mode, 'interativo');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('switchMode accepts i / a / auto shortcuts', () => {
  const state = helpers.mkTmpState('switch-shortcuts');
  const logs = helpers.mkTmpLogs('switch-shortcuts-logs');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    mode.selectMode('i');
    assert.strictEqual(mode.getMode(), 'interativo');
    mode.switchMode('a');
    assert.strictEqual(mode.getMode(), 'automatico');
    mode.switchMode('auto');
    assert.strictEqual(mode.getMode(), 'automatico');
    mode.switchMode('interativo');
    assert.strictEqual(mode.getMode(), 'interativo');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('switchMode rejects invalid mode with pt-BR error', () => {
  const state = helpers.mkTmpState('switch-invalid');
  const logs = helpers.mkTmpLogs('switch-invalid-logs');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    assert.throws(() => mode.switchMode('lento'), /modo invalido/);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
    helpers.rm(logs);
  }
});

test('switch-mode task declares mode_engine switchMode delegation (AC 9)', () => {
  const taskPath = path.join(
    helpers.YOTZER_CELL_ROOT,
    'tasks',
    'switch-mode.md'
  );
  const text = fs.readFileSync(taskPath, 'utf8');
  assert.match(text, /switchMode/);
  assert.match(text, /\*modo interativo/);
  assert.match(text, /\*modo auto/);
});
