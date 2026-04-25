'use strict';

/**
 * dvir/config-loader.js — strict YAML 1.2 subset loader for dvir-config.yaml.
 *
 * Scope (M1.3, CON-003 path 7a — stdlib only):
 *   - Root-level mappings (version, boundary, paths, cli)
 *   - Nested mappings (2-space indent)
 *   - Block sequences ("- item") under mapping keys
 *   - Quoted string scalars: "..." and '...'
 *   - Unquoted scalars ONLY if they match a safe allow-list:
 *       * booleans: exactly `true` or `false` (lowercase literal)
 *       * bare identifiers / paths that do NOT collide with YAML implicit
 *         typing (see REJECT list below)
 *   - Line comments starting with `#`
 *   - Blank lines
 *
 * Strict mode (R-015 — Norway Problem):
 *   The parser refuses to coerce any unquoted scalar that is ambiguous under
 *   YAML 1.1 implicit typing. Offending tokens (case-sensitive) are rejected
 *   with a pt-BR error; the user is told to quote the value.
 *
 * Non-goals: anchors, aliases, flow style, tags, multi-doc streams,
 * folded/literal block scalars.
 */

const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_CONFIG_PATH = path.join(
  REPO_ROOT,
  '.kaizen-dvir',
  'dvir-config.yaml'
);
const RELATIVE_CONFIG_PATH = '.kaizen-dvir/dvir-config.yaml';

// YAML 1.1 implicit-boolean tokens that strict mode must reject when unquoted.
// `true` and `false` (lowercase) are the ONLY accepted boolean literals.
const AMBIGUOUS_BOOL_TOKENS = new Set([
  'yes', 'Yes', 'YES',
  'no', 'No', 'NO',
  'on', 'On', 'ON',
  'off', 'Off', 'OFF',
  'True', 'TRUE',
  'False', 'FALSE',
  'y', 'Y', 'n', 'N',
  '~', 'null', 'Null', 'NULL',
]);

// Numeric / date-like patterns treated as ambiguous when unquoted.
const RE_INT = /^[+-]?\d+$/;
const RE_FLOAT = /^[+-]?(\d+\.\d*|\.\d+|\d+\.\d+)([eE][+-]?\d+)?$/;
const RE_FLOAT_NO_DOT = /^[+-]?\d+[eE][+-]?\d+$/;
const RE_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.+-]+)?$/;
const RE_HEX_OCT = /^0[xXoO][0-9a-fA-F]+$/;

// Bare identifier we DO allow unquoted (no implicit-type collision).
// Example: `command: kaizen` — purely alphanumeric + `_`/`-`/`/`/`.`
// but NOT matching any of the rejection patterns above.
const RE_SAFE_BARE = /^[A-Za-z_][A-Za-z0-9_\-./]*$/;
// Relative paths used in `paths.L*` sequences (allow leading `.` and `/`).
const RE_SAFE_PATH = /^[.A-Za-z0-9_\-/]+$/;

/**
 * Public API — read and validate the default config file.
 */
function getConfig() {
  return loadFromPath(DEFAULT_CONFIG_PATH);
}

/**
 * Public API — current value of boundary.frameworkProtection.
 * Re-reads the file on every call so toggle flips are honored without
 * restarting the Claude Code session (AC-011).
 */
function getBoundaryFlag() {
  const cfg = loadFromPath(DEFAULT_CONFIG_PATH);
  return cfg.boundary.frameworkProtection;
}

/**
 * Test / advanced API — load from an arbitrary absolute path.
 * Keeps getConfig() side-effect free for production callers.
 */
function loadFromPath(absPath) {
  if (!fs.existsSync(absPath)) {
    throw new Error(
      "Arquivo de configuração não encontrado em " +
        RELATIVE_CONFIG_PATH +
        ". Rode 'kaizen init' para criar o esqueleto."
    );
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = parseYaml(raw);
  validate(parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(obj) {
  const required = ['version', 'boundary', 'paths', 'cli'];
  const examples = {
    version: '"1.4.0"',
    boundary: '{ frameworkProtection: true }',
    paths: '{ L1: [...], L2: [...], L3: [...], L4: [...] }',
    cli: '{ command: kaizen }',
  };
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(
        "Campo obrigatório ausente em dvir-config.yaml: '" +
          field +
          "'. Adicione '" +
          field +
          ': ' +
          examples[field] +
          "' e tente novamente."
      );
    }
  }
  if (
    typeof obj.boundary !== 'object' ||
    obj.boundary === null ||
    Array.isArray(obj.boundary)
  ) {
    throw new Error(
      "Campo 'boundary' em dvir-config.yaml deve ser um mapeamento. Exemplo: 'boundary:\\n  frameworkProtection: true'."
    );
  }
  if (!('frameworkProtection' in obj.boundary)) {
    throw new Error(
      "Campo obrigatório ausente em dvir-config.yaml: 'boundary.frameworkProtection'. Adicione 'frameworkProtection: true' e tente novamente."
    );
  }
  if (typeof obj.boundary.frameworkProtection !== 'boolean') {
    throw new Error(
      "Tipo inválido em 'boundary.frameworkProtection' (dvir-config.yaml): esperado booleano (true ou false), recebido " +
        describeType(obj.boundary.frameworkProtection) +
        '. Use true ou false sem aspas.'
    );
  }
}

function describeType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'lista';
  return typeof v;
}

// ---------------------------------------------------------------------------
// Minimal strict YAML 1.2 subset parser
// ---------------------------------------------------------------------------

/**
 * Parse the YAML text into a plain JS object.
 * Supports only the subset described at the top of this file.
 */
function parseYaml(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    const lineNo = i + 1;
    const stripped = stripComment(rawLines[i]);
    if (stripped.trim() === '') continue;
    const indent = leadingSpaces(stripped);
    if (indent % 2 !== 0) {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          lineNo +
          '): indentação deve ser múltiplo de 2 espaços.'
      );
    }
    lines.push({ lineNo, indent, content: stripped.slice(indent) });
  }

  const state = { i: 0, lines };
  const root = parseMapping(state, 0);
  if (state.i !== state.lines.length) {
    const l = state.lines[state.i];
    throw new Error(
      'Erro de análise YAML em dvir-config.yaml (linha ' +
        l.lineNo +
        '): conteúdo inesperado após o final do documento.'
    );
  }
  return root;
}

function stripComment(line) {
  // Strip `#` comments that are not inside quotes.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      // A `#` only starts a comment when preceded by whitespace or SOL.
      if (i === 0 || /\s/.test(line[i - 1])) {
        return line.slice(0, i).replace(/\s+$/, '');
      }
    }
  }
  return line.replace(/\s+$/, '');
}

function leadingSpaces(s) {
  let n = 0;
  while (n < s.length && s[n] === ' ') n++;
  return n;
}

/**
 * Parse a block mapping at the given indent level.
 * Consumes lines whose indent >= expectedIndent and stops otherwise.
 */
function parseMapping(state, expectedIndent) {
  const out = {};
  while (state.i < state.lines.length) {
    const line = state.lines[state.i];
    if (line.indent < expectedIndent) break;
    if (line.indent > expectedIndent) {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          line.lineNo +
          '): indentação inesperada.'
      );
    }
    // Reject a sequence item where a mapping is expected.
    if (line.content.startsWith('- ') || line.content === '-') {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          line.lineNo +
          '): item de sequência onde esperava-se uma chave de mapeamento.'
      );
    }
    const { key, rest } = splitKey(line);
    state.i++;
    if (rest === '') {
      // Value is on the following indented block.
      const childIndent = expectedIndent + 2;
      const next = state.lines[state.i];
      if (!next || next.indent < childIndent) {
        // Empty mapping value. Treat as empty object.
        out[key] = {};
        continue;
      }
      if (next.content.startsWith('- ') || next.content === '-') {
        out[key] = parseSequence(state, childIndent);
      } else {
        out[key] = parseMapping(state, childIndent);
      }
    } else {
      out[key] = parseScalar(rest, line.lineNo, key);
    }
  }
  return out;
}

function parseSequence(state, expectedIndent) {
  const out = [];
  while (state.i < state.lines.length) {
    const line = state.lines[state.i];
    if (line.indent < expectedIndent) break;
    if (line.indent > expectedIndent) {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          line.lineNo +
          '): indentação inesperada em sequência.'
      );
    }
    if (!line.content.startsWith('- ') && line.content !== '-') {
      break;
    }
    const itemText = line.content === '-' ? '' : line.content.slice(2);
    state.i++;
    if (itemText === '') {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          line.lineNo +
          '): item de sequência vazio não é suportado.'
      );
    }
    out.push(parseScalar(itemText, line.lineNo, '<sequence item>'));
  }
  return out;
}

function splitKey(line) {
  // Find the first `:` outside of quotes.
  const s = line.content;
  let inSingle = false;
  let inDouble = false;
  let idx = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      idx = i;
      break;
    }
  }
  if (idx === -1) {
    throw new Error(
      'Erro de análise YAML em dvir-config.yaml (linha ' +
        line.lineNo +
        "): esperava-se ':' após a chave."
    );
  }
  const key = s.slice(0, idx).trim();
  if (!key) {
    throw new Error(
      'Erro de análise YAML em dvir-config.yaml (linha ' +
        line.lineNo +
        '): chave vazia não é permitida.'
    );
  }
  const rest = s.slice(idx + 1).trim();
  return { key, rest };
}

/**
 * Parse a scalar value. Enforces strict-mode rules.
 */
function parseScalar(raw, lineNo, field) {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error(
      "Valor ausente no campo '" +
        field +
        "' (linha " +
        lineNo +
        '). Forneça um valor ou remova a chave.'
    );
  }

  // Double-quoted string.
  if (trimmed.startsWith('"')) {
    if (!trimmed.endsWith('"') || trimmed.length < 2) {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          lineNo +
          '): aspas duplas não fechadas.'
      );
    }
    return unescapeDoubleQuoted(trimmed.slice(1, -1), lineNo);
  }

  // Single-quoted string.
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      throw new Error(
        'Erro de análise YAML em dvir-config.yaml (linha ' +
          lineNo +
          '): aspas simples não fechadas.'
      );
    }
    // YAML single-quoted: '' inside means a literal single quote.
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }

  // Accepted unquoted booleans — the ONLY allowed implicit types.
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Strict rejection of ambiguous tokens (R-015 — Norway Problem).
  if (AMBIGUOUS_BOOL_TOKENS.has(trimmed)) {
    throw new Error(
      "Valor ambíguo no campo '" +
        field +
        "' (linha " +
        lineNo +
        "). Use aspas para evitar interpretação implícita. Exemplo: '" +
        field +
        ': "' +
        trimmed +
        "\"'."
    );
  }

  if (
    RE_INT.test(trimmed) ||
    RE_FLOAT.test(trimmed) ||
    RE_FLOAT_NO_DOT.test(trimmed) ||
    RE_DATE.test(trimmed) ||
    RE_HEX_OCT.test(trimmed)
  ) {
    throw new Error(
      "Valor ambíguo no campo '" +
        field +
        "' (linha " +
        lineNo +
        "). Use aspas para evitar interpretação implícita. Exemplo: '" +
        field +
        ': "' +
        trimmed +
        "\"'."
    );
  }

  // Safe bare identifiers and paths are accepted as strings.
  if (RE_SAFE_BARE.test(trimmed) || RE_SAFE_PATH.test(trimmed)) {
    return trimmed;
  }

  throw new Error(
    "Valor não suportado no campo '" +
      field +
      "' (linha " +
      lineNo +
      '). Use aspas duplas ao redor do valor para tratá-lo como texto.'
  );
}

function unescapeDoubleQuoted(s, lineNo) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') {
      const next = s[i + 1];
      if (next === undefined) {
        throw new Error(
          'Erro de análise YAML em dvir-config.yaml (linha ' +
            lineNo +
            '): sequência de escape incompleta em aspas duplas.'
        );
      }
      switch (next) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '"': out += '"'; break;
        case '\\': out += '\\'; break;
        case '/': out += '/'; break;
        case '0': out += '\0'; break;
        default:
          throw new Error(
            'Erro de análise YAML em dvir-config.yaml (linha ' +
              lineNo +
              "): sequência de escape não suportada '\\" +
              next +
              "'."
          );
      }
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

module.exports = {
  getConfig,
  getBoundaryFlag,
  // Exposed for tests (not part of the stable public API).
  loadFromPath,
};
