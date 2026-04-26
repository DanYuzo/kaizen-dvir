'use strict';

// M7.3 — second `kaizen init` is a no-op for the new INLINE_TEMPLATES
// entries (.claude/CLAUDE.md and the six .claude/rules/*.md files). Ensures
// the existing diffScan idempotency path covers the new entries
// automatically (no regression in M1's idempotency contract).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

const TARGET_FILES = [
  '.claude/CLAUDE.md',
  '.claude/rules/boundary.md',
  '.claude/rules/cells.md',
  '.claude/rules/yotzer.md',
  '.claude/rules/doctor.md',
  '.claude/rules/language-policy.md',
  '.claude/rules/commit-conventions.md',
];

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m7.3-idem-'));
}

function rmTmp(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runInit(cwd) {
  return spawnSync(process.execPath, [CLI, 'init'], {
    cwd,
    encoding: 'utf8',
  });
}

test('M7.3: second init is a no-op for CLAUDE.md and .claude/rules/* (idempotency preserved)', () => {
  const tmp = mkTmp();
  try {
    const first = runInit(tmp);
    assert.strictEqual(first.status, 0, 'first run exit 0; stderr=' + first.stderr);

    // Snapshot bytes + mtime of every M7.3 target.
    const before = TARGET_FILES.map((rel) => {
      const abs = path.join(tmp, rel);
      return {
        rel,
        bytes: fs.readFileSync(abs),
        mtime: fs.statSync(abs).mtimeMs,
      };
    });

    const second = runInit(tmp);
    assert.strictEqual(second.status, 0, 'second run exit 0; stderr=' + second.stderr);

    for (const snap of before) {
      const abs = path.join(tmp, snap.rel);
      const afterBytes = fs.readFileSync(abs);
      const afterMtime = fs.statSync(abs).mtimeMs;
      assert.ok(
        Buffer.compare(snap.bytes, afterBytes) === 0,
        snap.rel + ' content preserved across init runs'
      );
      assert.strictEqual(
        afterMtime,
        snap.mtime,
        snap.rel + ' mtime unchanged (not rewritten on second run)'
      );
    }
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: expert edit to a rule file is preserved or surfaced via not-clean error', () => {
  // The existing diffScan path emits a not-clean error when an
  // INLINE_TEMPLATES file has been edited. Exit code 1 with pt-BR message
  // listing the conflicting file. Either the file is preserved (bytes
  // unchanged) AND init exits 1, OR it is preserved AND init exits 0 (if
  // future story softens the gate). The hard contract here is byte
  // preservation — expert edits are NEVER overwritten.
  const tmp = mkTmp();
  try {
    runInit(tmp);
    const ruleAbs = path.join(tmp, '.claude', 'rules', 'boundary.md');
    const expertContent = '# Expert override\n\nMy local notes about boundaries.\n';
    fs.writeFileSync(ruleAbs, expertContent, 'utf8');
    const expertBytes = fs.readFileSync(ruleAbs);

    const second = runInit(tmp);
    // Either gate fires (exit 1) or skip (exit 0) — both are acceptable.
    // What MUST hold: bytes were not overwritten by the canonical seed.
    const afterBytes = fs.readFileSync(ruleAbs);
    assert.ok(
      Buffer.compare(expertBytes, afterBytes) === 0,
      'expert edits to .claude/rules/boundary.md are preserved by init'
    );
    if (second.status !== 0) {
      // When the not-clean gate fires, the conflict listing must be pt-BR
      // and reference the offending file (NFR-101 — orient correction).
      assert.match(
        second.stderr,
        /\.claude\/rules\/boundary\.md/u,
        'not-clean error lists the rule file path'
      );
    }
  } finally {
    rmTmp(tmp);
  }
});
