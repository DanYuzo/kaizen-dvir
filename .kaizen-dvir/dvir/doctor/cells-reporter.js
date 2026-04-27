'use strict';

/**
 * cells-reporter.js — `kaizen doctor --cells` (M3.5, AC 6, FR-029).
 *
 * Scans `.kaizen-dvir/celulas/*\/celula.yaml`, parses each manifest using
 * the M2.5 schema-gate parser, validates against the M2.5 celula-schema,
 * and renders `{name} {version} {status}` per cell.
 *
 * Status mapping:
 *   - ativa      — manifest valid AND `boot:` declares >= 1 entry.
 *   - bootável   — manifest valid AND no boot entry yet (cell present but
 *                  not booted into the active session).
 *   - erro       — manifest fails to parse or fails the M2.5 schema.
 *
 * Version is read from a top-level `version:` scalar when present
 * (forward-compatible with v1.4 cells); falls back to `-` when missing.
 *
 * Read-only — no mutations.
 *
 * pt-BR labels and reasons. Identifiers (cell name, version) literal.
 * CON-002 / CON-003.
 */

const fs = require('node:fs');
const path = require('node:path');

const messages = require('./messages.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'schemas',
  'celula-schema.json'
);

function _celulasRoot() {
  if (process.env.KAIZEN_CELULAS_DIR) return process.env.KAIZEN_CELULAS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');
}

function _loadSchema() {
  return JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

function _loadParser() {
  // Reuse the M2.5 schema-gate YAML 1.2 strict parser. It throws pt-BR
  // errors on invalid manifests — we catch and mark the cell as `erro`.
  const schemaGatePath = path.join(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'dvir',
    'gates',
    'schema-gate.js'
  );
  delete require.cache[require.resolve(schemaGatePath)];
  return require(schemaGatePath)._parseYaml;
}

function _loadValidator() {
  const validatorPath = path.join(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'dvir',
    'schemas',
    'validator.js'
  );
  delete require.cache[require.resolve(validatorPath)];
  return require(validatorPath).validate;
}

/**
 * Build the per-cell report rows.
 *
 * @returns {Array<{name:string, version:string, status:string, reason?:string, path:string}>}
 */
function listCells() {
  const root = _celulasRoot();
  const out = [];
  if (!fs.existsSync(root)) return out;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return out;
  }
  // Sorted for deterministic output.
  entries.sort((a, b) => a.name.localeCompare(b.name));

  let parseYaml = null;
  let validate = null;
  let schema = null;
  try {
    parseYaml = _loadParser();
    validate = _loadValidator();
    schema = _loadSchema();
  } catch (loadErr) {
    // Parser / validator / schema unavailable — every cell renders as erro
    // with a generic reason. Never silently pass.
    parseYaml = null;
    validate = null;
    schema = null;
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const manifestPath = path.join(root, ent.name, 'celula.yaml');
    const row = {
      name: ent.name,
      version: '-',
      status: messages.STATUS_ERROR,
      path: manifestPath,
    };
    if (!fs.existsSync(manifestPath)) {
      row.status = messages.STATUS_ERROR;
      row.reason = 'celula.yaml ausente.';
      out.push(row);
      continue;
    }
    if (!parseYaml || !validate || !schema) {
      row.reason = 'parser ou schema indisponivel.';
      out.push(row);
      continue;
    }
    let raw;
    try {
      raw = fs.readFileSync(manifestPath, 'utf8');
    } catch (err) {
      row.reason = 'falha ao ler manifesto: ' + (err.message || String(err));
      out.push(row);
      continue;
    }
    let parsed;
    try {
      parsed = parseYaml(raw);
    } catch (err) {
      row.reason = err && err.message ? err.message : String(err);
      out.push(row);
      continue;
    }
    // Capture version (forward-compatible, optional). The M2.5 schema is
    // declared with `additionalProperties: false`, so we must strip the
    // `version` field before validating to avoid a false-erro label. The
    // schema is fixed in M2.5 — we cannot extend it here. Versioning lands
    // formally in M4.
    let validationCopy = parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (typeof parsed.version === 'string') {
        row.version = parsed.version;
      }
      validationCopy = Object.assign({}, parsed);
      delete validationCopy.version;
    }
    // Schema validation against M2.5 celula-schema.
    const result = validate(schema, validationCopy);
    if (!result.valid) {
      const first = result.errors && result.errors[0];
      row.reason =
        first && first.message
          ? first.message
          : 'manifesto nao valida contra celula-schema.json.';
      out.push(row);
      continue;
    }
    // Status — ativa when `boot:` has at least one entry; otherwise bootavel.
    const bootedHere =
      Array.isArray(parsed.boot) && parsed.boot.length > 0;
    row.status = bootedHere ? messages.STATUS_ACTIVE : messages.STATUS_BOOTABLE;
    out.push(row);
  }
  return out;
}

function _padRight(s, w) {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}

// --- M8.6 — skill-check section -------------------------------------------
//
// For every cell under `.kaizen-dvir/celulas/{*}/`, the doctor checks whether
// the corresponding entry skill at `.claude/commands/<segments[0..n-2]>/<segments[n-1]>.md`
// exists. The path resolution mirrors `cell-registry.js` (M8.2):
//   slashPrefix "Kaizen:Yotzer" → entry  Kaizen/Yotzer.md
//                                 specialists Kaizen/Yotzer/<agent>.md
// Doctor is read-only (Story M8.6 Scope OUT, line 105) — never writes,
// renames, or deletes anything under `.claude/commands/`.
//
// The section reports three outcomes per cell:
//   - OK     entry skill present → "OK: {cellName} -> /{slashPrefix}"
//   - AVISO  entry skill missing → "AVISO: celula em {cellPath} sem skill
//                                  registrada em {expectedSkillPath}. Rode
//                                  'kaizen update' ou 'kaizen init' para
//                                  registrar."
//   - AVISO  manifest unreadable  → "AVISO: celula em {cellPath} com
//                                  manifesto invalido ({reason}). Skill
//                                  check ignorado."
//
// Plus a separate orphan scan: top-level `.md` files under
// `.claude/commands/Kaizen/` whose basename does not match any installed
// cell's expected entry filename. Reported as:
//   - AVISO  orphan skill        → "AVISO: skill orfa em {orphanPath} sem
//                                  celula correspondente. Remova o arquivo
//                                  ou registre a celula."
//
// Specialist sub-skill drift detection — REMOVED in v1.7.0 ("1 cell = 1
// slash command" contract). Under the new rule, specialists are loaded
// internally by the chief from `<cellRoot>/agents/<id>.md` (engine layer)
// and never get their own `.md` files under `.claude/commands/`. The
// previous per-specialist AVISO loop was producing false-positive warnings
// for every declared specialist on every install, since those files are
// no longer expected to exist. Doctor still validates declared agents at
// the engine layer and still warns when the ENTRY skill is missing — the
// only structural slash file under the new contract.
//
// Exit code is unchanged — WARN lines do not flip status (M2/M3 doctor
// semantics preserved).

function _claudeCommandsDir() {
  if (process.env.KAIZEN_CLAUDE_COMMANDS_DIR) {
    return process.env.KAIZEN_CLAUDE_COMMANDS_DIR;
  }
  return path.join(PROJECT_ROOT, '.claude', 'commands');
}

/**
 * Read raw `slashPrefix` from a cell manifest using the M2.5 schema-gate
 * parser. Returns `null` when the manifest is unreadable or malformed.
 *
 * @param {string} manifestPath
 * @param {function} parseYaml
 * @returns {{ slashPrefix: string|null, error: string|null, parsed: object|null }}
 */
function _readManifestForSkillCheck(manifestPath, parseYaml) {
  if (!fs.existsSync(manifestPath)) {
    return { slashPrefix: null, error: 'celula.yaml ausente.', parsed: null };
  }
  let raw;
  try {
    raw = fs.readFileSync(manifestPath, 'utf8');
  } catch (err) {
    return {
      slashPrefix: null,
      error: 'falha ao ler manifesto: ' + (err && err.message ? err.message : String(err)),
      parsed: null,
    };
  }
  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    return {
      slashPrefix: null,
      error: err && err.message ? err.message : String(err),
      parsed: null,
    };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { slashPrefix: null, error: 'manifesto nao e objeto.', parsed: null };
  }
  const sp = parsed.slashPrefix;
  if (typeof sp !== 'string' || sp.length === 0) {
    return {
      slashPrefix: null,
      error: 'campo slashPrefix ausente ou vazio.',
      parsed: parsed,
    };
  }
  return { slashPrefix: sp, error: null, parsed: parsed };
}

/**
 * Split a slashPrefix string ("Kaizen:Yotzer") into path segments
 * (["Kaizen","Yotzer"]) using the same split rule as cell-registry.js.
 * Returns null when the prefix is structurally invalid (leading/trailing
 * colon, empty segment).
 *
 * @param {string} slashPrefix
 * @returns {string[]|null}
 */
function _slashPrefixSegments(slashPrefix) {
  if (
    typeof slashPrefix !== 'string' ||
    slashPrefix.length === 0 ||
    slashPrefix.startsWith(':') ||
    slashPrefix.endsWith(':') ||
    slashPrefix.indexOf('::') !== -1
  ) {
    return null;
  }
  const segs = slashPrefix.split(':');
  for (const s of segs) {
    if (s.length === 0) return null;
  }
  return segs;
}

/**
 * Collect declared specialist agent ids from a parsed manifest's tiers.
 * Iterates `tiers.tier_*` (any key under `tiers`) and concatenates the
 * `agents[]` arrays in declaration order. Returns an empty array when no
 * tiers/agents are declared (specialist-check is skipped for that cell).
 *
 * @param {object} manifest
 * @returns {string[]}
 */
function _collectDeclaredAgents(manifest) {
  const out = [];
  const seen = new Set();
  const tiers = manifest && manifest.tiers;
  if (!tiers || typeof tiers !== 'object' || Array.isArray(tiers)) return out;
  for (const tierKey of Object.keys(tiers)) {
    const tier = tiers[tierKey];
    if (!tier || typeof tier !== 'object') continue;
    const agents = tier.agents;
    if (!Array.isArray(agents)) continue;
    for (const a of agents) {
      if (typeof a !== 'string' || a.length === 0) continue;
      if (seen.has(a)) continue;
      seen.add(a);
      out.push(a);
    }
  }
  return out;
}

function _relPath(abs) {
  // Render paths relative to PROJECT_ROOT for readability when they sit
  // inside the project tree; fall back to the absolute path otherwise.
  const rel = path.relative(PROJECT_ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return abs;
  return rel.split(path.sep).join('/');
}

/**
 * Build per-cell skill-check rows.
 *
 * @returns {Array<{
 *   name: string,
 *   cellPath: string,
 *   manifestError: string|null,
 *   slashPrefix: string|null,
 *   entrySkillPath: string|null,
 *   entryPresent: boolean,
 *   specialists: Array<{ agentId: string, skillPath: string, present: boolean }>,
 * }>}
 */
function listCellSkillStatuses() {
  const root = _celulasRoot();
  const commandsDir = _claudeCommandsDir();
  const out = [];
  if (!fs.existsSync(root)) return out;

  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return out;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  let parseYaml = null;
  try {
    parseYaml = _loadParser();
  } catch (_) {
    parseYaml = null;
  }

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const cellDir = path.join(root, ent.name);
    const manifestPath = path.join(cellDir, 'celula.yaml');
    const row = {
      name: ent.name,
      cellPath: cellDir,
      manifestError: null,
      slashPrefix: null,
      entrySkillPath: null,
      entryPresent: false,
      specialists: [],
    };
    if (!parseYaml) {
      row.manifestError = 'parser indisponivel.';
      out.push(row);
      continue;
    }
    const m = _readManifestForSkillCheck(manifestPath, parseYaml);
    if (m.error) {
      row.manifestError = m.error;
      out.push(row);
      continue;
    }
    const segs = _slashPrefixSegments(m.slashPrefix);
    if (!segs) {
      row.manifestError =
        "slashPrefix '" + m.slashPrefix + "' invalido (segmentos vazios ou ':' inicial/final).";
      out.push(row);
      continue;
    }
    row.slashPrefix = m.slashPrefix;
    const lastSeg = segs[segs.length - 1];
    const folderSegs = segs.slice(0, -1);
    const entryPath = path.join(commandsDir, ...folderSegs, lastSeg + '.md');
    row.entrySkillPath = entryPath;
    row.entryPresent = fs.existsSync(entryPath);

    // Specialist sub-skills — only meaningful when entry is present.
    const declared = _collectDeclaredAgents(m.parsed);
    const specialistsDir = path.join(commandsDir, ...segs);
    for (const agentId of declared) {
      const spath = path.join(specialistsDir, agentId + '.md');
      row.specialists.push({
        agentId: agentId,
        skillPath: spath,
        present: fs.existsSync(spath),
      });
    }
    out.push(row);
  }
  return out;
}

/**
 * List orphan top-level entry skills under `<commandsDir>/Kaizen/` — i.e.,
 * `.md` files whose basename (without `.md`) does not match the last
 * segment of any installed cell's slashPrefix that lives under the same
 * folder.
 *
 * Scope: the orphan scan walks ONLY the `Kaizen/` folder (the canonical
 * KaiZen namespace). Files under nested specialist folders are not scanned
 * here — specialist drift is reported per-cell in `listCellSkillStatuses`.
 *
 * @param {Array<{slashPrefix:string|null}>} statuses — rows from
 *   `listCellSkillStatuses()` (used to compute the expected entry-name set).
 * @returns {string[]} absolute paths of orphan files (sorted).
 */
function listOrphanEntrySkills(statuses) {
  const commandsDir = _claudeCommandsDir();
  const kaizenDir = path.join(commandsDir, 'Kaizen');
  if (!fs.existsSync(kaizenDir)) return [];

  // Build the expected set: for every cell whose slashPrefix splits as
  // ["Kaizen", X, ...], the entry filename is X + '.md' under Kaizen/.
  // Cells outside the Kaizen/ namespace are not scanned for orphans here.
  const expected = new Set();
  for (const row of statuses) {
    if (!row.slashPrefix) continue;
    const segs = _slashPrefixSegments(row.slashPrefix);
    if (!segs || segs.length < 2) continue;
    if (segs[0] !== 'Kaizen') continue;
    expected.add(segs[1] + '.md');
  }

  let dirEntries;
  try {
    dirEntries = fs.readdirSync(kaizenDir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const orphans = [];
  for (const ent of dirEntries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.md')) continue;
    if (expected.has(ent.name)) continue;
    orphans.push(path.join(kaizenDir, ent.name));
  }
  orphans.sort();
  return orphans;
}

function _renderSkillCheckSection() {
  const lines = [];
  lines.push('Skills Claude Code:');
  const statuses = listCellSkillStatuses();
  if (statuses.length === 0) {
    lines.push('  nenhuma celula instalada.');
    lines.push('');
    return lines;
  }

  for (const row of statuses) {
    if (row.manifestError) {
      lines.push(
        '  AVISO: celula em ' +
          _relPath(row.cellPath) +
          ' com manifesto invalido (' +
          row.manifestError +
          '). Skill check ignorado.'
      );
      continue;
    }
    if (!row.entryPresent) {
      lines.push(
        '  AVISO: celula em ' +
          _relPath(row.cellPath) +
          ' sem skill registrada em ' +
          _relPath(row.entrySkillPath) +
          ". Rode 'kaizen update' ou 'kaizen init' para registrar."
      );
      continue;
    }
    lines.push('  OK: ' + row.name + ' -> /' + row.slashPrefix);

    // Specialist sub-skill drift loop REMOVED in v1.7.0.
    // Under the "1 cell = 1 slash command" contract, specialists do not
    // have their own slash files — they are loaded internally by the chief
    // from <cellRoot>/agents/<id>.md (engine layer). Iterating declared
    // specialists here would emit false-positive AVISO lines for every
    // install. The `row.specialists[]` array is still populated by
    // `listCellSkillStatuses()` for backward-compat / structured callers,
    // but no longer surfaces in the rendered report.
  }

  // Orphan scan — separate sub-section.
  const orphans = listOrphanEntrySkills(statuses);
  for (const orphan of orphans) {
    lines.push(
      '  AVISO: skill orfa em ' +
        _relPath(orphan) +
        ' sem celula correspondente. Remova o arquivo ou registre a celula.'
    );
  }

  lines.push('');
  return lines;
}

/**
 * Render the `--cells` report. Returns a string ending with `\n`.
 *
 * @returns {string}
 */
function render() {
  const lines = [];
  lines.push(messages.HEADER_CELLS);
  const cells = listCells();
  if (cells.length === 0) {
    lines.push(messages.EMPTY_CELLS);
  } else {
    for (const c of cells) {
      const name = _padRight(c.name, 20);
      const ver = _padRight(c.version, 10);
      lines.push('  ' + name + ' ' + ver + ' ' + c.status);
      if (c.status === messages.STATUS_ERROR && c.reason) {
        lines.push('    motivo: ' + c.reason);
      }
    }
  }
  lines.push('');

  // M8.6 — skill-check section appended after the existing cells report.
  const skillLines = _renderSkillCheckSection();
  for (const l of skillLines) {
    lines.push(l);
  }

  return lines.join('\n') + '\n';
}

module.exports = {
  render: render,
  listCells: listCells,
  listCellSkillStatuses: listCellSkillStatuses,
  listOrphanEntrySkills: listOrphanEntrySkills,
};
