'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// M1 Gate criterion 2: Commandments load in a Claude Code session.
// Operationally: .kaizen-dvir/commandments.md is readable, parseable, has all
// 7 Commandments, and .claude/CLAUDE.md references the path.

test('commandments.md is readable and exposes all 7 Commandments', () => {
  const tmp = mkTmp('commandments');
  try {
    runInit(tmp);
    const abs = path.join(tmp, '.kaizen-dvir', 'commandments.md');
    const content = fs.readFileSync(abs, 'utf8');

    for (const roman of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']) {
      const pattern = new RegExp('Commandment ' + roman + '\\b');
      assert.match(content, pattern, 'missing Commandment ' + roman);
    }
    assert.match(content, /version:\s*1\.4\.0/, 'version marker');
    assert.match(content, /Active/, 'status marker');
  } finally {
    rmTmp(tmp);
  }
});
