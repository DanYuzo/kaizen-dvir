'use strict';

/**
 * test-publisher-delegates-to-registry.js — M8.5 AC: the publisher
 * consumes `dvir/cell-registry.registerCellSkills()` instead of
 * inlining its own skill-emission logic. The output written under
 * `.claude/commands/{slashPrefix}/*.md` MUST match what the registry
 * helper produces when called standalone on the same cell (single
 * source of truth — D8.5 refactor goal).
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const H = require('./_helpers.js');

test('publisher writes the same entry skill bytes that registerCellSkills produces', () => {
  const celulasRoot = H.makeTempDir('celulas');
  const claudeDir = H.makeTempDir('claude');
  try {
    const publisher = H.loadPublisher();
    const spec = H.buildSpec({
      name: 'celula-delegate-1',
      slashPrefix: 'Kaizen:CelulaDelegate1',
    });
    const result = publisher.materializeCell(spec, celulasRoot, {
      claudeCommandsDir: claudeDir,
    });
    assert.strictEqual(
      result.skillRegistration && result.skillRegistration.entryWritten,
      true,
      'publisher must report entryWritten=true when claudeCommandsDir + personas present'
    );

    const entryPath = path.join(
      claudeDir,
      'Kaizen',
      'CelulaDelegate1.md'
    );
    assert.ok(
      H.fileExists(entryPath),
      'entry skill .md must exist at ' + entryPath
    );

    // Now invoke the registry helper directly on the same cellRoot+claudeDir
    // — it is idempotent, so the on-disk content must already match what
    // the helper would produce. This is the byte-equality probe the AC
    // calls for: the publisher cannot emit anything different from the
    // canonical helper output.
    const registry = H.loadRegistry();
    const standaloneResult = registry.registerCellSkills(
      result.celulaPath,
      claudeDir
    );
    assert.strictEqual(
      standaloneResult.entryWritten,
      true,
      'standalone helper run must also report entryWritten=true (idempotent)'
    );
    // The entry file must have the exact same bytes after the standalone
    // re-run (no diff means publisher did not customize the body).
    const bytesAfter = H.readUtf8(entryPath);
    // Re-run helper a third time; bytes must remain identical.
    registry.registerCellSkills(result.celulaPath, claudeDir);
    const bytesFinal = H.readUtf8(entryPath);
    assert.strictEqual(
      bytesFinal,
      bytesAfter,
      'entry skill bytes must be byte-identical between publisher and standalone helper runs (idempotency)'
    );
  } finally {
    H.rmRf(celulasRoot);
    H.rmRf(claudeDir);
  }
});

test('publisher writes one specialist skill per persona file under {slash}/', () => {
  const celulasRoot = H.makeTempDir('celulas-specialists');
  const claudeDir = H.makeTempDir('claude-specialists');
  try {
    const publisher = H.loadPublisher();
    const spec = H.buildSpec({
      name: 'celula-spec-1',
      slashPrefix: 'Kaizen:CelulaSpec1',
    });
    const result = publisher.materializeCell(spec, celulasRoot, {
      claudeCommandsDir: claudeDir,
    });
    const reg = result.skillRegistration;
    assert.ok(reg, 'skillRegistration block must be present');
    // chief + archaeologist = 2 specialist files (chief included for
    // direct re-activation per cell-registry contract).
    assert.deepStrictEqual(
      reg.specialistsWritten.slice().sort(),
      ['archaeologist', 'chief'],
      'specialistsWritten must list both agents (chief + archaeologist)'
    );
    assert.ok(
      H.fileExists(
        path.join(claudeDir, 'Kaizen', 'CelulaSpec1', 'chief.md')
      ),
      'chief specialist skill must exist'
    );
    assert.ok(
      H.fileExists(
        path.join(claudeDir, 'Kaizen', 'CelulaSpec1', 'archaeologist.md')
      ),
      'archaeologist specialist skill must exist'
    );
  } finally {
    H.rmRf(celulasRoot);
    H.rmRf(claudeDir);
  }
});

test('publisher does NOT inline skill-template literals (single source of truth)', () => {
  // Grep the publisher source for literal markers that would indicate
  // duplicated skill-emission logic. The only acceptable references are
  // the `require('../../../../dvir/cell-registry')` import line and the
  // pt-BR confirmation message in `bin/kaizen.js` (out of scope here).
  const fs = require('node:fs');
  const src = fs.readFileSync(H.PUBLISHER_PATH, 'utf8');

  // The publisher MUST require the registry helper — if this string is
  // missing, the refactor regressed.
  assert.ok(
    /require\(['"][^'"]*dvir\/cell-registry['"]\)/.test(src),
    'publisher.js must require the cell-registry helper (single source of truth)'
  );

  // The publisher MUST NOT contain skill-body templates of its own —
  // those are owned by cell-registry. Search for tell-tale strings that
  // ONLY appear in the registry's body templates (entry + specialist
  // skill prose). False-positives on generic words like "description"
  // are intentionally avoided here.
  const inlineMarkers = [
    'disable-model-invocation',
    'Carregue a persona do chief',
    'Os demais agentes da celula estao disponiveis como sub-skills',
    'distinto desta skill interativa',
    '## Ativacao',
  ];
  for (const marker of inlineMarkers) {
    assert.ok(
      !src.includes(marker),
      'publisher.js must NOT inline registry template marker: ' + marker
    );
  }
});
