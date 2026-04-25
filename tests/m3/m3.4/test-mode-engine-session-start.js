'use strict';

// AC 11 / FR-038 — Mode engine prompts in pt-BR at session start; selection
// persisted at .kaizen/state/session-mode.yaml.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('promptSessionStart returns the canonical pt-BR prompt', () => {
  const state = helpers.mkTmpState('me-prompt');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const prompt = mode.promptSessionStart();
    assert.match(prompt, /^modo:/);
    assert.match(prompt, /interativo/);
    assert.match(prompt, /automatico/);
    assert.match(prompt, /Playback entre fases/);
    assert.match(prompt, /pontos criticos/);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('selectMode("interativo") persists at session-mode.yaml', () => {
  const state = helpers.mkTmpState('me-sel-int');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const out = mode.selectMode('interativo');
    assert.strictEqual(out.mode, 'interativo');
    assert.ok(out.persisted.endsWith('session-mode.yaml'));
    const content = fs.readFileSync(out.persisted, 'utf8');
    assert.match(content, /mode: "interativo"/);
    assert.match(content, /updated_at:/);
    assert.match(content, /session_id:/);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('selectMode("automatico") persists and getMode() reads it back', () => {
  const state = helpers.mkTmpState('me-sel-auto');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    mode.selectMode('automatico');
    assert.strictEqual(mode.getMode(), 'automatico');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('short forms "i" / "a" normalized correctly', () => {
  const state = helpers.mkTmpState('me-sel-short');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    const a = mode.selectMode('i');
    assert.strictEqual(a.mode, 'interativo');
    const b = mode.selectMode('a');
    assert.strictEqual(b.mode, 'automatico');
    const c = mode.selectMode('auto');
    assert.strictEqual(c.mode, 'automatico');
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('invalid input throws pt-BR error', () => {
  const state = helpers.mkTmpState('me-sel-bad');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    assert.throws(() => mode.selectMode('manual'), /modo invalido/);
    assert.throws(() => mode.selectMode(''), /modo invalido/);
    assert.throws(() => mode.selectMode(null), /modo invalido/);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});

test('getMode returns null when no selection has been made', () => {
  const state = helpers.mkTmpState('me-getmode-null');
  try {
    const mode = helpers.freshGate('mode-engine.js');
    // Confirm state file does not exist.
    const file = path.join(state, 'session-mode.yaml');
    assert.strictEqual(fs.existsSync(file), false);
    assert.strictEqual(mode.getMode(), null);
  } finally {
    helpers.clearEnv();
    helpers.rm(state);
  }
});
