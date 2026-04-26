'use strict';

/**
 * test-chief-fallback.js — when no `chief: true` flag is set anywhere,
 * the FIRST agent of the FIRST declared tier becomes the entry agent.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

test('chief fallback: first tier_1 agent when no chief flag is present', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    // Replace the manifest with a variant that has NO chief flag at all.
    H.writeManifest(
      cellRoot,
      [
        'name: "yotzer"',
        'slashPrefix: "Kaizen:Yotzer"',
        'description: "Variante sem chief flag — deve cair no fallback."',
        'tiers:',
        '  tier_1:',
        '    role: "coordinator"',
        '    agents:',
        '      - "chief"',
        '  tier_2:',
        '    role: "discovery"',
        '    agents:',
        '      - "archaeologist"',
        '',
      ].join('\n')
    );

    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);

    assert.strictEqual(result.entryWritten, true);
    // The first declared tier_1 agent ('chief') becomes the entry agent.
    assert.strictEqual(result.specialistsWritten[0], 'chief',
      'first tier_1 agent must be the entry agent under the fallback rule');
    assert.ok(result.specialistsWritten.includes('archaeologist'));

    // Entry skill body must reference chief persona file.
    const entryBody = H.readFileUtf8(path.join(claudeDir, 'Kaizen', 'Yotzer.md'));
    assert.ok(
      /Persona do chief: `.+\/agents\/chief\.md`/.test(entryBody),
      'entry skill must reference chief.md as the persona'
    );
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('chief fallback: when first tier_1 agent name differs, that one is used', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    // Provide a manifest where the first tier_1 agent is `archaeologist`.
    // We must also rename agents/archaeologist.md to make it the chief
    // persona file — and remove agents/chief.md so the helper does not
    // pick chief by accident.
    H.writeManifest(
      cellRoot,
      [
        'name: "yotzer"',
        'slashPrefix: "Kaizen:Yotzer"',
        'description: "Fallback puro, primeiro agente do primeiro tier."',
        'tiers:',
        '  tier_1:',
        '    role: "coordinator"',
        '    agents:',
        '      - "archaeologist"',
        '  tier_2:',
        '    role: "discovery"',
        '    agents:',
        '      - "publisher"',
        '',
      ].join('\n')
    );

    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);
    assert.strictEqual(result.entryWritten, true);
    assert.strictEqual(result.specialistsWritten[0], 'archaeologist',
      'first agent of first tier must be the entry agent');

    const entryBody = H.readFileUtf8(path.join(claudeDir, 'Kaizen', 'Yotzer.md'));
    assert.ok(/agents\/archaeologist\.md/.test(entryBody),
      'entry body must reference the archaeologist persona');
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('per-agent chief: true wins over tier-level fallback', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    H.writeManifest(
      cellRoot,
      [
        'name: "yotzer"',
        'slashPrefix: "Kaizen:Yotzer"',
        'description: "Per-agent chief flag deve ser usada."',
        'tiers:',
        '  tier_1:',
        '    role: "coordinator"',
        '    agents:',
        '      - id: "archaeologist"',
        '      - id: "chief"',
        '        chief: true',
        '',
      ].join('\n')
    );

    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);
    assert.strictEqual(result.entryWritten, true);
    assert.strictEqual(result.specialistsWritten[0], 'chief',
      'per-agent chief flag must override declaration order');

    const entryBody = H.readFileUtf8(path.join(claudeDir, 'Kaizen', 'Yotzer.md'));
    assert.ok(/agents\/chief\.md/.test(entryBody),
      'entry body must reference chief.md when per-agent flag is set');
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});
