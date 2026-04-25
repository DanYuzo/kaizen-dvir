'use strict';

/**
 * cie.js — Context Injection Engine (CIE) for KaiZen hook system.
 *
 * Implements the four injection layers of M2.2 + M2.3:
 *   - CIE-0 Commandments  — always loads `.kaizen-dvir/commandments.md`.
 *   - CIE-1 Global rules  — loads `.kaizen-dvir/instructions/*.md` alphabetically.
 *   - CIE-2 Cell rules    — loads `.kaizen-dvir/celulas/{activeCell}/rules/*.md`
 *                           when a cell is active in the session.
 *   - CIE-3 Boot (M2.3)   — on FIRST activation of a cell per session, reads
 *                           `boot:` array from `.kaizen-dvir/celulas/{cell}/celula.yaml`
 *                           and loads each declared file. Subsequent activations
 *                           short-circuit (no disk reads). Detects activation via
 *                           prompt pattern `/Kaizen:{CellName}` anchored at start
 *                           of a line. State persisted in
 *                           `.kaizen/state/session-booted-cells.json` (object map
 *                           `{ cellName: { booted_at: iso8601 } }` — shape shared
 *                           with M2.4 PreCompact per already-green contract).
 *
 * Public contract (stable across M2.2–M3):
 *   module.exports = {
 *     inject(sessionCtx, layers),          // orchestrator (default: all 4 layers)
 *     injectCommandments(sessionCtx),      // CIE-0
 *     injectGlobalRules(sessionCtx),       // CIE-1
 *     injectCellRules(sessionCtx),         // CIE-2
 *     cie3Boot(sessionCtx),                // CIE-3 (M2.3)
 *     hasBooted(cellName),                 // session-state reader (M2.3)
 *     markBooted(cellName),                // session-state writer (M2.3)
 *     restoreBootedCellsFromSnapshot(path) // KZ-M2-R2 restore hook (M2.3)
 *   };
 *
 * Per-layer return shape:
 *   { payload: string, layer: 'CIE-0'|'CIE-1'|'CIE-2', elapsedMs: number,
 *     warnings: Array<{ file?: string, message: string }> }
 *
 * Orchestrator return shape:
 *   { combinedPayload: string,
 *     perLayer: Array<LayerResult>,
 *     totalMs: number }
 *
 * Requirements coverage:
 *   - FR-003, FR-011 (partial), NFR-002, AC-002, AC-006 (partial), AC-010 (partial).
 *   - CON-002 — CommonJS, ES2022.
 *   - CON-003 — Node stdlib only (fs, path, perf_hooks).
 *   - CON-004 — logs under .kaizen/logs/hook-calls/ (delegated to log-writer).
 *   - D-v1.4-02 — reads `commandments.md` (not `constitution.md`).
 *   - D-v1.4-05 — CIE-1 reads `.kaizen-dvir/instructions/`.
 *   - D-v1.4-06 — pt-BR error text on user-facing log entries.
 *
 * Design decisions (see Dev Notes of M2.2 story):
 *   - CIE-1 ordering: alphabetical (`Array.prototype.sort()` on file names).
 *     The hook-system spec does not prescribe an order; alphabetical is
 *     deterministic and reproducible, which is what the 200ms benchmark
 *     requires. Documented for @architect at the quality gate.
 *   - CIE-2 cell-rule path: `.kaizen-dvir/celulas/{activeCell}/rules/*.md`
 *     per story Task 4 + `05-hook-system.md` § Configuração. Missing cell
 *     directory is a silent no-op (M2.3 adds activation validation).
 *   - Layer error policy: per-layer failures are NON-fatal. The orchestrator
 *     logs a pt-BR entry under `.kaizen/logs/hook-calls/`, stores the warning
 *     on the layer result, and continues. The whole injection only fails if
 *     the orchestrator itself throws — individual layers never bubble out.
 *     Rationale: PRD § UserPromptSubmit severity = WARN (not BLOCK); the
 *     circuit breaker in `hook-runner.js` handles repeat failures.
 *   - File reads are NOT cached across calls. The 200ms budget leaves ample
 *     headroom on warm-cache syscalls (commandments.md ~11 KB, typical
 *     instructions/ < 50 KB combined). Re-reading on every prompt keeps the
 *     engine stateless and picks up edits without cache invalidation.
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const logWriter = require('./log-writer');

// Project root: cie.js -> hooks -> dvir -> .kaizen-dvir -> <projectRoot>
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const COMMANDMENTS_PATH = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'commandments.md'
);
const INSTRUCTIONS_DIR = path.join(
  PROJECT_ROOT,
  '.kaizen-dvir',
  'instructions'
);
const CELULAS_DIR = path.join(PROJECT_ROOT, '.kaizen-dvir', 'celulas');

// M2.2 static layer identifiers — PRESERVED to keep the M2.2 composable-API
// test (`test-cie-composable.js`) green. `ALL_LAYER_IDS` below is the M2.3+
// expanded set including CIE-3.
const LAYER_IDS = Object.freeze(['CIE-0', 'CIE-1', 'CIE-2']);
const ALL_LAYER_IDS = Object.freeze(['CIE-0', 'CIE-1', 'CIE-2', 'CIE-3']);

// -----------------------------------------------------------------------------
// CIE-3 (M2.3) — session-state + boot injection helpers
// -----------------------------------------------------------------------------

/**
 * Resolve the `.kaizen/state/` directory. Tests override via the
 * `KAIZEN_STATE_DIR` env variable (mirrors M2.4 PreCompact.js).
 *
 * @returns {string}
 */
function _stateDir() {
  if (process.env.KAIZEN_STATE_DIR) return process.env.KAIZEN_STATE_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'state');
}

/**
 * Resolve the `session-booted-cells.json` path. Matches the contract
 * M2.4 PreCompact.js depends on (`KAIZEN_BOOTED_CELLS_FILE`).
 *
 * Schema (object map — NOT the array shape drafted in the story Task 1):
 *   { "cell-name-a": { "booted_at": "2026-04-23T14:05:02Z" },
 *     "cell-name-b": { "booted_at": "2026-04-23T14:21:48Z" } }
 *
 * Rationale for the object-map shape: M2.4 PreCompact already shipped
 * with `readBootedCells()` returning `{}` for array-shaped state, and
 * the M2.4 tests `test-precompact-includes-booted-cells.js` assert the
 * object-map shape. The story Task 1 draft (`{session_id, booted_cells:[]}`)
 * is pre-dated by M2.4's already-green expectations. We follow M2.4 to
 * keep the 86/86 suite green (explicit NON-NEGOTIABLE constraint).
 * Flagged in Dev Notes for @architect at the quality gate.
 *
 * @returns {string}
 */
function _bootedCellsFile() {
  if (process.env.KAIZEN_BOOTED_CELLS_FILE) {
    return process.env.KAIZEN_BOOTED_CELLS_FILE;
  }
  return path.join(_stateDir(), 'session-booted-cells.json');
}

/**
 * Read the booted-cells map from disk. Absence → empty map. Malformed
 * content → empty map with a pt-BR warning logged (never crashes).
 *
 * @returns {Object<string, {booted_at:string}>}
 */
function _readBootedCells() {
  const file = _bootedCellsFile();
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (_) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch (_) {
    _safeLog({}, 'CIE-3', 'session-booted-cells.json malformado — estado tratado como vazio.', {
      path: file,
    });
    return {};
  }
}

/**
 * Persist the booted-cells map to disk. Creates `.kaizen/state/`
 * recursively if missing. Swallows write errors (logs pt-BR warning) so
 * CIE-3 never blocks the expert.
 *
 * @param {Object} map
 */
function _writeBootedCells(map) {
  const file = _bootedCellsFile();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(map, null, 2), { encoding: 'utf8' });
  } catch (err) {
    _safeLog({}, 'CIE-3', 'falha ao gravar session-booted-cells.json. Estado nao persistido.', {
      path: file,
      error: err && err.message ? err.message : String(err),
    });
  }
}

/**
 * Has `cellName` already booted in this session?
 *
 * @param {string} cellName
 * @returns {boolean}
 */
function hasBooted(cellName) {
  if (typeof cellName !== 'string' || !cellName) return false;
  const map = _readBootedCells();
  return Object.prototype.hasOwnProperty.call(map, cellName);
}

/**
 * Mark `cellName` as booted with the current timestamp.
 *
 * @param {string} cellName
 * @returns {{booted_at: string}}
 */
function markBooted(cellName) {
  if (typeof cellName !== 'string' || !cellName) {
    throw new Error('cie.markBooted: cellName must be a non-empty string');
  }
  const map = _readBootedCells();
  const entry = { booted_at: new Date().toISOString() };
  map[cellName] = entry;
  _writeBootedCells(map);
  return entry;
}

/**
 * Minimal YAML reader for the `boot:` field of `celula.yaml`. Accepts
 * block-list or flow-list shapes:
 *
 *   boot:
 *     - README.md
 *     - "MEMORY.md"
 *     - 'refs/contexto-ativo.md'
 *
 *   boot: [README.md, "MEMORY.md"]
 *
 * Lines starting with `#` are comments. Other top-level keys are ignored.
 * This is NOT a general YAML parser — CON-003 forbids external deps and
 * the celula.yaml JSON Schema Gate (M2.5) is what catches malformed
 * manifests. Documented for @architect review.
 *
 * @param {string} yamlText
 * @returns {Array<string>} paths (may be empty)
 */
function _parseBootArray(yamlText) {
  if (typeof yamlText !== 'string' || yamlText.length === 0) return [];
  const lines = yamlText.split(/\r?\n/);

  // First pass: look for flow-style `boot: [ ... ]` on a single logical line.
  for (const raw of lines) {
    const line = raw.replace(/#.*$/u, '').trim();
    const m = /^boot:\s*\[(.*)\]\s*$/u.exec(line);
    if (m) {
      return m[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/gu, ''))
        .filter((s) => s.length > 0);
    }
  }

  // Second pass: block-list form. Find `boot:` then consume `-` items
  // until a non-list, non-comment, non-empty line (next mapping key).
  const out = [];
  let inBoot = false;
  let bootIndent = -1;
  for (const raw of lines) {
    // Strip trailing comments but keep leading whitespace.
    const stripped = raw.replace(/#.*$/u, '').replace(/\s+$/u, '');
    if (stripped.trim().length === 0) continue;

    if (!inBoot) {
      const m = /^(\s*)boot:\s*$/u.exec(stripped);
      if (m) {
        inBoot = true;
        bootIndent = m[1].length;
      }
      continue;
    }

    // We are inside the boot block; capture items that indent past bootIndent.
    const indentMatch = /^(\s*)(.*)$/u.exec(stripped);
    const indent = indentMatch[1].length;
    const body = indentMatch[2];

    if (indent <= bootIndent) {
      // Back out to a sibling/parent mapping key — boot block ends.
      break;
    }
    const item = /^-\s*(.*)$/u.exec(body);
    if (!item) {
      // Not a list item at deeper indent — treat as boot-block terminator.
      break;
    }
    const value = item[1].trim().replace(/^['"]|['"]$/gu, '');
    if (value.length > 0) out.push(value);
  }
  return out;
}

/**
 * Detect cell activation in a prompt. Matches `/Kaizen:{CellName}` at
 * start-of-line (anchored, case-sensitive for the `/Kaizen:` prefix,
 * permissive for the cell name charset). Returns the first match only —
 * multi-cell activation in one prompt is out-of-scope for M2.3.
 *
 * Design note (M2.3-R1 mitigation): anchoring at start-of-line avoids
 * false positives where `/Kaizen:foo` appears mid-sentence or inside a
 * code fence. A purely start-of-string anchor would reject newline-led
 * prompts — start-of-line (`^` with `m` flag) is the defensible middle
 * ground and matches how the expert types the activation command.
 *
 * @param {string} prompt
 * @returns {string|null} cell name or null
 */
function _detectActivation(prompt) {
  if (typeof prompt !== 'string' || prompt.length === 0) return null;
  const re = /^\/Kaizen:([A-Za-z0-9_][A-Za-z0-9_.-]*)/mu;
  const m = re.exec(prompt);
  return m ? m[1] : null;
}

/**
 * CIE-3 — Boot injection on first cell activation.
 *
 * Short-circuit paths (NO disk access):
 *   - `sessionCtx.prompt` empty / not a string → empty payload.
 *   - No `/Kaizen:{CellName}` pattern detected → empty payload.
 *   - `hasBooted(cellName)` returns `true` → empty payload.
 *
 * On first activation:
 *   1. Read `.kaizen-dvir/celulas/{cellName}/celula.yaml` → `boot:` array.
 *   2. Resolve each declared path relative to the cell directory.
 *   3. Read each file; concatenate contents with blank-line separators.
 *   4. Call `markBooted(cellName)` ONLY on successful manifest read.
 *
 * A missing `celula.yaml` logs a pt-BR error and returns empty payload
 * WITHOUT calling `markBooted` (so a corrected manifest on a later prompt
 * can still boot). A declared boot file that fails to load logs a pt-BR
 * warning for that file but continues with the rest; `markBooted` IS
 * called in that case (manifest was valid, file-level errors are soft).
 *
 * @param {object} sessionCtx — expected `{ prompt: string, sessionId?: string }`.
 *   Accepts `sessionCtx.activeCell` as a fallback activation source for
 *   explicit activations that bypass the prompt pattern (not used by
 *   UserPromptSubmit.js today — kept for forward compat with M2.4+).
 * @returns {{payload:string, layer:'CIE-3', elapsedMs:number, warnings:Array, bootIoMs:number, cell:string|null}}
 */
function cie3Boot(sessionCtx) {
  const started = performance.now();
  const warnings = [];
  const ctx = sessionCtx && typeof sessionCtx === 'object' ? sessionCtx : {};

  let cellName = null;
  if (typeof ctx.prompt === 'string') {
    cellName = _detectActivation(ctx.prompt);
  }
  if (!cellName && typeof ctx.activeCell === 'string' && ctx.activeCell.trim()) {
    // Explicit activation via sessionCtx — only triggers boot if the
    // caller also opts in via `ctx.forceBoot` (reserved for future use).
    if (ctx.forceBoot === true) {
      cellName = ctx.activeCell.trim();
    }
  }

  if (!cellName) {
    return {
      payload: '',
      layer: 'CIE-3',
      elapsedMs: performance.now() - started,
      warnings: [],
      bootIoMs: 0,
      cell: null,
    };
  }

  if (hasBooted(cellName)) {
    return {
      payload: '',
      layer: 'CIE-3',
      elapsedMs: performance.now() - started,
      warnings: [],
      bootIoMs: 0,
      cell: cellName,
    };
  }

  const cellDir = path.join(CELULAS_DIR, cellName);
  const manifestPath = path.join(cellDir, 'celula.yaml');

  const ioStart = performance.now();
  let yamlText;
  try {
    yamlText = fs.readFileSync(manifestPath, 'utf8');
  } catch (err) {
    const msg =
      '[KaiZen] Célula "' +
      cellName +
      '" não tem celula.yaml. ' +
      'CIE-3 pulado nesta ativação. Verifique o caminho .kaizen-dvir/celulas/' +
      cellName +
      '/celula.yaml e rode "kaizen doctor --hooks" para detalhes.';
    warnings.push({ file: manifestPath, message: msg });
    _safeLog(ctx, 'CIE-3', msg, {
      error: err && err.message ? err.message : String(err),
      path: manifestPath,
      event_type: 'cie_3_failure',
      payload: { cell_name: cellName, reason: 'missing_celula_yaml' },
    });
    return {
      payload: '',
      layer: 'CIE-3',
      elapsedMs: performance.now() - started,
      warnings: warnings,
      bootIoMs: performance.now() - ioStart,
      cell: cellName,
    };
  }

  const bootPaths = _parseBootArray(yamlText);
  const chunks = [];
  for (const rel of bootPaths) {
    const full = path.join(cellDir, rel);
    try {
      chunks.push(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      const reason = err && err.message ? err.message : String(err);
      const msg =
        '[KaiZen] Arquivo de boot "' +
        rel +
        '" da célula "' +
        cellName +
        '" não carregou: ' +
        reason +
        '. CIE-3 seguiu com os demais arquivos declarados. ' +
        'Corrija o caminho em celula.yaml ou remova a entrada.';
      warnings.push({ file: full, message: msg });
      _safeLog(ctx, 'CIE-3', msg, {
        path: full,
        error: reason,
        event_type: 'cie_3_failure',
        payload: { cell_name: cellName, reason: 'boot_file_load_failure', file: rel },
      });
    }
  }
  const bootIoMs = performance.now() - ioStart;

  // Manifest read succeeded — mark cell as booted even if some boot files
  // failed (file-level errors are soft per AC 6).
  markBooted(cellName);

  return {
    payload: chunks.join('\n\n'),
    layer: 'CIE-3',
    elapsedMs: performance.now() - started,
    warnings: warnings,
    bootIoMs: bootIoMs,
    cell: cellName,
  };
}

/**
 * Restore the `session-booted-cells.json` state from a PreCompact YAML
 * snapshot (KZ-M2-R2 mitigation contract).
 *
 * Reads the YAML snapshot at `snapshotPath`, extracts the
 * `session_booted_cells:` block, and overwrites the state file with the
 * recovered map. This is a best-effort restore: a missing snapshot, a
 * malformed block, or a write failure are each logged (pt-BR) and
 * reported in the return value — never thrown.
 *
 * YAML shape expected (produced by M2.4 `PreCompact.buildYaml`):
 *   session_booted_cells:
 *     cell-a:
 *       booted_at: "2026-04-23T14:05:02Z"
 *     cell-b:
 *       booted_at: "2026-04-23T14:21:48Z"
 *
 * Empty block is serialized as `session_booted_cells: {}` and restored
 * as an empty map (which is treated as "no cells have booted" — the
 * same as the absent-file case).
 *
 * @param {string} snapshotPath absolute or project-relative path
 * @returns {{ok: boolean, restoredCount: number, error?: string}}
 */
function restoreBootedCellsFromSnapshot(snapshotPath) {
  if (typeof snapshotPath !== 'string' || snapshotPath.length === 0) {
    return { ok: false, restoredCount: 0, error: 'snapshotPath vazio' };
  }
  let text;
  try {
    text = fs.readFileSync(snapshotPath, 'utf8');
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    _safeLog({}, 'CIE-3', 'Snapshot de PreCompact nao encontrado para restauracao: ' + reason, {
      path: snapshotPath,
      event_type: 'cie_3_restore_failure',
    });
    return { ok: false, restoredCount: 0, error: reason };
  }

  const map = _parseBootedCellsBlock(text);
  try {
    _writeBootedCells(map);
  } catch (err) {
    const reason = err && err.message ? err.message : String(err);
    return { ok: false, restoredCount: 0, error: reason };
  }
  return { ok: true, restoredCount: Object.keys(map).length };
}

/**
 * Extract the `session_booted_cells:` block from a PreCompact YAML
 * snapshot. Tolerant of the flow-style empty-map case `{}`. Unknown
 * keys inside the block are ignored. Not a general YAML parser.
 *
 * @param {string} yamlText
 * @returns {Object<string, {booted_at:string}>}
 */
function _parseBootedCellsBlock(yamlText) {
  if (typeof yamlText !== 'string' || yamlText.length === 0) return {};
  const lines = yamlText.split(/\r?\n/);

  // Inline empty: `session_booted_cells: {}`
  for (const raw of lines) {
    const line = raw.replace(/#.*$/u, '').trim();
    if (/^session_booted_cells:\s*\{\s*\}\s*$/u.test(line)) return {};
  }

  const out = {};
  let inBlock = false;
  let blockIndent = -1;
  let currentCell = null;
  let currentIndent = -1;

  for (const raw of lines) {
    const stripped = raw.replace(/#.*$/u, '').replace(/\s+$/u, '');
    if (stripped.trim().length === 0) continue;

    if (!inBlock) {
      const m = /^(\s*)session_booted_cells:\s*$/u.exec(stripped);
      if (m) {
        inBlock = true;
        blockIndent = m[1].length;
      }
      continue;
    }

    const indentMatch = /^(\s*)(.*)$/u.exec(stripped);
    const indent = indentMatch[1].length;
    const body = indentMatch[2];

    if (indent <= blockIndent) break;

    // Cell-level key (one nesting deeper than the block).
    if (currentCell === null || indent <= currentIndent) {
      const cellMatch = /^([A-Za-z0-9_][A-Za-z0-9_.-]*):\s*$/u.exec(body);
      if (cellMatch) {
        currentCell = cellMatch[1];
        currentIndent = indent;
        out[currentCell] = {};
        continue;
      }
      // Not a cell mapping — treat as block terminator.
      break;
    }

    // Inside a cell mapping: pick up `booted_at: "..."`.
    const kv = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/u.exec(body);
    if (kv) {
      const key = kv[1];
      const value = kv[2].trim().replace(/^['"]|['"]$/gu, '');
      out[currentCell][key] = value;
    }
  }

  return out;
}

/**
 * Reset session state — test-only helper. Not exported on the public
 * surface; accessible via `cie._resetSessionStateForTests()`.
 * @private
 */
function _resetSessionStateForTests() {
  const file = _bootedCellsFile();
  try {
    fs.unlinkSync(file);
  } catch (_) {
    // Absent is fine.
  }
}

function _sessionId(sessionCtx) {
  if (sessionCtx && typeof sessionCtx.sessionId === 'string' && sessionCtx.sessionId) {
    return sessionCtx.sessionId;
  }
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

function _safeLog(sessionCtx, layer, message, extra) {
  const entry = {
    timestamp: new Date().toISOString(),
    event_type: 'injection_error',
    hook_name: 'UserPromptSubmit',
    session_id: _sessionId(sessionCtx),
    layer: layer,
    message: message,
  };
  if (extra && typeof extra === 'object') {
    Object.assign(entry, extra);
  }
  try {
    logWriter.write('hook-calls', entry);
  } catch (_) {
    // Log-writer failure must never cascade. The circuit breaker in
    // `hook-runner.js` observes repeated injection errors at the dispatch
    // layer if the handler keeps throwing — here we just swallow.
  }
}

/**
 * CIE-0 — prepend Commandments verbatim.
 *
 * @param {object} sessionCtx
 * @returns {{payload:string, layer:'CIE-0', elapsedMs:number, warnings:Array}}
 */
function injectCommandments(sessionCtx) {
  const started = performance.now();
  const warnings = [];
  let payload = '';
  try {
    payload = fs.readFileSync(COMMANDMENTS_PATH, 'utf8');
  } catch (err) {
    const msg =
      'Camada CIE-0 falhou: commandments.md nao encontrado em .kaizen-dvir/. ' +
      'A sessao continua sem injecao de Commandments — rode "kaizen doctor --hooks" para detalhes.';
    warnings.push({ file: COMMANDMENTS_PATH, message: msg });
    _safeLog(sessionCtx, 'CIE-0', msg, {
      error: err && err.message ? err.message : String(err),
      path: COMMANDMENTS_PATH,
    });
  }
  return {
    payload: payload,
    layer: 'CIE-0',
    elapsedMs: performance.now() - started,
    warnings: warnings,
  };
}

/**
 * CIE-1 — load global rules from `.kaizen-dvir/instructions/*.md`
 * in alphabetical order. Silent no-op when directory is missing or empty.
 *
 * @param {object} sessionCtx
 * @returns {{payload:string, layer:'CIE-1', elapsedMs:number, warnings:Array}}
 */
function injectGlobalRules(sessionCtx) {
  const started = performance.now();
  const warnings = [];
  let payload = '';

  let entries;
  try {
    entries = fs.readdirSync(INSTRUCTIONS_DIR, { withFileTypes: true });
  } catch (err) {
    // ENOENT (directory absent) is a silent no-op per AC 3. Other errors
    // surface as a warning so misconfiguration is observable via the log.
    if (err && err.code === 'ENOENT') {
      return {
        payload: '',
        layer: 'CIE-1',
        elapsedMs: performance.now() - started,
        warnings: [],
      };
    }
    const msg =
      'Camada CIE-1 falhou ao listar .kaizen-dvir/instructions/. ' +
      'Prosseguindo sem regras globais.';
    _safeLog(sessionCtx, 'CIE-1', msg, {
      error: err && err.message ? err.message : String(err),
      path: INSTRUCTIONS_DIR,
    });
    return {
      payload: '',
      layer: 'CIE-1',
      elapsedMs: performance.now() - started,
      warnings: [{ file: INSTRUCTIONS_DIR, message: msg }],
    };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort(); // alphabetical — deterministic, documented in Dev Notes.

  const chunks = [];
  for (const name of mdFiles) {
    const full = path.join(INSTRUCTIONS_DIR, name);
    try {
      chunks.push(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      const msg =
        'Regra global ignorada: ' + name + ' ilegivel. Demais regras foram carregadas.';
      warnings.push({ file: full, message: msg });
      _safeLog(sessionCtx, 'CIE-1', msg, {
        error: err && err.message ? err.message : String(err),
        path: full,
      });
    }
  }
  payload = chunks.join('\n\n');

  return {
    payload: payload,
    layer: 'CIE-1',
    elapsedMs: performance.now() - started,
    warnings: warnings,
  };
}

/**
 * CIE-2 — load cell-specific rules when `sessionCtx.activeCell` is set.
 * Silent no-op when no cell is active or the cell has no rules directory.
 *
 * @param {object} sessionCtx
 * @returns {{payload:string, layer:'CIE-2', elapsedMs:number, warnings:Array}}
 */
function injectCellRules(sessionCtx) {
  const started = performance.now();
  const warnings = [];
  const activeCell =
    sessionCtx && typeof sessionCtx.activeCell === 'string'
      ? sessionCtx.activeCell.trim()
      : '';

  if (!activeCell) {
    return {
      payload: '',
      layer: 'CIE-2',
      elapsedMs: performance.now() - started,
      warnings: [],
    };
  }

  const rulesDir = path.join(CELULAS_DIR, activeCell, 'rules');
  let entries;
  try {
    entries = fs.readdirSync(rulesDir, { withFileTypes: true });
  } catch (err) {
    // Missing directory is a valid state (cell might exist without rules yet).
    if (err && err.code === 'ENOENT') {
      return {
        payload: '',
        layer: 'CIE-2',
        elapsedMs: performance.now() - started,
        warnings: [],
      };
    }
    const msg =
      'Camada CIE-2 falhou ao listar regras da celula "' +
      activeCell +
      '". Prosseguindo sem regras da celula.';
    _safeLog(sessionCtx, 'CIE-2', msg, {
      error: err && err.message ? err.message : String(err),
      path: rulesDir,
      activeCell: activeCell,
    });
    return {
      payload: '',
      layer: 'CIE-2',
      elapsedMs: performance.now() - started,
      warnings: [{ file: rulesDir, message: msg }],
    };
  }

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => e.name)
    .sort();

  const chunks = [];
  for (const name of mdFiles) {
    const full = path.join(rulesDir, name);
    try {
      chunks.push(fs.readFileSync(full, 'utf8'));
    } catch (err) {
      const msg =
        'Regra de celula ignorada: ' +
        name +
        ' ilegivel. Demais regras da celula foram carregadas.';
      warnings.push({ file: full, message: msg });
      _safeLog(sessionCtx, 'CIE-2', msg, {
        error: err && err.message ? err.message : String(err),
        path: full,
        activeCell: activeCell,
      });
    }
  }

  return {
    payload: chunks.join('\n\n'),
    layer: 'CIE-2',
    elapsedMs: performance.now() - started,
    warnings: warnings,
  };
}

function _normalizeLayerId(id) {
  if (typeof id !== 'string') return '';
  const upper = id.toUpperCase().replace(/_/g, '-');
  // Accept "CIE-0" / "cie-0" / "CIE0" shorthand.
  const m = upper.match(/^CIE-?(\d)$/);
  return m ? 'CIE-' + m[1] : upper;
}

const LAYER_DISPATCH = Object.freeze({
  'CIE-0': injectCommandments,
  'CIE-1': injectGlobalRules,
  'CIE-2': injectCellRules,
  'CIE-3': cie3Boot,
});

/**
 * Orchestrator — runs each requested layer sequentially, concatenates
 * payloads in the order requested, and returns combined metadata.
 *
 * Per-layer throws are caught and surfaced as warnings on the layer result.
 * The injection only throws for programmer errors (bad `layers` arg).
 *
 * @param {object} sessionCtx
 * @param {Array<string>} layers — e.g. ['CIE-0','CIE-1','CIE-2'].
 * @returns {{combinedPayload:string, perLayer:Array, totalMs:number}}
 */
function inject(sessionCtx, layers) {
  const started = performance.now();
  if (!Array.isArray(layers) || layers.length === 0) {
    throw new Error(
      'cie.inject: layers must be a non-empty array of layer ids (e.g. ["CIE-0","CIE-1","CIE-2"])'
    );
  }

  const perLayer = [];
  const payloads = [];

  for (const rawId of layers) {
    const id = _normalizeLayerId(rawId);
    const fn = LAYER_DISPATCH[id];
    if (!fn) {
      const msg =
        'Camada desconhecida ignorada: "' +
        String(rawId) +
        '". Camadas suportadas: ' +
        ALL_LAYER_IDS.join(', ') +
        '.';
      _safeLog(sessionCtx, id || String(rawId), msg, { requested: String(rawId) });
      perLayer.push({
        payload: '',
        layer: String(rawId),
        elapsedMs: 0,
        warnings: [{ message: msg }],
      });
      continue;
    }

    let result;
    try {
      result = fn(sessionCtx);
    } catch (err) {
      // Defence-in-depth: a layer should never throw (it handles its own
      // errors internally), but if it does, convert to a warning and move on.
      const msg =
        'Camada ' +
        id +
        ' lancou excecao inesperada. Prosseguindo com as camadas carregadas.';
      _safeLog(sessionCtx, id, msg, {
        error: err && err.message ? err.message : String(err),
      });
      result = {
        payload: '',
        layer: id,
        elapsedMs: 0,
        warnings: [{ message: msg }],
      };
    }

    perLayer.push(result);
    if (result.payload) {
      payloads.push(result.payload);
    }
  }

  const combinedPayload = payloads.join('\n\n');
  const totalMs = performance.now() - started;

  // Soft-cap observation (200ms guardrail, AC 5). We only log — never block —
  // because PRD § UserPromptSubmit severity is WARN.
  if (totalMs > 200) {
    _safeLog(
      sessionCtx,
      'orchestrator',
      'Injecao de rules excedeu 200ms. Prosseguindo com as camadas carregadas. Registro em .kaizen/logs/hook-calls/.',
      { totalMs: totalMs, layers: layers }
    );
  }

  return {
    combinedPayload: combinedPayload,
    perLayer: perLayer,
    totalMs: totalMs,
  };
}

module.exports = {
  inject: inject,
  injectCommandments: injectCommandments,
  injectGlobalRules: injectGlobalRules,
  injectCellRules: injectCellRules,
  // CIE-3 (M2.3) public surface.
  cie3Boot: cie3Boot,
  hasBooted: hasBooted,
  markBooted: markBooted,
  restoreBootedCellsFromSnapshot: restoreBootedCellsFromSnapshot,
  LAYER_IDS: LAYER_IDS,
  ALL_LAYER_IDS: ALL_LAYER_IDS,
  // Exposed for tests — allow overriding resolved paths via a setter is NOT
  // offered; tests use KAIZEN_LOGS_DIR + temp fixtures under the real project
  // root. Keeping the module stateless is intentional (see Dev Notes).
  _paths: Object.freeze({
    COMMANDMENTS_PATH: COMMANDMENTS_PATH,
    INSTRUCTIONS_DIR: INSTRUCTIONS_DIR,
    CELULAS_DIR: CELULAS_DIR,
  }),
  // Test-only helpers.
  _resetSessionStateForTests: _resetSessionStateForTests,
  _parseBootArray: _parseBootArray,
  _parseBootedCellsBlock: _parseBootedCellsBlock,
  _detectActivation: _detectActivation,
  _bootedCellsFile: _bootedCellsFile,
};
