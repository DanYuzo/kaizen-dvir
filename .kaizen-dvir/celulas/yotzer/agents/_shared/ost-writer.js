'use strict';

/**
 * ost-writer.js — OST.md lifecycle writer for Yotzer's generated cells.
 *
 * Story M4.2 — Archaeologist and OST Lifecycle scaffold. Shared across
 * archaeologist (F1/F3/F6), risk-mapper (F5, M4.3), prioritizer (F7, M4.4),
 * task-granulator (F8, M4.4), and publisher (F10, M4.5).
 *
 * Placement rationale: cell-local helper at `agents/_shared/ost-writer.js`.
 * Declared in `celula.yaml` `components.agents` as INTERNAL — no
 * `/Kaizen:Yotzer:ost-writer` slash surface, no persona, no Playback Gate.
 * Pure writer, no judgement.
 *
 * Public contract (FROZEN — consumed by archaeologist tasks + downstream
 * specialists):
 *
 *   writeRoot(celulaPath, outcome) -> { ostPath, outcome }
 *     Creates OST.md at `{celulaPath}/OST.md` from the cell template and
 *     fills the root Outcome. Opportunities/Solutions/Links/Tasks start
 *     empty. Seeds Change Log with the creation entry.
 *
 *   appendOpportunity(celulaPath, opportunity) -> { id, line }
 *     Append-only write under Opportunities. Auto-assigns id `OPP-NNN` if
 *     missing. Returns the assigned id.
 *
 *   appendSolution(celulaPath, solution) -> { id, line }
 *     Append-only write under Solutions. Auto-assigns id `SOL-NNN` if
 *     missing.
 *
 *   linkSolutionToOpportunity(celulaPath, solutionId, opportunityId) -> { line }
 *     Append-only link row under Links. Never mutates a Solution entry in
 *     place.
 *
 *   appendChangeLog(celulaPath, author, change) -> { line }
 *     Append-only Change Log row with ISO timestamp.
 *
 * Storage layout:
 *   {celulaPath}/OST.md   — markdown artifact with well-known sections
 *
 * Constraints honoured:
 *   - CON-002: CommonJS + ES2022
 *   - CON-003: Node.js stdlib only (`node:fs`, `node:path`). No YAML
 *     parser, no markdown renderer. String splicing against section
 *     headings.
 *   - D-v1.4-09: user-facing prose in pt-BR (template drives copy).
 *   - D-v1.4-10: not relevant at this layer — the 4-mode F2 decision
 *     lives in `phase-2-sources-and-examples.md`.
 *   - D-v1.4-11: the writer writes to the generated cell only; it never
 *     touches global KB paths.
 *   - R-008: atomic append via `fs.promises.appendFile` equivalent using
 *     retry-on-EBUSY with short backoff (mirrors M3.1 memory-writer
 *     pattern, using the sync stdlib surface).
 *
 * Language Policy: EN for internal API names. User-facing output (OST.md
 * prose, bullet text written by the template) stays pt-BR via the
 * template file.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const TEMPLATE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'templates',
  'ost-tmpl.md'
);

const OST_FILENAME = 'OST.md';
const EMPTY_ROOT_MARKER = '- raiz ainda nao preenchida.';
const EMPTY_OPPS_MARKER = '- lista vazia. F3 adiciona as primeiras Opportunities. F5 adiciona as residuais.';
const EMPTY_SOLS_MARKER = '- lista vazia. F5 adiciona primeiras Solutions. F6 consolida Solutions definitivas.';
const EMPTY_LINKS_MARKER = '- sem links ainda.';
const EMPTY_TASKS_MARKER = '- lista vazia. F8 liga Tasks a Solutions.';
const EMPTY_CHANGELOG_MARKER = '- sem entradas ainda.';

// -- path resolution --------------------------------------------------------

function _ostPath(celulaPath) {
  if (typeof celulaPath !== 'string' || celulaPath.length === 0) {
    const err = new Error('celulaPath invalido: caminho da celula ausente.');
    err.code = 'OST_CELL_PATH_MISSING';
    throw err;
  }
  return path.join(celulaPath, OST_FILENAME);
}

function _ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

// -- atomic append with retry-on-EBUSY (M3.1 memory-writer pattern) ---------

const _APPEND_MAX_RETRIES = 5;
const _APPEND_BACKOFF_MS = 20;

function _sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // Tight loop — stdlib-only, no setTimeout await surface for sync path.
  }
}

function _writeFileRetry(target, content) {
  let lastErr = null;
  for (let i = 0; i < _APPEND_MAX_RETRIES; i++) {
    try {
      fs.writeFileSync(target, content, { encoding: 'utf8' });
      return;
    } catch (e) {
      lastErr = e;
      if (e && (e.code === 'EBUSY' || e.code === 'EACCES' || e.code === 'EPERM')) {
        _sleep(_APPEND_BACKOFF_MS * (i + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('OST write falhou apos ' + _APPEND_MAX_RETRIES + ' tentativas.');
}

// -- template read ----------------------------------------------------------

function _readTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    const err = new Error('ost-tmpl.md nao encontrado em ' + TEMPLATE_PATH + '.');
    err.code = 'OST_TEMPLATE_MISSING';
    throw err;
  }
  return fs.readFileSync(TEMPLATE_PATH, 'utf8');
}

// -- section splicing -------------------------------------------------------

const _SECTIONS = Object.freeze([
  { name: 'Outcome', heading: '## Outcome' },
  { name: 'Opportunities', heading: '## Opportunities' },
  { name: 'Solutions', heading: '## Solutions' },
  { name: 'Links', heading: '## Links' },
  { name: 'Tasks', heading: '## Tasks' },
  { name: 'Change Log', heading: '## Change Log' },
]);

function _splitSections(text) {
  const lines = text.split(/\r?\n/u);
  const out = { header: [], sections: {} };
  let current = null;
  let buffer = [];
  for (const line of lines) {
    const match = _SECTIONS.find((s) => line === s.heading);
    if (match) {
      if (current === null) {
        out.header = buffer;
      } else {
        out.sections[current] = buffer;
      }
      current = match.name;
      buffer = [line];
      continue;
    }
    buffer.push(line);
  }
  if (current === null) {
    out.header = buffer;
  } else {
    out.sections[current] = buffer;
  }
  return out;
}

function _joinSections(split) {
  const parts = [];
  parts.push(split.header.join('\n'));
  for (const section of _SECTIONS) {
    const block = split.sections[section.name];
    if (Array.isArray(block)) {
      parts.push(block.join('\n'));
    }
  }
  return parts.join('\n');
}

function _appendLineToSection(split, sectionName, line, emptyMarker) {
  const block = split.sections[sectionName];
  if (!Array.isArray(block)) {
    const err = new Error('secao ausente no OST: ' + sectionName + '.');
    err.code = 'OST_SECTION_MISSING';
    throw err;
  }
  // Strip the empty marker line if present. The marker is an exact match
  // against the template placeholder.
  const filtered = block.filter((l) => l !== emptyMarker);
  filtered.push(line);
  split.sections[sectionName] = filtered;
}

// -- id allocation ----------------------------------------------------------

function _nextId(lines, prefix) {
  let max = 0;
  // Match the id anywhere on the line (formatted as "- id: PREFIX-NNN — ...").
  const re = new RegExp('\\b' + prefix + '-(\\d{3,})\\b', 'u');
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return prefix + '-' + String(max + 1).padStart(3, '0');
}

function _padId(prefix, n) {
  return prefix + '-' + String(n).padStart(3, '0');
}

// -- isoTimestamp -----------------------------------------------------------

function _now() {
  return new Date().toISOString();
}

// -- writeRoot --------------------------------------------------------------

/**
 * Create OST.md at `{celulaPath}/OST.md` and fill the root Outcome.
 *
 * Overwrites any existing OST.md (F1 is the unique entry point for OST
 * creation — archaeologist.md persona enforces that contract).
 *
 * @param {string} celulaPath absolute path to the generated cell
 * @param {{id?: string, type: string, description: string}} outcome
 * @returns {{ostPath: string, outcome: object}}
 */
function writeRoot(celulaPath, outcome) {
  if (!outcome || typeof outcome !== 'object') {
    const err = new Error('outcome invalido: objeto esperado com tipo e descricao.');
    err.code = 'OST_OUTCOME_INVALID';
    throw err;
  }
  const { id, type, description } = outcome;
  if (typeof type !== 'string' || type.length === 0) {
    const err = new Error('outcome invalido: campo type ausente.');
    err.code = 'OST_OUTCOME_TYPE_MISSING';
    throw err;
  }
  if (typeof description !== 'string' || description.length === 0) {
    const err = new Error('outcome invalido: campo description ausente.');
    err.code = 'OST_OUTCOME_DESCRIPTION_MISSING';
    throw err;
  }

  const outcomeId = typeof id === 'string' && id.length > 0 ? id : _padId('OUT', 1);
  const outcomeLine = '- id: ' + outcomeId + ' — tipo: ' + type + ' — descricao: ' + description;

  const template = _readTemplate();
  const split = _splitSections(template);

  // Replace the Outcome empty marker with the outcome line.
  _appendLineToSection(split, 'Outcome', outcomeLine, EMPTY_ROOT_MARKER);

  // Seed the Change Log with the creation entry.
  const seedLine = '- ' + _now() + ' — @archaeologist — abriu OST com raiz ' + outcomeId + '.';
  _appendLineToSection(split, 'Change Log', seedLine, EMPTY_CHANGELOG_MARKER);

  const target = _ostPath(celulaPath);
  _ensureDir(target);
  _writeFileRetry(target, _joinSections(split));

  return {
    ostPath: target,
    outcome: { id: outcomeId, type: type, description: description },
  };
}

// -- appendOpportunity ------------------------------------------------------

/**
 * Append an Opportunity entry. Auto-assigns `OPP-NNN` id when omitted.
 *
 * @param {string} celulaPath
 * @param {{id?: string, description: string, pus?: string[]}} opportunity
 * @returns {{id: string, line: string}}
 */
function appendOpportunity(celulaPath, opportunity) {
  if (!opportunity || typeof opportunity !== 'object') {
    const err = new Error('opportunity invalida: objeto esperado com descricao.');
    err.code = 'OST_OPPORTUNITY_INVALID';
    throw err;
  }
  const { id, description, pus } = opportunity;
  if (typeof description !== 'string' || description.length === 0) {
    const err = new Error('opportunity invalida: campo description ausente.');
    err.code = 'OST_OPPORTUNITY_DESCRIPTION_MISSING';
    throw err;
  }

  const target = _ostPath(celulaPath);
  const raw = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : _readTemplate();
  const split = _splitSections(raw);

  const resolvedId =
    typeof id === 'string' && id.length > 0 ? id : _nextId(split.sections['Opportunities'] || [], 'OPP');

  let line = '- id: ' + resolvedId + ' — descricao: ' + description;
  if (Array.isArray(pus) && pus.length > 0) {
    line += ' — pus: [' + pus.join(', ') + ']';
  }

  _appendLineToSection(split, 'Opportunities', line, EMPTY_OPPS_MARKER);
  _appendLineToSection(
    split,
    'Change Log',
    '- ' + _now() + ' — @archaeologist — adicionou ' + resolvedId + '.',
    EMPTY_CHANGELOG_MARKER
  );

  _ensureDir(target);
  _writeFileRetry(target, _joinSections(split));

  return { id: resolvedId, line: line };
}

// -- appendSolution ---------------------------------------------------------

/**
 * Append a Solution entry. Auto-assigns `SOL-NNN` id when omitted.
 *
 * @param {string} celulaPath
 * @param {{id?: string, description: string, origin?: string}} solution
 * @returns {{id: string, line: string}}
 */
function appendSolution(celulaPath, solution) {
  if (!solution || typeof solution !== 'object') {
    const err = new Error('solution invalida: objeto esperado com descricao.');
    err.code = 'OST_SOLUTION_INVALID';
    throw err;
  }
  const { id, description, origin } = solution;
  if (typeof description !== 'string' || description.length === 0) {
    const err = new Error('solution invalida: campo description ausente.');
    err.code = 'OST_SOLUTION_DESCRIPTION_MISSING';
    throw err;
  }

  const target = _ostPath(celulaPath);
  const raw = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : _readTemplate();
  const split = _splitSections(raw);

  const resolvedId =
    typeof id === 'string' && id.length > 0 ? id : _nextId(split.sections['Solutions'] || [], 'SOL');

  let line = '- id: ' + resolvedId + ' — descricao: ' + description;
  if (typeof origin === 'string' && origin.length > 0) {
    line += ' — origem: ' + origin;
  }

  _appendLineToSection(split, 'Solutions', line, EMPTY_SOLS_MARKER);
  _appendLineToSection(
    split,
    'Change Log',
    '- ' + _now() + ' — @archaeologist — adicionou ' + resolvedId + '.',
    EMPTY_CHANGELOG_MARKER
  );

  _ensureDir(target);
  _writeFileRetry(target, _joinSections(split));

  return { id: resolvedId, line: line };
}

// -- linkSolutionToOpportunity ----------------------------------------------

/**
 * Write an append-only link row under Links.
 *
 * @param {string} celulaPath
 * @param {string} solutionId
 * @param {string} opportunityId
 * @returns {{line: string}}
 */
function linkSolutionToOpportunity(celulaPath, solutionId, opportunityId) {
  if (typeof solutionId !== 'string' || solutionId.length === 0) {
    const err = new Error('link invalido: solutionId ausente.');
    err.code = 'OST_LINK_SOLUTION_MISSING';
    throw err;
  }
  if (typeof opportunityId !== 'string' || opportunityId.length === 0) {
    const err = new Error('link invalido: opportunityId ausente.');
    err.code = 'OST_LINK_OPPORTUNITY_MISSING';
    throw err;
  }

  const target = _ostPath(celulaPath);
  const raw = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : _readTemplate();
  const split = _splitSections(raw);

  const line = '- ' + solutionId + ' resolve ' + opportunityId;
  _appendLineToSection(split, 'Links', line, EMPTY_LINKS_MARKER);
  _appendLineToSection(
    split,
    'Change Log',
    '- ' + _now() + ' — @archaeologist — ligou ' + solutionId + ' a ' + opportunityId + '.',
    EMPTY_CHANGELOG_MARKER
  );

  _ensureDir(target);
  _writeFileRetry(target, _joinSections(split));

  return { line: line };
}

// -- appendChangeLog --------------------------------------------------------

/**
 * Append a Change Log row with ISO timestamp.
 *
 * @param {string} celulaPath
 * @param {string} author
 * @param {string} change
 * @returns {{line: string}}
 */
function appendChangeLog(celulaPath, author, change) {
  if (typeof author !== 'string' || author.length === 0) {
    const err = new Error('change log invalido: autor ausente.');
    err.code = 'OST_CHANGELOG_AUTHOR_MISSING';
    throw err;
  }
  if (typeof change !== 'string' || change.length === 0) {
    const err = new Error('change log invalido: mudanca ausente.');
    err.code = 'OST_CHANGELOG_CHANGE_MISSING';
    throw err;
  }

  const target = _ostPath(celulaPath);
  const raw = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : _readTemplate();
  const split = _splitSections(raw);

  const line = '- ' + _now() + ' — ' + author + ' — ' + change;
  _appendLineToSection(split, 'Change Log', line, EMPTY_CHANGELOG_MARKER);

  _ensureDir(target);
  _writeFileRetry(target, _joinSections(split));

  return { line: line };
}

module.exports = {
  writeRoot: writeRoot,
  appendOpportunity: appendOpportunity,
  appendSolution: appendSolution,
  linkSolutionToOpportunity: linkSolutionToOpportunity,
  appendChangeLog: appendChangeLog,
  OST_FILENAME: OST_FILENAME,
  TEMPLATE_PATH: TEMPLATE_PATH,
  _projectRoot: function () {
    return PROJECT_ROOT;
  },
};
