'use strict';

// M7.3 — kaizen init writes .claude/CLAUDE.md byte-for-byte equal to the
// CLAUDE_MD_SCAFFOLD export of bin/lib/claude-md-scaffold.js (M7.2 wiring,
// FR-049, AC-027, M7 Gate criterion 1). Verifies the dead 17-line v1.4
// CLAUDE_MD_SCAFFOLD body has been fully removed.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');
const SCAFFOLD = require(path.join(SOURCE_ROOT, 'bin', 'lib', 'claude-md-scaffold.js'));

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m7.3-claudemd-'));
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

test('M7.3: .claude/CLAUDE.md is byte-for-byte equal to the M7.2 export', () => {
  const tmp = mkTmp();
  try {
    const result = runInit(tmp);
    assert.strictEqual(result.status, 0, 'init exits 0; stderr=' + result.stderr);

    const written = fs.readFileSync(
      path.join(tmp, '.claude', 'CLAUDE.md')
    );
    const expected = Buffer.from(SCAFFOLD.CLAUDE_MD_SCAFFOLD);
    assert.ok(
      Buffer.compare(written, expected) === 0,
      'init must write the M7.2 CLAUDE_MD_SCAFFOLD byte-for-byte'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: written CLAUDE.md has all 10 FR-049 sections', () => {
  const tmp = mkTmp();
  try {
    runInit(tmp);
    const content = fs.readFileSync(
      path.join(tmp, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    const HEADINGS = [
      /^##\s+1\.\s+Identidade do Projeto\s*$/m,
      /^##\s+2\.\s+Commandments\s*$/m,
      /^##\s+3\.\s+Framework Boundary\s*\(L1-L4\)\s*$/m,
      /^##\s+4\.\s+Vocabulário Essencial\s*$/m,
      /^##\s+5\.\s+DVIR\s*\(o Engine\)\s*$/m,
      /^##\s+6\.\s+Lifecycle de Célula\s*$/m,
      /^##\s+7\.\s+Comandos CLI\s*$/m,
      /^##\s+8\.\s+Hooks e Gates\s*$/m,
      /^##\s+9\.\s+Git Conventions\s*$/m,
      /^##\s+10\.\s+Como Estender\s*$/m,
    ];
    for (const re of HEADINGS) {
      assert.match(content, re, 'expected section heading: ' + re);
    }
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: written CLAUDE.md has the v1.5 delimiter contract (CON-007)', () => {
  const tmp = mkTmp();
  try {
    runInit(tmp);
    const content = fs.readFileSync(
      path.join(tmp, '.claude', 'CLAUDE.md'),
      'utf8'
    );
    assert.match(content, /<!--\s*KAIZEN:FRAMEWORK:START\s*-->/);
    assert.match(content, /<!--\s*KAIZEN:FRAMEWORK:END\s*-->/);
    assert.match(content, /<!--\s*KAIZEN:EXPERT:START\s*-->/);
    assert.match(content, /<!--\s*KAIZEN:EXPERT:END\s*-->/);
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: bin/kaizen-init.js no longer carries the dead 17-line v1.4 CLAUDE_MD_SCAFFOLD body', () => {
  // Commandment IV — Quality First, no orphan code. The story explicitly
  // demands the old scaffold body (the v1.4 string with "KaiZen v1.4" and
  // "Comandos de entrada") be removed. The new scaffold lives in
  // bin/lib/claude-md-scaffold.js and is reached via require.
  const initSource = fs.readFileSync(
    path.join(SOURCE_ROOT, 'bin', 'kaizen-init.js'),
    'utf8'
  );
  // Old v1.4 markers that lived inside the dead constant body
  assert.ok(
    !/KaiZen v1\.4/u.test(initSource),
    'old "KaiZen v1.4" string must be removed from bin/kaizen-init.js'
  );
  assert.ok(
    !/Comandos de entrada/u.test(initSource),
    'old "Comandos de entrada" section heading must be removed from bin/kaizen-init.js'
  );
  assert.ok(
    !/disponível em M2\/M3/u.test(initSource),
    'old "disponível em M2/M3" placeholder must be removed from bin/kaizen-init.js'
  );
});
