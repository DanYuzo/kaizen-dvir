'use strict';

/**
 * test-publisher-skip-when-no-personas.js — M8.5 backward-compat:
 * `materializeCell()` must skip skill registration silently when the
 * materialized cell has zero `.md` files under agents/. Existing M4.5
 * tests rely on this behavior — they exercise the publisher with
 * fixture manifests that declare `tier_1.agents: ['chief']` but never
 * seed `agents/chief.md`. The skip prevents a spurious throw from
 * registerCellSkills() on the chief-persona-missing path.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const H = require('./_helpers.js');

test('materializeCell skips registration when claudeCommandsDir is absent', () => {
  const celulasRoot = H.makeTempDir('celulas-no-claude');
  try {
    const publisher = H.loadPublisher();
    const spec = H.buildSpec({ name: 'celula-no-claude' });
    // Note: NO `options` argument -> claudeCommandsDir undefined.
    const result = publisher.materializeCell(spec, celulasRoot);
    assert.strictEqual(
      result.skillRegistration,
      null,
      'skillRegistration must be null when claudeCommandsDir is not provided'
    );
  } finally {
    H.rmRf(celulasRoot);
  }
});

test('materializeCell skips registration when agents/ has no persona .md files', () => {
  const celulasRoot = H.makeTempDir('celulas-no-personas');
  const claudeDir = H.makeTempDir('claude-no-personas');
  try {
    const publisher = H.loadPublisher();
    // Build a spec WITHOUT seedFiles for agents/*.md — only OST + success
    // examples — so the materialized cell has empty agents/.
    const spec = H.buildSpec({ name: 'celula-empty-agents' });
    delete spec.seedFiles['agents/chief.md'];
    delete spec.seedFiles['agents/archaeologist.md'];
    const result = publisher.materializeCell(spec, celulasRoot, {
      claudeCommandsDir: claudeDir,
    });
    assert.strictEqual(
      result.skillRegistration,
      null,
      'skillRegistration must be null when agents/ has no persona files'
    );
    // The claude dir must NOT have any files written.
    const fs = require('node:fs');
    let entries = [];
    try {
      entries = fs.readdirSync(claudeDir);
    } catch (_) {
      entries = [];
    }
    // claudeDir was created by mkdtempSync — empty by definition; if
    // anything appears here it was written by the publisher.
    assert.deepStrictEqual(
      entries,
      [],
      'claudeCommandsDir must remain empty when registration is skipped'
    );
  } finally {
    H.rmRf(celulasRoot);
    H.rmRf(claudeDir);
  }
});
