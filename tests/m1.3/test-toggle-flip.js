'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG = path.join(ROOT, '.kaizen-dvir', 'dvir-config.yaml');
const FIXTURE_ON = path.join(__dirname, 'fixtures', 'toggle-on.yaml');
const FIXTURE_OFF = path.join(__dirname, 'fixtures', 'toggle-off.yaml');

const loader = require(path.join(ROOT, '.kaizen-dvir', 'dvir', 'config-loader.js'));

test('loadFromPath honors frameworkProtection: false without error', () => {
  const cfg = loader.loadFromPath(FIXTURE_OFF);
  assert.strictEqual(cfg.boundary.frameworkProtection, false);
});

test('loadFromPath honors frameworkProtection: true', () => {
  const cfg = loader.loadFromPath(FIXTURE_ON);
  assert.strictEqual(cfg.boundary.frameworkProtection, true);
});

test('getBoundaryFlag() re-reads the file so toggle flips honor AC-011', () => {
  // Back up the live config, flip it, and verify getBoundaryFlag() reflects
  // the change WITHOUT reloading the module (i.e., without a session restart).
  const original = fs.readFileSync(CONFIG, 'utf8');
  const offContent = fs.readFileSync(FIXTURE_OFF, 'utf8');
  const onContent = fs.readFileSync(FIXTURE_ON, 'utf8');
  try {
    fs.writeFileSync(CONFIG, offContent, 'utf8');
    assert.strictEqual(
      loader.getBoundaryFlag(),
      false,
      'after flipping config to false, getBoundaryFlag() must return false'
    );
    fs.writeFileSync(CONFIG, onContent, 'utf8');
    assert.strictEqual(
      loader.getBoundaryFlag(),
      true,
      'after flipping config to true, getBoundaryFlag() must return true without restart'
    );
  } finally {
    fs.writeFileSync(CONFIG, original, 'utf8');
  }
});
