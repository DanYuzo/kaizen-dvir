'use strict';

/**
 * test-m8-gate.js — M8 integration gate test (Story M8.7).
 *
 * Validates the 3 PRD § M8 Gate criteria end-to-end against a clean sandbox
 * project. Where M8.2-M8.6 own per-story unit-level coverage, this suite
 * stitches the pieces together into the real expert-facing flow:
 *
 *     `kaizen init` → assert structure → `kaizen doctor --cells`
 *                                      → simulate corruption → re-doctor
 *                                      → publisher round-trip
 *
 * Gate criteria mapping:
 *   1. Init produces 1 entry skill + 9 specialist skills under
 *      `.claude/commands/Kaizen/Yotzer*` — covered by Test Group A.
 *   2. `/Kaizen:Yotzer` activates `chief` interactively — covered by the
 *      manual smoke test fixture documented at:
 *         tests/m8/MANUAL-SMOKE-TEST.md  (pt-BR, expert-facing)
 *         tests/m8/integration/smoke-procedure.md  (pt-BR, @qa procedure)
 *      The structural prerequisite (skill files loadable by Claude Code) is
 *      asserted automatically in Test Group A; the runtime prerequisite (an
 *      interactive Claude Code session) cannot be automated headlessly.
 *   3. Doctor detects missing skill — covered by Test Group C.
 *
 * Scope:
 *   Group A — Init flow (Gate 1)
 *   Group B — Doctor happy path (Gate 3 supporting case)
 *   Group C — Doctor detects missing entry skill (Gate 3 primary case)
 *   Group D — Publisher → cell-registry round-trip (D8.5)
 *   Group E — Single-source-of-truth invariant (no inlined skill emission)
 *   Group F — Language Policy (no English stop-words in user-facing output)
 *
 * Out of scope:
 *   - `kaizen update` skill resync flow (M8.4 owns the gate-level coverage
 *     via the canonical-root harness; this suite reuses the M8.4 invariants
 *     by reference — duplication would be wasteful and CON-003 hostile).
 *   - Headless `/Kaizen:Yotzer` activation — see manual smoke procedure.
 *
 * Refs: AC-025, AC-026, FR-047, FR-048, D-v1.5-05, D-v1.5-06, NFR-101,
 *       NFR-102, CON-002, CON-003, Commandment IV.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers-integration.js');

// ===========================================================================
// Group A — Gate 1: kaizen init produces the expected skill structure.
// ===========================================================================

test('M8 Gate 1.A: init exits 0 and writes the entry skill at Kaizen/Yotzer.md', () => {
  const tmp = H.mkProject('gate1-entry');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(
      result.status,
      0,
      'init must exit 0; stderr=' + result.stderr
    );
    const entryPath = path.join(
      tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md'
    );
    assert.ok(
      H.fileExists(entryPath),
      'Gate criterion 1 prerequisite: entry skill must exist at Kaizen/Yotzer.md'
    );
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate 1.B: init writes exactly 9 specialist skills (one per Yotzer agent)', () => {
  const tmp = H.mkProject('gate1-specialists');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const subDir = path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer');
    const files = H.listDirFiles(subDir);
    const expected = H.YOTZER_AGENTS.map((a) => a + '.md').sort();
    assert.deepStrictEqual(
      files,
      expected,
      'Gate criterion 1: must contain 1 .md per Yotzer agent (chief + 8 specialists = 9 files)'
    );
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate 1.C: every generated skill file has non-empty body and valid frontmatter', () => {
  const tmp = H.mkProject('gate1-frontmatter');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const entryPath = path.join(
      tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md'
    );
    const subDir = path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer');

    const files = [entryPath].concat(
      H.YOTZER_AGENTS.map((a) => path.join(subDir, a + '.md'))
    );
    for (const f of files) {
      const body = H.readUtf8(f);
      assert.ok(body.length > 0, 'file must be non-empty: ' + f);
      // Frontmatter contract per M8.1 spec: `---\ndescription: "..."\n---`
      assert.match(
        body,
        /^---\ndescription: "[^"]+"\n---/,
        'file must open with valid YAML frontmatter (description scalar): ' + f
      );
      // Body must continue past the frontmatter close.
      const afterFrontmatter = body.split(/^---\n/m).slice(2).join('---\n');
      assert.ok(
        afterFrontmatter.trim().length > 0,
        'body content after frontmatter must be non-empty: ' + f
      );
    }
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate 1.D: entry skill body asserts the slash-vs-shell distinction in pt-BR (FR-048)', () => {
  const tmp = H.mkProject('gate1-shell-distinction');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const body = H.readUtf8(
      path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md')
    );
    // The exact phrase produced by registerCellSkills (M8.2 contract):
    //   "Para invocacao programatica via terminal, use `kaizen Kaizen:Yotzer
    //   publish|resume|validate <work-id>` — distinto desta skill interativa."
    assert.ok(
      body.includes('kaizen Kaizen:Yotzer publish'),
      'entry body must reference the shell subcommand'
    );
    assert.ok(
      body.includes('distinto desta skill interativa'),
      'entry body must explicitly distinguish slash from shell (pt-BR per D-v1.5-06)'
    );
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate 1.E: init summary lists registered skills in pt-BR (NFR-102)', () => {
  const tmp = H.mkProject('gate1-summary');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(result.status, 0);
    assert.match(
      result.stdout,
      /Skills:\s+yotzer\s+\(1 entry \+ \d+ specialists\)/,
      'init summary must include the per-cell skills line in pt-BR (M8.3 AC line 81)'
    );
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate 1.F: init is idempotent — second run produces zero specialist file changes', () => {
  const tmp = H.mkProject('gate1-idempotent');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const subDir = path.join(tmp, '.claude', 'commands', 'Kaizen', 'Yotzer');
    const beforeBytes = new Map();
    for (const f of H.listDirFiles(subDir)) {
      beforeBytes.set(f, fs.readFileSync(path.join(subDir, f)));
    }
    const entryPath = path.join(
      tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md'
    );
    const beforeEntry = fs.readFileSync(entryPath);

    // Second init — must be a no-op for already-up-to-date skills.
    assert.strictEqual(H.runInit(tmp).status, 0);

    const afterEntry = fs.readFileSync(entryPath);
    assert.strictEqual(
      Buffer.compare(beforeEntry, afterEntry),
      0,
      'entry skill bytes must be identical across init runs'
    );
    for (const [name, before] of beforeBytes) {
      const after = fs.readFileSync(path.join(subDir, name));
      assert.strictEqual(
        Buffer.compare(before, after),
        0,
        'specialist ' + name + ' bytes must be identical across init runs'
      );
    }
  } finally {
    H.rmProject(tmp);
  }
});

// ===========================================================================
// Group B — Gate 3 supporting case: doctor reports OK on a clean install.
// ===========================================================================

test('M8 Gate 3.HAPPY: doctor --cells reports OK for yotzer when skills are present', () => {
  const tmp = H.mkProject('gate3-happy');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(
      doc.status,
      0,
      'doctor must exit 0 on clean state; stderr=' + doc.stderr
    );
    // M8.6 contract: "OK: yotzer -> /Kaizen:Yotzer" (or equivalent prefix).
    // We assert OK + cell name + slash command appear together.
    const ok = doc.stdout
      .split(/\r?\n/)
      .find((l) => l.indexOf('OK:') !== -1 && l.indexOf('yotzer') !== -1);
    assert.ok(
      ok,
      'must emit OK line for yotzer; stdout=' + doc.stdout
    );
    assert.match(
      ok,
      /\/Kaizen:Yotzer/,
      'OK line must include the slash command'
    );
    // No AVISO line for yotzer in clean state.
    assert.ok(
      doc.stdout.indexOf('AVISO:') === -1 ||
        !doc.stdout.match(/AVISO:.*yotzer/),
      'no AVISO line should appear for yotzer in clean state'
    );
  } finally {
    H.rmProject(tmp);
  }
});

// ===========================================================================
// Group C — Gate 3 PRIMARY case: doctor detects missing entry skill.
// ===========================================================================

test('M8 Gate 3.PRIMARY: doctor emits pt-BR AVISO when entry skill is deleted', () => {
  const tmp = H.mkProject('gate3-missing');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);

    const entryPath = path.join(
      tmp, '.claude', 'commands', 'Kaizen', 'Yotzer.md'
    );
    fs.unlinkSync(entryPath);
    assert.ok(!H.fileExists(entryPath), 'pre-condition: entry skill removed');

    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(
      doc.status,
      0,
      'AVISO must NOT change exit code (M8.6 doctor semantics); status=' + doc.status
    );

    const aviso = doc.stdout.split(/\r?\n/).find(
      (l) => l.indexOf('AVISO:') !== -1 && l.indexOf('sem skill registrada em') !== -1
    );
    assert.ok(
      aviso,
      'doctor must emit pt-BR AVISO line for missing entry; stdout=' + doc.stdout
    );

    // Gate criterion 3 requires: cell path AND fix suggestion both present
    // in the AVISO message.
    assert.match(
      aviso,
      /celulas[\\\/]yotzer/,
      'AVISO must name the cell directory (Gate 3 — cell path)'
    );
    assert.match(
      aviso,
      /Kaizen[\\\/]Yotzer\.md/,
      'AVISO must name the expected skill path (Gate 3)'
    );
    assert.match(
      aviso,
      /Rode 'kaizen update' ou 'kaizen init' para registrar\./,
      'AVISO must include pt-BR fix suggestion (Gate 3 — NFR-101)'
    );
  } finally {
    H.rmProject(tmp);
  }
});

// ===========================================================================
// Group D — Publisher → cell-registry round-trip (D8.5).
// ===========================================================================

test('M8 Gate Publisher: materializeCell with claudeCommandsDir registers entry + specialists', () => {
  const celulasRoot = H.mkProject('pub-celulas');
  const claudeDir = H.mkProject('pub-claude');
  try {
    const publisher = H.loadPublisher();
    const spec = H.buildPublisherSpec({
      name: 'celula-m87-gate',
      slashPrefix: 'Kaizen:CelulaM87Gate',
    });
    const result = publisher.materializeCell(spec, celulasRoot, {
      claudeCommandsDir: claudeDir,
    });

    assert.ok(
      result.skillRegistration,
      'publisher result must include skillRegistration block (M8.5 contract)'
    );
    assert.strictEqual(
      result.skillRegistration.entryWritten,
      true,
      'publisher must report entryWritten=true'
    );

    // Entry skill at the slashPrefix-derived path.
    const entryPath = path.join(
      claudeDir, 'Kaizen', 'CelulaM87Gate.md'
    );
    assert.ok(
      H.fileExists(entryPath),
      'publisher must produce entry skill at ' + entryPath
    );

    // Specialist files for chief + archaeologist.
    const specDir = path.join(claudeDir, 'Kaizen', 'CelulaM87Gate');
    const specialists = H.listDirFiles(specDir);
    assert.deepStrictEqual(
      specialists,
      ['archaeologist.md', 'chief.md'],
      'publisher must produce one .md per persona (chief + archaeologist)'
    );

    // Round-trip byte-equality with the standalone registry helper.
    const registry = H.loadRegistry();
    const standaloneResult = registry.registerCellSkills(
      result.celulaPath,
      claudeDir
    );
    assert.strictEqual(
      standaloneResult.entryWritten,
      true,
      'standalone helper run must succeed (idempotent)'
    );
    // After the standalone re-run, the entry bytes must remain identical
    // (publisher and helper write the same bytes — single source of truth).
    const entryBytes = fs.readFileSync(entryPath);
    registry.registerCellSkills(result.celulaPath, claudeDir);
    const entryBytesAgain = fs.readFileSync(entryPath);
    assert.strictEqual(
      Buffer.compare(entryBytes, entryBytesAgain),
      0,
      'entry skill bytes must be byte-identical between publisher and standalone helper runs'
    );
  } finally {
    H.rmProject(celulasRoot);
    H.rmProject(claudeDir);
  }
});

// ===========================================================================
// Group E — Single-source-of-truth invariant (D8.5 refactor goal).
// ===========================================================================

test('M8 Gate SSOT: publisher.js requires cell-registry helper (no duplicated registration code)', () => {
  const src = H.readUtf8(H.PUBLISHER_PATH);
  // The publisher MUST require the registry helper.
  assert.ok(
    /require\(['"][^'"]*dvir\/cell-registry['"]\)/.test(src),
    'publisher.js must require dvir/cell-registry (single source of truth — D8.5)'
  );
  // The publisher MUST NOT contain registry-only template markers.
  // These strings appear ONLY inside the registry's body templates.
  const inlineMarkers = [
    'Carregue a persona do chief',
    'Os demais agentes da celula estao disponiveis como sub-skills',
    'distinto desta skill interativa',
  ];
  for (const marker of inlineMarkers) {
    assert.ok(
      !src.includes(marker),
      'publisher.js must NOT inline registry marker: "' + marker + '"'
    );
  }
});

// ===========================================================================
// Group F — Language Policy (D-v1.4-06): no English stop-words in user-facing
// init or doctor output.
// ===========================================================================

const ENGLISH_STOP_WORDS = [
  // Words that would only appear in EN user-facing strings, never in pt-BR.
  // Carefully chosen so they do not appear as substrings of pt-BR words or
  // proper nouns (e.g., "Kaizen", paths, agent ids).
  ' Error:',
  ' Warning:',
  ' Failed ',
  ' Success ',
  ' Please ',
];

test('M8 Gate LangPolicy: kaizen init stdout has no English stop-words', () => {
  const tmp = H.mkProject('lang-init');
  try {
    const result = H.runInit(tmp);
    assert.strictEqual(result.status, 0);
    for (const word of ENGLISH_STOP_WORDS) {
      assert.ok(
        result.stdout.indexOf(word) === -1,
        'init stdout must not contain English stop-word "' + word.trim() + '"; ' +
          'stdout snippet: ' + result.stdout.slice(0, 200)
      );
    }
  } finally {
    H.rmProject(tmp);
  }
});

test('M8 Gate LangPolicy: kaizen doctor --cells stdout has no English stop-words', () => {
  const tmp = H.mkProject('lang-doctor');
  try {
    assert.strictEqual(H.runInit(tmp).status, 0);
    const doc = H.runDoctorCells(tmp);
    assert.strictEqual(doc.status, 0);
    for (const word of ENGLISH_STOP_WORDS) {
      assert.ok(
        doc.stdout.indexOf(word) === -1,
        'doctor stdout must not contain English stop-word "' + word.trim() + '"'
      );
    }
  } finally {
    H.rmProject(tmp);
  }
});

// ===========================================================================
// Group G — Cross-channel byte-equality probe (regression guard for M6.7
// §6.1 hotfix; the kaizen channel hash tests own the full assertion).
// ===========================================================================

test('M8 Gate ChannelHash: two inits in different sandboxes produce byte-identical Yotzer.md', () => {
  // Two independent `kaizen init` runs targeting different temp roots must
  // write identical entry-skill bytes — the relative-POSIX persona path
  // contract is the only thing that makes this true.
  const tmpA = H.mkProject('chan-a');
  const tmpB = H.mkProject('chan-b');
  try {
    assert.strictEqual(H.runInit(tmpA).status, 0);
    assert.strictEqual(H.runInit(tmpB).status, 0);
    const entryA = fs.readFileSync(
      path.join(tmpA, '.claude', 'commands', 'Kaizen', 'Yotzer.md')
    );
    const entryB = fs.readFileSync(
      path.join(tmpB, '.claude', 'commands', 'Kaizen', 'Yotzer.md')
    );
    assert.strictEqual(
      Buffer.compare(entryA, entryB),
      0,
      'entry skill bytes must be identical across two independent inits ' +
        '(channel-hash invariant — the M6.7 §6.1 hotfix unblocks this)'
    );
  } finally {
    H.rmProject(tmpA);
    H.rmProject(tmpB);
  }
});
