'use strict';

/**
 * tests/m8/integration/_helpers-integration.js — shared utilities for the
 * M8 integration gate test suite (Story M8.7).
 *
 * Mirrors the M6.7 `_helpers-integration.js` pattern: a small stdlib-only
 * (CON-003) toolkit that the gate test consumes for sandbox lifecycle, CLI
 * invocation, file structure assertions, and language-policy auditing.
 *
 *   mkProject(label) / rmProject(dir)   — sandbox temp-directory plumbing
 *   runInit(cwd)                         — spawn `kaizen init` against cwd
 *   runDoctorCells(cwd)                  — spawn `kaizen doctor --cells`
 *   runUpdate(cwd, opts)                 — spawn `kaizen update` against cwd
 *   loadPublisher() / loadRegistry()     — direct module loaders
 *   listDirFiles(dir)                    — sorted list of basenames
 *   readUtf8(abs)                        — UTF-8 file read
 *   fileExists(abs)                      — boolean existence check
 *   buildPublisherSpec(opts)             — minimal spec for materializeCell
 *   PUBLISHER_PATH / REGISTRY_PATH       — absolute resolved module paths
 *
 * Each test must own its sandbox: create with mkProject, tear down with
 * rmProject in a `finally` block. No shared mutable state across tests.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');
const PUBLISHER_PATH = path.join(
  SOURCE_ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer',
  'agents',
  '_shared',
  'publisher.js'
);
const REGISTRY_PATH = path.join(
  SOURCE_ROOT,
  '.kaizen-dvir',
  'dvir',
  'cell-registry.js'
);

const YOTZER_AGENTS = [
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

function mkProject(label) {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m8.7-' + label + '-')
  );
}

function rmProject(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    /* best-effort */
  }
}

function runInit(cwd) {
  return spawnSync(process.execPath, [CLI, 'init'], {
    cwd,
    encoding: 'utf8',
  });
}

function runDoctorCells(projectDir) {
  // Same env-variable pattern as tests/m8/m8.6/_helpers.js so the doctor
  // (which loads from the framework dev tree) reads the project's own
  // celulas/ + commands/ directories rather than the framework's.
  const env = Object.assign({}, process.env, {
    KAIZEN_CELULAS_DIR: path.join(projectDir, '.kaizen-dvir', 'celulas'),
    KAIZEN_CLAUDE_COMMANDS_DIR: path.join(projectDir, '.claude', 'commands'),
  });
  return spawnSync(process.execPath, [CLI, 'doctor', '--cells'], {
    cwd: projectDir,
    encoding: 'utf8',
    env,
  });
}

function runUpdate(cwd, opts) {
  const args = [CLI, 'update'];
  if (opts && opts.dryRun) args.push('--dry-run');
  if (opts && opts.skipMigrations) args.push('--skip-migrations');
  return spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
  });
}

function loadPublisher() {
  delete require.cache[require.resolve(PUBLISHER_PATH)];
  return require(PUBLISHER_PATH);
}

function loadRegistry() {
  delete require.cache[require.resolve(REGISTRY_PATH)];
  return require(REGISTRY_PATH);
}

function fileExists(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

function listDirFiles(abs) {
  try {
    return fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
  } catch (_) {
    return [];
  }
}

function readUtf8(abs) {
  return fs.readFileSync(abs, 'utf8');
}

/**
 * Build a minimal but valid spec accepted by `publisher.materializeCell()`.
 * Mirrors the M8.5 helper but lives here so M8.7 integration tests are
 * self-contained.
 */
function buildPublisherSpec(opts) {
  const o = opts || {};
  const cellName = o.name || 'celula-m87';
  const slashPrefix = o.slashPrefix || 'Kaizen:CelulaM87';
  const tiers = o.tiers || {
    tier_1: { role: 'coordinator', chief: true, agents: ['chief'] },
    tier_2: { role: 'specialist', agents: ['archaeologist'] },
  };
  const manifest = {
    name: cellName,
    version: '1.0.0',
    slashPrefix,
    description: 'Celula de teste M8.7 em pt-BR.',
    boot: ['README.md', 'MEMORY.md'],
    tiers,
    commands: [
      {
        name: '*start',
        description: 'inicia trabalho.',
        triggers: 'tasks/start.md',
        agent: 'chief',
      },
    ],
    components: {
      agents: ['chief', 'archaeologist'],
      tasks: ['start'],
      templates: [],
      checklists: [],
      kbs: [],
    },
    critical_invariants: ['phase-1-objective'],
  };
  const seedFiles = {
    'agents/chief.md':
      '---\nname: chief\n---\n# Chief — celula M8.7\n\nPersona do chief.\n',
    'agents/archaeologist.md':
      '---\nname: archaeologist\n---\n# Archaeologist — celula M8.7\n\nPersona do especialista.\n',
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
  };
  return {
    name: cellName,
    author: 'expert',
    manifest,
    seedFiles,
  };
}

module.exports = {
  SOURCE_ROOT,
  CLI,
  PUBLISHER_PATH,
  REGISTRY_PATH,
  YOTZER_AGENTS,
  mkProject,
  rmProject,
  runInit,
  runDoctorCells,
  runUpdate,
  loadPublisher,
  loadRegistry,
  fileExists,
  listDirFiles,
  readUtf8,
  buildPublisherSpec,
};
