'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const KAIZEN_BIN = path.join(PROJECT_ROOT, 'bin', 'kaizen.js');
const HANDOFF_ENGINE = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'memory',
  'handoff-engine.js'
);
const TIME_BUDGET = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'yotzer',
  'time-budget.js'
);
const PUBLISHER_MODULE = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer',
  'agents',
  '_shared',
  'publisher.js'
);
const PLAYBACK_GATE = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'gates',
  'playback-gate.js'
);
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'test-cell-domain.yaml');

function mkTmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m4.6-' + label + '-'));
}

function rm(dir) {
  if (typeof dir !== 'string') return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort
  }
}

function dropCache(absPath) {
  try {
    delete require.cache[require.resolve(absPath)];
  } catch (_) {
    // ignore
  }
}

function freshKaizenBin() {
  dropCache(KAIZEN_BIN);
  return require(KAIZEN_BIN);
}

function freshHandoffEngine() {
  dropCache(HANDOFF_ENGINE);
  return require(HANDOFF_ENGINE);
}

function freshTimeBudget() {
  dropCache(TIME_BUDGET);
  return require(TIME_BUDGET);
}

function freshPublisher() {
  dropCache(PUBLISHER_MODULE);
  return require(PUBLISHER_MODULE);
}

function freshPlaybackGate() {
  dropCache(PLAYBACK_GATE);
  return require(PLAYBACK_GATE);
}

function clearEnv() {
  delete process.env.KAIZEN_TARGET_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_YOTZER_WORK_DIR;
  delete process.env.KAIZEN_PUBLISH_CONFIRM;
  delete process.env.KAIZEN_RESUME_CONFIRM;
  delete process.env.KAIZEN_MODE;
}

function setupEnvSandbox(label) {
  const tmp = mkTmpDir(label);
  const handoffsDir = path.join(tmp, 'handoffs');
  const stateDir = path.join(tmp, 'state');
  const logsDir = path.join(tmp, 'logs');
  const celulasDir = path.join(tmp, 'celulas');
  const workDir = path.join(tmp, 'yotzer-work');
  fs.mkdirSync(handoffsDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(celulasDir, { recursive: true });
  fs.mkdirSync(workDir, { recursive: true });
  process.env.KAIZEN_HANDOFFS_DIR = handoffsDir;
  process.env.KAIZEN_STATE_DIR = stateDir;
  process.env.KAIZEN_LOGS_DIR = logsDir;
  process.env.KAIZEN_CELULAS_DIR = celulasDir;
  process.env.KAIZEN_YOTZER_WORK_DIR = workDir;
  return { tmp, handoffsDir, stateDir, logsDir, celulasDir, workDir };
}

// -- Test fixture: synthetic 10-phase domain --------------------------------

const PHASES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
const CRITICAL_PHASES = ['F1', 'F2', 'F10'];

function readFixture() {
  if (!fs.existsSync(FIXTURE_PATH)) return defaultFixture();
  const text = fs.readFileSync(FIXTURE_PATH, 'utf8');
  // Lightweight extraction for the fields we need.
  const m = /name:\s*"([^"]+)"/u.exec(text);
  return {
    name: m ? m[1] : 'test-cell',
    description:
      'celula sintetica de teste gerada pelo e2e harness do M4.6.',
  };
}

function defaultFixture() {
  return {
    name: 'test-cell',
    description: 'celula sintetica de teste gerada pelo e2e harness do M4.6.',
  };
}

// -- Synthetic Yotzer pipeline (deterministic 10-phase walk) ----------------

function runSyntheticPipeline(opts) {
  const o = opts || {};
  const workId = o.workId || 'wrk-e2e-test';
  const cellName = o.cellName || 'test-cell';
  const handoffEngine = freshHandoffEngine();
  const timeBudget = freshTimeBudget();
  const mode = o.mode || 'interativo';
  // Deterministic clock — start at epoch-relative 0 and advance by
  // `interactionMs` for every expert interaction (start->end pair).
  // `idleMs` (NOT counted) advances between phases to simulate
  // autonomous sub-agent processing.
  let now = 0;
  const interactionMs = typeof o.interactionMs === 'number' ? o.interactionMs : 60_000;
  const idleMs = typeof o.idleMs === 'number' ? o.idleMs : 30_000;
  const skipPhases = o.skipPhases || [];
  const clock = () => now;

  const events = [];
  for (const phase of PHASES) {
    if (skipPhases.includes(phase)) {
      // Record the skip — used by resume-midway test.
      events.push({ phase, skipped: true });
      continue;
    }

    // Mark start.
    timeBudget.measurePhaseBoundary({
      workId, phase, boundary: 'start', clock, interaction: phase + ':main',
    });
    // Expert interaction time.
    now += interactionMs;
    timeBudget.measurePhaseBoundary({
      workId, phase, boundary: 'end', clock, interaction: phase + ':main',
    });

    // Persist a handoff for this phase.
    const next = phase === 'F10' ? 'publicar' : 'avancar para proxima fase';
    let result;
    try {
      result = handoffEngine.generate(
        phase,
        'chief',
        {
          artifact_id: workId + '-' + phase,
          artifact_path: '.kaizen/state/yotzer/' + workId + '/' + phase + '.yaml',
          current_phase: phase,
          branch: 'main',
        },
        ['fase ' + phase + ' decidiu ' + (mode === 'automatico' ? 'auto' : 'inter')],
        ['arquivo-' + phase + '.md'],
        [],
        next
      );
      handoffEngine.persist(result);
      events.push({ phase, handoffPath: 'persisted', mode, critical: CRITICAL_PHASES.includes(phase) });
    } catch (e) {
      events.push({ phase, error: e.message });
    }

    // Idle time between phases — autonomous sub-agent execution.
    // NOT stamped on the time-budget harness (correct behavior).
    now += idleMs;
  }

  // Build the work-spec for the publish CLI.
  const workSpec = buildWorkSpec({ workId, cellName });
  return { workId, cellName, events, workSpec, totalSimulatedMs: now };
}

function buildWorkSpec(opts) {
  const o = opts || {};
  const workId = o.workId;
  const cellName = o.cellName || 'test-cell';
  const workDir = process.env.KAIZEN_YOTZER_WORK_DIR;
  const workIdDir = path.join(workDir, workId);
  fs.mkdirSync(workIdDir, { recursive: true });
  // F9 PASS marker.
  fs.writeFileSync(
    path.join(workIdDir, 'f9-state.json'),
    JSON.stringify({ verdict: 'PASS' }),
    'utf8'
  );
  const manifest = {
    name: cellName,
    version: '1.0.0',
    slashPrefix: 'Kaizen:' + slashName(cellName),
    description: 'celula de teste gerada pelo e2e harness do M4.6 em pt-BR.',
    boot: ['README.md', 'MEMORY.md'],
    tiers: {
      tier_1: { role: 'coordinator', chief: true, agents: ['chief'] },
    },
    commands: [
      {
        name: '*start',
        description: 'inicia o trabalho da celula.',
        triggers: 'tasks/start.md',
        agent: 'chief',
      },
    ],
    components: {
      agents: ['chief'],
      tasks: ['start'],
      templates: [],
      checklists: [],
      kbs: ['success-examples'],
    },
    critical_invariants: ['F1', 'F2', 'F10'],
  };
  const seedFiles = {
    'OST.md': [
      '# OST',
      '',
      '## Outcome',
      '',
      '- id: OUT-001 tipo: melhoria descricao: reduzir 30% do tempo de coleta.',
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
    ].join('\n'),
    'kbs/success-examples.md': [
      '# Exemplos de sucesso',
      '',
      '## Exemplo 1 — caso piloto',
      '',
      '**Fonte:** referencia 1.',
      '',
      '## Exemplo 2 — caso secundario',
      '',
      '**Fonte:** referencia 2.',
      '',
      '## Exemplo 3 — caso terciario',
      '',
      '**Fonte:** referencia 3.',
      '',
    ].join('\n'),
    'tasks/task-instalar-importador.md': [
      '---',
      'task_id: TASK-001',
      'solution_id: SOL-001',
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
  };
  const spec = {
    name: cellName,
    author: 'expert-e2e',
    manifest: manifest,
    seedFiles: seedFiles,
  };
  fs.writeFileSync(
    path.join(workIdDir, 'spec.json'),
    JSON.stringify(spec),
    'utf8'
  );
  return spec;
}

function slashName(cellName) {
  return cellName
    .split('-')
    .map((p) => (p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p))
    .join('');
}

// -- Capture stdout/stderr around a callable -------------------------------

function captureOutput(fn) {
  const stdoutChunks = [];
  const stderrChunks = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = (chunk, ...rest) => {
    stdoutChunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  process.stderr.write = (chunk, ...rest) => {
    stderrChunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
    return true;
  };
  let result;
  try {
    result = fn();
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
  }
  return {
    result: result,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
  };
}

// -- Recursive walk for action-*.md detection ------------------------------

function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// -- Filesystem snapshot for byte-compare -----------------------------------

function snapshotDir(dir) {
  const out = {};
  for (const file of walkFiles(dir)) {
    const rel = path.relative(dir, file);
    const stat = fs.statSync(file);
    out[rel] = {
      size: stat.size,
      mtime: stat.mtimeMs,
      content: fs.readFileSync(file, 'utf8'),
    };
  }
  return out;
}

function snapshotsEqual(a, b) {
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (a[aKeys[i]].content !== b[bKeys[i]].content) return false;
    if (a[aKeys[i]].size !== b[bKeys[i]].size) return false;
  }
  return true;
}

module.exports = {
  PROJECT_ROOT,
  KAIZEN_BIN,
  HANDOFF_ENGINE,
  TIME_BUDGET,
  PUBLISHER_MODULE,
  PLAYBACK_GATE,
  PHASES,
  CRITICAL_PHASES,
  mkTmpDir,
  rm,
  clearEnv,
  setupEnvSandbox,
  freshKaizenBin,
  freshHandoffEngine,
  freshTimeBudget,
  freshPublisher,
  freshPlaybackGate,
  readFixture,
  runSyntheticPipeline,
  buildWorkSpec,
  slashName,
  captureOutput,
  walkFiles,
  snapshotDir,
  snapshotsEqual,
};
