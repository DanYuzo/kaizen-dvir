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
const STRESS_TESTER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'stress-tester.md'
);
const RISK_MAPPER_PATH = path.join(
  YOTZER_CELL_ROOT,
  'agents',
  'risk-mapper.md'
);
const PHASE_4_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-4-stress-test.md'
);
const PHASE_5_TASK = path.join(
  YOTZER_CELL_ROOT,
  'tasks',
  'phase-5-risk-map.md'
);
const PU_REDUCTION_CHECKLIST = path.join(
  YOTZER_CELL_ROOT,
  'checklists',
  'pu-reduction-justified.md'
);
const MANIFEST_PATH = path.join(YOTZER_CELL_ROOT, 'celula.yaml');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.3-' + label + '-'));
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

/**
 * Apply Musk 5-step in strict order. Returns the final step index or
 * throws an error with code MUSK_ORDER_VIOLATED when reorder is attempted.
 *
 * Helper used by tests to simulate the strict-order enforcement that
 * the stress-tester persona declares in prose.
 */
const MUSK_STEPS = Object.freeze([
  'Questionar',
  'Deletar',
  'Simplificar',
  'Acelerar',
  'Automatizar',
]);

function applyMuskStep(state, step) {
  const expectedIndex = state.currentStep;
  const expected = MUSK_STEPS[expectedIndex];
  if (step !== expected) {
    const err = new Error(
      'ordem Musk quebrada. esperado: ' +
        expected +
        '. tentado: ' +
        step +
        '. volte antes de seguir.'
    );
    err.code = 'MUSK_ORDER_VIOLATED';
    err.expected = expected;
    err.attempted = step;
    throw err;
  }
  state.currentStep = expectedIndex + 1;
  state.applied.push(step);
  return state;
}

function newMuskState() {
  return { currentStep: 0, applied: [] };
}

/**
 * Build a synthetic cut-log entry for a PU cut. Used by tests to
 * emulate stress-tester output.
 */
function makeCutLogEntry(opts) {
  if (!opts || typeof opts !== 'object') {
    throw new Error('cut-log entry invalida: opcoes ausentes.');
  }
  const required = ['pu_id', 'date', 'author', 'reason', 'what_breaks'];
  for (const key of required) {
    if (typeof opts[key] !== 'string' || opts[key].length === 0) {
      const err = new Error(
        'PU cortada sem rationale completo. preencha id, data, autor, motivo e o que quebra. faltando: ' +
          key
      );
      err.code = 'CUT_RATIONALE_INCOMPLETE';
      err.missing = key;
      throw err;
    }
  }
  return {
    pu_id: opts.pu_id,
    date: opts.date,
    author: opts.author,
    reason: opts.reason,
    what_breaks: opts.what_breaks,
  };
}

/**
 * Compute cut percentage given total PUs and cut count. Returns the
 * verdict for the cut target criterion (PASS / CONCERNS).
 */
function evalCutTarget(totalPus, cutCount, hasWaiver) {
  if (typeof totalPus !== 'number' || totalPus <= 0) {
    throw new Error('totalPus invalido.');
  }
  const pct = (cutCount / totalPus) * 100;
  if (pct >= 10) return { verdict: 'PASS', pct: pct };
  if (hasWaiver === true) return { verdict: 'PASS', pct: pct, waiver: true };
  return {
    verdict: 'CONCERNS',
    pct: pct,
    message:
      'corte abaixo de 10%. registre waiver com approved_by ou aprofunde a fase Deletar.',
  };
}

/**
 * Validate a risk-map entry structure: every PU has at least one risk;
 * every risk has mitigation OR acceptance OR cut recommendation.
 */
function validateRiskEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, reason: 'entrada de risco vazia.' };
  }
  if (typeof entry.pu_id !== 'string' || entry.pu_id.length === 0) {
    return { valid: false, reason: 'pu_id ausente.' };
  }
  if (!Array.isArray(entry.riscos) || entry.riscos.length === 0) {
    return {
      valid: false,
      reason: 'PU ' + entry.pu_id + ' sem risco enumerado.',
    };
  }
  for (const r of entry.riscos) {
    if (!r || typeof r !== 'object') {
      return {
        valid: false,
        reason: 'risco invalido em ' + entry.pu_id + '.',
      };
    }
    const hasMitigation =
      typeof r.mitigacao === 'string' && r.mitigacao.length > 0;
    const hasAcceptance =
      r.aceite &&
      typeof r.aceite === 'object' &&
      r.aceite.approved_by === 'expert' &&
      typeof r.aceite.razao === 'string' &&
      r.aceite.razao.length > 0;
    const hasCut =
      typeof r.recomendacao_corte === 'string' &&
      r.recomendacao_corte.length > 0;
    if (!hasMitigation && !hasAcceptance && !hasCut) {
      return {
        valid: false,
        reason:
          'risco ' +
          (r.id || '<sem id>') +
          ' na PU ' +
          entry.pu_id +
          ' sem destino. escolha mitigacao, aceite ou corte.',
      };
    }
  }
  return { valid: true };
}

/**
 * Detect granularization attempts in F5 input. Returns FAIL with pt-BR
 * message citing D-v1.2-03 when the candidate carries `tasks` field on
 * a PU split.
 */
function detectGranularization(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { granularized: false };
  }
  if (Array.isArray(candidate.tasks) && candidate.tasks.length > 0) {
    return {
      granularized: true,
      message:
        'granularizacao em F5 nao roda. D-v1.2-03 manda Tasks para F8 (task-granulator). reabra esta analise sem dividir a PU.',
      reference: 'D-v1.2-03',
    };
  }
  if (Array.isArray(candidate.subTasks) && candidate.subTasks.length > 0) {
    return {
      granularized: true,
      message:
        'granularizacao em F5 nao roda. D-v1.2-03 manda Tasks para F8 (task-granulator). reabra esta analise sem dividir a PU.',
      reference: 'D-v1.2-03',
    };
  }
  if (Array.isArray(candidate.split_into) && candidate.split_into.length > 0) {
    return {
      granularized: true,
      message:
        'granularizacao em F5 nao roda. D-v1.2-03 manda Tasks para F8 (task-granulator). reabra esta analise sem dividir a PU.',
      reference: 'D-v1.2-03',
    };
  }
  return { granularized: false };
}

module.exports = {
  PROJECT_ROOT,
  YOTZER_CELL_ROOT,
  GATES_DIR,
  MEMORY_DIR,
  HOOKS_DIR,
  SCHEMAS_DIR,
  OST_WRITER_PATH,
  STRESS_TESTER_PATH,
  RISK_MAPPER_PATH,
  PHASE_4_TASK,
  PHASE_5_TASK,
  PU_REDUCTION_CHECKLIST,
  MANIFEST_PATH,
  MUSK_STEPS,
  mkTmpDir,
  mkTmpCell,
  mkTmpHandoffs,
  mkTmpState,
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
  applyMuskStep,
  newMuskState,
  makeCutLogEntry,
  evalCutTarget,
  validateRiskEntry,
  detectGranularization,
};
