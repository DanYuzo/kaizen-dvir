'use strict';

/**
 * publisher.js — KaiZen M4.5 Publisher pre-publish validators + cell
 * materialization helpers.
 *
 * Story M4.5 — sub-agent b of F10 publication. Pure JavaScript surface
 * consumed by:
 *   - the `/Kaizen:Yotzer publish {work-id}` CLI subcommand in
 *     `bin/kaizen.js`
 *   - the integration tests at `tests/m4/m4.5/`
 *
 * Public contract (FROZEN):
 *
 *   actionsInlineValidator(generatedTasksDir) ->
 *     { verdict: 'PASS'|'FAIL', errors: Array, offenders: Array<string> }
 *       Recursively scans generatedTasksDir for files matching
 *       /^action-.*\.md$/i (case-insensitive). Any match triggers FAIL
 *       with pt-BR error citing AC-119 + D-v1.3-04.
 *
 *   ostClosureValidator(generatedCellRoot) ->
 *     { verdict: 'PASS'|'FAIL', errors: Array, orphans: Array<string> }
 *       Parses OST.md and asserts every Task -> Solution -> Opportunity
 *       -> Outcome edge is present. Orphan triggers FAIL with pt-BR
 *       error naming the offending node (AC-117).
 *
 *   workflowsDirValidator(generatedCellRoot) ->
 *     { verdict: 'PASS'|'FAIL', errors: Array }
 *       Asserts the workflows/ directory exists. Empty directory with
 *       README.md is acceptable (D-v1.4-07). Missing dir triggers FAIL.
 *
 *   successExamplesValidator(generatedCellRoot, opts?) ->
 *     { verdict: 'PASS'|'FAIL', errors: Array, count: number }
 *       Counts entries in kbs/success-examples.md. < 3 or missing
 *       triggers FAIL. Entry = "## Exemplo" heading (D-v1.4-09).
 *
 *   prePublishCheck(generatedCellRoot) ->
 *     { verdict: 'PASS'|'FAIL', failures: Array }
 *       Runs the four validators in order. Returns the first FAIL
 *       (short-circuit) plus the full failure list.
 *
 *   schemaGateOnManifest(manifestYamlPath) ->
 *     { verdict, errors, durationMs }
 *       Thin wrapper around M3.4 schema-gate.validate against
 *       celula-schema.json. NFR-003: under 500ms.
 *
 *   instrumentHookModel(generatedCellRoot, options) ->
 *     { readmePath, narratives: { trigger, action, variable_reward, investment } }
 *       Renders the four Hook Model components into the README.md
 *       of the generated cell. pt-BR.
 *
 *   configureCli(generatedCellRoot, manifest) -> { commands: Array }
 *       Asserts that the manifest carries `/Kaizen:{NomeDaCelula}` as
 *       slashPrefix and that `*comandos` are mapped under
 *       components/commands. Returns the configured commands.
 *
 *   initializeChangelog(generatedCellRoot, options) -> { path, entry }
 *       Writes the first CHANGELOG.md row at version 1.0.0 (FR-115).
 *
 *   appendChangelogVersion(generatedCellRoot, version, summary) -> { path, entry }
 *       Appends a new version row (e.g. 1.0.1) to the CHANGELOG.md
 *       without overwriting prior rows (FR-023 append-only).
 *
 *   materializeCell(spec, targetCelulasRoot, options?) ->
 *       { celulaPath, manifest, manifestPath, skillRegistration }
 *       Materializes the AC-118 directory layout:
 *         celula.yaml, README.md, CHANGELOG.md, MEMORY.md, OST.md,
 *         agents/, tasks/, workflows/, templates/, checklists/, kbs/.
 *       When `options.claudeCommandsDir` is provided AND the materialized
 *       cell has at least one persona file under agents/, the publisher
 *       delegates to `dvir/cell-registry.registerCellSkills()` to write
 *       the slash skills (entry + specialists) under that directory.
 *       The `skillRegistration` field is `null` when registration is
 *       skipped (no claudeCommandsDir provided OR agents/ has zero
 *       persona files).
 *
 *   Internal-only helper (not exported):
 *     _registerSkillsForCell(cellPath, manifest, claudeCommandsDir)
 *       Calls registerCellSkills() from cell-registry.js with the
 *       generated cell's root and the project's .claude/commands/ dir.
 *       Invoked automatically at the end of materializeCell() when
 *       options.claudeCommandsDir is provided. Catches throws, appends a
 *       failure line to the cell's CHANGELOG, then re-throws so the
 *       caller (`runYotzerPublish` in `bin/kaizen.js`) can surface the
 *       pt-BR error and exit non-zero.
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06: pt-BR for surfaced errors.
 *
 * Story M8.5 — Refactor publisher to consume registerCellSkills() so
 * generated cells acquire slash skills via the same code path as init/
 * update (D8.5, D-v1.5-05, D-v1.5-06).
 */

const fs = require('node:fs');
const path = require('node:path');

// `cell-registry.js` lives at `.kaizen-dvir/dvir/cell-registry.js`. From
// this file (`.kaizen-dvir/celulas/yotzer/agents/_shared/publisher.js`)
// the relative path is four levels up: _shared/ -> agents/ -> yotzer/ ->
// celulas/ -> .kaizen-dvir/, then `dvir/cell-registry`. CON-005 read-only
// cross-L1-L2 access.
const cellRegistry = require('../../../../dvir/cell-registry');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const SCHEMAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'schemas');
const GATES_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'gates');

const CELULA_SCHEMA = path.join(SCHEMAS_DIR, 'celula-schema.json');

const VERDICTS = Object.freeze({ PASS: 'PASS', FAIL: 'FAIL' });

const ACTION_FILE_RE = /^action-.*\.md$/iu;

// -- 1. actionsInlineValidator (AC-119, D-v1.3-04) --------------------------

function actionsInlineValidator(generatedTasksDir) {
  const offenders = [];
  if (typeof generatedTasksDir !== 'string' || generatedTasksDir.length === 0) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: '(arg)',
          message:
            'publisher bloqueou publicacao: caminho de tasks/ ausente. ' +
            'forneca o diretorio para validar Actions-inline.',
        },
      ],
      offenders: offenders,
    };
  }
  if (!fs.existsSync(generatedTasksDir)) {
    // Missing tasks/ is not a FAIL of THIS validator; it is an upstream
    // problem caught by other gates. But empty tasks/ is allowed at this
    // layer (the F8 gate catches it). Treat missing as PASS for THIS
    // validator's narrow scope.
    return { verdict: VERDICTS.PASS, errors: [], offenders: offenders };
  }

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && ACTION_FILE_RE.test(entry.name)) {
        offenders.push(full);
      }
    }
  }

  walk(generatedTasksDir);

  if (offenders.length === 0) {
    return { verdict: VERDICTS.PASS, errors: [], offenders: [] };
  }

  const errors = offenders.map((p) => ({
    path: p,
    message:
      'publisher bloqueou publicacao: encontrei ' +
      p +
      '. Actions devem ser inline no markdown da Task (D-v1.3-04). ' +
      'remova o arquivo e republique.',
  }));
  return { verdict: VERDICTS.FAIL, errors: errors, offenders: offenders };
}

// -- 2. ostClosureValidator (AC-117) ----------------------------------------

function _readOstSections(ostPath) {
  if (!fs.existsSync(ostPath)) {
    return null;
  }
  const text = fs.readFileSync(ostPath, 'utf8');
  const lines = text.split(/\r?\n/u);
  const sections = {
    Outcome: [],
    Opportunities: [],
    Solutions: [],
    Links: [],
    Tasks: [],
  };
  let current = null;
  for (const line of lines) {
    if (line === '## Outcome') {
      current = 'Outcome';
      continue;
    }
    if (line === '## Opportunities') {
      current = 'Opportunities';
      continue;
    }
    if (line === '## Solutions') {
      current = 'Solutions';
      continue;
    }
    if (line === '## Links') {
      current = 'Links';
      continue;
    }
    if (line === '## Tasks') {
      current = 'Tasks';
      continue;
    }
    if (line === '## Change Log') {
      current = '_changelog';
      continue;
    }
    if (current && current !== '_changelog' && sections[current]) {
      sections[current].push(line);
    }
  }
  return sections;
}

function _extractIds(lines, prefix) {
  const ids = [];
  const re = new RegExp('\\b' + prefix + '-(\\d{3,})\\b', 'gu');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('<!--')) continue;
    let match;
    re.lastIndex = 0;
    while ((match = re.exec(line)) !== null) {
      const id = prefix + '-' + match[1];
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function _hasOutcomeRoot(outcomeLines) {
  // Outcome root present when there is at least one OUT-NNN id OR a
  // non-placeholder bullet (anything that is not the empty marker).
  const EMPTY = '- raiz ainda nao preenchida.';
  for (const line of outcomeLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('<!--')) continue;
    if (trimmed === EMPTY) continue;
    if (trimmed.startsWith('-')) return true;
  }
  return false;
}

function ostClosureValidator(generatedCellRoot) {
  const ostPath = path.join(generatedCellRoot, 'OST.md');
  const sections = _readOstSections(ostPath);
  if (sections === null) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: ostPath,
          message:
            'publisher bloqueou publicacao: OST.md ausente em ' +
            ostPath +
            '. F1 abre o OST. revise a celula gerada.',
        },
      ],
      orphans: [],
    };
  }

  const orphans = [];
  const errors = [];

  if (!_hasOutcomeRoot(sections.Outcome)) {
    errors.push({
      path: 'OST.md#Outcome',
      message:
        'publisher bloqueou publicacao: Outcome raiz ausente. F1 preenche ' +
        'a raiz do OST. revise OST.md antes de publicar.',
    });
  }

  const opportunityIds = _extractIds(sections.Opportunities, 'OPP');
  const solutionIds = _extractIds(sections.Solutions, 'SOL');
  const taskIds = _extractIds(sections.Tasks, 'TASK');
  const linkLines = sections.Links;

  // Build SOL -> OPP map from Links section ("SOL-NNN resolve OPP-NNN").
  const solToOpp = new Map();
  for (const line of linkLines) {
    const m = /\b(SOL-\d{3,})\b[^\n]*\b(OPP-\d{3,})\b/u.exec(line);
    if (m) {
      solToOpp.set(m[1], m[2]);
    }
  }

  // Build TASK -> SOL map from Tasks section. Each Task line should
  // reference SOL-NNN.
  const taskToSol = new Map();
  for (const line of sections.Tasks) {
    const tm = /\b(TASK-\d{3,})\b[^\n]*\b(SOL-\d{3,})\b/u.exec(line);
    if (tm) {
      taskToSol.set(tm[1], tm[2]);
    }
  }

  // Walk every Task -> Solution -> Opportunity -> Outcome chain.
  for (const taskId of taskIds) {
    const sol = taskToSol.get(taskId);
    if (!sol) {
      orphans.push(taskId);
      errors.push({
        path: 'OST.md#Tasks',
        message:
          'publisher bloqueou publicacao: ' +
          taskId +
          ' sem cadeia ate Outcome. F8 liga Tasks a Solutions; revise OST.md.',
      });
      continue;
    }
    if (!solutionIds.includes(sol)) {
      orphans.push(sol);
      errors.push({
        path: 'OST.md#Solutions',
        message:
          'publisher bloqueou publicacao: ' +
          sol +
          ' referenciada por ' +
          taskId +
          ' nao consta em Solutions. revise OST.md.',
      });
      continue;
    }
    const opp = solToOpp.get(sol);
    if (!opp) {
      orphans.push(sol);
      errors.push({
        path: 'OST.md#Links',
        message:
          'publisher bloqueou publicacao: ' +
          sol +
          ' sem link a Opportunity. F6 liga Solution a Opportunity; revise OST.md.',
      });
      continue;
    }
    if (!opportunityIds.includes(opp)) {
      orphans.push(opp);
      errors.push({
        path: 'OST.md#Opportunities',
        message:
          'publisher bloqueou publicacao: ' +
          opp +
          ' linkada por ' +
          sol +
          ' nao consta em Opportunities. revise OST.md.',
      });
      continue;
    }
  }

  if (errors.length > 0) {
    return { verdict: VERDICTS.FAIL, errors: errors, orphans: orphans };
  }
  if (taskIds.length === 0) {
    // No Tasks at all is suspicious — treat as orphan condition with
    // pt-BR error guiding the expert back to F8.
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: 'OST.md#Tasks',
          message:
            'publisher bloqueou publicacao: OST.md sem Tasks. F8 liga ' +
            'Tasks a Solutions. revise a celula gerada.',
        },
      ],
      orphans: [],
    };
  }
  return { verdict: VERDICTS.PASS, errors: [], orphans: [] };
}

// -- 3. workflowsDirValidator (D-v1.4-07) -----------------------------------

function workflowsDirValidator(generatedCellRoot) {
  const wfDir = path.join(generatedCellRoot, 'workflows');
  if (!fs.existsSync(wfDir)) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: wfDir,
          message:
            'publisher bloqueou publicacao: diretorio workflows/ ausente. ' +
            'D-v1.4-07 exige workflows/ em toda celula gerada. crie o ' +
            'diretorio com README.md explicando o proposito mesmo quando ' +
            'a celula nao declara workflow.',
        },
      ],
    };
  }
  let stat;
  try {
    stat = fs.statSync(wfDir);
  } catch (_) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: wfDir,
          message:
            'publisher bloqueou publicacao: workflows/ inacessivel em ' +
            wfDir +
            '. revise permissoes.',
        },
      ],
    };
  }
  if (!stat.isDirectory()) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: wfDir,
          message:
            'publisher bloqueou publicacao: workflows/ esperado como ' +
            'diretorio, encontrado arquivo. D-v1.4-07.',
        },
      ],
    };
  }
  return { verdict: VERDICTS.PASS, errors: [] };
}

// -- 4. successExamplesValidator (D-v1.4-09) --------------------------------

const SUCCESS_HEADING_RE = /^##\s+Exemplo\b/u;

function successExamplesValidator(generatedCellRoot, opts) {
  const options = opts || {};
  const minEntries = typeof options.minEntries === 'number' ? options.minEntries : 3;
  const filePath = path.join(
    generatedCellRoot,
    'kbs',
    'success-examples.md'
  );
  if (!fs.existsSync(filePath)) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: filePath,
          message:
            'publisher bloqueou publicacao: kbs/success-examples.md ' +
            'ausente. D-v1.4-09 exige minimo de ' +
            minEntries +
            ' exemplos ancorados. archaeologist coleta exemplos em F2 — ' +
            'volte a F2 para completar.',
        },
      ],
      count: 0,
    };
  }
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/u);
  let count = 0;
  for (const line of lines) {
    if (SUCCESS_HEADING_RE.test(line)) count++;
  }
  if (count < minEntries) {
    return {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: filePath,
          message:
            'publisher bloqueou publicacao: kbs/success-examples.md com ' +
            count +
            ' entradas. D-v1.4-09 exige minimo de ' +
            minEntries +
            ' exemplos ancorados. archaeologist coleta exemplos em F2 — ' +
            'volte a F2 para completar.',
        },
      ],
      count: count,
    };
  }
  return { verdict: VERDICTS.PASS, errors: [], count: count };
}

// -- 5. prePublishCheck (4 validators in sequence) --------------------------

function prePublishCheck(generatedCellRoot) {
  const failures = [];

  const ai = actionsInlineValidator(path.join(generatedCellRoot, 'tasks'));
  if (ai.verdict === VERDICTS.FAIL) failures.push({ name: 'actionsInline', ...ai });

  const oc = ostClosureValidator(generatedCellRoot);
  if (oc.verdict === VERDICTS.FAIL) failures.push({ name: 'ostClosure', ...oc });

  const wf = workflowsDirValidator(generatedCellRoot);
  if (wf.verdict === VERDICTS.FAIL) failures.push({ name: 'workflowsDir', ...wf });

  const se = successExamplesValidator(generatedCellRoot);
  if (se.verdict === VERDICTS.FAIL) failures.push({ name: 'successExamples', ...se });

  if (failures.length > 0) {
    return { verdict: VERDICTS.FAIL, failures: failures };
  }
  return { verdict: VERDICTS.PASS, failures: [] };
}

// -- 6. schemaGateOnManifest (NFR-003) --------------------------------------

function _freshSchemaGate() {
  const schemaGatePath = path.join(GATES_DIR, 'schema-gate.js');
  delete require.cache[require.resolve(schemaGatePath)];
  return require(schemaGatePath);
}

function schemaGateOnManifest(manifestYamlPath) {
  const schemaGate = _freshSchemaGate();
  return schemaGate.validate(manifestYamlPath, CELULA_SCHEMA, {
    gateId: 'schema-gate.publisher',
    isCellManifest: true,
  });
}

// -- 7. instrumentHookModel -------------------------------------------------

function _hookModelNarratives(opts) {
  const o = opts || {};
  return {
    trigger:
      o.trigger ||
      'Trigger: gatilho externo (preferencial) chama a celula. Gatilho ' +
        'interno alvo aciona a celula a partir do Claude Code.',
    action:
      o.action ||
      'Action: caminho de friccao minima. O expert ativa a celula com ' +
        '/Kaizen:{NomeDaCelula} e segue para a primeira pergunta.',
    variable_reward:
      o.variable_reward ||
      'Variable Reward: payoff fixo do output principal. Payoff variavel ' +
        'modulado pelo outcome — surpresa positiva quando a celula resolve ' +
        'o problema com menos passos do que o expert esperava.',
    investment:
      o.investment ||
      'Investment: MEMORY.md acumula contexto, CHANGELOG cresce a cada ' +
        'ciclo, OST fecha a cadeia Task → Outcome. O expert volta a ' +
        'celula porque o estado dela melhora a cada uso.',
  };
}

function instrumentHookModel(generatedCellRoot, options) {
  const opts = options || {};
  const narratives = _hookModelNarratives(opts);
  const readmePath = path.join(generatedCellRoot, 'README.md');
  const cellName = opts.cellName || '<NOME-DA-CELULA>';
  const sections = [];
  sections.push('# ' + cellName);
  sections.push('');
  if (typeof opts.description === 'string' && opts.description.length > 0) {
    sections.push(opts.description);
    sections.push('');
  }
  sections.push('## Hook Model');
  sections.push('');
  sections.push('### Trigger');
  sections.push('');
  sections.push(narratives.trigger);
  sections.push('');
  sections.push('### Action');
  sections.push('');
  sections.push(narratives.action);
  sections.push('');
  sections.push('### Variable Reward');
  sections.push('');
  sections.push(narratives.variable_reward);
  sections.push('');
  sections.push('### Investment');
  sections.push('');
  sections.push(narratives.investment);
  sections.push('');
  fs.mkdirSync(generatedCellRoot, { recursive: true });
  fs.writeFileSync(readmePath, sections.join('\n'), 'utf8');
  return { readmePath: readmePath, narratives: narratives };
}

// -- 8. configureCli --------------------------------------------------------

function configureCli(generatedCellRoot, manifest) {
  if (!manifest || typeof manifest !== 'object') {
    const err = new Error(
      'publisher bloqueou publicacao: manifesto invalido para CLI config.'
    );
    err.code = 'CLI_MANIFEST_INVALID';
    throw err;
  }
  const slashPrefix = manifest.slashPrefix;
  if (typeof slashPrefix !== 'string' || slashPrefix.length === 0) {
    const err = new Error(
      'publisher bloqueou publicacao: slashPrefix ausente no manifesto. ' +
        'configure /Kaizen:{NomeDaCelula} antes de publicar.'
    );
    err.code = 'CLI_SLASH_PREFIX_MISSING';
    throw err;
  }
  const commands = Array.isArray(manifest.commands) ? manifest.commands : [];
  if (commands.length === 0) {
    const err = new Error(
      'publisher bloqueou publicacao: nenhum *comando mapeado. configure ' +
        'pelo menos um comando antes de publicar.'
    );
    err.code = 'CLI_COMMANDS_MISSING';
    throw err;
  }
  for (const c of commands) {
    if (!c || typeof c.name !== 'string' || c.name.length === 0) {
      const err = new Error(
        'publisher bloqueou publicacao: comando sem name. revise commands no manifesto.'
      );
      err.code = 'CLI_COMMAND_NAME_MISSING';
      throw err;
    }
    if (!c.name.startsWith('*')) {
      const err = new Error(
        'publisher bloqueou publicacao: comando ' +
          c.name +
          ' sem prefixo "*". use *comando.'
      );
      err.code = 'CLI_COMMAND_PREFIX_INVALID';
      throw err;
    }
  }
  return { commands: commands.slice() };
}

// -- 9. initializeChangelog (FR-115) ----------------------------------------

function _isoDate() {
  return new Date().toISOString();
}

function initializeChangelog(generatedCellRoot, options) {
  const opts = options || {};
  const date = opts.date || _isoDate();
  const author = opts.author || '<expert>';
  const cellName = opts.cellName || '<NOME-DA-CELULA>';
  const components = opts.components || {};
  const lines = [];
  lines.push('# CHANGELOG — ' + cellName);
  lines.push('');
  lines.push('Append-only. Cada release adiciona uma linha de versao com data');
  lines.push('ISO, autor e resumo. Linhas anteriores nunca mudam.');
  lines.push('');
  lines.push('## 1.0.0 — ' + date);
  lines.push('');
  lines.push('- celula criada via Yotzer F10.');
  lines.push('- autor: ' + author + '.');
  if (Array.isArray(components.agents) && components.agents.length > 0) {
    lines.push('- agentes: ' + components.agents.join(', ') + '.');
  }
  if (Array.isArray(components.tasks) && components.tasks.length > 0) {
    lines.push('- tasks: ' + components.tasks.join(', ') + '.');
  }
  if (Array.isArray(components.templates) && components.templates.length > 0) {
    lines.push('- templates: ' + components.templates.join(', ') + '.');
  }
  if (Array.isArray(components.checklists) && components.checklists.length > 0) {
    lines.push('- checklists: ' + components.checklists.join(', ') + '.');
  }
  if (Array.isArray(components.kbs) && components.kbs.length > 0) {
    lines.push('- kbs: ' + components.kbs.join(', ') + '.');
  }
  lines.push('');
  fs.mkdirSync(generatedCellRoot, { recursive: true });
  const changelogPath = path.join(generatedCellRoot, 'CHANGELOG.md');
  const content = lines.join('\n');
  fs.writeFileSync(changelogPath, content, 'utf8');
  return { path: changelogPath, entry: content };
}

function appendChangelogVersion(generatedCellRoot, version, summary) {
  const changelogPath = path.join(generatedCellRoot, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) {
    const err = new Error(
      'publisher bloqueou publicacao: CHANGELOG.md ausente em ' +
        changelogPath +
        '. inicie em 1.0.0 antes de republicar.'
    );
    err.code = 'CHANGELOG_MISSING';
    throw err;
  }
  if (typeof version !== 'string' || version.length === 0) {
    const err = new Error('publisher: versao invalida em appendChangelogVersion.');
    err.code = 'CHANGELOG_VERSION_INVALID';
    throw err;
  }
  const date = _isoDate();
  const block = [
    '',
    '## ' + version + ' — ' + date,
    '',
    typeof summary === 'string' && summary.length > 0
      ? '- ' + summary
      : '- republicacao via /Kaizen:Yotzer publish.',
    '',
  ].join('\n');
  fs.appendFileSync(changelogPath, block, 'utf8');
  return { path: changelogPath, entry: block };
}

// -- 10. materializeCell ----------------------------------------------------

function _emitYamlValue(value, indent) {
  const pad = '  '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return (
      '\n' +
      value
        .map((v) => {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            const keys = Object.keys(v);
            if (keys.length === 0) return pad + '- {}';
            const first = keys[0];
            const rest = keys.slice(1);
            const head = pad + '- ' + first + ': ' + _emitScalar(v[first]);
            const restLines = rest.map(
              (k) => pad + '  ' + k + ': ' + _emitScalar(v[k])
            );
            return [head].concat(restLines).join('\n');
          }
          return pad + '- ' + _emitScalar(v);
        })
        .join('\n')
    );
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    return (
      '\n' +
      keys
        .map((k) => {
          const v = value[k];
          if (Array.isArray(v) || (v && typeof v === 'object')) {
            return pad + k + ':' + _emitYamlValue(v, indent + 1);
          }
          return pad + k + ': ' + _emitScalar(v);
        })
        .join('\n')
    );
  }
  return _emitScalar(value);
}

function _emitScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  // Quote everything string for safety (R-015 — no implicit booleans).
  return '"' + String(v).replace(/\\/gu, '\\\\').replace(/"/gu, '\\"') + '"';
}

function emitYaml(manifest) {
  const lines = [];
  for (const key of Object.keys(manifest)) {
    const v = manifest[key];
    if (Array.isArray(v) || (v && typeof v === 'object')) {
      lines.push(key + ':' + _emitYamlValue(v, 1));
    } else {
      lines.push(key + ': ' + _emitScalar(v));
    }
  }
  return lines.join('\n') + '\n';
}

function materializeCell(spec, targetCelulasRoot, options) {
  if (!spec || typeof spec !== 'object') {
    const err = new Error('publisher: spec invalido para materializeCell.');
    err.code = 'MATERIALIZE_SPEC_INVALID';
    throw err;
  }
  const cellName = spec.name;
  if (typeof cellName !== 'string' || cellName.length === 0) {
    const err = new Error('publisher: spec sem name. defina name antes de publicar.');
    err.code = 'MATERIALIZE_NAME_MISSING';
    throw err;
  }
  if (typeof targetCelulasRoot !== 'string' || targetCelulasRoot.length === 0) {
    const err = new Error('publisher: targetCelulasRoot ausente.');
    err.code = 'MATERIALIZE_ROOT_MISSING';
    throw err;
  }
  const opts = options || {};
  const cellPath = path.join(targetCelulasRoot, cellName);
  fs.mkdirSync(cellPath, { recursive: true });

  // Required AC-118 directories.
  const dirs = ['agents', 'tasks', 'workflows', 'templates', 'checklists', 'kbs'];
  for (const d of dirs) {
    fs.mkdirSync(path.join(cellPath, d), { recursive: true });
  }

  // Manifest.
  const manifest = spec.manifest || {};
  if (!manifest.version) manifest.version = '1.0.0';
  const yaml = emitYaml(manifest);
  const manifestPath = path.join(cellPath, 'celula.yaml');
  fs.writeFileSync(manifestPath, yaml, 'utf8');

  // README via Hook Model instrumentation.
  instrumentHookModel(cellPath, {
    cellName: manifest.name || cellName,
    description: manifest.description,
    trigger: spec.hookModel && spec.hookModel.trigger,
    action: spec.hookModel && spec.hookModel.action,
    variable_reward: spec.hookModel && spec.hookModel.variable_reward,
    investment: spec.hookModel && spec.hookModel.investment,
  });

  // CHANGELOG.
  initializeChangelog(cellPath, {
    cellName: manifest.name || cellName,
    author: spec.author || '<expert>',
    components: manifest.components || {},
  });

  // MEMORY.md placeholder.
  fs.writeFileSync(
    path.join(cellPath, 'MEMORY.md'),
    '# MEMORY — ' + cellName + '\n\nAcumulacao append-only. F10 publicou em 1.0.0.\n',
    'utf8'
  );

  // Seed files from spec (allow callers — typically the publish CLI —
  // to ship pre-populated OST.md, tasks, agents, etc. produced by F1-F9).
  if (spec.seedFiles && typeof spec.seedFiles === 'object') {
    for (const relPath of Object.keys(spec.seedFiles)) {
      const content = spec.seedFiles[relPath];
      if (typeof content !== 'string') continue;
      const target = path.join(cellPath, relPath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
    }
  }

  // OST.md — defer to ost-writer if outcome provided; otherwise minimal.
  if (!fs.existsSync(path.join(cellPath, 'OST.md'))) {
    const ostMinimal = [
      '# OST — Opportunity Solution Tree',
      '',
      '## Outcome',
      '',
      '- raiz ainda nao preenchida.',
      '',
      '## Opportunities',
      '',
      '- lista vazia. F3 adiciona as primeiras Opportunities. F5 adiciona as residuais.',
      '',
      '## Solutions',
      '',
      '- lista vazia. F5 adiciona primeiras Solutions. F6 consolida Solutions definitivas.',
      '',
      '## Links',
      '',
      '- sem links ainda.',
      '',
      '## Tasks',
      '',
      '- lista vazia. F8 liga Tasks a Solutions.',
      '',
      '## Change Log',
      '',
      '- ' + _isoDate() + ' — @publisher — F10 fechou OST. celula publicada em 1.0.0.',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(cellPath, 'OST.md'), ostMinimal, 'utf8');
  }

  // workflows/README.md when workflows/ ends up empty (D-v1.4-07).
  const workflowsDir = path.join(cellPath, 'workflows');
  const wfEntries = fs.readdirSync(workflowsDir);
  if (wfEntries.length === 0) {
    fs.writeFileSync(
      path.join(workflowsDir, 'README.md'),
      '# Workflows — ' +
        cellName +
        '\n\nDiretorio sempre presente em celula KaiZen (D-v1.4-07).\n' +
        'Esta celula nao declara workflows nesta versao. Adicione manifestos\n' +
        'YAML aqui seguindo workflow-tmpl.yaml caso a celula precise de\n' +
        'workflows futuramente.\n',
      'utf8'
    );
  }

  // kbs/success-examples.md placeholder — copy template if missing.
  const sePath = path.join(cellPath, 'kbs', 'success-examples.md');
  if (!fs.existsSync(sePath)) {
    fs.mkdirSync(path.dirname(sePath), { recursive: true });
    const tmplPath = path.join(
      PROJECT_ROOT,
      '.kaizen-dvir',
      'celulas',
      'yotzer',
      'templates',
      'success-examples-tmpl.md'
    );
    if (fs.existsSync(tmplPath)) {
      const tmplBody = fs.readFileSync(tmplPath, 'utf8');
      fs.writeFileSync(sePath, tmplBody, 'utf8');
    }
  }

  // -------------------------------------------------------------------------
  //  Story M8.5 — slash-skill registration via cell-registry helper.
  //  Skipped (skillRegistration === null) when the caller did not provide a
  //  claudeCommandsDir (e.g., M4.5 unit tests that exercise materializeCell
  //  in isolation) OR when the materialized cell has no persona files yet
  //  under agents/ (incomplete fixture; nothing to register). Real publish
  //  flow always passes claudeCommandsDir AND seeds agents/ via spec.seed
  //  Files in F9 — see `_doPublish` in `bin/kaizen.js`.
  // -------------------------------------------------------------------------
  let skillRegistration = null;
  if (
    typeof opts.claudeCommandsDir === 'string' &&
    opts.claudeCommandsDir.length > 0 &&
    _hasAgentPersonas(cellPath)
  ) {
    skillRegistration = _registerSkillsForCell(
      cellPath,
      manifest,
      opts.claudeCommandsDir
    );
  }

  return {
    celulaPath: cellPath,
    manifest: manifest,
    manifestPath: manifestPath,
    skillRegistration: skillRegistration,
  };
}

// -- 11. Skill registration delegation (M8.5) -------------------------------

function _hasAgentPersonas(cellPath) {
  const agentsDir = path.join(cellPath, 'agents');
  let entries;
  try {
    entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch (_) {
    return false;
  }
  for (const ent of entries) {
    if (ent.isFile() && ent.name.endsWith('.md')) return true;
  }
  return false;
}

/**
 * Internal post-materialize hook (M8.5). Delegates skill emission to
 * `dvir/cell-registry.registerCellSkills()` — the single source of truth
 * shared with `kaizen init` (M8.3) and `kaizen update` (M8.4). The
 * publisher itself never inlines skill-file templates: this guarantees
 * that bundled cells and expert-generated cells acquire activatable
 * slash skills through the same code path (D8.5, D-v1.5-05).
 *
 * On throw from registerCellSkills() (malformed manifest, missing chief
 * persona, etc.) the helper appends a failure line to the cell's
 * CHANGELOG.md and re-throws the original pt-BR error so the calling
 * `runYotzerPublish` in `bin/kaizen.js` can surface it and exit
 * non-zero. Failure path complies with NFR-101 and Commandment V.
 *
 * @param {string} cellPath          Absolute path to the materialized cell.
 * @param {object} manifest          Parsed celula.yaml (used for slashPrefix
 *                                   pre-flight via configureCli).
 * @param {string} claudeCommandsDir Absolute path to <project>/.claude/commands.
 * @returns {{ entryWritten: boolean,
 *            specialistsWritten: string[],
 *            warnings: string[] }}
 * @throws {Error} pt-BR error message after appending CHANGELOG failure entry.
 */
function _registerSkillsForCell(cellPath, manifest, claudeCommandsDir) {
  // Pre-flight: configureCli throws CLI_SLASH_PREFIX_MISSING when the
  // manifest does not declare slashPrefix. Catching here lets us write a
  // CHANGELOG failure entry before bubbling up — registerCellSkills would
  // throw the same kind of error a moment later, but the configureCli
  // contract is the historical pre-publish gate for slashPrefix and
  // produces the exact pt-BR phrasing the expert already knows.
  try {
    configureCli(cellPath, manifest);
  } catch (cfgErr) {
    if (cfgErr && cfgErr.code === 'CLI_SLASH_PREFIX_MISSING') {
      _safeAppendChangelogFailure(
        cellPath,
        'falha ao registrar skill: slashPrefix ausente no manifesto. ' +
          'configure /Kaizen:{NomeDaCelula} antes de republicar.'
      );
    }
    throw cfgErr;
  }

  let result;
  try {
    result = cellRegistry.registerCellSkills(cellPath, claudeCommandsDir);
  } catch (regErr) {
    const msg =
      regErr && regErr.message ? regErr.message : String(regErr);
    _safeAppendChangelogFailure(
      cellPath,
      'falha ao registrar skill via cell-registry: ' + msg
    );
    throw regErr;
  }
  return result;
}

function _safeAppendChangelogFailure(cellPath, summary) {
  // Best-effort CHANGELOG annotation. The publish flow already
  // initialized CHANGELOG.md at 1.0.0 earlier in materializeCell(), so
  // appending should normally succeed. Swallow append errors here to
  // avoid masking the original registration error the caller cares about.
  try {
    appendChangelogVersion(cellPath, '1.0.0+skill-fail', summary);
  } catch (_) {
    /* ignore — original error path takes precedence. */
  }
}

module.exports = {
  VERDICTS: VERDICTS,
  actionsInlineValidator: actionsInlineValidator,
  ostClosureValidator: ostClosureValidator,
  workflowsDirValidator: workflowsDirValidator,
  successExamplesValidator: successExamplesValidator,
  prePublishCheck: prePublishCheck,
  schemaGateOnManifest: schemaGateOnManifest,
  instrumentHookModel: instrumentHookModel,
  configureCli: configureCli,
  initializeChangelog: initializeChangelog,
  appendChangelogVersion: appendChangelogVersion,
  materializeCell: materializeCell,
  emitYaml: emitYaml,
};
