'use strict';

/**
 * tests/m8/m8.5/_helpers.js — shared fixture helpers for M8.5 tests.
 *
 * The publisher refactor (M8.5) wires `materializeCell()` to call
 * `dvir/cell-registry.registerCellSkills()` whenever a `claudeCommandsDir`
 * is provided AND the materialized cell has at least one persona file.
 * These helpers build minimal-but-valid spec inputs the publisher
 * accepts and exercise the registration delegation path end-to-end.
 *
 * No mocks: each test runs against a real temp directory tree so the
 * round-trip from publisher -> cell-registry -> .claude/commands/*.md
 * is verified byte-for-byte.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..');
const PUBLISHER_PATH = path.join(
  ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer',
  'agents',
  '_shared',
  'publisher.js'
);
const REGISTRY_PATH = path.join(
  ROOT,
  '.kaizen-dvir',
  'dvir',
  'cell-registry.js'
);

function loadPublisher() {
  delete require.cache[require.resolve(PUBLISHER_PATH)];
  return require(PUBLISHER_PATH);
}

function loadRegistry() {
  delete require.cache[require.resolve(REGISTRY_PATH)];
  return require(REGISTRY_PATH);
}

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kz-m8-5-' + label + '-'));
}

function rmRf(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    /* best-effort */
  }
}

/**
 * Build a minimal spec accepted by `materializeCell()`. The seedFiles
 * include a chief persona under agents/ so the cell-registry registration
 * path is actually exercised (without it the publisher skips registration
 * by design — see _hasAgentPersonas in publisher.js).
 */
function buildSpec(opts) {
  const o = opts || {};
  const cellName = o.name || 'celula-m85';
  const slashPrefix = o.slashPrefix || 'Kaizen:CelulaM85';
  const tiers = o.tiers || {
    tier_1: { role: 'coordinator', chief: true, agents: ['chief'] },
    tier_2: { role: 'specialist', agents: ['archaeologist'] },
  };
  const manifest = {
    name: cellName,
    version: '1.0.0',
    slashPrefix: slashPrefix,
    description: 'Celula de teste M8.5 em pt-BR.',
    boot: ['README.md', 'MEMORY.md'],
    tiers: tiers,
    commands: o.commands || [
      {
        name: '*start',
        description: 'inicia trabalho.',
        triggers: 'tasks/start.md',
        agent: 'chief',
      },
    ],
    components: o.components || {
      agents: ['chief', 'archaeologist'],
      tasks: ['start'],
      templates: [],
      checklists: [],
      kbs: [],
    },
    critical_invariants: o.critical_invariants || ['phase-1-objective'],
  };
  const seedFiles = Object.assign(
    {
      'agents/chief.md':
        '---\nname: chief\n---\n# Chief — celula de teste M8.5\n\nPersona do chief.\n',
      'agents/archaeologist.md':
        '---\nname: archaeologist\n---\n# Archaeologist — celula de teste M8.5\n\nPersona do especialista.\n',
      'OST.md': [
        '# OST',
        '',
        '## Outcome',
        '',
        '- id: OUT-001 tipo: melhoria descricao: x.',
        '',
        '## Opportunities',
        '',
        '- id: OPP-001 descricao: y. pus: PU-001.',
        '',
        '## Solutions',
        '',
        '- id: SOL-001 descricao: z.',
        '',
        '## Links',
        '',
        '- SOL-001 resolve OPP-001.',
        '',
        '## Tasks',
        '',
        '- id: TASK-001 descricao: w. solution: SOL-001.',
        '',
        '## Change Log',
        '',
        '- 2026-04-25 — @publisher — closed.',
        '',
      ].join('\n'),
      'kbs/success-examples.md': [
        '# Exemplos',
        '',
        '## Exemplo 1 — t1',
        '',
        '**Fonte:** ref 1.',
        '',
        '## Exemplo 2 — t2',
        '',
        '**Fonte:** ref 2.',
        '',
        '## Exemplo 3 — t3',
        '',
        '**Fonte:** ref 3.',
        '',
      ].join('\n'),
    },
    o.extraSeedFiles || {}
  );
  return {
    name: cellName,
    author: 'expert',
    manifest: manifest,
    seedFiles: seedFiles,
  };
}

function fileExists(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

function readUtf8(abs) {
  return fs.readFileSync(abs, 'utf8');
}

module.exports = {
  ROOT,
  PUBLISHER_PATH,
  loadPublisher,
  loadRegistry,
  makeTempDir,
  rmRf,
  buildSpec,
  fileExists,
  readUtf8,
};
