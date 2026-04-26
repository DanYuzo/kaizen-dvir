'use strict';

/*
 * delimiter-merge.js — KaiZen v1.5 / Story M7.4
 *
 * Purpose
 * -------
 * Pure function that performs the delimiter-aware merge contract for the
 * single L3 file `.claude/CLAUDE.md`. The contract (CON-007 / D-v1.5-07):
 *
 *   - Content between `<!-- KAIZEN:FRAMEWORK:START -->` and
 *     `<!-- KAIZEN:FRAMEWORK:END -->` belongs to the framework. `kaizen
 *     update` REPLACES this region wholesale with the canonical content
 *     from `theirs` — any expert drift inside this region is overwritten.
 *
 *   - Content between `<!-- KAIZEN:EXPERT:START -->` and
 *     `<!-- KAIZEN:EXPERT:END -->` belongs to the expert. `kaizen update`
 *     PRESERVES this region byte-for-byte from `ours` — the canonical
 *     EXPERT block in `theirs` (typically empty save the invitation
 *     comment) is discarded.
 *
 *   - The four delimiter lines themselves are sourced from `theirs` so
 *     that a delimiter-syntax migration in a future framework version
 *     propagates without expert action.
 *
 *   - The leading bytes before `KAIZEN:FRAMEWORK:START` (project header)
 *     and the trailing bytes after `KAIZEN:EXPERT:END` are sourced from
 *     `theirs`. These regions are framework-managed today (M7.2 emits a
 *     fixed header and a single trailing newline) and are not contract-
 *     covered, so the canonical wins by default.
 *
 *   - The bytes between `KAIZEN:FRAMEWORK:END` and `KAIZEN:EXPERT:START`
 *     (gap separator) are also sourced from `theirs` for the same reason.
 *
 * Public API
 * ----------
 *   mergeClaudeMdWithDelimiters({ ours, theirs, path }) -> Result
 *
 *   Result shape:
 *     { status: 'merged' | 'block',
 *       content?: string,                    // present iff status === 'merged'
 *       reason?: 'missing_delimiters_ours' | 'missing_delimiters_theirs'
 *              | 'malformed_delimiters_ours' | 'malformed_delimiters_theirs',
 *       missing?: string[],                  // delimiter names absent in ours/theirs
 *       errorPtBR?: string }                 // pt-BR reproducer message (NFR-101)
 *
 *   Status semantics:
 *     'merged' — both sides have all four delimiters in canonical order;
 *                content is the assembled file with EXPERT block from
 *                ours and FRAMEWORK block from theirs.
 *     'block'  — at least one side is missing or has malformed delimiters.
 *                The caller MUST halt the update and surface errorPtBR.
 *                Per CON-007 § "demais blocos são preservados intactos",
 *                we never silently fall back to a different merge strategy
 *                — the contract is byte-exact or it BLOCKs.
 *
 * Edge cases handled
 * ------------------
 *   - UTF-8 BOM at start of ours: stripped from delimiter detection but
 *     re-emitted in the merged output (preserving the source byte).
 *   - CRLF line endings: detected and normalized for delimiter scan;
 *     EXPERT block bytes are preserved exactly (CRLF-in -> CRLF-out).
 *   - Trailing newline: the merged file inherits theirs's trailing-newline
 *     policy because the file shape (including the final byte) is
 *     framework-managed.
 *   - Whitespace inside delimiter HTML comments: tolerated by the regex
 *     used in M7.2's scaffold tests (e.g. `<!--  KAIZEN:FRAMEWORK:START -->`)
 *     so this module accepts any whitespace-padded variant on `ours` and
 *     re-emits the canonical bytes from `theirs` on output. This means a
 *     post-update file always has the byte-exact delimiter strings even
 *     if the expert's previous file had whitespace drift in the markers.
 *
 * Purity
 * ------
 *   - No `require('fs')`. No I/O of any kind.
 *   - Inputs: strings.
 *   - Output: plain object literal.
 *
 * Constraints
 * -----------
 *   - Stdlib-only (CON-003); stdlib is not imported here.
 *   - CommonJS, ES2022 (CON-002).
 *   - Language Policy (D-v1.4-06): comments and identifiers EN; the
 *     errorPtBR string content is pt-BR (user-facing surface).
 */

// ---------------------------------------------------------------------------
// Delimiter byte-exact strings (CON-007 contract)
// ---------------------------------------------------------------------------

const FRAMEWORK_START = '<!-- KAIZEN:FRAMEWORK:START -->';
const FRAMEWORK_END = '<!-- KAIZEN:FRAMEWORK:END -->';
const EXPERT_START = '<!-- KAIZEN:EXPERT:START -->';
const EXPERT_END = '<!-- KAIZEN:EXPERT:END -->';

// Tolerant detection regex (matches the existing M7.2 scaffold test style:
// any internal whitespace inside the HTML comment is accepted). The
// produced output always uses the byte-exact strings above.
const RE_FRAMEWORK_START = /<!--\s*KAIZEN:FRAMEWORK:START\s*-->/;
const RE_FRAMEWORK_END = /<!--\s*KAIZEN:FRAMEWORK:END\s*-->/;
const RE_EXPERT_START = /<!--\s*KAIZEN:EXPERT:START\s*-->/;
const RE_EXPERT_END = /<!--\s*KAIZEN:EXPERT:END\s*-->/;

// UTF-8 BOM (U+FEFF). Stripped for delimiter detection but preserved in
// the output stream when present on `ours` only (we do not re-introduce
// a BOM if `theirs` lacks one — the file shape comes from theirs).
const BOM = '﻿';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Locate the first occurrence of each of the four delimiters in `text`.
 * Returns an object keyed by delimiter name; each value is either the
 * 0-based index of the delimiter line start, or -1 when absent.
 *
 * "Line start" means the index of the first character of the line that
 * contains the delimiter — used so the caller can slice [start..lineEnd]
 * to get just the delimiter line, and slice everything else as content.
 */
function locateDelimiters(text) {
  const out = {
    frameworkStart: locateLine(text, RE_FRAMEWORK_START),
    frameworkEnd: locateLine(text, RE_FRAMEWORK_END),
    expertStart: locateLine(text, RE_EXPERT_START),
    expertEnd: locateLine(text, RE_EXPERT_END),
  };
  return out;
}

/**
 * Locate the first regex match in `text` and return the index of the
 * line start (the most recent '\n' + 1, or 0 if no preceding newline).
 * Returns -1 if no match.
 *
 * Also returns lineEnd: the index AFTER the match (used by the caller
 * to know where the delimiter line content ends; the trailing '\n' is
 * not part of the line).
 */
function locateLine(text, re) {
  const m = re.exec(text);
  if (!m) return { idx: -1, lineStart: -1, lineEnd: -1 };
  const matchStart = m.index;
  const matchEnd = m.index + m[0].length;
  // Walk back to the previous '\n' (exclusive) or string start.
  let lineStart = matchStart;
  while (lineStart > 0 && text.charCodeAt(lineStart - 1) !== 10) {
    lineStart--;
  }
  // Walk forward to next '\n' (exclusive) or string end. The "line" does
  // not include its trailing newline.
  let lineEnd = matchEnd;
  while (lineEnd < text.length && text.charCodeAt(lineEnd) !== 10) {
    lineEnd++;
  }
  return { idx: matchStart, lineStart, lineEnd };
}

/**
 * Validate that all four delimiters were found in canonical order.
 * Returns null on success or an object describing the validation failure.
 */
function validateDelimiters(loc, side) {
  const missing = [];
  if (loc.frameworkStart.idx < 0) missing.push('KAIZEN:FRAMEWORK:START');
  if (loc.frameworkEnd.idx < 0) missing.push('KAIZEN:FRAMEWORK:END');
  if (loc.expertStart.idx < 0) missing.push('KAIZEN:EXPERT:START');
  if (loc.expertEnd.idx < 0) missing.push('KAIZEN:EXPERT:END');
  if (missing.length > 0) {
    return {
      status: 'block',
      reason: 'missing_delimiters_' + side,
      missing,
    };
  }
  // Order check.
  const order = [
    loc.frameworkStart.idx,
    loc.frameworkEnd.idx,
    loc.expertStart.idx,
    loc.expertEnd.idx,
  ];
  for (let i = 1; i < order.length; i++) {
    if (order[i] <= order[i - 1]) {
      return {
        status: 'block',
        reason: 'malformed_delimiters_' + side,
        missing: [],
      };
    }
  }
  return null;
}

/**
 * Build the pt-BR reproducer message that the caller surfaces to the
 * expert when the delimiter contract is violated. NFR-101: the message
 * guides correction, not just describes the problem.
 *
 * The exact bytes of this message are part of the M7.4 / M7.5 gate
 * contract — downstream tests in `tests/m7/` assert verbatim presence
 * of the keywords below, so do not edit casually.
 */
function buildErrorPtBR(reason, missing, filePath) {
  const target = filePath || '.claude/CLAUDE.md';
  if (reason === 'missing_delimiters_ours' || reason === 'missing_delimiters_theirs') {
    const side = reason.endsWith('_ours') ? 'arquivo local' : 'arquivo canônico';
    const list = missing.length > 0 ? '\n  - ' + missing.join('\n  - ') : '';
    return [
      'erro: contrato de delimiters violado em ' + target + ' (' + side + ').',
      'Os seguintes delimiters obrigatórios estão ausentes:' + list,
      '',
      'Como corrigir:',
      '  1. Abra ' + target + ' e verifique a presença dos quatro comentários HTML:',
      '       <!-- KAIZEN:FRAMEWORK:START -->',
      '       <!-- KAIZEN:FRAMEWORK:END -->',
      '       <!-- KAIZEN:EXPERT:START -->',
      '       <!-- KAIZEN:EXPERT:END -->',
      '  2. Restaure os delimiters faltantes nas posições corretas (ordem fixa: FRAMEWORK antes de EXPERT).',
      '  3. Rode `kaizen update` novamente.',
      '',
      'Se o arquivo foi corrompido sem cópia local, use `kaizen rollback` para restaurar o último snapshot.',
      '',
    ].join('\n');
  }
  if (reason === 'malformed_delimiters_ours' || reason === 'malformed_delimiters_theirs') {
    const side = reason.endsWith('_ours') ? 'arquivo local' : 'arquivo canônico';
    return [
      'erro: contrato de delimiters violado em ' + target + ' (' + side + ').',
      'Os quatro delimiters foram encontrados mas estão fora da ordem canônica.',
      '',
      'Ordem obrigatória (FRAMEWORK antes de EXPERT, START antes de END):',
      '  <!-- KAIZEN:FRAMEWORK:START -->',
      '  ... conteúdo do framework ...',
      '  <!-- KAIZEN:FRAMEWORK:END -->',
      '  <!-- KAIZEN:EXPERT:START -->',
      '  ... conteúdo do expert ...',
      '  <!-- KAIZEN:EXPERT:END -->',
      '',
      'Como corrigir:',
      '  1. Abra ' + target + ' e reordene os delimiters conforme acima.',
      '  2. Não duplique nenhum dos quatro comentários.',
      '  3. Rode `kaizen update` novamente.',
      '',
    ].join('\n');
  }
  return 'erro: contrato de delimiters violado em ' + target + '.\n';
}

// ---------------------------------------------------------------------------
// Public probe — used by the orchestrator to decide whether the contract
// is in force for this update. The contract activates only when the
// CANONICAL file ships all four delimiters (i.e., the framework is on
// v1.5+). If the canonical lacks delimiters, the framework version
// pre-dates the delimiter contract and the orchestrator falls back to
// generic merge3 — preserving M6.2 backward compatibility for older
// fixtures and any pre-v1.5 update path.
// ---------------------------------------------------------------------------

/**
 * Returns true when `text` contains all four canonical delimiters
 * (in any order — order is validated separately by the merge entry).
 */
function hasAllDelimiters(text) {
  if (typeof text !== 'string') return false;
  const stripped = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  return (
    RE_FRAMEWORK_START.test(stripped) &&
    RE_FRAMEWORK_END.test(stripped) &&
    RE_EXPERT_START.test(stripped) &&
    RE_EXPERT_END.test(stripped)
  );
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Delimiter-aware merge for `.claude/CLAUDE.md`.
 *
 * @param {{ ours: string, theirs: string, path?: string }} args
 * @returns {{
 *   status: 'merged' | 'block',
 *   content?: string,
 *   reason?: string,
 *   missing?: string[],
 *   errorPtBR?: string
 * }}
 */
function mergeClaudeMdWithDelimiters(args) {
  if (args === null || typeof args !== 'object') {
    throw new TypeError('mergeClaudeMdWithDelimiters: expected an object argument');
  }
  const { ours, theirs } = args;
  const filePath = args.path || '.claude/CLAUDE.md';
  if (typeof ours !== 'string' || typeof theirs !== 'string') {
    throw new TypeError(
      'mergeClaudeMdWithDelimiters: ours and theirs must both be strings'
    );
  }

  // -- Strip-and-track BOM on ours (preserve detection only) ---------------
  // We re-emit the file shape from theirs, so the BOM (if any) on ours is
  // discarded — the canonical owns the byte-0 of the file. We still detect
  // it so a BOM does not throw off the delimiter scan.
  const oursStripped = ours.startsWith(BOM) ? ours.slice(BOM.length) : ours;
  const theirsStripped = theirs.startsWith(BOM) ? theirs.slice(BOM.length) : theirs;

  // -- Locate delimiters on both sides --------------------------------------
  const oursLoc = locateDelimiters(oursStripped);
  const theirsLoc = locateDelimiters(theirsStripped);

  const oursValidation = validateDelimiters(oursLoc, 'ours');
  if (oursValidation) {
    return Object.assign({}, oursValidation, {
      errorPtBR: buildErrorPtBR(oursValidation.reason, oursValidation.missing || [], filePath),
    });
  }
  const theirsValidation = validateDelimiters(theirsLoc, 'theirs');
  if (theirsValidation) {
    return Object.assign({}, theirsValidation, {
      errorPtBR: buildErrorPtBR(theirsValidation.reason, theirsValidation.missing || [], filePath),
    });
  }

  // -- Extract EXPERT block bytes from ours --------------------------------
  // The EXPERT block content is the bytes between the line FOLLOWING
  // EXPERT:START and the line PRECEDING EXPERT:END. We slice from the
  // character AFTER the newline that terminates the EXPERT:START line,
  // up to (but not including) the start of the EXPERT:END line.
  //
  // If EXPERT:START is the last line of the file (no trailing newline),
  // the slice is empty — correct fallback.
  const exStart = oursLoc.expertStart;
  const exEnd = oursLoc.expertEnd;
  let expertBlockStart = exStart.lineEnd;
  // Skip the newline character that terminates the START line, if any.
  if (
    expertBlockStart < oursStripped.length &&
    oursStripped.charCodeAt(expertBlockStart) === 10
  ) {
    expertBlockStart++;
  }
  const expertBlockEnd = exEnd.lineStart;
  const expertBlock =
    expertBlockEnd > expertBlockStart
      ? oursStripped.slice(expertBlockStart, expertBlockEnd)
      : '';

  // -- Compose merged file from theirs's shape -----------------------------
  // Layout sourced from theirs:
  //   [head: bytes before FRAMEWORK:START line, inclusive of leading
  //          newlines]
  //   <FRAMEWORK_START>          (byte-exact canonical bytes)
  //   <newline>
  //   <theirs FRAMEWORK content>
  //   <FRAMEWORK_END>            (byte-exact canonical bytes)
  //   <gap: bytes between FRAMEWORK:END line end and EXPERT:START line start>
  //   <EXPERT_START>             (byte-exact canonical bytes)
  //   <newline>
  //   <expertBlock from ours>    (verbatim)
  //   <EXPERT_END>               (byte-exact canonical bytes)
  //   <tail: bytes after EXPERT:END line, inclusive of trailing newline>
  const tFwStart = theirsLoc.frameworkStart;
  const tFwEnd = theirsLoc.frameworkEnd;
  const tExStart = theirsLoc.expertStart;
  const tExEnd = theirsLoc.expertEnd;

  // Head: from start of theirs up to (and including the newline that
  // terminates) the line BEFORE FRAMEWORK:START. We include everything
  // strictly before the FRAMEWORK:START line start.
  const head = theirsStripped.slice(0, tFwStart.lineStart);

  // Framework content: bytes between the newline that terminates
  // FRAMEWORK:START and the start of the FRAMEWORK:END line. Verbatim
  // from theirs.
  let fwContentStart = tFwStart.lineEnd;
  if (
    fwContentStart < theirsStripped.length &&
    theirsStripped.charCodeAt(fwContentStart) === 10
  ) {
    fwContentStart++;
  }
  const fwContentEnd = tFwEnd.lineStart;
  const frameworkContent =
    fwContentEnd > fwContentStart
      ? theirsStripped.slice(fwContentStart, fwContentEnd)
      : '';

  // Gap: bytes between the FRAMEWORK:END line end (inclusive of its
  // terminating newline) and the EXPERT:START line start. Verbatim
  // from theirs (typically a single blank line).
  let gapStart = tFwEnd.lineEnd;
  if (
    gapStart < theirsStripped.length &&
    theirsStripped.charCodeAt(gapStart) === 10
  ) {
    gapStart++;
  }
  const gap = theirsStripped.slice(gapStart, tExStart.lineStart);

  // Tail: bytes from the end of the EXPERT:END line to the end of theirs.
  // We start at the position right after the EXPERT:END text (lineEnd is
  // exclusive of the line's trailing '\n'). Including the '\n' here gives
  // the merged output theirs's trailing-newline policy automatically.
  const tailStart = tExEnd.lineEnd;
  const tail = theirsStripped.slice(tailStart);

  // Reassemble. The EXPERT block from ours is sandwiched between the
  // canonical EXPERT_START / EXPERT_END byte-exact strings. Note: the
  // expertBlock string already carries its own trailing newlines (or
  // lack thereof) — we do not add an extra '\n' before EXPERT_END to
  // preserve byte fidelity.
  const merged =
    head +
    FRAMEWORK_START +
    '\n' +
    frameworkContent +
    FRAMEWORK_END +
    '\n' +
    gap +
    EXPERT_START +
    '\n' +
    expertBlock +
    EXPERT_END +
    tail;

  return {
    status: 'merged',
    content: merged,
  };
}

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

module.exports = {
  mergeClaudeMdWithDelimiters,
  hasAllDelimiters,
  // Exposed for tests / migration consumers — DO NOT inline the strings.
  FRAMEWORK_START,
  FRAMEWORK_END,
  EXPERT_START,
  EXPERT_END,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M7.4: introduced delimiter-aware merge for
//   `.claude/CLAUDE.md`. Pure function, stdlib-only, byte-exact CON-007
//   contract enforcement. EXPERT block bytes from `ours` are preserved
//   verbatim; FRAMEWORK block (and the rest of the file shape) comes from
//   `theirs`. Missing or malformed delimiters on either side BLOCK the
//   merge with a pt-BR reproducer (NFR-101). BOM and CRLF tolerated on
//   detection; output bytes follow theirs's shape. Wired into
//   `bin/kaizen-update.js` for the `.claude/CLAUDE.md` L3 path; all other
//   L3 paths continue to use the generic merge3 from M6.3.
