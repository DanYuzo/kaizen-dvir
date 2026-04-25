'use strict';

// AC 12 — `kaizen init` auto-installs the Yotzer scaffold into the target
// project. Idempotent on re-run. Never overwrites an expert fork.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('installYotzer copies scaffold into clean target (AC 12, AC-100)', () => {
  const target = helpers.mkTmpDir('install-clean');
  try {
    const ki = helpers.freshKaizenInit();
    const out = ki.installYotzer(target);
    const cellRoot = path.join(target, '.kaizen-dvir', 'celulas', 'yotzer');
    assert.ok(fs.existsSync(path.join(cellRoot, 'celula.yaml')));
    assert.ok(fs.existsSync(path.join(cellRoot, 'README.md')));
    assert.ok(fs.existsSync(path.join(cellRoot, 'CHANGELOG.md')));
    assert.ok(fs.existsSync(path.join(cellRoot, 'MEMORY.md')));
    assert.ok(fs.existsSync(path.join(cellRoot, 'agents', 'chief.md')));
    // 6 navigation tasks
    const tasksDir = path.join(cellRoot, 'tasks');
    for (const name of [
      'start.md',
      'edit-celula.md',
      'explain-method.md',
      'switch-mode.md',
      'resume.md',
      'status.md',
    ]) {
      assert.ok(
        fs.existsSync(path.join(tasksDir, name)),
        'missing navigation task ' + name
      );
    }
    assert.ok(
      fs.existsSync(
        path.join(cellRoot, 'templates', 'welcome-message-tmpl.md')
      )
    );
    assert.ok(out.copied > 0, 'copied should be > 0 on clean install');
  } finally {
    helpers.rm(target);
  }
});

test('installYotzer is idempotent on second run (AC 12)', () => {
  const target = helpers.mkTmpDir('install-idempotent');
  try {
    const ki = helpers.freshKaizenInit();
    const first = ki.installYotzer(target);
    const second = ki.installYotzer(target);
    assert.ok(first.copied > 0, 'first run copies files');
    assert.strictEqual(
      second.copied,
      0,
      'second run copies nothing (idempotent)'
    );
  } finally {
    helpers.rm(target);
  }
});

test('installYotzer preserves expert fork when target version is newer (AC 12, M4.1-R1)', () => {
  const target = helpers.mkTmpDir('install-newer');
  try {
    const ki = helpers.freshKaizenInit();
    // First install the scaffold.
    ki.installYotzer(target);
    // Mutate target manifest with a newer version + custom marker.
    const manifestPath = path.join(
      target,
      '.kaizen-dvir',
      'celulas',
      'yotzer',
      'celula.yaml'
    );
    let text = fs.readFileSync(manifestPath, 'utf8');
    text = text.replace(/version\s*:\s*"[^"]+"/, 'version: "9.9.9"');
    text = text + '\n# MARKER: expert fork preserved\n';
    fs.writeFileSync(manifestPath, text, 'utf8');
    // Re-run installer — should preserve the expert fork.
    const out = ki.installYotzer(target);
    const after = fs.readFileSync(manifestPath, 'utf8');
    assert.match(after, /MARKER: expert fork preserved/);
    assert.match(after, /version\s*:\s*"9\.9\.9"/);
    assert.strictEqual(out.skipped, 1, 'skipped should be 1 for newer fork');
    assert.match(out.warning || '', /mais nova/);
  } finally {
    helpers.rm(target);
  }
});

test('installYotzer creates directory structure with 6 subdirs (AC 1)', () => {
  const target = helpers.mkTmpDir('install-dirs');
  try {
    const ki = helpers.freshKaizenInit();
    ki.installYotzer(target);
    const cellRoot = path.join(target, '.kaizen-dvir', 'celulas', 'yotzer');
    for (const sub of [
      'agents',
      'tasks',
      'workflows',
      'templates',
      'checklists',
      'kbs',
    ]) {
      const d = path.join(cellRoot, sub);
      assert.ok(
        fs.existsSync(d) && fs.statSync(d).isDirectory(),
        'missing subdir ' + sub
      );
    }
  } finally {
    helpers.rm(target);
  }
});
