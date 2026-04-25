'use strict';

/**
 * memory-reporter.js — `kaizen doctor --memory` (M3.5, AC 4 + AC 5,
 * FR-029, AC-209 surface).
 *
 * Renders, in pt-BR:
 *   - Ikigai 4 docs status (presente / ausente / vazio per dimension)
 *   - refs/ikigai/biblioteca/ adjacent presence (AC-209)
 *   - MEMORY.md per installed cell (path, size, last-modified)
 *   - handoff count under .kaizen/handoffs/
 *   - waiver count under .kaizen/logs/waivers/
 *   - frameworkProtection alert (R-009) re-rendered inline when toggle false
 *
 * Read-only — no mutations to logs, state, or memory artifacts.
 *
 * pt-BR labels. Identifiers (paths, dimension names) literal.
 * CON-002 / CON-003.
 */

const fs = require('node:fs');
const path = require('node:path');

const messages = require('./messages.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const IKIGAI_DIMENSIONS = Object.freeze([
  'o-que-faco',
  'quem-sou',
  'para-quem',
  'como-faco',
]);

function _ikigaiRoot() {
  if (process.env.KAIZEN_IKIGAI_DIR) return process.env.KAIZEN_IKIGAI_DIR;
  return path.join(PROJECT_ROOT, 'refs', 'ikigai');
}

function _celulasRoot() {
  if (process.env.KAIZEN_CELULAS_DIR) return process.env.KAIZEN_CELULAS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');
}

function _handoffsDir() {
  if (process.env.KAIZEN_HANDOFFS_DIR) return process.env.KAIZEN_HANDOFFS_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'handoffs');
}

function _waiversDir() {
  const root = process.env.KAIZEN_LOGS_DIR
    ? process.env.KAIZEN_LOGS_DIR
    : path.join(PROJECT_ROOT, '.kaizen', 'logs');
  return path.join(root, 'waivers');
}

function _ikigaiBibliotecaDir() {
  return path.join(_ikigaiRoot(), 'biblioteca');
}

function _padDots(label, width) {
  if (label.length >= width) return label;
  return label + '.'.repeat(width - label.length);
}

function _ikigaiStatus() {
  const out = [];
  for (const dim of IKIGAI_DIMENSIONS) {
    const file = path.join(_ikigaiRoot(), dim + '.md');
    let status;
    if (!fs.existsSync(file)) {
      status = messages.STATUS_ABSENT;
    } else {
      let raw = '';
      try {
        raw = fs.readFileSync(file, 'utf8');
      } catch (_) {
        raw = '';
      }
      status = raw.trim().length === 0 ? messages.STATUS_EMPTY : messages.STATUS_PRESENT;
    }
    out.push({ dimension: dim, status: status, path: file });
  }
  // biblioteca/ presence (AC-209).
  const bib = _ikigaiBibliotecaDir();
  const bibPresent = fs.existsSync(bib) && fs.statSync(bib).isDirectory();
  out.push({
    dimension: 'biblioteca/',
    status: bibPresent ? messages.STATUS_PRESENT : messages.STATUS_ABSENT,
    path: bib,
  });
  return out;
}

function _memoryPerCell() {
  const root = _celulasRoot();
  if (!fs.existsSync(root)) return [];
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const memFile = path.join(root, ent.name, 'MEMORY.md');
    if (!fs.existsSync(memFile)) continue;
    let st;
    try {
      st = fs.statSync(memFile);
    } catch (_) {
      continue;
    }
    out.push({
      cell: ent.name,
      path: memFile,
      size: st.size,
      mtimeIso: new Date(st.mtimeMs).toISOString(),
    });
  }
  return out;
}

function _countFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return 0;
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch (_) {
    return 0;
  }
  let n = 0;
  for (const name of names) {
    if (predicate(name)) n++;
  }
  return n;
}

function _handoffCount() {
  return _countFiles(_handoffsDir(), (n) => /\.yaml$/u.test(n) && n.indexOf('.tmp-') === -1);
}

function _waiverCount() {
  return _countFiles(_waiversDir(), (n) => /\.yaml$/u.test(n));
}

function _formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Read frameworkProtection toggle from dvir-config.yaml. Defaults to true
 * (alert NOT rendered) on read failure — fail-safe; we never spuriously
 * surface the R-009 alert when the file is missing or unparseable. The
 * config-loader emits a separate error on its own surface.
 *
 * @returns {boolean}
 */
function _frameworkProtectionFlag() {
  try {
    const configLoaderPath = path.join(
      PROJECT_ROOT,
      '.kaizen-dvir',
      'dvir',
      'config-loader.js'
    );
    // Fresh require so test env overrides take effect (config-loader resolves
    // its own DEFAULT_CONFIG_PATH; tests don't currently override that path).
    delete require.cache[require.resolve(configLoaderPath)];
    const cfg = require(configLoaderPath);
    return cfg.getBoundaryFlag();
  } catch (_) {
    return true;
  }
}

/**
 * Render the `--memory` report. Returns a string ending with `\n`.
 *
 * @param {object} [opts]
 *   - frameworkProtection: boolean — explicit override (tests).
 * @returns {string}
 */
function render(opts) {
  const options = opts || {};
  const lines = [];
  lines.push(messages.HEADER_MEMORY);

  // frameworkProtection alert (R-009) — re-rendered inline.
  const fp = typeof options.frameworkProtection === 'boolean'
    ? options.frameworkProtection
    : _frameworkProtectionFlag();
  if (fp === false) {
    lines.push('  ' + messages.ALERT_FRAMEWORK_PROTECTION);
  }

  // Ikigai status block.
  lines.push(messages.SUBHEADER_IKIGAI);
  const iki = _ikigaiStatus();
  for (const row of iki) {
    const label = _padDots('    ' + row.dimension + ' ', 24);
    lines.push(label + ' ' + row.status);
  }

  // MEMORY.md per cell.
  lines.push(messages.SUBHEADER_MEMORY_PER_CELL);
  const mems = _memoryPerCell();
  if (mems.length === 0) {
    lines.push(messages.EMPTY_MEMORIES);
  } else {
    for (const m of mems) {
      // Render path relative to project root for compactness.
      const rel = path.relative(PROJECT_ROOT, m.path).replace(/\\/g, '/');
      lines.push(
        '    ' + rel + '  ' + _formatSize(m.size) + '  ' + m.mtimeIso
      );
    }
  }

  // Counts.
  lines.push(messages.SUBHEADER_HANDOFFS + ' ' + _handoffCount());
  lines.push(messages.SUBHEADER_WAIVERS + ' ' + _waiverCount());
  lines.push('');

  return lines.join('\n') + '\n';
}

module.exports = {
  render: render,
  IKIGAI_DIMENSIONS: IKIGAI_DIMENSIONS,
  // Exposed for tests.
  _internal: {
    _ikigaiStatus: _ikigaiStatus,
    _memoryPerCell: _memoryPerCell,
    _handoffCount: _handoffCount,
    _waiverCount: _waiverCount,
    _frameworkProtectionFlag: _frameworkProtectionFlag,
  },
};
