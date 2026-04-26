'use strict';

/*
 * merge.js — 3-way merge library (stdlib only)
 *
 * Story: M6.3 — 3-Way Merge Library in stdlib (`merge3`)
 * Epic:  KZ-M6 — Distribution & Update System
 *
 * PURPOSE
 *   Pure function that performs a line-based 3-way merge over three string
 *   inputs (base, ours, theirs) and returns a structured result. Consumed by
 *   the `kaizen update` engine (M6.2) to merge L3 framework files while
 *   preserving expert customizations.
 *
 * PUBLIC API
 *   merge3({ base, ours, theirs, path }) -> Result
 *
 *   Result shape:
 *     { status: "clean"  | "merged" | "conflict",
 *       content?: string,
 *       conflicts?: Array<{ start: number, end: number, ours: string, theirs: string }> }
 *
 *   Parameters:
 *     base   — canonical content from the previously installed version.
 *              Resolved by the caller from snapshot or N-1 manifest.
 *     ours   — current local file content. The expert may have edited this.
 *     theirs — canonical content from the new target version.
 *     path   — relative path of the file being merged. Used only for diagnostic
 *              echoing in the result; merge3 itself does NOT read or write the
 *              filesystem.
 *
 *   Status semantics:
 *     "clean"    — no change on either side; content === ours === theirs.
 *     "merged"   — at least one side changed and the merge succeeded with no
 *                  conflicts. content holds the merged result.
 *     "conflict" — overlapping edits detected. content is set to `ours`
 *                  (preserve-ours fallback per KZ-M6-R1). conflicts is a
 *                  non-empty array of conflict regions; each region carries
 *                  the line range in `base` (start/end, 0-indexed,
 *                  half-open: [start, end)) and the ours/theirs strings.
 *
 *   Trivial cases (short-circuit before diff):
 *     A. ours === theirs       -> { status: "clean",  content: ours }
 *     B. ours === base         -> { status: "merged", content: theirs }
 *     C. theirs === base       -> { status: "merged", content: ours }
 *
 *   Non-trivial: classic LCS-based hunk computation against base; non-
 *   overlapping hunks from both sides apply cleanly; overlapping hunks form
 *   conflict regions.
 *
 *   Ambiguous-conflict fallback (KZ-M6-R1):
 *     If overlapping edits cannot be cleanly partitioned, the result is
 *     { status: "conflict", content: ours, conflicts: [...] }. The original
 *     file on disk is left untouched (the caller writes adjacent .ours/.theirs
 *     files). This prevents silent overwrite of expert work.
 *
 * EXPORTED CONFLICT MARKER LABELS (pt-BR — user-facing per Language Policy)
 *   MERGE_LABEL_OURS    — label written by the caller into `{path}.ours`.
 *   MERGE_LABEL_THEIRS  — label written by the caller into `{path}.theirs`.
 *   These constants are exported here so the caller (M6.2) can import them
 *   without duplicating the strings. merge3 itself never emits these labels.
 *
 * PURITY
 *   - No `require('fs')` in this file.
 *   - No `process.exit`, no console output, no I/O of any kind.
 *   - Inputs: strings (or empty strings to represent deleted files).
 *   - Output: plain object literal.
 *
 * SCOPE OUT (deferred for v1.5)
 *   - Renamed-file detection (treat as delete+add at the caller).
 *   - Binary file merge (L3 is text-only).
 *   - Structured-format semantic merge (parsed-tree YAML/JSON merge).
 *
 * DEPENDENCIES
 *   None. Stdlib-only and stdlib is not imported here. CON-003 compliant.
 */

// ---------------------------------------------------------------------------
// pt-BR conflict marker labels (Language Policy: user-facing strings)
// ---------------------------------------------------------------------------

const MERGE_LABEL_OURS = '// === KAIZEN: versão sua (suas mudanças) ===';
const MERGE_LABEL_THEIRS = '// === KAIZEN: nova versão do framework ===';

// ---------------------------------------------------------------------------
// Internal helpers — line manipulation
// ---------------------------------------------------------------------------

/**
 * Split a string into a tuple [lines, trailingNewline] such that joining the
 * lines with "\n" and appending a "\n" if trailingNewline === true reproduces
 * the original input exactly. An empty string yields { lines: [], trailing: false }.
 */
function splitLines(s) {
  if (s === '') return { lines: [], trailing: false };
  const trailing = s.endsWith('\n');
  const trimmed = trailing ? s.slice(0, -1) : s;
  const lines = trimmed.split('\n');
  return { lines, trailing };
}

/**
 * Inverse of splitLines: join an array of lines back into a string preserving
 * the trailing-newline convention.
 */
function joinLines(lines, trailing) {
  if (lines.length === 0) return trailing ? '\n' : '';
  return lines.join('\n') + (trailing ? '\n' : '');
}

// ---------------------------------------------------------------------------
// LCS-based diff between two line arrays
// ---------------------------------------------------------------------------

/**
 * Compute the Longest Common Subsequence table between two line arrays.
 * Returns a 2-D array `lcs` where lcs[i][j] is the length of the LCS of
 * a[0..i) and b[0..j).
 */
function lcsTable(a, b) {
  const n = a.length;
  const m = b.length;
  const tbl = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    tbl[i] = new Array(m + 1).fill(0);
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) {
        tbl[i][j] = tbl[i - 1][j - 1] + 1;
      } else {
        tbl[i][j] = tbl[i - 1][j] >= tbl[i][j - 1] ? tbl[i - 1][j] : tbl[i][j - 1];
      }
    }
  }
  return tbl;
}

/**
 * Walk the LCS table to produce a sequence of edit operations transforming
 * `a` (the base) into `b` (a side). Returns an array of hunks where each
 * hunk has shape:
 *   { baseStart, baseEnd, replacement: string[] }
 * meaning: replace base lines [baseStart, baseEnd) with the lines in
 * `replacement`. baseStart === baseEnd means a pure insertion. replacement
 * length 0 means a pure deletion. Equal regions between hunks correspond
 * to LCS matches and carry no hunk.
 */
function diffHunks(a, b) {
  const tbl = lcsTable(a, b);
  // Backtrack to assemble the LCS path as a list of (i, j) match pairs in
  // increasing order.
  const matches = [];
  {
    let i = a.length;
    let j = b.length;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        matches.push([i - 1, j - 1]);
        i--;
        j--;
      } else if (tbl[i - 1][j] >= tbl[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    matches.reverse();
  }

  // Walk the matches to emit hunks for the gaps between matches.
  const hunks = [];
  let prevA = 0;
  let prevB = 0;
  for (const [ia, ib] of matches) {
    if (ia > prevA || ib > prevB) {
      hunks.push({
        baseStart: prevA,
        baseEnd: ia,
        replacement: b.slice(prevB, ib),
      });
    }
    prevA = ia + 1;
    prevB = ib + 1;
  }
  // Trailing gap after the last match (or the entire range if no match).
  if (prevA < a.length || prevB < b.length) {
    hunks.push({
      baseStart: prevA,
      baseEnd: a.length,
      replacement: b.slice(prevB, b.length),
    });
  }
  return hunks;
}

// ---------------------------------------------------------------------------
// 3-way merge core
// ---------------------------------------------------------------------------

/**
 * Determine whether two base ranges overlap. Each range is [start, end);
 * a zero-width range at position p (start === end === p) overlaps a non-empty
 * range [s, e) iff s <= p < e. Two zero-width ranges at the same position
 * are treated as overlapping (both sides inserting at the same point).
 */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (aStart === aEnd && bStart === bEnd) {
    return aStart === bStart;
  }
  if (aStart === aEnd) {
    return aStart >= bStart && aStart < bEnd;
  }
  if (bStart === bEnd) {
    return bStart >= aStart && bStart < aEnd;
  }
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compare two replacement arrays for line-by-line equality.
 */
function sameReplacement(r1, r2) {
  if (r1.length !== r2.length) return false;
  for (let i = 0; i < r1.length; i++) {
    if (r1[i] !== r2[i]) return false;
  }
  return true;
}

/**
 * Merge two hunk arrays against a shared base. Returns either:
 *   { ok: true, mergedLines: string[], trailing: boolean }
 * or
 *   { ok: false, conflicts: Array<{start,end,ours,theirs}> }
 */
function mergeHunks(baseLines, baseTrailing, oursHunks, theirsHunks, oursTrailing, theirsTrailing) {
  // Walk both hunk lists in parallel order of their baseStart positions and
  // detect overlaps.
  const conflicts = [];
  const merged = []; // sequence of { kind: 'keep'|'replace', start, end, lines }

  // For deterministic ordering, sort by baseStart then baseEnd.
  const sortFn = (a, b) => a.baseStart - b.baseStart || a.baseEnd - b.baseEnd;
  const O = oursHunks.slice().sort(sortFn);
  const T = theirsHunks.slice().sort(sortFn);

  let oi = 0;
  let ti = 0;
  let cursor = 0; // current position in baseLines fully consumed

  while (oi < O.length || ti < T.length) {
    const o = oi < O.length ? O[oi] : null;
    const t = ti < T.length ? T[ti] : null;

    // Pick the next hunk by earliest baseStart; ties prefer ours so iteration
    // is deterministic.
    let pick;
    if (!o) pick = 't';
    else if (!t) pick = 'o';
    else if (o.baseStart < t.baseStart) pick = 'o';
    else if (t.baseStart < o.baseStart) pick = 't';
    else pick = 'both'; // same baseStart — investigate overlap

    if (pick === 'both' || (o && t && rangesOverlap(o.baseStart, o.baseEnd, t.baseStart, t.baseEnd))) {
      // Overlap detected: union the base ranges, then check whether both
      // sides agree (both-sides-same-edit -> merged) or disagree (-> conflict).
      const start = Math.min(o.baseStart, t.baseStart);
      const end = Math.max(o.baseEnd, t.baseEnd);

      // Special case: identical edits over the same exact range are a clean merge.
      if (
        o.baseStart === t.baseStart &&
        o.baseEnd === t.baseEnd &&
        sameReplacement(o.replacement, t.replacement)
      ) {
        if (start > cursor) merged.push({ kind: 'keep', start: cursor, end: start });
        merged.push({ kind: 'replace', start, end, lines: o.replacement.slice() });
        cursor = end;
        oi++;
        ti++;
        continue;
      }

      // Otherwise: conflict over the union of the ranges.
      // Pull base lines for the conflict region (informative only).
      // Build the ours and theirs slices for the conflict region:
      //   ours-slice  = baseLines[start..o.baseStart) + o.replacement + baseLines[o.baseEnd..end)
      //   theirs-slice = baseLines[start..t.baseStart) + t.replacement + baseLines[t.baseEnd..end)
      const oursSlice = baseLines.slice(start, o.baseStart).concat(o.replacement, baseLines.slice(o.baseEnd, end));
      const theirsSlice = baseLines.slice(start, t.baseStart).concat(t.replacement, baseLines.slice(t.baseEnd, end));

      conflicts.push({
        start,
        end,
        ours: oursSlice.length === 0 ? '' : oursSlice.join('\n'),
        theirs: theirsSlice.length === 0 ? '' : theirsSlice.join('\n'),
      });

      // Advance past both hunks; further overlapping hunks may be added to
      // the same conflict region by sweeping while overlap continues.
      oi++;
      ti++;
      let regionEnd = end;

      // Coalesce any subsequent hunk on either side that still overlaps this
      // conflict region — a single conflict region may absorb multiple hunks.
      // (This keeps the conflicts array shape simple for the caller.)
      // No-op: subsequent overlap is handled naturally by the next iteration
      // because we advanced the cursor; but if the new ours/theirs hunks
      // start inside [start, regionEnd), we need to absorb them too.
      while (
        (oi < O.length && O[oi].baseStart < regionEnd) ||
        (ti < T.length && T[ti].baseStart < regionEnd)
      ) {
        if (oi < O.length && O[oi].baseStart < regionEnd) {
          regionEnd = Math.max(regionEnd, O[oi].baseEnd);
          oi++;
        }
        if (ti < T.length && T[ti].baseStart < regionEnd) {
          regionEnd = Math.max(regionEnd, T[ti].baseEnd);
          ti++;
        }
      }
      cursor = regionEnd;
      // Update the conflict end if we absorbed more hunks.
      conflicts[conflicts.length - 1].end = regionEnd;
      continue;
    }

    // No overlap at this point: apply whichever hunk comes first.
    const next = pick === 'o' ? o : t;
    if (next.baseStart > cursor) {
      merged.push({ kind: 'keep', start: cursor, end: next.baseStart });
    }
    merged.push({
      kind: 'replace',
      start: next.baseStart,
      end: next.baseEnd,
      lines: next.replacement.slice(),
    });
    cursor = next.baseEnd;
    if (pick === 'o') oi++; else ti++;
  }

  // Trailing keep region.
  if (cursor < baseLines.length) {
    merged.push({ kind: 'keep', start: cursor, end: baseLines.length });
  }

  if (conflicts.length > 0) {
    return { ok: false, conflicts };
  }

  // Reconstruct the merged line array.
  const mergedLines = [];
  for (const seg of merged) {
    if (seg.kind === 'keep') {
      for (let i = seg.start; i < seg.end; i++) mergedLines.push(baseLines[i]);
    } else {
      for (const ln of seg.lines) mergedLines.push(ln);
    }
  }

  // Trailing newline policy: if either side introduced (or removed) a trailing
  // newline relative to base, prefer the side that diverged from base; if both
  // diverged identically, use that. Otherwise inherit base.
  let trailing = baseTrailing;
  const oursDiverges = oursTrailing !== baseTrailing;
  const theirsDiverges = theirsTrailing !== baseTrailing;
  if (oursDiverges && theirsDiverges) {
    trailing = oursTrailing === theirsTrailing ? oursTrailing : baseTrailing;
  } else if (oursDiverges) {
    trailing = oursTrailing;
  } else if (theirsDiverges) {
    trailing = theirsTrailing;
  }

  return { ok: true, mergedLines, trailing };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * 3-way merge.
 *
 * @param {{ base: string, ours: string, theirs: string, path?: string }} args
 * @returns {{ status: 'clean'|'merged'|'conflict',
 *             content?: string,
 *             conflicts?: Array<{ start: number, end: number, ours: string, theirs: string }> }}
 */
function merge3(args) {
  if (args === null || typeof args !== 'object') {
    throw new TypeError('merge3: expected an object argument');
  }
  const { base, ours, theirs } = args;
  if (typeof base !== 'string' || typeof ours !== 'string' || typeof theirs !== 'string') {
    throw new TypeError('merge3: base, ours, theirs must all be strings');
  }

  // Trivial case A: no change on either side.
  if (ours === theirs) {
    return { status: 'clean', content: ours };
  }
  // Trivial case B: only the framework changed.
  if (ours === base) {
    return { status: 'merged', content: theirs };
  }
  // Trivial case C: only the expert changed.
  if (theirs === base) {
    return { status: 'merged', content: ours };
  }

  // Both sides diverged from base AND from each other.
  // Special-case full-file deletion semantics (deletion is represented by
  // empty string ours or theirs):
  //   - ours === '' and theirs !== '' and theirs !== base
  //       -> conflict (expert deleted a file the framework also modified;
  //          surfacing this prevents silent loss of either side).
  //   - theirs === '' and ours !== '' and ours !== base
  //       -> conflict (framework removed a file the expert also edited).
  // (The pure-trivial cases B and C above already covered the unilateral
  // delete cases.)
  if (ours === '' && theirs !== '' && theirs !== base) {
    return {
      status: 'conflict',
      content: ours,
      conflicts: [
        { start: 0, end: splitLines(base).lines.length, ours: '', theirs },
      ],
    };
  }
  if (theirs === '' && ours !== '' && ours !== base) {
    return {
      status: 'conflict',
      content: ours,
      conflicts: [
        { start: 0, end: splitLines(base).lines.length, ours, theirs: '' },
      ],
    };
  }

  const { lines: baseLines, trailing: baseTrailing } = splitLines(base);
  const { lines: oursLines, trailing: oursTrailing } = splitLines(ours);
  const { lines: theirsLines, trailing: theirsTrailing } = splitLines(theirs);

  const oursHunks = diffHunks(baseLines, oursLines);
  const theirsHunks = diffHunks(baseLines, theirsLines);

  const result = mergeHunks(
    baseLines,
    baseTrailing,
    oursHunks,
    theirsHunks,
    oursTrailing,
    theirsTrailing
  );

  if (result.ok) {
    return {
      status: 'merged',
      content: joinLines(result.mergedLines, result.trailing),
    };
  }

  // Conflict path: preserve-ours fallback per KZ-M6-R1.
  return {
    status: 'conflict',
    content: ours,
    conflicts: result.conflicts,
  };
}

module.exports = {
  merge3,
  MERGE_LABEL_OURS,
  MERGE_LABEL_THEIRS,
};
