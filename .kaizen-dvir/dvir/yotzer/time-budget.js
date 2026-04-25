'use strict';

/**
 * time-budget.js — KaiZen M4.6 Time-Budget Measurement Harness.
 *
 * Story M4.6 — Yotzer end-to-end time instrumentation. Measures the M4
 * Gate criterion SM-01: end-to-end cell generation under 4 hours of
 * active expert work.
 *
 * "Active expert work" definition (PRD §M4 verbatim):
 *   Cumulative time the expert spends reading prompts, answering
 *   elicitations, and validating Playback Gates across the 10 phases
 *   (F1 through F10). Idle time between phases AND autonomous sub-agent
 *   execution do NOT count.
 *
 *   The harness instruments `phase_start` when chief presents a prompt
 *   or Playback Gate to the expert, and `phase_end` when the expert
 *   submits a response. The delta (phase_end - phase_start) accrues to
 *   the cumulative active-expert-time budget. Idle time between phases
 *   (e.g. archaeologist processing sources between F2 and F3) is NOT
 *   stamped — that is autonomous sub-agent execution.
 *
 * Public contract (FROZEN):
 *
 *   measurePhaseBoundary({ workId, phase, boundary, clock?, interaction? })
 *     -> { workId, phase, boundary, ts, interaction }
 *
 *       Stamps `phase_start` or `phase_end` for an expert interaction.
 *       Persists the stamp to .kaizen/state/yotzer/<workId>/time-budget.yaml
 *       (append-only). `clock` is the deterministic clock injection seam
 *       (defaults to Date.now). `interaction` is a stable identifier so
 *       multiple expert interactions in the same phase are paired
 *       correctly (defaults to '<phase>:default').
 *
 *   aggregate({ workId }) -> {
 *     workId, intervals: Array<{ phase, interaction, startMs, endMs, deltaMs }>,
 *     phaseTotals: Record<phase, ms>,
 *     cumulativeMs, cumulativeHours, budgetMs, withinBudget
 *   }
 *
 *       Reads the stamp file, pairs every phase_start with its phase_end
 *       by (phase, interaction). Unpaired starts are dropped (autonomous
 *       sub-agent crashed before completion — does not count). Returns
 *       per-phase totals + cumulative active-expert time.
 *
 *   emitBudgetWarning(cumulativeMs, projectedMs, opts?)
 *     -> { warned: boolean, message: string }
 *
 *       Emits pt-BR warning when `projectedMs > 4h`. Actionable hint
 *       suggests mode switch to automatic or test-domain reduction.
 *
 *   resetWorkBudget({ workId }) -> void
 *
 *       Clears the time-budget stamp file for a work-id. Used by tests
 *       and only when explicitly invoked (never automatic).
 *
 * Storage layout (gitignored — CON-004):
 *   .kaizen/state/yotzer/<workId>/time-budget.yaml
 *
 * Override for tests: KAIZEN_STATE_DIR (mirrors KAIZEN_HANDOFFS_DIR
 * convention from M3.2). Override clock via the `clock` option per call
 * (deterministic test fixtures replay time without wall-clock drift —
 * M4.6-R1 mitigation).
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06 — pt-BR for surfaced warnings.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const VALID_BOUNDARIES = ['start', 'end'];

function _stateRoot() {
  if (process.env.KAIZEN_STATE_DIR) return process.env.KAIZEN_STATE_DIR;
  return path.join(PROJECT_ROOT, '.kaizen', 'state');
}

function _budgetFilePath(workId) {
  return path.join(_stateRoot(), 'yotzer', workId, 'time-budget.yaml');
}

function _yamlEscape(s) {
  return String(s)
    .replace(/\\/gu, '\\\\')
    .replace(/"/gu, '\\"');
}

function _emitStampLine(stamp) {
  return [
    '- phase: "' + _yamlEscape(stamp.phase) + '"',
    '  boundary: "' + _yamlEscape(stamp.boundary) + '"',
    '  interaction: "' + _yamlEscape(stamp.interaction) + '"',
    '  ts: ' + stamp.ts,
  ].join('\n') + '\n';
}

function _readStamps(workId) {
  const filePath = _budgetFilePath(workId);
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/u);
  const stamps = [];
  let cur = null;
  for (const raw of lines) {
    if (raw.length === 0) continue;
    const m = /^-\s+phase:\s+"([^"]*)"\s*$/u.exec(raw);
    if (m) {
      if (cur) stamps.push(cur);
      cur = { phase: m[1], boundary: null, interaction: null, ts: null };
      continue;
    }
    if (!cur) continue;
    let mm = /^\s+boundary:\s+"([^"]*)"\s*$/u.exec(raw);
    if (mm) {
      cur.boundary = mm[1];
      continue;
    }
    mm = /^\s+interaction:\s+"([^"]*)"\s*$/u.exec(raw);
    if (mm) {
      cur.interaction = mm[1];
      continue;
    }
    mm = /^\s+ts:\s+(-?\d+)\s*$/u.exec(raw);
    if (mm) {
      cur.ts = Number(mm[1]);
      continue;
    }
  }
  if (cur) stamps.push(cur);
  return stamps.filter(
    (s) =>
      typeof s.phase === 'string' &&
      typeof s.boundary === 'string' &&
      typeof s.interaction === 'string' &&
      typeof s.ts === 'number'
  );
}

/**
 * Stamp a phase boundary for an expert interaction.
 *
 * @param {object} args
 * @param {string} args.workId
 * @param {string} args.phase            — e.g. 'F1', 'F2', ..., 'F10'
 * @param {string} args.boundary         — 'start' | 'end'
 * @param {function} [args.clock]        — deterministic clock seam (defaults Date.now)
 * @param {string} [args.interaction]    — interaction identifier (defaults '<phase>:default')
 * @returns {{workId: string, phase: string, boundary: string, ts: number, interaction: string}}
 */
function measurePhaseBoundary(args) {
  if (!args || typeof args !== 'object') {
    throw new Error('time-budget: argumento ausente em measurePhaseBoundary.');
  }
  const workId = args.workId;
  const phase = args.phase;
  const boundary = args.boundary;
  if (typeof workId !== 'string' || workId.length === 0) {
    throw new Error('time-budget: workId obrigatorio.');
  }
  if (typeof phase !== 'string' || phase.length === 0) {
    throw new Error('time-budget: phase obrigatorio.');
  }
  if (VALID_BOUNDARIES.indexOf(boundary) === -1) {
    throw new Error(
      'time-budget: boundary invalido. use "start" ou "end".'
    );
  }
  const clock = typeof args.clock === 'function' ? args.clock : Date.now;
  const interaction =
    typeof args.interaction === 'string' && args.interaction.length > 0
      ? args.interaction
      : phase + ':default';
  const ts = clock();
  const stamp = {
    workId: workId,
    phase: phase,
    boundary: boundary,
    interaction: interaction,
    ts: ts,
  };
  const filePath = _budgetFilePath(workId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, _emitStampLine(stamp), 'utf8');
  return stamp;
}

/**
 * Aggregate stamped intervals into cumulative active-expert time.
 *
 * @param {object} args
 * @param {string} args.workId
 * @returns {{workId: string, intervals: Array, phaseTotals: object, cumulativeMs: number, cumulativeHours: number, budgetMs: number, withinBudget: boolean}}
 */
function aggregate(args) {
  if (!args || typeof args !== 'object' || typeof args.workId !== 'string') {
    throw new Error('time-budget: workId obrigatorio em aggregate.');
  }
  const workId = args.workId;
  const stamps = _readStamps(workId);
  // Pair starts with ends by (phase, interaction).
  const starts = new Map();
  const intervals = [];
  for (const s of stamps) {
    const key = s.phase + '|' + s.interaction;
    if (s.boundary === 'start') {
      // Latest start wins if duplicate (defensive).
      starts.set(key, s.ts);
    } else if (s.boundary === 'end') {
      const startTs = starts.get(key);
      if (typeof startTs === 'number') {
        const deltaMs = Math.max(0, s.ts - startTs);
        intervals.push({
          phase: s.phase,
          interaction: s.interaction,
          startMs: startTs,
          endMs: s.ts,
          deltaMs: deltaMs,
        });
        starts.delete(key);
      }
      // Unpaired end: ignore (defensive).
    }
  }
  const phaseTotals = {};
  let cumulativeMs = 0;
  for (const iv of intervals) {
    cumulativeMs += iv.deltaMs;
    if (typeof phaseTotals[iv.phase] !== 'number') phaseTotals[iv.phase] = 0;
    phaseTotals[iv.phase] += iv.deltaMs;
  }
  const cumulativeHours = cumulativeMs / (60 * 60 * 1000);
  return {
    workId: workId,
    intervals: intervals,
    phaseTotals: phaseTotals,
    cumulativeMs: cumulativeMs,
    cumulativeHours: cumulativeHours,
    budgetMs: FOUR_HOURS_MS,
    withinBudget: cumulativeMs <= FOUR_HOURS_MS,
  };
}

/**
 * Emit pt-BR warning when projected cumulative time exceeds 4h budget.
 * Returns `{ warned: false }` when within budget, otherwise the rendered
 * warning string and `warned: true`. The harness does NOT decide what to
 * do with the warning — chief routes it to the expert via the standard
 * elicitation channel.
 *
 * @param {number} cumulativeMs
 * @param {number} projectedMs
 * @param {object} [opts]
 * @returns {{warned: boolean, message: string}}
 */
function emitBudgetWarning(cumulativeMs, projectedMs, opts) {
  const _opts = opts || {};
  const budgetMs = typeof _opts.budgetMs === 'number' ? _opts.budgetMs : FOUR_HOURS_MS;
  if (projectedMs <= budgetMs) {
    return { warned: false, message: '' };
  }
  const projectedH = (projectedMs / (60 * 60 * 1000)).toFixed(2);
  const cumulativeH = (cumulativeMs / (60 * 60 * 1000)).toFixed(2);
  const message =
    'Aviso: tempo ativo projetado ' +
    projectedH +
    ' h excede orcamento de 4 h (acumulado atual ' +
    cumulativeH +
    ' h). Considere trocar para modo automatico ou reduzir dominio de teste.';
  return { warned: true, message: message };
}

/**
 * Reset the time-budget stamp file for a work-id. Test-only helper —
 * never called automatically.
 *
 * @param {object} args
 * @param {string} args.workId
 */
function resetWorkBudget(args) {
  if (!args || typeof args.workId !== 'string') return;
  const filePath = _budgetFilePath(args.workId);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {
    // best-effort
  }
}

module.exports = {
  measurePhaseBoundary: measurePhaseBoundary,
  aggregate: aggregate,
  emitBudgetWarning: emitBudgetWarning,
  resetWorkBudget: resetWorkBudget,
  FOUR_HOURS_MS: FOUR_HOURS_MS,
  _budgetFilePath: _budgetFilePath,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M4.6: created the time-budget harness.
//   Instruments chief's phase orchestration via measurePhaseBoundary; pairs
//   phase_start with phase_end by (phase, interaction); aggregates cumulative
//   active-expert time; emits pt-BR warning when projected total exceeds 4h.
//   Deterministic clock injection seam documented in the module header
//   (M4.6-R1 mitigation).
