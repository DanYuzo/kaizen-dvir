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
const OST_WRITER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  '_shared',
  'ost-writer.js'
);

const PRIORITIZER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'prioritizer.md'
);
const TASK_GRANULATOR_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'task-granulator.md'
);
const CONTRACT_BUILDER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'contract-builder.md'
);
const PHASE_7_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-7-prioritize.md'
);
const PHASE_8_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-8-granulate.md'
);
const PHASE_9_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-9-contracts.md'
);

const TASK_TMPL = path.join(YOTZER_CELL_ROOT, 'templates', 'task-tmpl.yaml');
const ACTION_REF_TMPL = path.join(
  YOTZER_CELL_ROOT,
  'templates',
  'action-conceptual-reference-tmpl.yaml'
);
const CONTRACTS_TMPL = path.join(
  YOTZER_CELL_ROOT,
  'templates',
  'contracts-tmpl.yaml'
);
const AGENT_TMPL = path.join(YOTZER_CELL_ROOT, 'templates', 'agent-tmpl.yaml');

const MVP_VS_ROADMAP_CHECKLIST = path.join(
  YOTZER_CELL_ROOT,
  'checklists',
  'mvp-vs-roadmap-separation.md'
);
const ACTION_OBS_CHECKLIST = path.join(
  YOTZER_CELL_ROOT,
  'checklists',
  'action-observability.md'
);

const CELULA_SCHEMA = path.join(SCHEMAS_DIR, 'celula-schema.json');
const TASK_CONTRACT_SCHEMA = path.join(SCHEMAS_DIR, 'task-contract-schema.json');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.4-' + label + '-'));
}

function mkTmpCell(label) {
  return mkTmpDir(label + '-cell');
}

function mkTmpHandoffs(label) {
  const dir = mkTmpDir(label + '-handoffs');
  process.env.KAIZEN_HANDOFFS_DIR = dir;
  return dir;
}

function mkTmpLogs(label) {
  const dir = mkTmpDir(label + '-logs');
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
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
  delete process.env.KAIZEN_REUSE_ROOTS;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_IKIGAI_DIR;
  delete process.env.KAIZEN_YOTZER_TEST_CELL_DIR;
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // ignore
  }
}

function freshOstWriter() {
  dropCache(OST_WRITER_PATH);
  return require(OST_WRITER_PATH);
}

function freshGate(name) {
  const drops = [
    path.join(GATES_DIR, name),
    path.join(GATES_DIR, 'mode-engine.js'),
    path.join(GATES_DIR, 'reuse-gate.js'),
    path.join(GATES_DIR, 'schema-gate.js'),
    path.join(GATES_DIR, 'playback-gate.js'),
    path.join(GATES_DIR, 'quality-gate.js'),
    path.join(GATES_DIR, 'self-healing.js'),
    path.join(GATES_DIR, 'waiver.js'),
    path.join(GATES_DIR, 'executor-judge-validator.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(MEMORY_DIR, 'handoff-engine.js'),
    path.join(MEMORY_DIR, 'ikigai-reader.js'),
    path.join(MEMORY_DIR, 'change-log-guard.js'),
    path.join(SCHEMAS_DIR, 'validator.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(GATES_DIR, name));
}

function freshMemory(name) {
  const drops = [
    path.join(MEMORY_DIR, name),
    path.join(MEMORY_DIR, 'handoff-engine.js'),
    path.join(MEMORY_DIR, 'ikigai-reader.js'),
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(SCHEMAS_DIR, 'validator.js'),
  ];
  for (const p of drops) dropCache(p);
  return require(path.join(MEMORY_DIR, name));
}

function readFileText(abs) {
  return fs.readFileSync(abs, 'utf8');
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
            if (nv.startsWith('[') && nv.endsWith(']')) {
              nested[nk] = parseInlineList(nv);
            } else {
              nested[nk] = stripQuotes(nv);
            }
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
      out[key] = parseInlineList(rest);
      i++;
      continue;
    }
    out[key] = stripQuotes(rest);
    i++;
  }
  return out;
}

function parseInlineList(text) {
  const inner = text.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner
    .split(',')
    .map((s) => stripQuotes(s.trim()))
    .filter((s) => s.length > 0);
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

// -- ICE simplified evaluation -----------------------------------------------

const ICE_LEVELS = Object.freeze(['baixo', 'medio', 'alto']);

function isIceItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (!item.ice || typeof item.ice !== 'object') return false;
  for (const dim of ['impact', 'confidence', 'ease']) {
    if (!ICE_LEVELS.includes(item.ice[dim])) return false;
  }
  if (typeof item.rationale !== 'string' || item.rationale.length === 0) {
    return false;
  }
  return true;
}

// -- task / action validators ------------------------------------------------

const INFERENTIAL_PATTERNS = [
  /^seja\s+/iu,
  /^mostre\s+/iu,
  /^demonstre\s+/iu,
  /^transmita\s+/iu,
  /\bcarismatico\b/iu,
  /\bconfianca\b/iu,
  /\bautoridade\b/iu,
];

function isInferentialAction(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  // The strict heuristic: starts with an inferential verb (e.g. "seja",
  // "mostre", "demonstre", "transmita") OR contains an unmodified
  // inferential adjective ("carismatico", "confianca", "autoridade")
  // without any concrete observable verb.
  const lower = text.trim().toLowerCase();
  const observableVerbs = [
    'levante',
    'aumente',
    'diminua',
    'pause',
    'pause-se',
    'fale',
    'olhe',
    'mantenha',
    'aponte',
    'sorria',
    'movimente',
    'faca',
    'confirme',
    'pergunte',
    'escreva',
    'leia',
    'envie',
    'clique',
    'abra',
    'feche',
    'salve',
    'gere',
    'execute',
    'colete',
    'registre',
    'valide',
    'verifique',
  ];
  // If the text starts with an observable verb, allow it.
  for (const v of observableVerbs) {
    if (lower.startsWith(v + ' ') || lower === v) return false;
  }
  for (const re of INFERENTIAL_PATTERNS) {
    if (re.test(lower)) return true;
  }
  return false;
}

function makeTaskFile(targetDir, taskId, opts) {
  const options = opts || {};
  const puPai = options.pu_pai || 'PU-001';
  const solutionId = options.solution_id || 'SOL-001';
  const actions = Array.isArray(options.actions) ? options.actions : [];
  const fm = [
    '---',
    'task_id: ' + taskId,
    'pu_pai: ' + puPai,
    'solution_id: ' + solutionId,
    'executor_hint: humano',
    'estimated_effort: "5min"',
    'gates:',
    '  - quality_gate',
    '---',
    '',
    '# Task ' + taskId,
    '',
    '## Actions',
    '',
  ];
  for (let i = 0; i < actions.length; i++) {
    fm.push(String(i + 1) + '. ' + actions[i]);
  }
  fm.push('');
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, taskId + '.md');
  fs.writeFileSync(target, fm.join('\n'), 'utf8');
  return target;
}

function listActionMdFiles(tasksDir) {
  if (!fs.existsSync(tasksDir)) return [];
  const out = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.isFile() &&
        /^action-.*\.md$/u.test(entry.name)
      ) {
        out.push(full);
      }
    }
  }
  walk(tasksDir);
  return out;
}

function countActions(taskFilePath) {
  const raw = fs.readFileSync(taskFilePath, 'utf8');
  const idx = raw.indexOf('## Actions');
  if (idx === -1) return 0;
  const body = raw.slice(idx);
  // Count numbered list lines (digits followed by '. ').
  let n = 0;
  for (const line of body.split(/\r?\n/u)) {
    if (/^\d+\.\s+/u.test(line)) n++;
  }
  return n;
}

function makeContractYaml(opts) {
  const o = opts || {};
  const taskId = o.task_id || 'TASK-001';
  const description = o.description || 'descricao curta em pt-BR';
  const inputs = Array.isArray(o.inputs)
    ? o.inputs
    : [
        {
          name: 'entrada',
          type: 'string',
          description: 'descricao curta em pt-BR',
          required: true,
        },
      ];
  const outputs = Array.isArray(o.outputs)
    ? o.outputs
    : [
        {
          name: 'saida',
          type: 'string',
          description: 'descricao curta em pt-BR',
        },
      ];
  const gates = Array.isArray(o.gates) ? o.gates : ['quality_gate'];

  const lines = [];
  lines.push('task_id: "' + taskId + '"');
  lines.push('description: "' + description + '"');
  lines.push('inputs:');
  for (const inp of inputs) {
    lines.push('  - name: "' + inp.name + '"');
    lines.push('    type: "' + inp.type + '"');
    lines.push('    description: "' + inp.description + '"');
    if (typeof inp.required === 'boolean') {
      lines.push('    required: ' + (inp.required ? 'true' : 'false'));
    }
  }
  lines.push('outputs:');
  for (const out of outputs) {
    lines.push('  - name: "' + out.name + '"');
    lines.push('    type: "' + out.type + '"');
    lines.push('    description: "' + out.description + '"');
  }
  lines.push('gates:');
  for (const g of gates) {
    lines.push('  - "' + g + '"');
  }
  if (o.schema_reference) {
    lines.push('schema_reference: "' + o.schema_reference + '"');
  }
  return lines.join('\n') + '\n';
}

function writeContractFile(dir, taskId, contractYaml) {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, taskId + '.yaml');
  fs.writeFileSync(target, contractYaml, 'utf8');
  return target;
}

module.exports = {
  PROJECT_ROOT,
  YOTZER_CELL_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  HOOKS_DIR,
  SCHEMAS_DIR,
  OST_WRITER_PATH,
  PRIORITIZER_PATH,
  TASK_GRANULATOR_PATH,
  CONTRACT_BUILDER_PATH,
  PHASE_7_TASK,
  PHASE_8_TASK,
  PHASE_9_TASK,
  TASK_TMPL,
  ACTION_REF_TMPL,
  CONTRACTS_TMPL,
  AGENT_TMPL,
  MVP_VS_ROADMAP_CHECKLIST,
  ACTION_OBS_CHECKLIST,
  CELULA_SCHEMA,
  TASK_CONTRACT_SCHEMA,
  ICE_LEVELS,
  mkTmpDir,
  mkTmpCell,
  mkTmpHandoffs,
  mkTmpLogs,
  rm,
  clearEnv,
  dropCache,
  freshOstWriter,
  freshGate,
  freshMemory,
  readFileText,
  parseFrontmatter,
  parseSimpleYaml,
  isIceItem,
  isInferentialAction,
  makeTaskFile,
  listActionMdFiles,
  countActions,
  makeContractYaml,
  writeContractFile,
};
