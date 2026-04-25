'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// M1 Gate criterion 3 + AC 7: deny rules cover 100% of tested L1 paths.
// We validate the *settings.json surface* — Claude Code's runtime enforces the
// rules when an agent tries to write; here we verify the canonical patterns
// are present for ≥5 distinct L1 paths.

const REQUIRED_L1_DENY_PATTERNS = [
  /Write\(\.kaizen-dvir\/dvir\/\*\*\)/,
  /Write\(\.kaizen-dvir\/commandments\.md\)/,
  /Write\(bin\/\*\*\)/,
  /Write\(\.kaizen-dvir\/instructions\/\*\*\)/,
  /Write\(\.kaizen-dvir\/infra\/\*\*\)/,
];

test('.claude/settings.json denies ≥5 L1 paths (AC 7, AC-003)', () => {
  const tmp = mkTmp('denyl1');
  try {
    runInit(tmp);
    const abs = path.join(tmp, '.claude', 'settings.json');
    const raw = fs.readFileSync(abs, 'utf8');
    const json = JSON.parse(raw);
    assert.ok(Array.isArray(json.permissions.deny), 'permissions.deny must be an array');

    const denyText = json.permissions.deny.join('\n');
    let hits = 0;
    for (const pattern of REQUIRED_L1_DENY_PATTERNS) {
      if (pattern.test(denyText)) {
        hits += 1;
      }
    }
    assert.ok(
      hits >= 5,
      'expected ≥5 L1 deny patterns; matched ' + hits + ' of ' + REQUIRED_L1_DENY_PATTERNS.length
    );
  } finally {
    rmTmp(tmp);
  }
});

test('.claude/settings.json denies Edit on the same L1 paths', () => {
  const tmp = mkTmp('denyl1edit');
  try {
    runInit(tmp);
    const abs = path.join(tmp, '.claude', 'settings.json');
    const json = JSON.parse(fs.readFileSync(abs, 'utf8'));
    const denyText = json.permissions.deny.join('\n');
    const editPatterns = [
      /Edit\(\.kaizen-dvir\/dvir\/\*\*\)/,
      /Edit\(\.kaizen-dvir\/commandments\.md\)/,
      /Edit\(bin\/\*\*\)/,
    ];
    for (const p of editPatterns) {
      assert.match(denyText, p, 'missing Edit deny: ' + p);
    }
  } finally {
    rmTmp(tmp);
  }
});
