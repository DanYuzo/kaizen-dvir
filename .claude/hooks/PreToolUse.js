'use strict';

/**
 * PreToolUse.js — KaiZen M2.4 hook entry point.
 *
 * Event-triggered gate that fires before every tool call. Enforces the two
 * NON-NEGOTIABLE Commandments at runtime:
 *   - Commandment I — CLI First
 *   - Commandment II — Authority Boundaries
 *
 * Scope (per story KZ-M2.4):
 *   - Reads the active cell id from session state; if none, applies
 *     Commandment I baseline only and skips Commandment II.
 *   - If a cell is active, loads `.kaizen-dvir/celulas/{cell}/celula.yaml`
 *     once and caches the parsed `authorities.exclusive` list in-memory
 *     (per KZ-M2-R4 mitigation).
 *   - Returns a verdict `{ verdict: 'PASS' | 'BLOCK', reason?, commandment? }`.
 *   - Logs every verdict (PASS and BLOCK) to `.kaizen/logs/gate-verdicts/`.
 *
 * Constraints honoured:
 *   - CON-002: CommonJS + ES2022.
 *   - CON-003: Node stdlib only. Minimal hand-rolled YAML reader for the
 *     flat `authorities.exclusive` list (documented below).
 *   - NFR-013 is owned by PreCompact, not this hook.
 *
 * Registers with the M2.1 hook-runner under event name `PreToolUse`. The
 * runner owns circuit-breaker + dispatch. This module exposes the handler
 * plus a pure `evaluate()` helper for tests.
 *
 * Commandment-I runtime scope (IMPORTANT — see story Dev Notes):
 *   Commandment I's full enforcement ("does a new UI feature have a CLI
 *   equivalent?") requires semantic analysis and lives in Quality Gate
 *   code review. Here we enforce ONLY the subset detectable from
 *   { tool_name, parameters } — concretely, a tool call whose parameters
 *   explicitly flag a UI-only path (e.g. `ui_only: true`, `surface: 'ui'`)
 *   with no CLI equivalent declared. This boundary is deliberate to
 *   prevent scope creep into @architect review.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// v1.7.3: simple local lookup. The full `dvir/` runtime tree is now copied
// into every target project at init-time, so this path is always resolvable
// post-init. See UserPromptSubmit.js for full rationale.
const HOOKS_DIR = path.resolve(PROJECT_ROOT, '.kaizen-dvir', 'dvir', 'hooks');
const RUNNER_PATH = path.join(HOOKS_DIR, 'hook-runner.js');
const LOG_WRITER_PATH = path.join(HOOKS_DIR, 'log-writer.js');

// Lazy so tests can override KAIZEN_LOGS_DIR before the module loads the
// log-writer singleton.
function _logWriter() {
  return require(LOG_WRITER_PATH);
}

// Canonical Commandment names — copied verbatim from
// `.kaizen-dvir/commandments.md` so the pt-BR block message cites the law
// by its canonical title (language policy: names are named artifacts, not
// translatable phrases).
const COMMANDMENT_I_NAME = 'CLI First';
const COMMANDMENT_II_NAME = 'Authority Boundaries';

// In-memory cache: { [cellName]: string[] } of authorities.exclusive.
// Cleared via `_resetCacheForTests()` between test runs.
const authoritiesCache = new Map();

/**
 * Read the active cell id from session state.
 *
 * Convention (established by M2.3): the active cell may be surfaced by
 * the payload, by env var `KAIZEN_ACTIVE_CELL`, or by a state file at
 * `.kaizen/state/active-cell`. We try the payload first (most explicit),
 * then env, then file, then null.
 *
 * @param {object} payload
 * @returns {string|null}
 */
function readActiveCell(payload) {
  if (payload && typeof payload.active_cell === 'string' && payload.active_cell.length > 0) {
    return payload.active_cell;
  }
  if (process.env.KAIZEN_ACTIVE_CELL && process.env.KAIZEN_ACTIVE_CELL.length > 0) {
    return process.env.KAIZEN_ACTIVE_CELL;
  }
  const file = path.join(PROJECT_ROOT, '.kaizen', 'state', 'active-cell');
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    return raw.length > 0 ? raw : null;
  } catch (_) {
    return null;
  }
}

/**
 * Minimal stdlib YAML reader: extracts the `authorities.exclusive` flat
 * string array from a `celula.yaml`. Does NOT attempt to be a general
 * YAML parser. Limits:
 *   - Only supports `authorities:` top-level mapping with an `exclusive:`
 *     child holding a block-style list of scalar strings
 *     (`  - "git push"` or `  - git_push`).
 *   - Ignores comments (lines whose first non-space char is `#`).
 *   - Quoted and unquoted scalars both accepted; surrounding quotes stripped.
 *   - Any other YAML shape → returns empty array (fail-closed).
 *
 * Flagged for @architect review (see story deliverable). If cells evolve
 * to express authorities as a nested structure, a real parser is required
 * (still stdlib-only, but out of scope for M2.4).
 *
 * @param {string} yamlText
 * @returns {string[]}
 */
function parseAuthoritiesExclusive(yamlText) {
  if (typeof yamlText !== 'string' || yamlText.length === 0) {
    return [];
  }
  const lines = yamlText.split(/\r?\n/);
  let inAuthorities = false;
  let inExclusive = false;
  let exclusiveIndent = -1;
  const out = [];
  for (const rawLine of lines) {
    // Strip trailing CR already handled. Strip comments on their own line.
    const stripped = rawLine.replace(/\s+$/u, '');
    if (stripped.length === 0) continue;
    const firstNonSpace = stripped.search(/\S/u);
    if (firstNonSpace === -1) continue;
    if (stripped[firstNonSpace] === '#') continue;

    // Top-level key detection: zero indent and ends with `:`.
    if (firstNonSpace === 0) {
      const key = stripped.replace(/:.*$/u, '').trim();
      inAuthorities = key === 'authorities';
      inExclusive = false;
      exclusiveIndent = -1;
      continue;
    }

    if (!inAuthorities) continue;

    // Inside `authorities:` — look for `  exclusive:` (indent > 0).
    if (!inExclusive) {
      const trimmed = stripped.trim();
      if (/^exclusive\s*:/u.test(trimmed)) {
        inExclusive = true;
        exclusiveIndent = firstNonSpace;
        continue;
      }
      // Any other authorities child — skip, but leave inAuthorities true
      // so we can still pick up `exclusive:` later in the block.
      continue;
    }

    // Inside `exclusive:` list. Expect list items at indent > exclusiveIndent.
    if (firstNonSpace <= exclusiveIndent) {
      // Left the exclusive block. Stop collecting.
      inExclusive = false;
      exclusiveIndent = -1;
      // Re-evaluate current line against outer state.
      if (firstNonSpace === 0) {
        const key = stripped.replace(/:.*$/u, '').trim();
        inAuthorities = key === 'authorities';
      }
      continue;
    }

    // Valid list entry: starts with `-` after the indent.
    const afterIndent = stripped.slice(firstNonSpace);
    if (afterIndent.startsWith('- ') || afterIndent === '-') {
      let value = afterIndent.slice(1).trim();
      // Strip optional surrounding quotes (double or single).
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value.length > 0) out.push(value);
    }
  }
  return out;
}

/**
 * Load and cache `authorities.exclusive` for a given cell.
 *
 * @param {string} cell
 * @returns {string[]}  Empty array if the cell has no celula.yaml or
 *                     no exclusive authorities. Fail-closed.
 */
function loadAuthoritiesExclusive(cell) {
  if (authoritiesCache.has(cell)) {
    return authoritiesCache.get(cell);
  }
  const yamlPath = path.join(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'celulas',
    cell,
    'celula.yaml'
  );
  let text;
  try {
    text = fs.readFileSync(yamlPath, 'utf8');
  } catch (_) {
    // No manifest → cell cannot grant authority beyond baseline.
    authoritiesCache.set(cell, []);
    return [];
  }
  const parsed = parseAuthoritiesExclusive(text);
  authoritiesCache.set(cell, parsed);
  return parsed;
}

/**
 * Normalize a tool name + first param for matching against authority
 * tokens. We match case-insensitively on the canonical tool name alone
 * and, when available, `{tool} {first_arg_head}` to catch patterns like
 * `git push`.
 *
 * @param {string} toolName
 * @param {object} parameters
 * @returns {string[]} tokens to try in order (first match wins)
 */
function toolTokens(toolName, parameters) {
  const out = [];
  if (typeof toolName !== 'string' || toolName.length === 0) return out;
  const name = toolName.trim();
  out.push(name);
  // Common shape: Bash tool with a `command` field — `git push ...`.
  if (parameters && typeof parameters.command === 'string') {
    const head = parameters.command.trim().split(/\s+/u).slice(0, 2).join(' ');
    if (head.length > 0) out.push(head);
    const first = parameters.command.trim().split(/\s+/u)[0];
    if (first && first.length > 0) out.push(first);
  }
  return out;
}

/**
 * Commandment I runtime check. Returns `null` on PASS, or a reason string
 * on BLOCK. Narrow by design — see module JSDoc.
 *
 * @param {string} toolName
 * @param {object} parameters
 * @returns {string|null}
 */
function checkCommandmentI(toolName, parameters) {
  if (!parameters || typeof parameters !== 'object') return null;
  // Explicit UI-only signals with no CLI equivalent declared.
  const uiOnly = parameters.ui_only === true || parameters.surface === 'ui';
  const hasCliEquivalent =
    typeof parameters.cli_equivalent === 'string' &&
    parameters.cli_equivalent.length > 0;
  if (uiOnly && !hasCliEquivalent) {
    return 'tool call emite efeito so em UI sem comando equivalente na CLI';
  }
  return null;
}

/**
 * Commandment II runtime check. Returns `null` on PASS, or a reason
 * string on BLOCK.
 *
 * Semantics: if `authorities.exclusive` is non-empty, the tool call must
 * match at least one token in the list. Empty list → no exclusive
 * authorities declared → fall back to baseline (PASS).
 *
 * @param {string} toolName
 * @param {object} parameters
 * @param {string[]} exclusive
 * @returns {string|null}
 */
function checkCommandmentII(toolName, parameters, exclusive) {
  if (!Array.isArray(exclusive) || exclusive.length === 0) return null;
  const tokens = toolTokens(toolName, parameters).map((t) => t.toLowerCase());
  const allowed = exclusive.map((e) => String(e).toLowerCase());
  const match = tokens.some((tok) => allowed.includes(tok));
  if (match) return null;
  const primary = tokens[tokens.length - 1] || toolName;
  return primary + ' nao esta em authorities.exclusive da celula ativa';
}

/**
 * Build the pt-BR BLOCK message per the canonical template.
 *
 * @param {'I'|'II'} roman
 * @param {string} name  canonical commandment name (English, verbatim)
 * @param {string} reason pt-BR short reason
 * @returns {string}
 */
function blockMessage(roman, name, reason) {
  return (
    'Bloqueado pelo Mandamento ' +
    roman +
    ' — ' +
    name +
    '. ' +
    reason +
    '. Delegue para quem tem autoridade ou ajuste o escopo da celula.'
  );
}

/**
 * Pure evaluation function — no file I/O, no logging. Exposed for tests.
 *
 * @param {object} input
 *   - tool_name: string
 *   - parameters: object
 *   - active_cell: string|null
 *   - authorities_exclusive: string[]   (caller resolves from cache)
 * @returns {{ verdict: 'PASS'|'BLOCK', reason?: string, commandment?: 'I'|'II' }}
 */
function evaluate(input) {
  const toolName = (input && input.tool_name) || '';
  const parameters = (input && input.parameters) || {};
  const activeCell = input && input.active_cell ? input.active_cell : null;
  const exclusive = (input && input.authorities_exclusive) || [];

  // Commandment I runs always (baseline).
  const iReason = checkCommandmentI(toolName, parameters);
  if (iReason) {
    return {
      verdict: 'BLOCK',
      commandment: 'I',
      reason: blockMessage('I', COMMANDMENT_I_NAME, iReason),
    };
  }

  // Commandment II only when a cell is active.
  if (activeCell !== null) {
    const iiReason = checkCommandmentII(toolName, parameters, exclusive);
    if (iiReason) {
      return {
        verdict: 'BLOCK',
        commandment: 'II',
        reason: blockMessage('II', COMMANDMENT_II_NAME, iiReason),
      };
    }
  }

  return { verdict: 'PASS' };
}

/**
 * The registered handler. Called by the M2.1 runner via `dispatch`.
 *
 * @param {object} payload
 *   - tool_name: string
 *   - parameters: object
 *   - session_id?: string
 *   - active_cell?: string  (optional override; otherwise resolved)
 * @returns {{ verdict: 'PASS'|'BLOCK', reason?: string, commandment?: 'I'|'II' }}
 */
function handle(payload) {
  const toolName = (payload && payload.tool_name) || '';
  const parameters = (payload && payload.parameters) || {};
  const sessionId =
    (payload && payload.session_id) ||
    'pid-' + process.pid + '-' + (process.env.KAIZEN_SESSION_ID || 'default');

  const activeCell =
    payload && payload.active_cell !== undefined
      ? payload.active_cell
      : readActiveCell(payload);

  const exclusive =
    activeCell !== null ? loadAuthoritiesExclusive(activeCell) : [];

  const result = evaluate({
    tool_name: toolName,
    parameters: parameters,
    active_cell: activeCell,
    authorities_exclusive: exclusive,
  });

  // Log verdict. Every call emits one entry — PASS or BLOCK.
  const entry = {
    timestamp: new Date().toISOString(),
    event_type: 'verdict',
    hook_name: 'PreToolUse',
    session_id: sessionId,
    tool_name: toolName,
    verdict: result.verdict,
    active_cell: activeCell,
  };
  if (result.commandment) entry.commandment_ref = result.commandment;
  if (result.reason) entry.reason = result.reason;

  try {
    _logWriter().write('gate-verdicts', entry);
  } catch (_) {
    // Logging failure must not escalate into a BLOCK for the tool call.
    // The outer runner tracks handler failures via exceptions — we swallow
    // here intentionally (M2.1-R2 pattern).
  }

  return result;
}

/**
 * Register handler with the M2.1 runner. Idempotent per test via
 * `_resetForTests()` on the runner.
 */
function register() {
  const runner = require(RUNNER_PATH);
  runner.register('PreToolUse', handle);
}

// Test helpers (prefix-underscored to keep production surface minimal).
function _resetCacheForTests() {
  authoritiesCache.clear();
}

module.exports = {
  register: register,
  handle: handle,
  evaluate: evaluate,
  parseAuthoritiesExclusive: parseAuthoritiesExclusive,
  loadAuthoritiesExclusive: loadAuthoritiesExclusive,
  blockMessage: blockMessage,
  COMMANDMENT_I_NAME: COMMANDMENT_I_NAME,
  COMMANDMENT_II_NAME: COMMANDMENT_II_NAME,
  _resetCacheForTests: _resetCacheForTests,
};
