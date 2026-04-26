'use strict';

/**
 * dvir/cell-registry.js — generic cell-to-skill registrar.
 *
 * STATUS: M8.2 implementation. Real callers land in M8.3 (init), M8.4
 * (update) and M8.5 (publisher). Helper is pure: reads `celula.yaml`,
 * writes `.md` files under `.claude/commands/`. No side effects beyond
 * the target directory tree.
 *
 * Story:  M8.2 — Implement registerCellSkills() helper in cell-registry.js
 * Epic:   KZ-M8 — Yotzer Activation Bridge
 * Risk mitigated: KZ-M8-R1 (do not invent the .claude/commands spec)
 * Commandment: III — No Invention. Every external claim cited in M8.1 JSDoc.
 *
 * The full slash-skill spec research preamble lived inline in the M8.1 stub
 * (Parts A-D). It has been condensed here into a contract block for callers;
 * full sources remain in the M8.1 commit (cd1c575) and in the
 * `docs/kaizen/stories/M8/M8.1.research-slash-skill-spec.md` story.
 *
 * =============================================================================
 *  CONTRACT (frozen by M8.1, implemented by M8.2)
 * =============================================================================
 *
 *  Path resolution
 *  ---------------
 *  slashPrefix         folder path under .claude/commands/
 *  -----------         ----------------------------------
 *  Kaizen              Kaizen.md                                (entry)
 *  Kaizen:Yotzer       Kaizen/Yotzer.md                         (entry)
 *  Kaizen:Yotzer       Kaizen/Yotzer/{specialist-id}.md         (specialists)
 *
 *  Frontmatter (per skill file)
 *  ----------------------------
 *  ---
 *  description: <pt-BR description, <=1536 chars>
 *  ---
 *
 *  `disable-model-invocation` is intentionally OMITTED — both expert and
 *  Claude can enter the skill. `allowed-tools` is also omitted so Claude
 *  inherits session permissions (D.3 in M8.1 — recommended default).
 *
 *  Body (entry skill)
 *  ------------------
 *   1. One-paragraph pt-BR identification of the cell.
 *   2. Instruction to load the chief persona by REFERENCE from
 *      `<cellRoot>/agents/<chief-id>.md` — single-source persona.
 *   3. Slash-vs-shell distinction line in pt-BR (D-v1.5-06):
 *      "Para invocacao programatica via terminal, use `kaizen <slashPrefix>
 *      publish|resume|validate <work-id>` — distinto desta skill interativa."
 *
 *  Body (specialist skill)
 *  -----------------------
 *   1. One-paragraph pt-BR identification of the specialist.
 *   2. Instruction to load the specialist persona by REFERENCE from
 *      `<cellRoot>/agents/<agent-id>.md`.
 *   3. Note the parent cell.
 *
 *  Idempotency
 *  -----------
 *  Before writing each `.md` file the helper compares the desired content to
 *  the on-disk content (byte-equal). Identical content => no write. Caller can
 *  run the helper repeatedly without filesystem churn.
 *
 *  Orphan handling (D.5 — WARN-only)
 *  ---------------------------------
 *  If `<claudeCommandsDir>/<segments...>/<lastSegment>/` already contains
 *  `.md` files that the current run did NOT produce, the helper emits a
 *  pt-BR warning per orphan. Files are NEVER deleted: experts may have
 *  customized a skill body locally and auto-deletion would silently destroy
 *  that work. M8.6 doctor surfaces orphans; M8.4 update preserves them.
 *
 *  Errors
 *  ------
 *  Hard failure (throws Error with pt-BR message) when:
 *    - `cellRoot/celula.yaml` missing or fails to parse.
 *    - `slashPrefix` missing, empty, or contains forbidden characters.
 *    - `tiers` missing or contains no agents at all.
 *    - chief persona file missing for the entry skill.
 *    - tier_1 has more than one agent and none is flagged `chief: true` and
 *      no tier-level `chief: true` flag is set (ambiguous chief).
 *
 *  Soft failure (warning entry, no throw) when:
 *    - A non-chief agent referenced by `tiers` has no persona file on disk.
 *    - An orphan `.md` file lives under the cell folder.
 *
 *  Constraints
 *  -----------
 *  - Stdlib only (CON-003): `fs`, `path` and the existing
 *    `.kaizen-dvir/dvir/gates/schema-gate.js` `_parseYaml` helper for YAML
 *    parsing (the same parser cells-reporter uses for celula.yaml).
 *  - CommonJS, ES2022 (CON-002).
 *  - L1 module — does NOT write to L2 (`celulas/`); only reads.
 *  - Writes only to L3 path `<claudeCommandsDir>` (project's `.claude/commands/`).
 *
 *  Return shape (durable contract — shared by M8.3, M8.4, M8.5)
 *  ------------------------------------------------------------
 *    { entryWritten: boolean,
 *      specialistsWritten: string[],
 *      warnings: string[] }
 *
 * =============================================================================
 *
 * @module dvir/cell-registry
 * @author @architect (Aria) — story M8.1 (spec)
 * @author @dev — story M8.2 (implementation)
 * @since KaiZen v1.5.0
 */

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_GATE_PATH = path.join(__dirname, 'gates', 'schema-gate.js');

// Description hard cap from Claude Code Skills frontmatter spec.
// [Source: https://code.claude.com/docs/en/skills, fetched 2026-04-25]
const DESCRIPTION_MAX = 1536;

// Allowed characters per slashPrefix segment (between `:` separators).
// [Source: M8.1 § A.4 — Case sensitivity and platform notes]
const RE_SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;

// Allowed characters for an agent id (filename stem on disk).
// [Source: Claude Code Skills `name` constraint, M8.1 § A.1]
const RE_SAFE_AGENT_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Register a cell's slash skills under a `.claude/commands/` directory.
 *
 * Reads `<cellRoot>/celula.yaml`, resolves the slashPrefix path, identifies
 * the chief agent in tier_1, writes one entry skill plus one specialist skill
 * per agent (chief included, enabling direct re-activation as
 * `/<slashPrefix>:<chief-id>`).
 *
 * @param {string} cellRoot
 *   Absolute path to the cell directory containing `celula.yaml`. Must exist.
 *   Read-only — the helper never writes inside `cellRoot`.
 * @param {string} claudeCommandsDir
 *   Absolute path to the project's `.claude/commands` directory. Helper
 *   creates the directory tree if missing.
 *
 * @returns {{
 *   entryWritten: boolean,
 *   specialistsWritten: string[],
 *   warnings: string[],
 * }}
 *   - `entryWritten`: true when the entry skill is on disk with the desired
 *     content (whether newly written or already up-to-date). False only when
 *     the helper aborted before writing.
 *   - `specialistsWritten`: ordered list of specialist agent ids whose `.md`
 *     was written or already up-to-date. Order follows the manifest tier
 *     order (tier_1, tier_2, tier_3 ...).
 *   - `warnings`: pt-BR strings describing non-fatal issues (missing
 *     non-chief persona files, orphan `.md` files left intact).
 *
 * @throws {Error} pt-BR error message when the manifest is malformed or
 *   the chief persona is missing.
 */
function registerCellSkills(cellRoot, claudeCommandsDir) {
  if (typeof cellRoot !== 'string' || cellRoot.length === 0) {
    throw new Error(
      'cell-registry: parametro cellRoot obrigatorio (string nao vazia).'
    );
  }
  if (typeof claudeCommandsDir !== 'string' || claudeCommandsDir.length === 0) {
    throw new Error(
      'cell-registry: parametro claudeCommandsDir obrigatorio (string nao vazia).'
    );
  }

  const manifest = _loadManifest(cellRoot);
  const slashPrefix = _readSlashPrefix(manifest, cellRoot);
  const segments = _slashPrefixToSegments(slashPrefix, cellRoot);
  const cellName = typeof manifest.name === 'string' && manifest.name.length > 0
    ? manifest.name
    : segments[segments.length - 1];
  const cellDescription =
    typeof manifest.description === 'string' && manifest.description.length > 0
      ? manifest.description
      : 'Celula KaiZen ' + cellName + '.';

  const tierAgents = _collectTierAgents(manifest, cellRoot);
  const chiefId = _resolveChiefId(manifest, tierAgents, cellRoot);

  const warnings = [];

  // --------------------------------------------------------------------------
  //  Entry skill
  // --------------------------------------------------------------------------
  const lastSegment = segments[segments.length - 1];
  const folderSegments = segments.slice(0, -1);
  const entryDir = path.join(claudeCommandsDir, ...folderSegments);
  const entryPath = path.join(entryDir, lastSegment + '.md');
  const specialistsDir = path.join(claudeCommandsDir, ...segments);

  // Chief persona file existence is a HARD requirement — without it the
  // entry skill cannot reference a real persona.
  const chiefPersonaAbs = path.join(cellRoot, 'agents', chiefId + '.md');
  if (!fs.existsSync(chiefPersonaAbs)) {
    throw new Error(
      'cell-registry: arquivo de persona do chief ausente em ' +
        _relativizeForMsg(chiefPersonaAbs) +
        ". Esperado para celula '" +
        cellName +
        "' (slashPrefix '" +
        slashPrefix +
        "')."
    );
  }

  const entryContent = _renderEntrySkill({
    slashPrefix,
    cellName,
    cellDescription,
    chiefId,
    cellRoot,
  });
  fs.mkdirSync(entryDir, { recursive: true });
  _writeIfChanged(entryPath, entryContent);

  // --------------------------------------------------------------------------
  //  Specialist skills (chief included so /<prefix>:<chief-id> works)
  // --------------------------------------------------------------------------
  fs.mkdirSync(specialistsDir, { recursive: true });

  // Build the ordered list: chief first (so it lands at the top of the
  // specialists folder), then the remaining tier_1 agents (none expected in
  // the Yotzer fixture, but the contract supports multi-tier_1 cells), then
  // tier_2, tier_3, ... in declared order. Each id appears at most once.
  const orderedAgentIds = _orderedAgentIds(tierAgents, chiefId);

  const specialistsWritten = [];
  for (const agentId of orderedAgentIds) {
    if (!RE_SAFE_AGENT_ID.test(agentId)) {
      throw new Error(
        "cell-registry: id de agente invalido '" +
          agentId +
          "' em celula '" +
          cellName +
          "'. Permitido apenas [a-z0-9-] iniciando com letra ou digito."
      );
    }
    const personaAbs = path.join(cellRoot, 'agents', agentId + '.md');
    if (!fs.existsSync(personaAbs)) {
      // Soft failure for non-chief specialists.
      warnings.push(
        'Persona do especialista ausente em ' +
          _relativizeForMsg(personaAbs) +
          " para a celula '" +
          cellName +
          "'. Skill gerada referencia o arquivo mesmo assim; crie ou remova o agente do manifesto."
      );
    }
    const specialistPath = path.join(specialistsDir, agentId + '.md');
    const specialistContent = _renderSpecialistSkill({
      slashPrefix,
      cellName,
      cellRoot,
      agentId,
      isChief: agentId === chiefId,
    });
    _writeIfChanged(specialistPath, specialistContent);
    specialistsWritten.push(agentId);
  }

  // --------------------------------------------------------------------------
  //  Orphan detection (WARN-only — never delete; D.5)
  // --------------------------------------------------------------------------
  const expectedFiles = new Set(orderedAgentIds.map((id) => id + '.md'));
  let dirEntries = [];
  try {
    dirEntries = fs.readdirSync(specialistsDir, { withFileTypes: true });
  } catch (_) {
    dirEntries = [];
  }
  for (const ent of dirEntries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.md')) continue;
    if (expectedFiles.has(ent.name)) continue;
    warnings.push(
      "Skill orfa detectada em " +
        _relativizeForMsg(path.join(specialistsDir, ent.name)) +
        ". Nao foi gerada por esta execucao. Arquivo preservado (politica WARN-only); remova manualmente se nao for mais usado."
    );
  }

  return {
    entryWritten: true,
    specialistsWritten,
    warnings,
  };
}

// ---------------------------------------------------------------------------
//  Internals
// ---------------------------------------------------------------------------

function _loadManifest(cellRoot) {
  const manifestPath = path.join(cellRoot, 'celula.yaml');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'cell-registry: manifesto celula.yaml ausente em ' +
        _relativizeForMsg(manifestPath) +
        '. O cellRoot informado nao e uma celula KaiZen valida.'
    );
  }
  let raw;
  try {
    raw = fs.readFileSync(manifestPath, 'utf8');
  } catch (err) {
    throw new Error(
      'cell-registry: falha ao ler ' +
        _relativizeForMsg(manifestPath) +
        ': ' +
        ((err && err.message) || String(err))
    );
  }
  const parseYaml = _loadYamlParser();
  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(
      'cell-registry: erro de parse em ' +
        _relativizeForMsg(manifestPath) +
        ': ' +
        ((err && err.message) || String(err))
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'cell-registry: manifesto ' +
        _relativizeForMsg(manifestPath) +
        ' nao e um mapeamento YAML valido.'
    );
  }
  return parsed;
}

function _loadYamlParser() {
  // Reuse the strict subset parser already shipped in schema-gate.js. The
  // same parser is used by cells-reporter.js for celula.yaml today, so
  // behavior stays consistent across the framework. Stdlib only (CON-003).
  // eslint-disable-next-line global-require
  return require(SCHEMA_GATE_PATH)._parseYaml;
}

function _readSlashPrefix(manifest, cellRoot) {
  const sp = manifest.slashPrefix;
  if (typeof sp !== 'string' || sp.length === 0) {
    throw new Error(
      'cell-registry: campo slashPrefix obrigatorio ausente ou vazio no manifesto da celula em ' +
        _relativizeForMsg(cellRoot) +
        '. Exemplo valido: \'slashPrefix: "Kaizen:Yotzer"\'.'
    );
  }
  return sp;
}

function _slashPrefixToSegments(slashPrefix, cellRoot) {
  if (slashPrefix.startsWith(':') || slashPrefix.endsWith(':')) {
    throw new Error(
      "cell-registry: slashPrefix '" +
        slashPrefix +
        "' invalido na celula em " +
        _relativizeForMsg(cellRoot) +
        ". Nao pode comecar nem terminar com ':'."
    );
  }
  if (slashPrefix.indexOf('::') !== -1) {
    throw new Error(
      "cell-registry: slashPrefix '" +
        slashPrefix +
        "' invalido na celula em " +
        _relativizeForMsg(cellRoot) +
        ". Sequencia '::' nao e permitida."
    );
  }
  const segments = slashPrefix.split(':');
  for (const seg of segments) {
    if (!RE_SAFE_SEGMENT.test(seg)) {
      throw new Error(
        "cell-registry: segmento invalido '" +
          seg +
          "' em slashPrefix '" +
          slashPrefix +
          "' (celula em " +
          _relativizeForMsg(cellRoot) +
          '). Use apenas [A-Za-z0-9_-] em cada segmento.'
      );
    }
  }
  return segments;
}

/**
 * Walk `manifest.tiers.*` in declared order. Each tier yields:
 *   { tierName, chiefFlag: boolean, agents: string[] }
 * Throws when no agents are declared at all.
 *
 * The Yotzer manifest declares agents as plain strings:
 *   tier_1: { chief: true, agents: [ "chief" ] }
 *   tier_2: { agents: [ "archaeologist" ] }
 *   tier_3: { agents: [ "stress-tester", ... ] }
 * Object-form agents (with explicit per-agent `chief: true`) are also
 * accepted to keep the helper forward-compatible.
 */
function _collectTierAgents(manifest, cellRoot) {
  if (!manifest.tiers || typeof manifest.tiers !== 'object' || Array.isArray(manifest.tiers)) {
    throw new Error(
      'cell-registry: campo tiers obrigatorio ausente ou invalido no manifesto da celula em ' +
        _relativizeForMsg(cellRoot) +
        ". Esperado mapeamento (ex: 'tiers:\\n  tier_1:\\n    agents: [\"chief\"]')."
    );
  }
  const out = [];
  let totalAgents = 0;
  for (const tierName of Object.keys(manifest.tiers)) {
    const tier = manifest.tiers[tierName];
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
      throw new Error(
        "cell-registry: tier '" +
          tierName +
          "' no manifesto da celula em " +
          _relativizeForMsg(cellRoot) +
          ' deve ser um mapeamento.'
      );
    }
    const chiefFlag = tier.chief === true;
    const rawAgents = tier.agents;
    if (!Array.isArray(rawAgents)) {
      throw new Error(
        "cell-registry: campo agents ausente ou invalido em tier '" +
          tierName +
          "' (celula em " +
          _relativizeForMsg(cellRoot) +
          '). Esperado lista de ids de agentes.'
      );
    }
    const ids = [];
    for (const item of rawAgents) {
      let id = null;
      let perAgentChief = false;
      if (typeof item === 'string') {
        id = item;
      } else if (item && typeof item === 'object') {
        if (typeof item.id === 'string') id = item.id;
        if (item.chief === true) perAgentChief = true;
      }
      if (typeof id !== 'string' || id.length === 0) {
        throw new Error(
          "cell-registry: agente invalido em tier '" +
            tierName +
            "' (celula em " +
            _relativizeForMsg(cellRoot) +
            "). Cada item deve ser uma string id ou um mapeamento com 'id'."
        );
      }
      ids.push({ id, chief: perAgentChief });
    }
    out.push({ tierName, chiefFlag, agents: ids });
    totalAgents += ids.length;
  }
  if (totalAgents === 0) {
    throw new Error(
      'cell-registry: nenhum agente declarado em tiers do manifesto da celula em ' +
        _relativizeForMsg(cellRoot) +
        '. Adicione ao menos um agente em tier_1.'
    );
  }
  return out;
}

/**
 * Resolve the chief agent id. Resolution order (matches user prompt + story):
 *   1. Search ALL tiers for a per-agent `chief: true` flag (any tier wins).
 *   2. If exactly one tier has tier-level `chief: true` AND that tier has
 *      exactly one agent → that agent.
 *   3. If exactly one tier has tier-level `chief: true` AND that tier has
 *      multiple agents → first agent of that tier (with no per-agent flag,
 *      tier-level flag implies tier_1[0]).
 *   4. Fallback: first agent of the FIRST tier in declaration order.
 *
 * Throws when:
 *   - Two or more agents are flagged `chief: true` at the per-agent level
 *     (ambiguous chief).
 */
function _resolveChiefId(manifest, tierAgents, cellRoot) {
  // (1) per-agent chief flag — strongest signal.
  const perAgentChiefs = [];
  for (const tier of tierAgents) {
    for (const a of tier.agents) {
      if (a.chief) perAgentChiefs.push(a.id);
    }
  }
  if (perAgentChiefs.length > 1) {
    throw new Error(
      "cell-registry: mais de um agente flagado com 'chief: true' no manifesto da celula em " +
        _relativizeForMsg(cellRoot) +
        ' (' +
        perAgentChiefs.join(', ') +
        '). Apenas um agente pode ser chief.'
    );
  }
  if (perAgentChiefs.length === 1) return perAgentChiefs[0];

  // (2)/(3) tier-level chief flag.
  const chiefTiers = tierAgents.filter((t) => t.chiefFlag);
  if (chiefTiers.length > 1) {
    throw new Error(
      "cell-registry: mais de um tier flagado com 'chief: true' no manifesto da celula em " +
        _relativizeForMsg(cellRoot) +
        ' (' +
        chiefTiers.map((t) => t.tierName).join(', ') +
        '). Apenas um tier pode ser o tier do chief.'
    );
  }
  if (chiefTiers.length === 1) {
    return chiefTiers[0].agents[0].id;
  }

  // (4) Fallback: first agent of the first declared tier.
  return tierAgents[0].agents[0].id;
}

function _orderedAgentIds(tierAgents, chiefId) {
  const seen = new Set();
  const out = [];
  if (chiefId) {
    out.push(chiefId);
    seen.add(chiefId);
  }
  for (const tier of tierAgents) {
    for (const a of tier.agents) {
      if (seen.has(a.id)) continue;
      out.push(a.id);
      seen.add(a.id);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
//  Skill body templates
// ---------------------------------------------------------------------------

function _renderEntrySkill({
  slashPrefix,
  cellName,
  cellDescription,
  chiefId,
  cellRoot,
}) {
  const description = _buildEntryDescription(cellName, cellDescription);
  const personaRel = _personaRelPath(cellRoot, chiefId);
  const lines = [];
  lines.push('---');
  lines.push('description: ' + _yamlScalar(description));
  lines.push('---');
  lines.push('');
  lines.push('# /' + slashPrefix);
  lines.push('');
  lines.push(
    'Esta skill ativa a celula **' +
      cellName +
      '** do KaiZen. ' +
      cellDescription
  );
  lines.push('');
  lines.push(
    'Para invocacao programatica via terminal, use `kaizen ' +
      slashPrefix +
      ' publish|resume|validate <work-id>` — distinto desta skill interativa.'
  );
  lines.push('');
  lines.push('## Ativacao');
  lines.push('');
  lines.push(
    'Carregue a persona do chief desta celula a partir do arquivo abaixo e siga as instrucoes de ativacao declaradas la. Nao reescreva a persona — leia o arquivo e adote-a integralmente.'
  );
  lines.push('');
  lines.push('Persona do chief: `' + personaRel + '`');
  lines.push('');
  lines.push(
    'Ao terminar a leitura, apresente o greeting do chief e aguarde a primeira instrucao do expert.'
  );
  lines.push('');
  lines.push('## Especialistas');
  lines.push('');
  lines.push(
    'Os demais agentes da celula estao disponiveis como sub-skills em `/' +
      slashPrefix +
      ':<agent-id>` para reativacao direta.'
  );
  lines.push('');
  return lines.join('\n');
}

function _renderSpecialistSkill({
  slashPrefix,
  cellName,
  cellRoot,
  agentId,
  isChief,
}) {
  const description = _buildSpecialistDescription(cellName, agentId, isChief);
  const personaRel = _personaRelPath(cellRoot, agentId);
  const lines = [];
  lines.push('---');
  lines.push('description: ' + _yamlScalar(description));
  lines.push('---');
  lines.push('');
  lines.push('# /' + slashPrefix + ':' + agentId);
  lines.push('');
  if (isChief) {
    lines.push(
      'Reativa o **chief** (' +
        agentId +
        ') da celula **' +
        cellName +
        '**. Use esta skill para retomar a coordenacao apos uma troca de contexto.'
    );
  } else {
    lines.push(
      'Ativa o especialista **' +
        agentId +
        '** da celula **' +
        cellName +
        '** para execucao focada da fase correspondente.'
    );
  }
  lines.push('');
  lines.push('## Ativacao');
  lines.push('');
  lines.push(
    'Carregue a persona do especialista a partir do arquivo abaixo e siga as instrucoes de ativacao declaradas la. Nao reescreva a persona — leia o arquivo e adote-a integralmente.'
  );
  lines.push('');
  lines.push('Persona: `' + personaRel + '`');
  lines.push('');
  lines.push(
    'Esta skill pertence a celula **' +
      cellName +
      '** (entrada principal: `/' +
      slashPrefix +
      '`).'
  );
  lines.push('');
  return lines.join('\n');
}

function _buildEntryDescription(cellName, cellDescription) {
  const base =
    'Ativa a celula ' + cellName + ' do KaiZen no modo interativo. ' + cellDescription;
  return _truncateForFrontmatter(base);
}

function _buildSpecialistDescription(cellName, agentId, isChief) {
  const role = isChief
    ? 'Reativa o chief (coordenador) da celula ' + cellName + '.'
    : 'Ativa o especialista ' + agentId + ' da celula ' + cellName + '.';
  return _truncateForFrontmatter(role);
}

function _truncateForFrontmatter(s) {
  if (s.length <= DESCRIPTION_MAX) return s;
  // Reserve 1 char for the truncation marker so the final string fits.
  return s.slice(0, DESCRIPTION_MAX - 1) + '…';
}

/**
 * Quote a single-line scalar for YAML frontmatter using double quotes when
 * the value contains characters that YAML implicit typing might otherwise
 * coerce. The strict parser at ../gates/schema-gate.js refuses ambiguous
 * implicit values, so when in doubt — quote.
 */
function _yamlScalar(s) {
  // Always quote with double quotes; escape backslash and double quote only.
  const escaped = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return '"' + escaped + '"';
}

function _personaRelPath(cellRoot, agentId) {
  // Render a forward-slash path for portability inside the markdown body.
  // Skill files may live outside the repo (e.g., installed under a project's
  // node_modules), so we use the absolute path normalized to forward slashes
  // — the body is informational, not consumed by tooling.
  const abs = path.join(cellRoot, 'agents', agentId + '.md');
  return abs.split(path.sep).join('/');
}

function _writeIfChanged(absPath, desiredContent) {
  let current = null;
  try {
    current = fs.readFileSync(absPath, 'utf8');
  } catch (_) {
    current = null;
  }
  if (current === desiredContent) return false;
  fs.writeFileSync(absPath, desiredContent, 'utf8');
  return true;
}

function _relativizeForMsg(absPath) {
  // Make error messages stable across machines: trim everything before the
  // last `.kaizen-dvir/` segment when present, otherwise return basename.
  const marker = '.kaizen-dvir';
  const idx = absPath.indexOf(marker);
  if (idx !== -1) return absPath.slice(idx).split(path.sep).join('/');
  return path.basename(absPath);
}

module.exports = { registerCellSkills };
