'use strict';

// AC 12 / FR-038 — *modo interativo / *modo auto switches mid-session
// update session-mode.yaml AND log a mode_switch entry to gate-verdicts.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('switchMode updates state file and logs mode_switch entry', () => {
  const logs = helpers.mkTmpLogs('me-switch');
  const state = helpers.mkTmpState('me-switch');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    mode.selectMode('interativo');
    const out = mode.switchMode('automatico');
    assert.strictEqual(out.mode, 'automatico');
    assert.strictEqual(out.previous, 'interativo');
    assert.strictEqual(out.logged, true);
    // State file reflects the switch.
    assert.strictEqual(mode.getMode(), 'automatico');
    // Log entry recorded.
    const entries = helpers.readJsonl(logs, 'gate-verdicts');
    const switches = entries.filter((e) => e.event_type === 'mode_switch');
    assert.ok(switches.length >= 1);
    assert.strictEqual(switches[0].new_mode, 'automatico');
    assert.strictEqual(switches[0].previous_mode, 'interativo');
    assert.match(switches[0].message, /mudanca de modo registrada/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(state);
  }
});

test('switchMode from null previous (no prior selection) records null', () => {
  const logs = helpers.mkTmpLogs('me-switch-null');
  const state = helpers.mkTmpState('me-switch-null');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const out = mode.switchMode('interativo');
    assert.strictEqual(out.mode, 'interativo');
    assert.strictEqual(out.previous, null);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(state);
  }
});

test('switchMode rejects invalid target', () => {
  const logs = helpers.mkTmpLogs('me-switch-bad');
  const state = helpers.mkTmpState('me-switch-bad');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    assert.throws(() => mode.switchMode('xyz'), /modo invalido/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(state);
  }
});

test('switchMode persists YAML readable by getMode', () => {
  const logs = helpers.mkTmpLogs('me-switch-persist');
  const state = helpers.mkTmpState('me-switch-persist');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    mode.switchMode('automatico');
    // Drop the module to ensure persistence reads from disk, not memory.
    helpers.dropCache(require.resolve(
      require('node:path').join(helpers.GATES_DIR, 'mode-engine.js')
    ));
    const mode2 = helpers.freshGate('mode-engine.js');
    assert.strictEqual(mode2.getMode(), 'automatico');
    // State file matches.
    const path = require('node:path');
    const file = path.join(state, 'session-mode.yaml');
    assert.ok(fs.existsSync(file));
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(state);
  }
});
