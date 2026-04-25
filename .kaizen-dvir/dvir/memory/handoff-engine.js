'use strict';

/**
 * handoff-engine.js — KaiZen M3.2 Handoff Protocol engine.
 *
 * Public contract (consumed by M3.4 Schema Gate, M3.5 integration gate, and
 * eventually M4 Yotzer's 9 sub-agents):
 *   - generate(fromAgent, toAgent, workContext, decisions, filesModified, blockers, nextAction)
 *       -> { artifact, yaml, tokenCount }
 *   - persist(artifact)              -> absolute path written
 *   - readLatest(toAgent)            -> { artifact, yaml, path } | null
 *   - listRetained()                 -> [ { path, mtimeMs, filename } ] (<= 3)
 *   - restore(artifactPath)          -> artifact object (validated)
 *
 * Storage layout (lazily created on first persist; .kaizen/ is gitignored —
 * CON-004):
 *   .kaizen/handoffs/handoff-{from}-to-{to}-{timestamp}.yaml
 *
 * Override for tests: KAIZEN_HANDOFFS_DIR (mirrors KAIZEN_LOGS_DIR pattern
 * established in M2.1 _helpers.js).
 *
 * Constraints honoured:
 *   - CON-002 CommonJS + ES2022
 *   - CON-003 Node.js stdlib only (fs, path) plus the local validator and
 *     token-counter modules
 *   - CON-004 .kaizen/ is gitignored — runtime, not version-controlled
 *   - FR-008  500-token ceiling enforced at generate() time
 *   - FR-034  pure-YAML persistence at the canonical filename pattern
 *   - NFR-011 disk-resident handoff trail; session loss does not erase context
 *   - R-010   over-budget rejection forces compact handoffs by design
 *   - R-015   YAML 1.2 strict mode — no implicit typing on read or write
 *
 * User-facing strings: pt-BR (D-v1.4-06 Language Policy). Internal JSDoc and
 * machine-instruction comments: EN.
 *
 * ----------------------------------------------------------------------------
 * AUTHORING CAVEAT — closed-loop YAML round-trip (M3.2 architect review)
 * ----------------------------------------------------------------------------
 * The YAML emitter (`_emitYaml` / `_yamlValue` / `_yamlQuoteString`) and the
 * hand-rolled parser (`_parseYaml` / `_classifyScalar` / `_parseMapping`) are
 * a PAIRED, CLOSED-LOOP system: the parser supports exactly the constructs
 * the emitter produces (block mappings, double-quoted scalars, inline `[]`/
 * `{}` empties, narrow inline lists for nested tier objects). Anchors,
 * multi-line scalars, complex flow sequences, and other YAML 1.2 features
 * outside the emitter's output set are NOT supported on `restore()`.
 *
 * Hand-edited handoff files are NOT a supported authoring path. Only
 * artifacts produced by `generate()` and persisted via `persist()` are
 * guaranteed to round-trip through `readLatest()` / `restore()`. Any future
 * external authoring (e.g. tooling that wants to inject a handoff) MUST go
 * through the public API — never write directly to
 * `.kaizen/handoffs/handoff-*.yaml` files.
 *
 * Schema validation on `restore()` is the second line of defense and will
 * surface a pt-BR error on structural drift, but R-015 ambiguous scalars
 * (bare `no`/`yes`/`on`/`off`/`true`/`false`) are caught at the parser
 * layer and rejected before schema validation runs.
 * ----------------------------------------------------------------------------
 */

const fs = require('node:fs');
const path = require('node:path');

const tokenCounter = require('./token-counter.js');
const validator = require('../schemas/validator.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCHEMA_PATH = path.resolve(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'dvir',
  'schemas',
  'handoff-schema.json'
);

const TOKEN_CEILING = 500;

const FILENAME_PREFIX = 'handoff-';
const FILENAME_INFIX = '-to-';
const FILENAME_SUFFIX = '.yaml';
// Temp file marker for atomic writes (M3.2-R2 mitigation).
const TEMP_MARKER = '.tmp-';

const RETENTION_LIMIT = 3;

// -- schema loading ---------------------------------------------------------

let _schemaCache = null;
function _loadSchema() {
  if (_schemaCache) return _schemaCache;
  _schemaCache = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return _schemaCache;
}

// -- handoffs dir resolution ------------------------------------------------

/**
 * Resolve `.kaizen/handoffs/`. Override via KAIZEN_HANDOFFS_DIR for tests
 * (mirrors KAIZEN_LOGS_DIR / KAIZEN_STATE_DIR conventions from M2).
 *
 * @returns {string}
 */
function _handoffsDir() {
  if (process.env.KAIZEN_HANDOFFS_DIR) return process.env.KAIZEN_HANDOFFS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'handoffs');
}

// -- agent-name sanitization ------------------------------------------------

const _SANITIZE_RE = /[^a-zA-Z0-9_-]/gu;

/**
 * Strip any character outside [A-Za-z0-9_-]. Prevents path-separator or
 * ambiguous shell characters from leaking into filenames (FR-034 + Windows
 * filesystem safety). Empty result rejected upstream.
 *
 * @param {string} name
 * @returns {string}
 */
function _sanitizeAgent(name) {
  if (typeof name !== 'string') return '';
  return name.replace(_SANITIZE_RE, '');
}

// -- timestamp formatting ---------------------------------------------------

/**
 * ISO-8601 with millisecond precision and `:` replaced by `-` for Windows
 * filesystem safety. Pure function over an injected Date for testability.
 *
 * @param {Date} d
 * @returns {string}
 */
function _filenameTimestamp(d) {
  return d.toISOString().replace(/:/gu, '-');
}

// -- YAML 1.2 strict-mode emitter -------------------------------------------
// Quotes every scalar string (no implicit-type leakage on re-parse).
// Numbers, booleans, and null have explicit, unambiguous representations.

function _yamlQuoteString(s) {
  const escaped = String(s)
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"')
    .replace(/\n/gu, '\\n')
    .replace(/\r/gu, '\\r')
    .replace(/\t/gu, '\\t');
  return '"' + escaped + '"';
}

function _yamlValue(value, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : _yamlQuoteString(String(value));
  }
  if (typeof value === 'string') return _yamlQuoteString(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = ' '.repeat(indent);
    const lines = [];
    for (const item of value) {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length === 0) {
          lines.push(pad + '- {}');
          continue;
        }
        const head = keys[0];
        lines.push(pad + '- ' + head + ': ' + _yamlValue(item[head], indent + 4));
        for (let i = 1; i < keys.length; i++) {
          const k = keys[i];
          lines.push(' '.repeat(indent + 2) + k + ': ' + _yamlValue(item[k], indent + 4));
        }
      } else {
        lines.push(pad + '- ' + _yamlValue(item, indent + 2));
      }
    }
    return '\n' + lines.join('\n');
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const pad = ' '.repeat(indent);
    const lines = [];
    for (const k of keys) {
      lines.push(pad + k + ': ' + _yamlValue(value[k], indent + 2));
    }
    return '\n' + lines.join('\n');
  }
  return _yamlQuoteString(String(value));
}

/**
 * Emit the YAML document for the handoff envelope.
 * @param {object} artifact { handoff: {...} }
 * @returns {string}
 */
function _emitYaml(artifact) {
  const keys = Object.keys(artifact);
  const lines = [];
  for (const k of keys) {
    lines.push(k + ': ' + _yamlValue(artifact[k], 2));
  }
  return lines.join('\n') + '\n';
}

// -- YAML 1.2 strict-mode parser --------------------------------------------
// Hand-rolled parser narrowly tuned for the handoff envelope shape. Refuses
// implicit typing: any unquoted scalar that matches the YAML 1.1 reserved
// boolean set (`yes`, `no`, `on`, `off`, `true`, `false`) or that LOOKS LIKE
// a number but is found at a position where the schema expects a string is
// rejected as ambiguous. Quoted strings (double or single) always pass.

const _IMPLICIT_BOOL_RE = /^(yes|no|on|off|true|false)$/iu;
const _NUMERIC_RE = /^-?(?:\d+(?:\.\d+)?)$/u;

/**
 * Tokenize a YAML scalar value at the right of `key:` (the trailing portion
 * of a mapping line) into { kind, value } where kind ∈ {'string', 'number',
 * 'boolean', 'null', 'inline-empty', 'block-marker', 'ambiguous'}.
 *
 * @param {string} raw the substring AFTER the colon and a single space
 * @returns {{kind: string, value: any}}
 */
function _classifyScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'block-marker', value: null };
  if (trimmed === 'null') return { kind: 'null', value: null };
  if (trimmed === '[]') return { kind: 'inline-empty', value: [] };
  if (trimmed === '{}') return { kind: 'inline-empty', value: {} };

  // Quoted strings — always strings.
  if (trimmed.startsWith('"')) {
    if (!trimmed.endsWith('"') || trimmed.length < 2) {
      return { kind: 'ambiguous', value: trimmed, reason: 'aspas mal-formadas' };
    }
    return { kind: 'string', value: _unescapeDoubleQuoted(trimmed.slice(1, -1)) };
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      return { kind: 'ambiguous', value: trimmed, reason: 'aspas mal-formadas' };
    }
    // YAML 1.2 single-quoted: '' is the only escape.
    return { kind: 'string', value: trimmed.slice(1, -1).replace(/''/gu, "'") };
  }

  // Bare scalars: in strict mode we keep them as STRINGS unless they
  // unambiguously parse as a numeric literal. Implicit-boolean keywords are
  // rejected as ambiguous (R-015 — Norway Problem). The validator then
  // catches type mismatches if a numeric appears where a string is expected.
  if (_IMPLICIT_BOOL_RE.test(trimmed)) {
    return { kind: 'ambiguous', value: trimmed, reason: 'valor sem aspas pode ser booleano implicito' };
  }
  if (_NUMERIC_RE.test(trimmed)) {
    return { kind: 'number', value: Number(trimmed) };
  }
  // Plain bare string — keep as string.
  return { kind: 'string', value: trimmed };
}

function _unescapeDoubleQuoted(s) {
  return s
    .replace(/\\n/gu, '\n')
    .replace(/\\r/gu, '\r')
    .replace(/\\t/gu, '\t')
    .replace(/\\"/gu, '"')
    .replace(/\\\\/gu, '\\');
}

/**
 * Parse a YAML document tuned for the handoff envelope. Returns the parsed
 * object on success; throws an Error with pt-BR message on ambiguous scalar
 * (R-015 strict-mode rejection).
 *
 * Supported subset (sufficient for the handoff schema):
 *   - top-level mapping with one key (`handoff:`) opening a nested mapping
 *   - nested block mappings
 *   - block sequences (`-` prefix, scalar items only — strings/numbers)
 *   - inline empty list `[]` and inline empty map `{}`
 *   - quoted scalars (double or single)
 *   - bare numeric scalars
 *   - strict rejection of bare `yes/no/on/off/true/false` (R-015)
 *
 * @param {string} yamlText
 * @returns {object}
 */
function _parseYaml(yamlText) {
  const lines = String(yamlText).split(/\r?\n/u);
  const ctx = { lines: lines, idx: 0 };
  return _parseBlock(ctx, 0);
}

function _measureIndent(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ') i++;
  return i;
}

function _parseBlock(ctx, expectedIndent) {
  // Look at the first non-blank line to decide: mapping (`key:`) or
  // sequence (`- ...`).
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) {
      // De-dent: caller handles.
      return null;
    }
    if (indent > expectedIndent) {
      throw new Error(
        'handoff invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (stripped.startsWith('- ') || stripped === '-') {
      return _parseSequence(ctx, expectedIndent);
    }
    return _parseMapping(ctx, expectedIndent);
  }
  return null;
}

function _parseMapping(ctx, expectedIndent) {
  const map = {};
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) return map;
    if (indent > expectedIndent) {
      throw new Error(
        'handoff invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (stripped.startsWith('- ')) {
      throw new Error(
        'handoff invalido. lista encontrada onde mapeamento era esperado na linha ' +
          (ctx.idx + 1) +
          '.'
      );
    }
    const colonAt = stripped.indexOf(':');
    if (colonAt === -1) {
      throw new Error(
        "handoff invalido. linha sem ':' na posicao " + (ctx.idx + 1) + '.'
      );
    }
    const key = stripped.slice(0, colonAt).trim();
    const valuePart = stripped.slice(colonAt + 1);
    ctx.idx++;
    const cls = _classifyScalar(valuePart);
    if (cls.kind === 'ambiguous') {
      throw new Error(
        'handoff recusado. valor ambiguo no campo ' + key + ': use aspas.'
      );
    }
    if (cls.kind === 'block-marker') {
      // Nested block mapping or sequence; descend at next indent level.
      const child = _parseBlock(ctx, expectedIndent + 2);
      map[key] = child === null ? {} : child;
    } else {
      map[key] = cls.value;
    }
  }
  return map;
}

function _parseSequence(ctx, expectedIndent) {
  const list = [];
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) return list;
    if (indent > expectedIndent) {
      throw new Error(
        'handoff invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (!stripped.startsWith('- ') && stripped !== '-') return list;
    const after = stripped === '-' ? '' : stripped.slice(2);
    ctx.idx++;
    const cls = _classifyScalar(after);
    if (cls.kind === 'ambiguous') {
      throw new Error(
        'handoff recusado. valor ambiguo em item de lista: use aspas.'
      );
    }
    if (cls.kind === 'block-marker') {
      // Nested mapping under the bullet.
      const child = _parseBlock(ctx, expectedIndent + 2);
      list.push(child === null ? {} : child);
    } else {
      list.push(cls.value);
    }
  }
  return list;
}

// -- size enforcement (FR-008) ----------------------------------------------

const _LIST_FIELDS = ['decisions', 'files_modified', 'blockers'];

/**
 * Rank list-typed fields by their measured serialized weight; returns the
 * field name whose YAML serialization contributes the most tokens. Used to
 * craft the pt-BR rejection message naming the worst offender (Dev Notes
 * reference patterns).
 *
 * @param {object} handoff
 * @returns {string}
 */
function _heaviestField(handoff) {
  let heaviest = 'decisions';
  let max = -1;
  // 1) Rank list-typed fields by serialized weight.
  for (const f of _LIST_FIELDS) {
    const list = handoff[f];
    if (!Array.isArray(list) || list.length === 0) continue;
    const yamlChunk = _yamlValue(list, 2);
    const tokens = tokenCounter.count(yamlChunk);
    if (tokens > max) {
      max = tokens;
      heaviest = f;
    }
  }
  // 2) Compare against next_action (string scalar) — measured at its
  //    serialized YAML weight to stay apples-to-apples with list fields.
  if (typeof handoff.next_action === 'string' && handoff.next_action.length > 0) {
    const naTokens = tokenCounter.count(_yamlValue(handoff.next_action, 2));
    if (naTokens > max) {
      max = naTokens;
      heaviest = 'next_action';
    }
  }
  // 3) Compare against work_context (nested object) — measure the full
  //    serialized block. A bloated artifact_path or current_phase will
  //    surface here.
  if (handoff.work_context && typeof handoff.work_context === 'object') {
    const wcTokens = tokenCounter.count(_yamlValue(handoff.work_context, 2));
    if (wcTokens > max) {
      max = wcTokens;
      heaviest = 'work_context';
    }
  }
  // Fallback: small handoff with no measurable field — credit next_action
  // so the rejection message still names a concrete field.
  if (max <= 0 && typeof handoff.next_action === 'string') return 'next_action';
  return heaviest;
}

// -- generate ---------------------------------------------------------------

/**
 * Build, validate, measure, and return a Handoff Artifact ready for persist().
 * Does NOT touch the filesystem.
 *
 * Rejects with pt-BR error on schema failure or 500-token overflow.
 *
 * @param {string} fromAgent
 * @param {string} toAgent
 * @param {{artifact_id: string, artifact_path: string, current_phase: string, branch: string}} workContext
 * @param {string[]} decisions
 * @param {string[]} filesModified
 * @param {string[]} blockers
 * @param {string} nextAction
 * @returns {{artifact: object, yaml: string, tokenCount: number}}
 */
function generate(fromAgent, toAgent, workContext, decisions, filesModified, blockers, nextAction) {
  const artifact = {
    handoff: {
      from: typeof fromAgent === 'string' ? fromAgent : '',
      to: typeof toAgent === 'string' ? toAgent : '',
      work_context:
        workContext && typeof workContext === 'object' && !Array.isArray(workContext)
          ? workContext
          : {},
      decisions: Array.isArray(decisions) ? decisions : [],
      files_modified: Array.isArray(filesModified) ? filesModified : [],
      blockers: Array.isArray(blockers) ? blockers : [],
      next_action: typeof nextAction === 'string' ? nextAction : '',
    },
  };

  // Schema validation first — gives the most specific pt-BR error path.
  const schema = _loadSchema();
  const result = validator.validate(schema, artifact);
  if (!result.valid) {
    const first = result.errors[0];
    const fieldHint = first.path && first.path !== '(raiz)' ? first.path : '(raiz)';
    const err = new Error(
      'handoff invalido. campo obrigatorio ausente ou invalido: ' +
        fieldHint +
        ' — ' +
        first.message
    );
    err.code = 'HANDOFF_SCHEMA_INVALID';
    err.field = fieldHint;
    err.errors = result.errors;
    throw err;
  }

  // Serialize and measure.
  const yamlText = _emitYaml(artifact);
  const tokens = tokenCounter.count(yamlText);
  if (tokens > TOKEN_CEILING) {
    const heaviest = _heaviestField(artifact.handoff);
    const err = new Error(
      'handoff excede ' +
        TOKEN_CEILING +
        ' tokens. campo que mais pesa: ' +
        heaviest +
        '. reduza e tente de novo.'
    );
    err.code = 'HANDOFF_OVER_BUDGET';
    err.field = heaviest;
    err.tokens = tokens;
    throw err;
  }

  return { artifact: artifact, yaml: yamlText, tokenCount: tokens };
}

// -- persist ----------------------------------------------------------------

/**
 * Compute the canonical filename for a handoff artifact.
 *
 * @param {object} artifact
 * @param {Date} [date]  optional clock injection for tests
 * @returns {string} bare filename, no directory
 */
function _computeFilename(artifact, date) {
  const handoff = artifact && artifact.handoff ? artifact.handoff : {};
  const fromSafe = _sanitizeAgent(handoff.from);
  const toSafe = _sanitizeAgent(handoff.to);
  if (fromSafe.length === 0 || toSafe.length === 0) {
    const err = new Error('handoff invalido. campos from e to sao obrigatorios.');
    err.code = 'HANDOFF_INVALID_NAMES';
    throw err;
  }
  const ts = _filenameTimestamp(date instanceof Date ? date : new Date());
  return FILENAME_PREFIX + fromSafe + FILENAME_INFIX + toSafe + '-' + ts + FILENAME_SUFFIX;
}

/**
 * Atomic write: stage to a temp filename, then rename. Prevents PreCompact
 * from observing a partial file (M3.2-R2 mitigation).
 *
 * @param {string} target
 * @param {string} content
 */
function _atomicWriteFile(target, content) {
  const dir = path.dirname(target);
  const base = path.basename(target);
  const tempName = path.join(
    dir,
    base + TEMP_MARKER + process.pid + '-' + Date.now()
  );
  fs.writeFileSync(tempName, content, { encoding: 'utf8' });
  try {
    fs.renameSync(tempName, target);
  } catch (renameErr) {
    // Windows: rename can fail if the target exists. Fall back to direct write
    // and clean up the temp.
    try {
      fs.writeFileSync(target, content, { encoding: 'utf8' });
    } finally {
      try {
        fs.unlinkSync(tempName);
      } catch (_) {
        // best-effort
      }
    }
    if (!fs.existsSync(target)) {
      throw renameErr;
    }
  }
}

/**
 * List the on-disk handoff filenames (no temp markers), sorted descending by
 * filename — which is monotonic with the embedded ISO timestamp.
 *
 * @returns {string[]} bare filenames
 */
function _listHandoffFilenames() {
  const dir = _handoffsDir();
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir);
  const filtered = [];
  for (const name of entries) {
    if (!name.startsWith(FILENAME_PREFIX)) continue;
    if (!name.endsWith(FILENAME_SUFFIX)) continue;
    if (name.indexOf(TEMP_MARKER) !== -1) continue;
    filtered.push(name);
  }
  filtered.sort();
  return filtered;
}

/**
 * Enforce the 3-handoff retention limit. Removes the oldest file(s) until
 * `<= RETENTION_LIMIT` remain. Best-effort: deletion failures are swallowed
 * (the framework never raises retention failures to the expert per Dev Notes
 * line 165).
 */
function _enforceRetention() {
  const all = _listHandoffFilenames();
  if (all.length <= RETENTION_LIMIT) return;
  const dir = _handoffsDir();
  const toRemove = all.slice(0, all.length - RETENTION_LIMIT);
  for (const name of toRemove) {
    try {
      fs.unlinkSync(path.join(dir, name));
    } catch (_) {
      // best-effort
    }
  }
}

/**
 * Persist a generated artifact to disk. Returns the absolute path written.
 * Enforces retention after writing.
 *
 * @param {object|{artifact: object, yaml: string}} artifactOrResult — accepts
 *     the bare artifact OR the `generate()` return shape.
 * @param {Date} [date]  optional clock injection for tests
 * @returns {string} absolute path written
 */
function persist(artifactOrResult, date) {
  let artifact;
  let yamlText;
  if (
    artifactOrResult &&
    typeof artifactOrResult === 'object' &&
    artifactOrResult.artifact &&
    typeof artifactOrResult.yaml === 'string'
  ) {
    artifact = artifactOrResult.artifact;
    yamlText = artifactOrResult.yaml;
  } else {
    artifact = artifactOrResult;
    // Re-validate when caller bypassed generate() and handed us a bare object.
    const schema = _loadSchema();
    const result = validator.validate(schema, artifact);
    if (!result.valid) {
      const first = result.errors[0];
      const err = new Error(
        'handoff invalido. campo obrigatorio ausente ou invalido: ' +
          first.path +
          ' — ' +
          first.message
      );
      err.code = 'HANDOFF_SCHEMA_INVALID';
      err.errors = result.errors;
      throw err;
    }
    yamlText = _emitYaml(artifact);
  }

  const filename = _computeFilename(artifact, date);
  const dir = _handoffsDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, filename);
  _atomicWriteFile(target, yamlText);
  _enforceRetention();
  return target;
}

// -- read / restore ---------------------------------------------------------

/**
 * Return the up-to-3 most recent handoff entries, newest first.
 *
 * @returns {Array<{path: string, filename: string, mtimeMs: number}>}
 */
function listRetained() {
  const dir = _handoffsDir();
  const all = _listHandoffFilenames();
  const out = [];
  for (const name of all) {
    const full = path.join(dir, name);
    let mtimeMs = 0;
    try {
      mtimeMs = fs.statSync(full).mtimeMs;
    } catch (_) {
      mtimeMs = 0;
    }
    out.push({ path: full, filename: name, mtimeMs: mtimeMs });
  }
  // Newest first: filenames embed ISO timestamps so reverse-sort is correct.
  out.reverse();
  return out.slice(0, RETENTION_LIMIT);
}

/**
 * Find the most recent handoff addressed to `toAgent`. Returns null when no
 * such handoff exists. Pure read+parse path — never prompts the expert
 * (AC-201, NFR-011).
 *
 * @param {string} toAgent
 * @returns {{artifact: object, yaml: string, path: string} | null}
 */
function readLatest(toAgent) {
  if (typeof toAgent !== 'string' || toAgent.length === 0) return null;
  const safe = _sanitizeAgent(toAgent);
  if (safe.length === 0) return null;
  const targetInfix = FILENAME_INFIX + safe + '-';

  const dir = _handoffsDir();
  const all = _listHandoffFilenames();
  // Newest filename last (ascending sort) — iterate reverse for newest-first.
  for (let i = all.length - 1; i >= 0; i--) {
    const name = all[i];
    if (name.indexOf(targetInfix) === -1) continue;
    const full = path.join(dir, name);
    const yamlText = fs.readFileSync(full, 'utf8');
    const artifact = _parseYaml(yamlText);
    // Re-validate against schema (defense-in-depth on read).
    const result = validator.validate(_loadSchema(), artifact);
    if (!result.valid) continue;
    if (artifact.handoff && artifact.handoff.to === toAgent) {
      return { artifact: artifact, yaml: yamlText, path: full };
    }
    // Sanitization match without exact `to` equality — still return for the
    // intended addressee (sanitized name is the disambiguator on disk).
    if (artifact.handoff && _sanitizeAgent(artifact.handoff.to) === safe) {
      return { artifact: artifact, yaml: yamlText, path: full };
    }
  }
  return null;
}

/**
 * Read + strict-parse + schema-validate a handoff artifact at the given path.
 * Returns the structured object. Never prompts the expert — pure read path
 * (AC-201, NFR-011). Throws pt-BR error on parse or validation failure.
 *
 * @param {string} artifactPath
 * @returns {object}
 */
function restore(artifactPath) {
  if (typeof artifactPath !== 'string' || artifactPath.length === 0) {
    const err = new Error('handoff invalido. caminho do artefato ausente.');
    err.code = 'HANDOFF_PATH_MISSING';
    throw err;
  }
  const yamlText = fs.readFileSync(artifactPath, 'utf8');
  const artifact = _parseYaml(yamlText);
  const schema = _loadSchema();
  const result = validator.validate(schema, artifact);
  if (!result.valid) {
    const first = result.errors[0];
    const err = new Error(
      'handoff invalido. campo obrigatorio ausente ou invalido: ' +
        first.path +
        ' — ' +
        first.message
    );
    err.code = 'HANDOFF_SCHEMA_INVALID';
    err.errors = result.errors;
    throw err;
  }
  return artifact;
}

module.exports = {
  generate: generate,
  persist: persist,
  readLatest: readLatest,
  listRetained: listRetained,
  restore: restore,
  // Exposed for tests / cooperation with PreCompact (M2.4):
  TOKEN_CEILING: TOKEN_CEILING,
  RETENTION_LIMIT: RETENTION_LIMIT,
  _computeFilename: _computeFilename,
  _emitYaml: _emitYaml,
  _parseYaml: _parseYaml,
  _handoffsDir: _handoffsDir,
};
