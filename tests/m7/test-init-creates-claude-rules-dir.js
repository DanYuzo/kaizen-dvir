'use strict';

// M7.3 — kaizen init creates .claude/rules/ with exactly six seed files
// matching the M7.1 seed list (FR-050, AC-027, M7 Gate criterion 2).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

const EXPECTED_RULES = [
  'boundary.md',
  'cells.md',
  'yotzer.md',
  'doctor.md',
  'language-policy.md',
  'commit-conventions.md',
];

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m7.3-rules-'));
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

test('M7.3: kaizen init creates .claude/rules/ with exactly six seed files', () => {
  const tmp = mkTmp();
  try {
    const result = runInit(tmp);
    assert.strictEqual(result.status, 0, 'init exits 0; stderr=' + result.stderr);

    const rulesDir = path.join(tmp, '.claude', 'rules');
    assert.ok(fs.existsSync(rulesDir), '.claude/rules/ must exist');
    assert.ok(fs.statSync(rulesDir).isDirectory(), '.claude/rules/ is a directory');

    const entries = fs.readdirSync(rulesDir).sort();
    assert.deepStrictEqual(
      entries,
      EXPECTED_RULES.slice().sort(),
      'exactly the six M7.1 seed files must be present, no extra, no missing'
    );

    for (const name of EXPECTED_RULES) {
      const abs = path.join(rulesDir, name);
      const stat = fs.statSync(abs);
      assert.ok(stat.isFile(), name + ' must be a file');
      assert.ok(stat.size > 0, name + ' must be non-empty');
    }
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: rule seed bodies match the L2 source bytes-for-bytes (single source of truth)', () => {
  const tmp = mkTmp();
  try {
    runInit(tmp);
    for (const name of EXPECTED_RULES) {
      const writtenBytes = fs.readFileSync(
        path.join(tmp, '.claude', 'rules', name)
      );
      const sourceBytes = fs.readFileSync(
        path.join(
          SOURCE_ROOT,
          '.kaizen-dvir',
          'instructions',
          'templates',
          'rules',
          name
        )
      );
      assert.ok(
        Buffer.compare(writtenBytes, sourceBytes) === 0,
        name + ' must match L2 source byte-for-byte'
      );
    }
  } finally {
    rmTmp(tmp);
  }
});

test('M7.3: init summary mentions .claude/rules/ in pt-BR (NFR-101)', () => {
  const tmp = mkTmp();
  try {
    const result = runInit(tmp);
    assert.strictEqual(result.status, 0);
    assert.match(
      result.stdout,
      /\.claude\/rules\//,
      'summary mentions .claude/rules/'
    );
    assert.match(
      result.stdout,
      /6 arquivos de referência do framework/u,
      'summary describes the six reference files in pt-BR'
    );
  } finally {
    rmTmp(tmp);
  }
});
