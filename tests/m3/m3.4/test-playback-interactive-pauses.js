'use strict';

// AC 1 — Playback Gate pauses in interactive mode and captures the
// expert's verdict via the 3 options (sim / ajustar / nao).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('interactive mode: prompt is invoked and "sim" returns PASS', () => {
  const logs = helpers.mkTmpLogs('pb-int-sim');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    let promptCalls = 0;
    let receivedNarrative = null;
    let receivedOptions = null;
    const out = playback.present(
      { id: 'art-1', type: 'cell', intent: 'criar yotzer', fields: { foo: 'bar' } },
      null,
      {
        mode: 'interativo',
        prompt: function (narrative, opts) {
          promptCalls += 1;
          receivedNarrative = narrative;
          receivedOptions = opts;
          return 'sim';
        },
      }
    );
    assert.strictEqual(promptCalls, 1, 'prompt must be called in interactive mode');
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.option, 'sim');
    assert.strictEqual(out.paused, true);
    assert.strictEqual(out.mode, 'interativo');
    // Narrative-drift mitigation (M3.4-R3): narrative echoes artifact fields.
    assert.match(receivedNarrative, /art-1/);
    assert.match(receivedNarrative, /criar yotzer/);
    assert.deepStrictEqual(receivedOptions.options, ['sim', 'ajustar', 'nao']);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('interactive mode: "ajustar" returns ADJUST with reason', () => {
  const logs = helpers.mkTmpLogs('pb-int-adj');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const out = playback.present(
      { id: 'art-2', type: 'cell', intent: 'criar yotzer' },
      null,
      {
        mode: 'interativo',
        prompt: () => 'ajustar',
        reasonCollector: () => 'falta o campo objetivo.',
      }
    );
    assert.strictEqual(out.verdict, 'ADJUST');
    assert.strictEqual(out.option, 'ajustar');
    assert.strictEqual(out.reason, 'falta o campo objetivo.');
    assert.strictEqual(out.paused, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('interactive mode: "nao" returns HALT with reason', () => {
  const logs = helpers.mkTmpLogs('pb-int-nao');
  try {
    const playback = helpers.freshGate('playback-gate.js');
    const out = playback.present(
      { id: 'art-3', type: 'cell', intent: 'criar yotzer' },
      null,
      {
        mode: 'interativo',
        prompt: () => 'nao',
        reasonCollector: () => 'a celula nao deveria ser criada agora.',
      }
    );
    assert.strictEqual(out.verdict, 'HALT');
    assert.strictEqual(out.option, 'nao');
    assert.match(out.reason, /nao deveria ser criada/);
    assert.strictEqual(out.paused, true);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
