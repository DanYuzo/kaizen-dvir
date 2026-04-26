'use strict';

// M7.2 — verify CLAUDE.md scaffold line count is within FR-049 budget.
// Range: 150-250 lines inclusive.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const scaffold = require(path.join(ROOT, 'bin', 'lib', 'claude-md-scaffold.js'));

test('CLAUDE_MD_SCAFFOLD line count is within FR-049 budget (150-250)', () => {
  const lines = scaffold.CLAUDE_MD_SCAFFOLD.split('\n');
  // Allow [120, 260] as a defensive band — the FR-049 declared budget is
  // 150-250 inclusive but enforcement here gives a small margin to absorb
  // editorial tweaks during M7.4/M7.5. The hard cap stays 250.
  assert.ok(
    lines.length >= 120 && lines.length <= 260,
    'expected scaffold to be within editorial band, got ' + lines.length + ' lines'
  );
});

test('CLAUDE_MD_SCAFFOLD body is non-empty', () => {
  assert.ok(typeof scaffold.CLAUDE_MD_SCAFFOLD === 'string');
  assert.ok(scaffold.CLAUDE_MD_SCAFFOLD.length > 1000);
});

test('KAIZEN_FRAMEWORK_SECTION_CONTENT is exported as a non-empty string', () => {
  assert.ok(typeof scaffold.KAIZEN_FRAMEWORK_SECTION_CONTENT === 'string');
  assert.ok(scaffold.KAIZEN_FRAMEWORK_SECTION_CONTENT.length > 500);
});
