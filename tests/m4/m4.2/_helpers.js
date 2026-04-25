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
const ARCHAEOLOGIST_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'archaeologist.md'
);
const PHASE_1_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-1-objective.md'
);
const PHASE_2_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-2-sources-and-examples.md'
);
const PHASE_3_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-3-as-is.md'
);
const PHASE_6_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-6-to-be.md'
);
const PLAYBACK_CHECKLIST = path.join(
  YOTZER_CELL_ROOT,
  'checklists',
  'playback-completeness.md'
);

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.2-' + label + '-'));
}

function mkTmpCell(label) {
  return mkTmpDir(label + '-cell');
}

function mkTmpHandoffs(label) {
  const dir = mkTmpDir(label + '-handoffs');
  process.env.KAIZEN_HANDOFFS_DIR = dir;
  return dir;
}

function mkTmpState(label) {
  const dir = mkTmpDir(label + '-state');
  process.env.KAIZEN_STATE_DIR = dir;
  return dir;
}

function mkTmpLogs(label) {
  const dir = mkTmpDir(label + '-logs');
  process.env.KAIZEN_LOGS_DIR = dir;
  return dir;
}

function mkTmpIkigai(label) {
  const dir = mkTmpDir(label + '-ikigai');
  process.env.KAIZEN_IKIGAI_DIR = dir;
  // Seed 4 dimension files so readDimension() succeeds.
  const dims = ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco'];
  for (const d of dims) {
    fs.writeFileSync(
      path.join(dir, d + '.md'),
      '# ' + d + '\n\n## Resumo\n\nconteudo teste para ' + d + '.\n',
      'utf8'
    );
  }
  return dir;
}

function rm(dir) {
  if (typeof dir !== 'string') return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort cleanup
  }
}

function clearEnv() {
  delete process.env.KAIZEN_TARGET_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_REUSE_ROOTS;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_IKIGAI_DIR;
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
    path.join(HOOKS_DIR, 'log-writer.js'),
    path.join(MEMORY_DIR, 'handoff-engine.js'),
    path.join(MEMORY_DIR, 'ikigai-reader.js'),
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

/**
 * Parse YAML frontmatter of a markdown file. Minimal — handles the shapes
 * used by our agent/task files. Returns { frontmatter, body }.
 */
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

/**
 * Tiny YAML parser for frontmatter. Supports:
 *   - scalar key: value
 *   - list: [a, b, c]
 *   - block list under key
 *   - nested maps indented by 2 spaces (one level)
 * Enough for our agent/task frontmatter shapes.
 */
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
      // Block list or nested map.
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
  return inner.split(',').map((s) => stripQuotes(s.trim())).filter((s) => s.length > 0);
}

function stripQuotes(s) {
  if (typeof s !== 'string') return s;
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

module.exports = {
  PROJECT_ROOT,
  YOTZER_CELL_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  HOOKS_DIR,
  SCHEMAS_DIR,
  OST_WRITER_PATH,
  ARCHAEOLOGIST_PATH,
  PHASE_1_TASK,
  PHASE_2_TASK,
  PHASE_3_TASK,
  PHASE_6_TASK,
  PLAYBACK_CHECKLIST,
  mkTmpDir,
  mkTmpCell,
  mkTmpHandoffs,
  mkTmpState,
  mkTmpLogs,
  mkTmpIkigai,
  rm,
  clearEnv,
  dropCache,
  freshOstWriter,
  freshGate,
  freshMemory,
  readFileText,
  parseFrontmatter,
  parseSimpleYaml,
};
