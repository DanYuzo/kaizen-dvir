'use strict';

// AC 5: persist() writes pure-YAML to
// .kaizen/handoffs/handoff-{from}-to-{to}-{timestamp}.yaml.
// Filename pattern, lazy directory creation, and round-trip readability
// asserted (FR-034, D-v1.1-06, CON-004).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = require('./_helpers');

test('persist writes file at handoff-{from}-to-{to}-{timestamp}.yaml (AC 5, FR-034)', () => {
  const tmp = mkTmp('persist');
  try {
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    const written = engine.persist(result);

    assert.ok(fs.existsSync(written), 'file exists at returned path');

    const filename = path.basename(written);
    // handoff-archaeologist-to-forge-smith-2026-04-24T...-...-..Z.yaml
    assert.ok(
      /^handoff-archaeologist-to-forge-smith-\d{4}-\d{2}-\d{2}T[0-9-]+\.\d+Z\.yaml$/.test(filename),
      'filename matches pattern, got: ' + filename
    );

    // Lives under the sandboxed handoffs dir.
    const rel = path.relative(tmp.handoffs, written);
    assert.ok(!rel.startsWith('..') && !path.isAbsolute(rel), 'file inside KAIZEN_HANDOFFS_DIR sandbox');
  } finally {
    rmTmp(tmp);
  }
});

test('persist creates the handoffs directory lazily on first call (AC 5)', () => {
  const tmp = mkTmp('lazy-dir');
  try {
    // Remove the pre-created handoffs dir to prove lazy creation.
    fs.rmSync(tmp.handoffs, { recursive: true, force: true });
    assert.ok(!fs.existsSync(tmp.handoffs), 'precondition: dir absent');

    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    engine.persist(result);

    assert.ok(fs.existsSync(tmp.handoffs), 'persist() created the directory');
  } finally {
    rmTmp(tmp);
  }
});

test('persisted file content matches the generated YAML (AC 5)', () => {
  const tmp = mkTmp('round-trip');
  try {
    const engine = engineFresh();
    const result = callGenerate(engine, validHandoffArgs());
    const written = engine.persist(result);
    const onDisk = fs.readFileSync(written, 'utf8');
    assert.strictEqual(onDisk, result.yaml, 'on-disk content equals generated YAML');
    // YAML 1.2 strict-mode write side: every string scalar quoted.
    assert.ok(onDisk.includes('"archaeologist"'), 'from quoted');
    assert.ok(onDisk.includes('"forge-smith"'), 'to quoted');
    assert.ok(onDisk.includes('"main"'), 'branch quoted');
  } finally {
    rmTmp(tmp);
  }
});

test('persist sanitizes path-unsafe characters in agent names (FR-034 + Windows safety)', () => {
  const tmp = mkTmp('sanitize');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.fromAgent = 'arc/h*aeo';
    args.toAgent = 'forge:smith';
    const result = callGenerate(engine, args);
    const written = engine.persist(result);
    const filename = path.basename(written);
    assert.ok(!/[\/:\*]/.test(filename.replace(/\.yaml$/u, '')), 'no path-unsafe characters: ' + filename);
    assert.ok(/handoff-archaeo-to-forgesmith-/.test(filename), 'sanitized names retained: ' + filename);
  } finally {
    rmTmp(tmp);
  }
});
