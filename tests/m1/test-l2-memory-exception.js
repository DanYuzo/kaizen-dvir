'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 9, D-v1.1-09: .kaizen-dvir/celulas/*/MEMORY.md is writable (allow wins),
// verified at the settings.json contract level. M1.4 chose option (A) —
// no broad celulas/** deny — so the MEMORY.md allow stands cleanly.

test('.claude/settings.json declares the MEMORY.md exception in allow and omits a broad celulas deny', () => {
  const tmp = mkTmp('l2exc');
  try {
    runInit(tmp);
    const abs = path.join(tmp, '.claude', 'settings.json');
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));

    const allowText = json.permissions.allow.join('\n');
    assert.match(
      allowText,
      /Write\(\.kaizen-dvir\/celulas\/\*\/MEMORY\.md\)/,
      'Write allow for MEMORY.md required'
    );
    assert.match(
      allowText,
      /Edit\(\.kaizen-dvir\/celulas\/\*\/MEMORY\.md\)/,
      'Edit allow for MEMORY.md required'
    );

    const denyText = json.permissions.deny.join('\n');
    // Option (A) chosen by M1.4: no broad celulas/** deny that would swallow
    // the MEMORY.md allow. If option (B) is adopted later, update this test.
    assert.doesNotMatch(
      denyText,
      /Write\(\.kaizen-dvir\/celulas\/\*\*\)/,
      'option (A) forbids a broad celulas/** deny'
    );
  } finally {
    rmTmp(tmp);
  }
});
