'use strict';

/*
 * _helpers-gate.js — KaiZen v1.5 / Story M7.5
 *
 * Shared utilities for the M7 integration gate suite. Builds a clean temp
 * project, runs `kaizen init` end-to-end (the same code path the expert
 * exercises), and exposes parsing helpers used by every M7 gate criterion.
 *
 * Stdlib only (CON-003). CommonJS (CON-002). Mirrors the style of
 * tests/m6/integration/_helpers-integration.js and tests/m7/_helpers-delimiter.js
 * so the gate suite stays readable next to the M6 gate it follows.
 *
 * Public API
 * ----------
 *   SOURCE_ROOT          — absolute path of the kaizen repo root
 *   CLI                  — absolute path of bin/kaizen.js
 *   RULE_SEED_NAMES      — canonical six-file list (FR-050)
 *   FRAMEWORK_DELIMS     — { fwStart, fwEnd, exStart, exEnd } regex set
 *   USER_FACING_FILES    — array of relative paths the language audit covers
 *
 *   mkSandbox(label)     — fs.mkdtempSync wrapper with a stable prefix
 *   rmSandbox(dir)       — recursive remove (force)
 *   runInit(cwd)         — spawnSync of `kaizen init` in `cwd`; returns
 *                          { status, stdout, stderr }
 *   readGenerated(root, rel) — read a file under the sandbox as utf8
 *   countMatches(text, re)   — count regex matches (re must NOT be /g)
 *   indexOf(text, re)        — index of first match (or -1)
 *   ptBrLanguageCheck(text)  — heuristic pt-BR vs EN paragraph audit;
 *                              returns { paragraphsChecked, flagged: [] }
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

// FR-050 canonical seed list. The order here is the publish order;
// equality checks should `.sort()` both sides.
const RULE_SEED_NAMES = [
  'boundary.md',
  'cells.md',
  'yotzer.md',
  'doctor.md',
  'language-policy.md',
  'commit-conventions.md',
];

// CON-007 / AC-027 delimiter regex set. Each is non-/g for first-match
// `exec`; tests that need a count clone with the /g flag.
const FRAMEWORK_DELIMS = {
  fwStart: /<!--\s*KAIZEN:FRAMEWORK:START\s*-->/,
  fwEnd: /<!--\s*KAIZEN:FRAMEWORK:END\s*-->/,
  exStart: /<!--\s*KAIZEN:EXPERT:START\s*-->/,
  exEnd: /<!--\s*KAIZEN:EXPERT:END\s*-->/,
};

// User-facing files the M7.5 language policy audit walks.
const USER_FACING_FILES = [
  '.claude/CLAUDE.md',
  '.claude/rules/boundary.md',
  '.claude/rules/cells.md',
  '.claude/rules/yotzer.md',
  '.claude/rules/doctor.md',
  '.claude/rules/language-policy.md',
  '.claude/rules/commit-conventions.md',
];

function mkSandbox(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m75-' + label + '-'));
}

function rmSandbox(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run `kaizen init` against `cwd`. Returns the spawnSync result with the
 * standard `{ status, stdout, stderr }` shape; tests should check
 * `status === 0` before parsing artifacts.
 */
function runInit(cwd) {
  return spawnSync(process.execPath, [CLI, 'init'], {
    cwd,
    encoding: 'utf8',
  });
}

function readGenerated(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

/**
 * Count occurrences of `re` in `text`. `re` must be a regex without the
 * /g flag — this helper clones it with /g internally so callers can pass
 * the canonical regex from FRAMEWORK_DELIMS verbatim.
 */
function countMatches(text, re) {
  const r = new RegExp(re.source, 'g');
  let n = 0;
  while (r.exec(text) !== null) n++;
  return n;
}

function indexOf(text, re) {
  const r = new RegExp(re.source, re.flags.replace('g', ''));
  const m = r.exec(text);
  return m ? m.index : -1;
}

// -- Language heuristic ---------------------------------------------------
//
// Paragraph-by-paragraph stop-word density check. The story spec
// (M7.5 § Deliverables, item 6) calls for a heuristic that flags
// paragraphs where EN stop-word density exceeds pt-BR stop-word density
// by a clear margin. The heuristic intentionally:
//
//   - excludes fenced code blocks (``` … ```)
//   - skips short paragraphs (< 4 words) where stop-word ratios are noise
//   - skips paragraphs with no stop-words from either side (pure
//     identifiers, paths, numbers — common in tables and code refs)
//   - skips lines that look like markdown table rows (start with `|`),
//     navigation bullets that are mostly identifiers, and HTML comments
//     (the four delimiter markers in CLAUDE.md must not trigger)
//
// The threshold is conservative (EN must exceed pt-BR by 2x AND pt-BR
// must be effectively absent) so a paragraph mixing pt-BR prose with a
// few EN command names ("kaizen init") does not flip a flag. This
// matches the story Dev Note: "near-zero false positives on genuine
// prose paragraphs in English".

const PT_BR_STOPWORDS = [
  'de', 'da', 'do', 'das', 'dos',
  'para', 'com', 'sem', 'sob', 'sobre',
  'que', 'qual', 'quando', 'onde',
  'uma', 'um', 'umas', 'uns',
  'este', 'esta', 'esse', 'essa', 'isto', 'isso',
  'também', 'então', 'porque', 'porém',
  'são', 'ser', 'foi', 'está', 'estar',
  'não', 'sim', 'mais', 'menos',
  'cada', 'todo', 'toda', 'todos', 'todas',
  'pelo', 'pela', 'pelos', 'pelas',
  'nos', 'nas', 'no', 'na',
  'seu', 'sua', 'seus', 'suas',
];

const EN_STOPWORDS = [
  'the', 'a', 'an',
  'of', 'and', 'or', 'but', 'nor',
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those',
  'which', 'who', 'whom', 'whose',
  'when', 'where', 'why', 'how',
  'do', 'does', 'did',
  'have', 'has', 'had',
  'will', 'would', 'should', 'could',
  'not', 'no',
  'as', 'so', 'than',
  'their', 'they', 'them', 'there',
  'its', 'his', 'her',
];

function tokenize(line) {
  // Split on whitespace and punctuation, lowercase. Keep only alphabetic
  // tokens (drop numbers and punctuation-only) so the ratio is computed
  // on words, not on identifiers like ".kaizen-dvir" or "v1.5".
  return line
    .toLowerCase()
    .split(/[^a-záàâãéêíóôõúüç]+/iu)
    .filter((t) => t.length > 0);
}

function countStopwords(tokens, stopwords) {
  let n = 0;
  for (const t of tokens) {
    if (stopwords.indexOf(t) >= 0) n++;
  }
  return n;
}

function stripCodeFences(text) {
  // Remove fenced code blocks. Keep one newline per dropped block so
  // paragraph splitting still works.
  const lines = text.split(/\r?\n/);
  const out = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/u.test(line)) {
      inFence = !inFence;
      out.push(''); // preserve paragraph boundary
      continue;
    }
    if (inFence) {
      out.push('');
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

function splitParagraphs(text) {
  // A paragraph is a run of non-blank lines separated by one or more
  // blank lines. Each yielded paragraph keeps its starting line number
  // (1-based) so failure messages can point the expert at the offender.
  const lines = text.split(/\r?\n/);
  const paragraphs = [];
  let buf = [];
  let bufStart = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      if (buf.length > 0) {
        paragraphs.push({ startLine: bufStart, text: buf.join('\n') });
        buf = [];
      }
      continue;
    }
    if (buf.length === 0) bufStart = i + 1;
    buf.push(line);
  }
  if (buf.length > 0) {
    paragraphs.push({ startLine: bufStart, text: buf.join('\n') });
  }
  return paragraphs;
}

function isStructuralParagraph(text) {
  // Markdown table rows, HTML comments, headings, link-only lines —
  // none carry meaningful pt-BR vs EN signal. Skip them so the heuristic
  // measures prose only.
  const trimmed = text.trim();
  if (trimmed.startsWith('|')) return true; // table
  if (trimmed.startsWith('<!--')) return true; // HTML comment / delimiter
  if (/^#{1,6}\s/u.test(trimmed)) return true; // heading
  if (/^[-*]\s/u.test(trimmed) && trimmed.length < 80) {
    // Short bullet — frequently a table-of-contents entry. Only skip if
    // it is overwhelmingly identifiers/paths.
    const tokens = tokenize(trimmed);
    if (tokens.length < 4) return true;
  }
  return false;
}

/**
 * Per-paragraph pt-BR vs EN heuristic.
 *
 * @param {string} text — full file body (utf8)
 * @returns {{ paragraphsChecked: number, flagged: Array<{
 *   startLine: number,
 *   ptBr: number,
 *   en: number,
 *   excerpt: string,
 * }> }}
 */
function ptBrLanguageCheck(text) {
  const stripped = stripCodeFences(text);
  const paragraphs = splitParagraphs(stripped);
  const flagged = [];
  let checked = 0;

  for (const p of paragraphs) {
    if (isStructuralParagraph(p.text)) continue;
    const tokens = tokenize(p.text);
    if (tokens.length < 4) continue;
    const ptBr = countStopwords(tokens, PT_BR_STOPWORDS);
    const en = countStopwords(tokens, EN_STOPWORDS);
    if (ptBr === 0 && en === 0) continue;
    checked++;
    // Flag when EN stop-words are clearly dominant. Two conditions:
    //   - en >= 3 (raises the floor; isolated words don't trip)
    //   - en > ptBr * 2 + 1 (EN at least 2x pt-BR, with a +1 buffer for
    //     ties on tiny paragraphs)
    if (en >= 3 && en > ptBr * 2 + 1) {
      flagged.push({
        startLine: p.startLine,
        ptBr,
        en,
        excerpt: p.text.slice(0, 120).replace(/\s+/g, ' '),
      });
    }
  }

  return { paragraphsChecked: checked, flagged };
}

module.exports = {
  SOURCE_ROOT,
  CLI,
  RULE_SEED_NAMES,
  FRAMEWORK_DELIMS,
  USER_FACING_FILES,
  mkSandbox,
  rmSandbox,
  runInit,
  readGenerated,
  countMatches,
  indexOf,
  ptBrLanguageCheck,
  // Exported for unit-level sanity tests of the heuristic itself.
  PT_BR_STOPWORDS,
  EN_STOPWORDS,
  tokenize,
  countStopwords,
  stripCodeFences,
  splitParagraphs,
};
