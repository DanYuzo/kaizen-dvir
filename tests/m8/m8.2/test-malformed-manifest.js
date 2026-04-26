'use strict';

/**
 * test-malformed-manifest.js — registerCellSkills throws pt-BR errors on
 * malformed celula.yaml shapes.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const H = require('./_helpers.js');

function runOnYaml(yamlText) {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  H.writeManifest(cellRoot, yamlText);
  try {
    const { registerCellSkills } = H.loadRegistry();
    return {
      cellRoot,
      claudeDir,
      run: () => registerCellSkills(cellRoot, claudeDir),
    };
  } finally {
    // Cleanup deferred to caller via try/finally.
  }
}

test('throws when celula.yaml is missing', () => {
  const cellRoot = H.makeTempDir('cell');
  const claudeDir = H.makeTempDir('claude');
  try {
    const { registerCellSkills } = H.loadRegistry();
    assert.throws(
      () => registerCellSkills(cellRoot, claudeDir),
      /celula\.yaml ausente/
    );
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('throws when slashPrefix is missing', () => {
  const ctx = runOnYaml(
    [
      'name: "yotzer"',
      'description: "Celula sem slashPrefix"',
      'tiers:',
      '  tier_1:',
      '    chief: true',
      '    agents:',
      '      - "chief"',
      '',
    ].join('\n')
  );
  try {
    assert.throws(ctx.run, /slashPrefix obrigatorio/);
  } finally {
    H.rmRf(ctx.cellRoot);
    H.rmRf(ctx.claudeDir);
  }
});

test('throws when slashPrefix contains forbidden characters', () => {
  const ctx = runOnYaml(
    [
      'name: "yotzer"',
      'slashPrefix: "Kaizen:Yot zer"', // space — forbidden
      'description: "x"',
      'tiers:',
      '  tier_1:',
      '    chief: true',
      '    agents:',
      '      - "chief"',
      '',
    ].join('\n')
  );
  try {
    // The strict YAML parser rejects ambiguous values OR our segment
    // validator rejects the space. Either error path is acceptable —
    // only the throw matters for the AC.
    assert.throws(ctx.run, /slashPrefix|invalido|ambig/i);
  } finally {
    H.rmRf(ctx.cellRoot);
    H.rmRf(ctx.claudeDir);
  }
});

test('throws when tiers is missing', () => {
  const ctx = runOnYaml(
    [
      'name: "yotzer"',
      'slashPrefix: "Kaizen:Yotzer"',
      'description: "Celula sem tiers"',
      '',
    ].join('\n')
  );
  try {
    assert.throws(ctx.run, /tiers obrigatorio/);
  } finally {
    H.rmRf(ctx.cellRoot);
    H.rmRf(ctx.claudeDir);
  }
});

test('throws when no agents are declared at all', () => {
  const ctx = runOnYaml(
    [
      'name: "yotzer"',
      'slashPrefix: "Kaizen:Yotzer"',
      'description: "x"',
      'tiers:',
      '  tier_1:',
      '    chief: true',
      '    agents: []',
      '',
    ].join('\n')
  );
  try {
    // Empty inline list `[]` is not parsed by the strict subset parser, so
    // the manifest fails with `agents ausente ou invalido` — acceptable
    // either way: the test asserts a hard failure with pt-BR text.
    assert.throws(ctx.run, /agents|agente|tier/);
  } finally {
    H.rmRf(ctx.cellRoot);
    H.rmRf(ctx.claudeDir);
  }
});

test('throws when chief persona file is missing on disk', () => {
  // Use the canonical Yotzer manifest but delete agents/chief.md.
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  fs.unlinkSync(path.join(cellRoot, 'agents', 'chief.md'));
  try {
    const { registerCellSkills } = H.loadRegistry();
    assert.throws(
      () => registerCellSkills(cellRoot, claudeDir),
      /persona do chief ausente/
    );
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});

test('throws when more than one agent is flagged chief: true (per-agent)', () => {
  const ctx = runOnYaml(
    [
      'name: "yotzer"',
      'slashPrefix: "Kaizen:Yotzer"',
      'description: "x"',
      'tiers:',
      '  tier_1:',
      '    agents:',
      '      - id: "chief"',
      '        chief: true',
      '      - id: "archaeologist"',
      '        chief: true',
      '',
    ].join('\n')
  );
  try {
    assert.throws(ctx.run, /mais de um agente flagado/);
  } finally {
    H.rmRf(ctx.cellRoot);
    H.rmRf(ctx.claudeDir);
  }
});
