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
    lines.push('');
    return lines.join('\n') + '\n';
  }
  for (const c of cells) {
    const name = _padRight(c.name, 20);
    const ver = _padRight(c.version, 10);
    lines.push('  ' + name + ' ' + ver + ' ' + c.status);
    if (c.status === messages.STATUS_ERROR && c.reason) {
      lines.push('    motivo: ' + c.reason);
    }
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

module.exports = {
  render: render,
  listCells: listCells,
};
