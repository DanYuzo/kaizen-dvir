'use strict';

/**
 * test-hotfix-persona-relative-path.js — regression test for the M6.7 §6.1
 * gate-verdict CONCERN: cell-registry `_personaRelPath()` previously embedded
 * absolute filesystem paths into the body of every generated
 * `.claude/commands/Kaizen/Yotzer*.md` skill file. Two installs of the same
 * package landed under different `os.tmpdir()` roots, so the absolute string
 * differed across channels — breaking the byte-equality contract asserted by
 * `tests/m6/test-channel-github-packages.js` and `tests/m6/test-channel-npx-github.js`
 * (D-v1.5-09).
 *
 * The fix (committed in M8.7 closeout): persona references are POSIX-relative
 * paths under `cellRoot` (e.g., `agents/chief.md`). The body remains
 * informational — it points the expert at the persona file using the path
 * the skill itself implicitly anchors at via the `/Kaizen:Yotzer` prefix.
 *
 * This test guards against regression by asserting:
 *   1. NO absolute path appears in any generated skill body.
 *   2. The persona reference matches the exact relative POSIX form.
 *   3. Two registrations against different cellRoot tmp dirs produce
 *      byte-identical skill bodies (the channel-hash invariant).
 *
 * Story:  M8.7 — M8 integration gate (closes M6.7 §6.1 backlog)
 * Refs:   M6.7 gate-report.md §6.1, Commandment IV (Quality First)
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const REGISTRY_PATH = path.join(ROOT, '.kaizen-dvir', 'dvir', 'cell-registry.js');
const YOTZER_SOURCE = path.join(ROOT, '.kaizen-dvir', 'celulas', 'yotzer');

function loadRegistry() {
  delete require.cache[require.resolve(REGISTRY_PATH)];
  return require(REGISTRY_PATH);
}

function mkTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kz-m8.7-hotfix-' + label + '-'));
}

function rmRf(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    /* best-effort */
  }
}

/**
 * Clone the canonical Yotzer cell into a fresh temp directory so each test
 * works against an isolated cellRoot. Only `celula.yaml` and `agents/*.md`
 * are needed for skill registration.
 */
function cloneYotzerCell() {
  const cellRoot = mkTmp('cell');
  fs.copyFileSync(
    path.join(YOTZER_SOURCE, 'celula.yaml'),
    path.join(cellRoot, 'celula.yaml')
  );
  fs.mkdirSync(path.join(cellRoot, 'agents'), { recursive: true });
  for (const ent of fs.readdirSync(path.join(YOTZER_SOURCE, 'agents'), { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
    fs.copyFileSync(
      path.join(YOTZER_SOURCE, 'agents', ent.name),
      path.join(cellRoot, 'agents', ent.name)
    );
  }
  return cellRoot;
}

test('M8.7 hotfix: NO absolute path leaks into entry skill body', () => {
  const cellRoot = cloneYotzerCell();
  const claudeDir = mkTmp('claude');
  try {
    const { registerCellSkills } = loadRegistry();
    registerCellSkills(cellRoot, claudeDir);
    const entryBody = fs.readFileSync(
      path.join(claudeDir, 'Kaizen', 'Yotzer.md'),
      'utf8'
    );
    // Reject anything that looks like an absolute filesystem path. POSIX
    // absolute paths start with `/`; Windows absolute paths start with a
    // drive letter (`C:`, `D:`, etc.) or are UNC. We only need to assert
    // the cellRoot leakage is gone — the cellRoot string itself must not
    // appear inside the body.
    assert.ok(
      !entryBody.includes(cellRoot),
      'entry skill body MUST NOT contain the cellRoot absolute path. ' +
        'Found cellRoot=' + cellRoot + ' in body.'
    );
    // Also reject likely Windows path leakage forms (forward-slashed copy
    // of cellRoot, since _personaRelPath used to normalize separators).
    const cellRootPosix = cellRoot.split(path.sep).join('/');
    assert.ok(
      !entryBody.includes(cellRootPosix),
      'entry skill body MUST NOT contain POSIX-normalized cellRoot. ' +
        'Found ' + cellRootPosix + ' in body.'
    );
  } finally {
    rmRf(cellRoot);
    rmRf(claudeDir);
  }
});

test('M8.7 hotfix: NO absolute path leaks into specialist skill bodies', () => {
  const cellRoot = cloneYotzerCell();
  const claudeDir = mkTmp('claude');
  try {
    const { registerCellSkills } = loadRegistry();
    registerCellSkills(cellRoot, claudeDir);
    const specialistsDir = path.join(claudeDir, 'Kaizen', 'Yotzer');
    const cellRootPosix = cellRoot.split(path.sep).join('/');
    for (const ent of fs.readdirSync(specialistsDir, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.endsWith('.md')) continue;
      const body = fs.readFileSync(path.join(specialistsDir, ent.name), 'utf8');
      assert.ok(
        !body.includes(cellRoot),
        'specialist ' + ent.name + ' body leaks cellRoot=' + cellRoot
      );
      assert.ok(
        !body.includes(cellRootPosix),
        'specialist ' + ent.name + ' body leaks POSIX cellRoot=' + cellRootPosix
      );
    }
  } finally {
    rmRf(cellRoot);
    rmRf(claudeDir);
  }
});

test('M8.7 hotfix: persona references use exact relative POSIX form', () => {
  const cellRoot = cloneYotzerCell();
  const claudeDir = mkTmp('claude');
  try {
    const { registerCellSkills } = loadRegistry();
    registerCellSkills(cellRoot, claudeDir);

    const entryBody = fs.readFileSync(
      path.join(claudeDir, 'Kaizen', 'Yotzer.md'),
      'utf8'
    );
    assert.match(
      entryBody,
      /Persona do chief: `agents\/chief\.md`/,
      'entry body must reference chief persona as `agents/chief.md` (relative POSIX)'
    );

    // Verify each specialist body uses the same relative form.
    const expectedAgents = [
      'archaeologist',
      'chief',
      'contract-builder',
      'prioritizer',
      'progressive-systemizer',
      'publisher',
      'risk-mapper',
      'stress-tester',
      'task-granulator',
    ];
    const specialistsDir = path.join(claudeDir, 'Kaizen', 'Yotzer');
    for (const agentId of expectedAgents) {
      const body = fs.readFileSync(
        path.join(specialistsDir, agentId + '.md'),
        'utf8'
      );
      const re = new RegExp('Persona: `agents\\/' + agentId + '\\.md`');
      assert.match(
        body,
        re,
        agentId + ' specialist must reference persona as `agents/' + agentId + '.md`'
      );
    }
  } finally {
    rmRf(cellRoot);
    rmRf(claudeDir);
  }
});

test('M8.7 hotfix: two registrations under DIFFERENT cellRoots produce byte-identical bodies', () => {
  // This is the channel-hash invariant. With the old absolute-path embedding
  // these two bodies differed; with the relative-path fix they must be
  // identical (the fix's whole purpose).
  const cellRootA = cloneYotzerCell();
  const cellRootB = cloneYotzerCell();
  const claudeDirA = mkTmp('claude-a');
  const claudeDirB = mkTmp('claude-b');
  try {
    assert.notStrictEqual(
      cellRootA,
      cellRootB,
      'sanity: temp cellRoots must differ across the two installs'
    );

    const { registerCellSkills } = loadRegistry();
    registerCellSkills(cellRootA, claudeDirA);
    registerCellSkills(cellRootB, claudeDirB);

    const filesA = fs.readdirSync(path.join(claudeDirA, 'Kaizen', 'Yotzer')).sort();
    const filesB = fs.readdirSync(path.join(claudeDirB, 'Kaizen', 'Yotzer')).sort();
    assert.deepStrictEqual(filesA, filesB, 'specialist file sets must match');

    // Entry skill byte equality.
    const entryA = fs.readFileSync(
      path.join(claudeDirA, 'Kaizen', 'Yotzer.md')
    );
    const entryB = fs.readFileSync(
      path.join(claudeDirB, 'Kaizen', 'Yotzer.md')
    );
    assert.strictEqual(
      Buffer.compare(entryA, entryB),
      0,
      'entry skill bytes must be identical across two cellRoots ' +
        '(channel-hash invariant restored by M8.7 hotfix)'
    );

    // Specialist skill byte equality.
    for (const fname of filesA) {
      const a = fs.readFileSync(path.join(claudeDirA, 'Kaizen', 'Yotzer', fname));
      const b = fs.readFileSync(path.join(claudeDirB, 'Kaizen', 'Yotzer', fname));
      assert.strictEqual(
        Buffer.compare(a, b),
        0,
        'specialist ' + fname + ' bytes must be identical across two cellRoots'
      );
    }
  } finally {
    rmRf(cellRootA);
    rmRf(cellRootB);
    rmRf(claudeDirA);
    rmRf(claudeDirB);
  }
});
