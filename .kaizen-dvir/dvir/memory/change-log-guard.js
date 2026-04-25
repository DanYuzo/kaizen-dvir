'use strict';

/**
 * change-log-guard.js — Append-only validator for `## Change Log` sections.
 *
 * Owned by M3.1 (FR-023, AC-207). Artifact-agnostic — works on any markdown
 * that carries a `## Change Log` section. Consumed by M3.3 Quality Gate via
 * `check(artifactPath)` and by M3.1 callers via `validateAppendOnly()`.
 *
 * Public API:
 *   - validateAppendOnly(previousContent, newContent)
 *       → { verdict: 'PASS' | 'FAIL', issues: Array<object> }
 *     Compares the change-log block of two in-memory revisions of an
 *     artifact body. PASS when `new` is `previous` plus appended rows
 *     in the same order. FAIL when any historical row is missing,
 *     reordered, or rewritten.
 *
 *   - check(artifactPath)
 *       → { valid: boolean, violations: Array<{line, reason}> }
 *     Disk-backed variant used by M3.3 Quality Gate. Records a
 *     baseline snapshot at `<file>.changelog-baseline.json` on first
 *     call; on every subsequent call compares the current rows to the
 *     baseline. The baseline is updated when rows are appended, never
 *     when rows mutate.
 *
 * Comparison policy (semantic, not byte-level):
 *   To avoid false positives from harmless reformatting (trailing spaces,
 *   editor whitespace normalization, CRLF↔LF), the guard compares prior
 *   change-log rows after a normalization step:
 *     - strip trailing whitespace
 *     - collapse runs of internal whitespace to a single space
 *     - drop empty lines and HTML comments
 *   FAIL only on semantic mutations of historical rows.
 *
 * Constraints:
 *   - CON-002: CommonJS, ES2022.
 *   - CON-003: stdlib only — `node:fs`, `node:path`.
 */

const fs = require('node:fs');
const path = require('node:path');

const SECTION_HEADER_RE = /^##\s+Change\s+Log\s*$/i;
const ANY_H2_RE = /^##\s+/;
const BASELINE_SUFFIX = '.changelog-baseline.json';

// ---------------------------------------------------------------------------
// Section extraction + normalization (pure helpers)
// ---------------------------------------------------------------------------

function _extractRawLines(text) {
  // Pull every line under the `## Change Log` header until the next H2
  // header (or EOF). Returns the raw lines for the section. Returns null
  // when no Change Log section exists at all (caller decides what to do).
  if (typeof text !== 'string' || text.length === 0) {
    return null;
  }
  const lines = text.split(/\r?\n/);
  const out = [];
  let inSection = false;
  for (const line of lines) {
    if (SECTION_HEADER_RE.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && ANY_H2_RE.test(line.trim())) {
      break;
    }
    if (inSection) {
      out.push(line);
    }
  }
  return inSection ? out : null;
}

function _normalize(line) {
  return line.replace(/[\t ]+/g, ' ').trim();
}

function _meaningfulRows(rawLines) {
  // Drop blank lines, HTML comments, and table format scaffolding.
  // Keep table data rows and bullet rows — those carry the entries.
  const out = [];
  if (!rawLines) return out;
  for (const raw of rawLines) {
    const norm = _normalize(raw);
    if (norm === '') continue;
    if (norm.startsWith('<!--') || norm.endsWith('-->')) continue;
    if (/^\|\s*-{3,}/.test(norm)) continue;
    if (/^\|\s*Date\s*\|/i.test(norm)) continue;
    if (/^\|\s*Data\s*\|/i.test(norm)) continue;
    if (norm.startsWith('|') || norm.startsWith('-')) {
      out.push(norm);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API — validateAppendOnly (pure, in-memory)
// ---------------------------------------------------------------------------

/**
 * Validate that the `## Change Log` section in `newContent` is `previousContent`
 * plus appended rows.
 *
 * @param {string} previousContent — full prior body of the artifact.
 * @param {string} newContent — full new body of the artifact.
 * @returns {{verdict: 'PASS'|'FAIL', issues: Array<object>}}
 */
function validateAppendOnly(previousContent, newContent) {
  const issues = [];

  const prevRaw = _extractRawLines(previousContent);
  const newRaw = _extractRawLines(newContent);

  // No change log on either side — nothing to enforce.
  if (prevRaw === null) {
    return { verdict: 'PASS', issues: [] };
  }

  if (newRaw === null) {
    issues.push({
      type: 'section_removed',
      detail:
        'a seção `## Change Log` foi removida. ' +
          'append-only não permite remover a seção.',
    });
    return { verdict: 'FAIL', issues: issues };
  }

  const prevRows = _meaningfulRows(prevRaw);
  const newRows = _meaningfulRows(newRaw);

  if (prevRows.length === 0) {
    return { verdict: 'PASS', issues: [] };
  }

  if (newRows.length < prevRows.length) {
    issues.push({
      type: 'rows_removed',
      prior_count: prevRows.length,
      current_count: newRows.length,
      detail:
        'linhas históricas do change log foram removidas. ' +
          'append-only não permite remoção.',
    });
    return { verdict: 'FAIL', issues: issues };
  }

  for (let i = 0; i < prevRows.length; i++) {
    const before = prevRows[i];
    const after = newRows[i];
    if (before !== after) {
      issues.push({
        type: 'row_modified',
        line_index: i,
        prior: before,
        current: after,
        detail:
          'linha histórica do change log foi alterada na posição ' +
            i + '. append-only não permite reescrita.',
      });
    }
  }

  if (issues.length > 0) {
    return { verdict: 'FAIL', issues: issues };
  }
  return { verdict: 'PASS', issues: [] };
}

// ---------------------------------------------------------------------------
// Public API — check (disk-backed, baseline-recording)
// ---------------------------------------------------------------------------

function _baselinePath(artifactPath) {
  const dir = path.dirname(artifactPath);
  const base = path.basename(artifactPath);
  return path.join(dir, base + BASELINE_SUFFIX);
}

function _readBaseline(artifactPath) {
  const bp = _baselinePath(artifactPath);
  if (!fs.existsSync(bp)) return null;
  try {
    return JSON.parse(fs.readFileSync(bp, 'utf8'));
  } catch (_) {
    return null;
  }
}

function _writeBaseline(artifactPath, entries) {
  const bp = _baselinePath(artifactPath);
  fs.writeFileSync(bp, JSON.stringify({ entries: entries }, null, 2), 'utf8');
}

/**
 * Verify the artifact's `## Change Log` section is append-only against a
 * stored baseline. First call records the baseline; subsequent calls
 * compare against it and update on clean append.
 *
 * @param {string} artifactPath
 * @returns {{valid:boolean, violations:Array<{line:number, reason:string}>}}
 */
function check(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    return {
      valid: false,
      violations: [
        {
          line: 0,
          reason:
            'artefato não encontrado para validação do change log: ' +
              artifactPath,
        },
      ],
    };
  }

  const content = fs.readFileSync(artifactPath, 'utf8');
  const rows = _meaningfulRows(_extractRawLines(content));
  const hasSection = _extractRawLines(content) !== null;
  if (!hasSection) {
    // No section to enforce — silent pass (other artifacts may not have one).
    return { valid: true, violations: [] };
  }

  const baseline = _readBaseline(artifactPath);
  if (baseline === null) {
    _writeBaseline(artifactPath, rows);
    return { valid: true, violations: [] };
  }

  const violations = [];
  const prior = Array.isArray(baseline.entries) ? baseline.entries : [];

  if (rows.length < prior.length) {
    violations.push({
      line: 0,
      reason:
        'change log encolheu: tinha ' + prior.length +
          ' linhas, agora tem ' + rows.length +
          '. append-only exige preservar histórico.',
    });
  }

  const checkLen = Math.min(prior.length, rows.length);
  for (let i = 0; i < checkLen; i++) {
    if (rows[i] !== prior[i]) {
      violations.push({
        line: i + 1,
        reason:
          'linha ' + (i + 1) +
            ' do change log foi reescrita. ' +
            'append-only exige preservar conteúdo histórico.',
      });
    }
  }

  if (violations.length === 0) {
    _writeBaseline(artifactPath, rows);
  }
  return { valid: violations.length === 0, violations: violations };
}

function _resetBaseline(artifactPath) {
  const bp = _baselinePath(artifactPath);
  if (fs.existsSync(bp)) fs.unlinkSync(bp);
}

module.exports = {
  validateAppendOnly: validateAppendOnly,
  check: check,
  BASELINE_SUFFIX: BASELINE_SUFFIX,
  // Test-only handles.
  _resetBaseline: _resetBaseline,
  _internal: {
    _extractRawLines: _extractRawLines,
    _normalize: _normalize,
    _meaningfulRows: _meaningfulRows,
  },
};
