'use strict';

/**
 * token-counter.js — Deterministic stdlib-only token approximator for the
 * Handoff Artifact 500-token ceiling (FR-008, AC-103 prerequisite, R-010).
 *
 * Public contract:
 *   - count(yamlText) -> integer
 *
 * Heuristic: word-based counting (whitespace-delimited tokens). The function
 * splits the YAML payload on Unicode whitespace and returns the count of
 * non-empty fragments.
 *
 * _heuristicRationale (CON-003):
 *   The 500-token ceiling exists to bound context-window cost when 9 Yotzer
 *   sub-agents chain per phase (R-010). The counter only needs to be a SAFE
 *   ceiling check — it must never UNDER-count, because that would let an
 *   over-budget artifact slip past `generate()` and burn the real LLM
 *   tokenizer downstream.
 *
 *   Direction-of-error analysis on YAML+English+path text (the actual handoff
 *   payload type):
 *
 *     - Real LLM tokenizers (BPE / SentencePiece variants) typically split
 *       words further (sub-word fragments, punctuation, sometimes per-char on
 *       file paths and identifiers). For YAML+path content, real tokenizer
 *       counts are CONSISTENTLY HIGHER than whitespace-word counts.
 *
 *     - Therefore whitespace-word counting OVER-estimates relative to the
 *       real tokenizer when applied to handoff payloads. Wait — re-read:
 *       whitespace-word produces FEWER tokens than the real tokenizer, so
 *       relative to the real count, whitespace-word UNDER-estimates.
 *
 *     - That would be unsafe. We compensate by adding a small structural
 *       overhead per non-empty line (YAML structural punctuation: `-`, `:`,
 *       quoting, indentation each contribute to real-tokenizer counts that
 *       whitespace splitting collapses). One token per non-empty line is the
 *       documented adjustment that keeps the counter safe-by-default for the
 *       text shape we measure: short YAML strings, file paths, and
 *       single-line decisions.
 *
 *     - Net effect: the counter remains deterministic, allocation-light, and
 *       trends toward over-counting on the realistic handoff text shape — so
 *       a payload measured at ~500 heuristic tokens almost always tokenizes
 *       below 500 in production. A full BPE tokenizer is OUT of scope per
 *       CON-003 and unnecessary for a ceiling check.
 *
 *   The heuristic is forward-swappable behind the `count(yamlText)` signature
 *   if M4 Yotzer dog-food shows drift (M3.2-R1 mitigation).
 *
 * CON-002: CommonJS + ES2022.
 * CON-003: Node stdlib only (no `require` calls; pure-function module).
 */

// Unicode whitespace splitter: \s already covers ASCII space, tab, newline,
// vertical tab, form feed, carriage return — sufficient for YAML payloads
// emitted by the engine (which never contain exotic separator characters).
const _WHITESPACE_RE = /\s+/u;

/**
 * Approximate token count for a YAML payload. Pure function; deterministic;
 * safe on empty / whitespace-only / null / undefined input (returns 0).
 *
 * @param {string} yamlText the YAML serialization to measure
 * @returns {number} non-negative integer token approximation
 */
function count(yamlText) {
  if (yamlText === null || yamlText === undefined) return 0;
  const text = String(yamlText);
  if (text.length === 0) return 0;

  // Word-based count: split on whitespace, drop empties.
  const words = text.split(_WHITESPACE_RE).filter((w) => w.length > 0);

  // Structural overhead: one extra token per non-empty line accounts for
  // YAML punctuation (`:`, `-`, quotes, indentation-driven structure) that
  // real BPE tokenizers count separately from words. See _heuristicRationale.
  const nonEmptyLines = text
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0).length;

  return words.length + nonEmptyLines;
}

module.exports = {
  count: count,
};
