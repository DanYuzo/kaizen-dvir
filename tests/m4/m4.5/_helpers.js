'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const YOTZER_CELL_ROOT = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer'
);
const GATES_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'gates');
const MEMORY_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'memory');
const HOOKS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');
const SHARED_DIR = path.join(YOTZER_CELL_ROOT, 'agents', '_shared');

const PROGRESSIVE_SYSTEMIZER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'progressive-systemizer.md'
);
const PUBLISHER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'publisher.md'
);
const PHASE_10_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-10-publication.md'
);
const WF_GENERATE = path.join(
  YOTZER_CELL_ROOT,
  'workflows',
  'wf-yotzer-generate-celula.yaml'
);
const WF_EDIT = path.join(
  YOTZER_CELL_ROOT,
  'workflows',
  'wf-yotzer-edit-celula.yaml'
);
const CELULA_BLUEPRINT_TMPL = path.join(
  YOTZER_CELL_ROOT,
  'templates',
  'celula-blueprint-tmpl.yaml'
);
const WELCOME_MESSAGE_TMPL = path.join(
  YOTZER_CELL_ROOT,
  'templates',
  'welcome-message-tmpl.md'
);
const WORKFLOW_TMPL = path.join(
  YOTZER_CELL_ROOT,
  'templates',
  'workflow-tmpl.yaml'
);
const PROGRESSIVE_LEVELS_CHECKLIST = path.join(
  YOTZER_CELL_ROOT,
  'checklists',
  'progressive-levels-coherence.md'
);
const PUBLISHER_MODULE = path.join(SHARED_DIR, 'publisher.js');
const KAIZEN_BIN = path.join(PROJECT_ROOT, 'bin', 'kaizen.js');

const CELULA_SCHEMA = path.join(SCHEMAS_DIR, 'celula-schema.json');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.5-' + label + '-'));
}

function rm(dir) {
  if (typeof dir !== 'string') return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function clearEnv() {
  delete process.env.KAIZEN_TARGET_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_YOTZER_WORK_DIR;
  delete process.env.KAIZEN_PUBLISH_CONFIRM;
}

function readFileText(abs) {
  return fs.readFileSync(abs, 'utf8');
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // ignore
  }
}

function freshPublisher() {
  dropCache(PUBLISHER_MODULE);
  return require(PUBLISHER_MODULE);
}

function freshKaizenBin() {
  dropCache(KAIZEN_BIN);
  return require(KAIZEN_BIN);
}

function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/u);
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: text };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) return { frontmatter: {}, body: text };
  const fmText = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  const fm = parseSimpleYaml(fmText);
  return { frontmatter: fm, body: body };
}

function parseSimpleYaml(text) {
  const out = {};
  const lines = text.split(/\n/u);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().length === 0 || line.trim().startsWith('#')) {
      i++;
      continue;
    }
    const topMatch = /^([a-zA-Z0-9_-]+):\s*(.*)$/u.exec(line);
    if (!topMatch) {
      i++;
      continue;
    }
    const key = topMatch[1];
    const rest = topMatch[2];
    if (rest.length === 0) {
      const next = lines[i + 1] || '';
      if (/^\s{2,}-\s+/u.test(next)) {
        const list = [];
        i++;
        while (i < lines.length && /^\s{2,}-\s+/u.test(lines[i])) {
          const item = lines[i].replace(/^\s{2,}-\s+/u, '').trim();
          list.push(stripQuotes(item));
          i++;
        }
        out[key] = list;
        continue;
      }
      if (/^\s{2,}[a-zA-Z0-9_-]+:/u.test(next)) {
        const nested = {};
        i++;
        while (i < lines.length && /^\s{2,}[a-zA-Z0-9_-]+:/u.test(lines[i])) {
          const nm = /^\s{2,}([a-zA-Z0-9_-]+):\s*(.*)$/u.exec(lines[i]);
          if (nm) {
            const nk = nm[1];
            const nv = nm[2];
            nested[nk] = stripQuotes(nv);
          }
          i++;
        }
        out[key] = nested;
        continue;
      }
      out[key] = '';
      i++;
      continue;
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      out[key] =
        inner.length === 0
          ? []
          : inner.split(',').map((s) => stripQuotes(s.trim()));
      i++;
      continue;
    }
    out[key] = stripQuotes(rest);
    i++;
  }
  return out;
}

function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

// -- Generated cell scaffolding helpers (test fixtures) ---------------------

function makeValidCellScaffold(cellRoot, opts) {
  const o = opts || {};
  fs.mkdirSync(cellRoot, { recursive: true });
  const dirs = ['agents', 'tasks', 'workflows', 'templates', 'checklists', 'kbs'];
  for (const d of dirs) {
    fs.mkdirSync(path.join(cellRoot, d), { recursive: true });
  }
  // workflows/README.md acceptable per D-v1.4-07 (empty workflows + README).
  fs.writeFileSync(
    path.join(cellRoot, 'workflows', 'README.md'),
    '# Workflows\n\nDiretorio sempre presente (D-v1.4-07).\n',
    'utf8'
  );
  // success-examples with 3+ entries by default.
  const entries = typeof o.successEntries === 'number' ? o.successEntries : 3;
  const seLines = ['# Exemplos de sucesso', ''];
  for (let i = 1; i <= entries; i++) {
    seLines.push('## Exemplo ' + i + ' — titulo ' + i);
    seLines.push('');
    seLines.push('**Fonte:** referencia ' + i + '.');
    seLines.push('');
    seLines.push('**Criterios de qualidade:**');
    seLines.push('');
    seLines.push('- criterio 1.');
    seLines.push('');
  }
  fs.writeFileSync(
    path.join(cellRoot, 'kbs', 'success-examples.md'),
    seLines.join('\n'),
    'utf8'
  );
  // OST.md with closed chain by default.
  const ostLines = [
    '# OST',
    '',
    '## Outcome',
    '',
    '- id: OUT-001 tipo: melhoria descricao: reduzir 30% do tempo.',
    '',
    '## Opportunities',
    '',
    '- id: OPP-001 descricao: gargalo na coleta. pus: PU-001.',
    '',
    '## Solutions',
    '',
    '- id: SOL-001 descricao: trocar coleta manual por importador.',
    '',
    '## Links',
    '',
    '- SOL-001 resolve OPP-001.',
    '',
    '## Tasks',
    '',
    '- id: TASK-001 descricao: instalar importador. solution: SOL-001.',
    '',
    '## Change Log',
    '',
    '- 2026-04-25 — @publisher — F10 fechou OST.',
    '',
  ];
  fs.writeFileSync(
    path.join(cellRoot, 'OST.md'),
    ostLines.join('\n'),
    'utf8'
  );
  // tasks/<task-id>.md with inline Actions.
  fs.writeFileSync(
    path.join(cellRoot, 'tasks', 'task-instalar-importador.md'),
    [
      '---',
      'task_id: TASK-001',
      'solution_id: SOL-001',
      'pu_pai: PU-001',
      '---',
      '',
      '# Instalar importador',
      '',
      '## Actions',
      '',
      '1. abra o painel admin.',
      '2. clique em adicionar fonte.',
      '3. salve.',
      '',
    ].join('\n'),
    'utf8'
  );
  return cellRoot;
}

function buildValidManifest(opts) {
  const o = opts || {};
  return {
    name: o.name || 'celula-teste',
    version: o.version || '1.0.0',
    slashPrefix: o.slashPrefix || 'Kaizen:CelulaTeste',
    description: o.description || 'celula de teste em pt-BR.',
    boot: ['README.md', 'MEMORY.md'],
    tiers: o.tiers || {
      tier_1: { role: 'coordinator', chief: true, agents: ['chief'] },
    },
    commands: o.commands || [
      { name: '*start', description: 'inicia trabalho.', triggers: 'tasks/start.md', agent: 'chief' },
    ],
    components: o.components || {
      agents: ['chief'],
      tasks: ['start'],
      templates: [],
      checklists: [],
      kbs: [],
    },
    critical_invariants: o.critical_invariants || ['phase-1-objective'],
  };
}

module.exports = {
  PROJECT_ROOT: PROJECT_ROOT,
  YOTZER_CELL_ROOT: YOTZER_CELL_ROOT,
  GATES_DIR: GATES_DIR,
  MEMORY_DIR: MEMORY_DIR,
  HOOKS_DIR: HOOKS_DIR,
  SCHEMAS_DIR: SCHEMAS_DIR,
  SHARED_DIR: SHARED_DIR,
  PROGRESSIVE_SYSTEMIZER_PATH: PROGRESSIVE_SYSTEMIZER_PATH,
  PUBLISHER_PATH: PUBLISHER_PATH,
  PHASE_10_TASK: PHASE_10_TASK,
  WF_GENERATE: WF_GENERATE,
  WF_EDIT: WF_EDIT,
  CELULA_BLUEPRINT_TMPL: CELULA_BLUEPRINT_TMPL,
  WELCOME_MESSAGE_TMPL: WELCOME_MESSAGE_TMPL,
  WORKFLOW_TMPL: WORKFLOW_TMPL,
  PROGRESSIVE_LEVELS_CHECKLIST: PROGRESSIVE_LEVELS_CHECKLIST,
  PUBLISHER_MODULE: PUBLISHER_MODULE,
  KAIZEN_BIN: KAIZEN_BIN,
  CELULA_SCHEMA: CELULA_SCHEMA,
  mkTmpDir: mkTmpDir,
  rm: rm,
  clearEnv: clearEnv,
  readFileText: readFileText,
  dropCache: dropCache,
  freshPublisher: freshPublisher,
  freshKaizenBin: freshKaizenBin,
  parseFrontmatter: parseFrontmatter,
  parseSimpleYaml: parseSimpleYaml,
  makeValidCellScaffold: makeValidCellScaffold,
  buildValidManifest: buildValidManifest,
};
