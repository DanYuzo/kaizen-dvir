'use strict';

// AC 12: Change-log append-only enforced at gate time — rewriting a
// historical entry causes FAIL.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmpLogs,
  rmTmp,
  mkTmpDir,
  requireFreshGate,
  requireFreshMemory,
} = require('./_helpers');

const CONTENT_V1 = [
  '# Sample artifact',
  '',
  'Some body text.',
  '',
  '## Change Log',
  '',
  '- 2026-04-23 — @sm: drafted',
  '- 2026-04-24 — @dev: implemented',
  '',
].join('\n');

const CONTENT_V2_APPEND_OK = CONTENT_V1 + '- 2026-04-25 — @qa: reviewed\n';

const CONTENT_V2_REWRITE = [
  '# Sample artifact',
  '',
  'Some body text.',
  '',
  '## Change Log',
  '',
  '- 2026-04-23 — @sm: drafted differently',
  '- 2026-04-24 — @dev: implemented',
  '- 2026-04-25 — @qa: reviewed',
  '',
].join('\n');

test('change-log-guard accepts append; rejects rewrite', () => {
  const dir = mkTmpDir('changelog');
  try {
    const guard = requireFreshMemory('change-log-guard.js');
    const file = path.join(dir, 'artifact.md');

    fs.writeFileSync(file, CONTENT_V1, 'utf8');
    const r1 = guard.check(file); // baseline recorded
    assert.strictEqual(r1.valid, true);

    fs.writeFileSync(file, CONTENT_V2_APPEND_OK, 'utf8');
    const r2 = guard.check(file); // valid append
    assert.strictEqual(r2.valid, true);

    fs.writeFileSync(file, CONTENT_V2_REWRITE, 'utf8');
    const r3 = guard.check(file);
    assert.strictEqual(r3.valid, false);
    assert.ok(r3.violations.length > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('quality-gate FAILs when change log was rewritten', () => {
  const tmp = mkTmpLogs('gate-changelog-rewrite');
  const dir = mkTmpDir('gate-changelog');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const file = path.join(dir, 'artifact.md');
    fs.writeFileSync(file, CONTENT_V1, 'utf8');
    // First gate call records baseline and passes the guard.
    const r1 = gate.evaluate(
      { id: 'art-cl-1', path: file },
      [{ id: 'c1', severity: 'critical', check: 'automated', run: () => true }]
    );
    assert.strictEqual(r1.verdict, 'PASS');

    // Rewrite history; re-run the gate.
    fs.writeFileSync(file, CONTENT_V2_REWRITE, 'utf8');
    const r2 = gate.evaluate(
      { id: 'art-cl-1', path: file },
      [{ id: 'c1', severity: 'critical', check: 'automated', run: () => true }]
    );
    assert.strictEqual(r2.verdict, 'FAIL');
    assert.ok(
      r2.issues.some((i) => /AC-207|FR-023|append-only/i.test(i.message)),
      'gate cites AC-207 / FR-023 in pt-BR'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    rmTmp(tmp);
  }
});
