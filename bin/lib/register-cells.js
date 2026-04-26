'use strict';

/**
 * bin/lib/register-cells.js — shared cell-skill registration helpers.
 *
 * Single source of truth for the bundled-cell enumeration and skill-
 * registration loop reused by:
 *   - bin/kaizen-init.js   (story M8.3 — initial registration)
 *   - bin/kaizen-update.js (story M8.4 — re-registration after merge)
 *
 * Why a shared module
 * -------------------
 * Init and update both walk `<targetRoot>/.kaizen-dvir/celulas/{*}/`,
 * filter for directories that contain a `celula.yaml`, and call the
 * M8.2 `registerCellSkills()` helper per cell. Constitution Art. VII
 * (REUSE > ADAPT > CREATE) and PRD D-v1.5-05 (generic per-cell
 * registration) push for one implementation, not two.
 *
 * Generality (D-v1.5-05)
 * ----------------------
 * The iteration set today is `{yotzer}`. Any future first-party cell
 * bundled under `.kaizen-dvir/celulas/` auto-registers without code
 * changes here.
 *
 * Module boundaries
 * -----------------
 *   - Reads cell manifests from `targetRoot` (read-only).
 *   - Writes skill `.md` files under `<targetRoot>/.claude/commands/`.
 *   - Loads the `registerCellSkills` implementation from
 *     `<frameworkRoot>/.kaizen-dvir/dvir/cell-registry.js`. The framework
 *     code is L1 — never copied into the project; lives either in the
 *     dev tree or `node_modules/@DanYuzo/kaizen-dvir/`.
 *
 * Pre/post-registration snapshot for action classification
 * --------------------------------------------------------
 * `registerSkillsForCells` returns per-cell `actions` objects that count
 * `atualizadas` (newly written or content changed) vs. `preservadas`
 * (already up-to-date — idempotent skip). The classification is computed
 * by snapshotting byte content of each expected specialist file BEFORE
 * the call to `registerCellSkills` and comparing against the post-call
 * disk content. Files that did not exist before count as `atualizadas`;
 * files whose content differs count as `atualizadas`; files whose content
 * is identical count as `preservadas`.
 *
 * Constraints
 * -----------
 * - Stdlib only (CON-003): `fs`, `path`. No external dependencies.
 * - CommonJS, ES2022 (CON-002).
 * - Pure with respect to expert-facing strings — the helper builds neutral
 *   English structures; pt-BR rendering happens in callers (init/update).
 *
 * Story M8.4 — wired into kaizen-update.js after layered-policy merge.
 */

const fs = require('node:fs');
const path = require('node:path');

const CELL_REGISTRY_REL = path.join('.kaizen-dvir', 'dvir', 'cell-registry.js');

/**
 * Enumerate bundled cells under `<targetRoot>/.kaizen-dvir/celulas/`.
 *
 * Returns one entry per direct subdirectory of `celulas/` whose
 * `celula.yaml` file exists on disk. Iteration order is stable (sorted by
 * directory name) so summaries are deterministic across runs.
 *
 * @param {string} targetRoot
 * @returns {Array<{ name: string, cellRoot: string }>}
 */
function enumerateBundledCells(targetRoot) {
  const celulasDir = path.join(targetRoot, '.kaizen-dvir', 'celulas');
  if (!fs.existsSync(celulasDir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(celulasDir, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  const out = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const cellRoot = path.join(celulasDir, ent.name);
    const manifestAbs = path.join(cellRoot, 'celula.yaml');
    if (!fs.existsSync(manifestAbs)) continue;
    out.push({ name: ent.name, cellRoot });
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

/**
 * Load the `registerCellSkills` helper from the framework tree.
 *
 * @param {string} frameworkRoot — absolute path of the framework checkout
 *   or the installed package root (where `.kaizen-dvir/dvir/cell-registry.js`
 *   lives).
 * @returns {function} the M8.2 `registerCellSkills` function.
 */
function _loadRegisterCellSkills(frameworkRoot) {
  const modPath = path.join(frameworkRoot, CELL_REGISTRY_REL);
  // eslint-disable-next-line global-require
  const mod = require(modPath);
  return mod.registerCellSkills;
}

/**
 * Snapshot the byte content of every specialist `.md` file the registrar
 * is expected to write under `<claudeCommandsDir>/<segments...>/`.
 *
 * Returns a map { '<agent-id>.md': Buffer | null }. `null` denotes a file
 * that did not exist pre-registration. Files NOT in the expected set are
 * irrelevant for the `atualizadas`/`preservadas` count (M8.2 surfaces them
 * as orphan warnings).
 *
 * The function does NOT need to know the specialist set in advance — it
 * scans the existing directory and returns content for every `.md` it
 * finds. The caller correlates against `specialistsWritten[]` returned
 * by `registerCellSkills()`.
 *
 * @param {string} specialistsDir
 * @returns {Map<string, Buffer>}
 */
function _snapshotSpecialistsDir(specialistsDir) {
  const out = new Map();
  let entries = [];
  try {
    entries = fs.readdirSync(specialistsDir, { withFileTypes: true });
  } catch (_) {
    return out;
  }
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.md')) continue;
    try {
      const buf = fs.readFileSync(path.join(specialistsDir, ent.name));
      out.set(ent.name, buf);
    } catch (_) {
      // best-effort
    }
  }
  return out;
}

/**
 * Resolve the directory where a cell's specialist sub-skills are written.
 * Mirrors the path-resolution in `cell-registry.js`:
 *   slashPrefix "Kaizen:Yotzer" => `<commandsDir>/Kaizen/Yotzer/`
 *
 * Reads `slashPrefix` from `celula.yaml` via a tiny line scanner — we
 * intentionally avoid loading the full YAML parser here. If the field is
 * missing or malformed, `registerCellSkills()` will throw downstream with
 * a precise pt-BR message; this helper just falls back to the cell name.
 *
 * @param {string} cellRoot
 * @param {string} cellName
 * @returns {string[]} segments of the slashPrefix path.
 */
function _slashPrefixSegmentsForCell(cellRoot, cellName) {
  const manifestAbs = path.join(cellRoot, 'celula.yaml');
  let raw = '';
  try {
    raw = fs.readFileSync(manifestAbs, 'utf8');
  } catch (_) {
    return [cellName];
  }
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*slashPrefix\s*:\s*"?([^"\s#]+)"?/.exec(line);
    if (m) {
      const sp = m[1].trim();
      if (sp.length === 0) return [cellName];
      return sp.split(':');
    }
  }
  return [cellName];
}

/**
 * Re-runs `registerCellSkills()` for all bundled cells under
 * `<targetRoot>/.kaizen-dvir/celulas/{*}/`. Idempotent — unchanged cells
 * produce zero filesystem writes.
 *
 * Per-cell action classification:
 *   - `atualizadas`: count of specialist files that did not exist pre-call
 *     OR whose content changed between the snapshot and the post-call
 *     disk content.
 *   - `preservadas`: count of specialist files whose pre-call content
 *     equals the post-call content (idempotent skip).
 *
 * Errors from `registerCellSkills()` (malformed manifest, missing chief
 * persona) are re-thrown with the cell name prefixed so callers can build
 * pt-BR stderr messages that name the offending cell.
 *
 * @param {string} targetRoot — project root being updated/initialized.
 * @param {object} [opts]
 * @param {string} [opts.frameworkRoot] — where to load
 *   `cell-registry.js` from. Defaults to `targetRoot` (covers both the
 *   self-checkout dev tree and installed-package contexts when the
 *   framework code IS the target tree). Init passes `INSTALL_ROOT`
 *   explicitly to keep helper loading anchored at the package source.
 *
 * @returns {{
 *   perCell: Array<{
 *     name: string,
 *     entryWritten: boolean,
 *     specialistsCount: number,
 *     atualizadas: number,
 *     preservadas: number,
 *     warnings: string[],
 *   }>,
 *   warnings: string[],
 * }}
 *
 * @throws {Error} pt-BR error message when any cell's manifest is
 *   malformed; the error carries `cellName` and `cellRoot` properties.
 */
function registerSkillsForCells(targetRoot, opts) {
  opts = opts || {};
  const frameworkRoot = opts.frameworkRoot || targetRoot;

  const commandsDir = path.join(targetRoot, '.claude', 'commands');
  const cells = enumerateBundledCells(targetRoot);
  const perCell = [];
  const aggregatedWarnings = [];

  // Lazy-load the registrar — only needed when at least one cell exists.
  // Empty fixtures (e.g., M6.2 snapshot/rollback tests that scaffold a
  // bare project without `.kaizen-dvir/celulas/`) must not require the
  // framework module to be reachable.
  if (cells.length === 0) {
    return { perCell, warnings: aggregatedWarnings };
  }
  const registerCellSkills = _loadRegisterCellSkills(frameworkRoot);

  for (const cell of cells) {
    // --- pre-call snapshot --------------------------------------------------
    const segments = _slashPrefixSegmentsForCell(cell.cellRoot, cell.name);
    const specialistsDir = path.join(commandsDir, ...segments);
    const beforeSnapshot = _snapshotSpecialistsDir(specialistsDir);

    // --- registrar invocation ----------------------------------------------
    let result;
    try {
      result = registerCellSkills(cell.cellRoot, commandsDir);
    } catch (err) {
      const inner = (err && err.message) || String(err);
      const e = new Error("celula '" + cell.name + "': " + inner);
      e.cellName = cell.name;
      e.cellRoot = cell.cellRoot;
      e.cause = err;
      throw e;
    }

    // --- post-call classification ------------------------------------------
    let atualizadas = 0;
    let preservadas = 0;
    const written = Array.isArray(result.specialistsWritten)
      ? result.specialistsWritten
      : [];
    for (const agentId of written) {
      const fileName = agentId + '.md';
      const filePath = path.join(specialistsDir, fileName);
      let afterBuf = null;
      try {
        afterBuf = fs.readFileSync(filePath);
      } catch (_) {
        afterBuf = null;
      }
      const beforeBuf = beforeSnapshot.get(fileName) || null;
      if (!beforeBuf) {
        atualizadas++;
        continue;
      }
      if (afterBuf && Buffer.compare(beforeBuf, afterBuf) === 0) {
        preservadas++;
      } else {
        atualizadas++;
      }
    }

    perCell.push({
      name: cell.name,
      entryWritten: !!result.entryWritten,
      specialistsCount: written.length,
      atualizadas: atualizadas,
      preservadas: preservadas,
      warnings: Array.isArray(result.warnings) ? result.warnings.slice() : [],
    });
    for (const w of (result.warnings || [])) {
      aggregatedWarnings.push('[' + cell.name + '] ' + w);
    }
  }

  return { perCell, warnings: aggregatedWarnings };
}

module.exports = {
  enumerateBundledCells: enumerateBundledCells,
  registerSkillsForCells: registerSkillsForCells,
  CELL_REGISTRY_REL: CELL_REGISTRY_REL,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M8.4: extracted enumerateBundledCells +
//   registerSkillsForCells from bin/kaizen-init.js into a shared module so
//   bin/kaizen-update.js (M8.4) can re-use the same enumeration + helper-
//   loading + per-cell action classification logic. Added action
//   classification (atualizadas vs preservadas) computed by byte-content
//   snapshot pre/post the call to registerCellSkills(). Init delegates to
//   this module via require('./lib/register-cells.js'). Stdlib only
//   (CON-003), CommonJS (CON-002), no new dependencies. Constitution Art.
//   VII (REUSE > ADAPT > CREATE) — single source of truth.
