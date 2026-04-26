'use strict';

/*
 * test-merge3.js — M6.3 AC verification for the 3-way merge library.
 *
 * Scope:
 *   - Trivial cases (clean-no-changes, ours-only, theirs-only).
 *   - Non-trivial clean merge (both-non-conflicting).
 *   - Conflict cases (both-conflicting-same-region, deleted-by-ours,
 *     deleted-by-theirs).
 *   - Purity gate: merge.js does not require('fs') in lib code.
 *   - Language Policy: exported pt-BR conflict marker labels are non-empty.
 *   - Zero external deps gate: merge.js loads without pulling third-party
 *     modules.
 *
 * The merge3 function is pure. Tests load fixture files via the test
 * harness's fs module — fs is intentionally NOT used inside merge.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const MERGE_LIB = path.join(ROOT, '.kaizen-dvir', 'dvir', 'update', 'merge.js');
const FIXTURES = path.join(__dirname, 'fixtures', 'merge');

// eslint-disable-next-line global-require -- intentionally lazy so the file-existence
// test can run before requiring it.
function loadMergeLib() {
  return require(MERGE_LIB);
}

// Normalize CRLF -> LF when reading fixture files. On Windows, git's
// core.autocrlf may rewrite checked-out .txt files with CRLF; merge3 itself
// is line-ending-agnostic but our fixtures specify content with LF in their
// expected.json strings, so the test harness normalizes here. This is a
// test-only convenience and does not bleed into the lib.
function readFixtureFile(p) {
  return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
}

function loadFixture(name) {
  const dir = path.join(FIXTURES, name);
  return {
    base: readFixtureFile(path.join(dir, 'base.txt')),
    ours: readFixtureFile(path.join(dir, 'ours.txt')),
    theirs: readFixtureFile(path.join(dir, 'theirs.txt')),
    expected: JSON.parse(fs.readFileSync(path.join(dir, 'expected.json'), 'utf8')),
  };
}

// ---------------------------------------------------------------------------
// Existence / wiring sanity checks
// ---------------------------------------------------------------------------

test('M6.3 — merge.js exists at the canonical path', () => {
  assert.ok(fs.existsSync(MERGE_LIB), 'merge.js missing at .kaizen-dvir/dvir/update/merge.js');
});

test('M6.3 — merge.js exposes merge3 + pt-BR label constants', () => {
  const m = loadMergeLib();
  assert.equal(typeof m.merge3, 'function', 'merge3 export missing');
  assert.equal(typeof m.MERGE_LABEL_OURS, 'string', 'MERGE_LABEL_OURS export missing');
  assert.equal(typeof m.MERGE_LABEL_THEIRS, 'string', 'MERGE_LABEL_THEIRS export missing');
  assert.ok(m.MERGE_LABEL_OURS.length > 0, 'MERGE_LABEL_OURS must be non-empty');
  assert.ok(m.MERGE_LABEL_THEIRS.length > 0, 'MERGE_LABEL_THEIRS must be non-empty');
  // Light pt-BR sanity: labels reference KAIZEN and use pt-BR vocabulary.
  assert.match(m.MERGE_LABEL_OURS, /KAIZEN/);
  assert.match(m.MERGE_LABEL_THEIRS, /KAIZEN/);
  assert.match(m.MERGE_LABEL_OURS, /versão/);
  assert.match(m.MERGE_LABEL_THEIRS, /versão|nova/);
});

// ---------------------------------------------------------------------------
// Purity gate (CON-003 + KZ-M6-R1 testability)
// ---------------------------------------------------------------------------

test('M6.3 AC — merge.js source contains no require("fs") (pure function)', () => {
  const raw = fs.readFileSync(MERGE_LIB, 'utf8');
  // Strip block comments and line comments so the gate scans executable code only.
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/[^\n]*/g, '$1');
  assert.ok(
    !/require\(['"]fs['"]\)/.test(stripped),
    'merge.js must not require fs in code — it is a pure function'
  );
  assert.ok(
    !/require\(['"]node:fs['"]\)/.test(stripped),
    'merge.js must not require node:fs in code — it is a pure function'
  );
  assert.ok(
    !/require\(['"]path['"]\)/.test(stripped) && !/require\(['"]node:path['"]\)/.test(stripped),
    'merge.js must not require path in code — pure function takes strings, not paths'
  );
  // Also: no require() at all (no third-party imports).
  assert.ok(
    !/(?:^|[^.\w])require\s*\(/.test(stripped),
    'merge.js must not call require() at all (CON-003 zero external deps)'
  );
});

test('M6.3 AC — merge.js loads with zero external dependencies (CON-003)', () => {
  // Loading the module must not throw and must not need any node_modules entry.
  // The require itself + the assertion that exports exist confirms this.
  const m = loadMergeLib();
  assert.ok(m.merge3);
});

// ---------------------------------------------------------------------------
// Trivial cases
// ---------------------------------------------------------------------------

test('M6.3 AC — clean-no-changes fixture: status=clean, content=ours', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs, expected } = loadFixture('clean-no-changes');
  const r = merge3({ base, ours, theirs, path: 'x.txt' });
  assert.equal(r.status, 'clean');
  assert.equal(r.status, expected.status);
  assert.equal(r.content, ours);
  assert.equal(r.conflicts, undefined);
});

test('M6.3 AC — ours-only fixture: status=merged, content=ours (trivial case C)', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs, expected } = loadFixture('ours-only');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'merged');
  assert.equal(r.status, expected.status);
  assert.equal(r.content, ours);
});

test('M6.3 AC — theirs-only fixture: status=merged, content=theirs (trivial case B)', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs, expected } = loadFixture('theirs-only');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'merged');
  assert.equal(r.status, expected.status);
  assert.equal(r.content, theirs);
});

// ---------------------------------------------------------------------------
// Non-trivial clean merge
// ---------------------------------------------------------------------------

test('M6.3 AC — both-non-conflicting fixture: both edits apply cleanly', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs, expected } = loadFixture('both-non-conflicting');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'merged');
  assert.equal(r.content, expected.expectedContent);
  assert.equal(r.conflicts, undefined);
});

// ---------------------------------------------------------------------------
// Conflict cases
// ---------------------------------------------------------------------------

test('M6.3 AC — both-conflicting-same-region fixture: status=conflict, preserve-ours', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs } = loadFixture('both-conflicting-same-region');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'conflict');
  assert.equal(r.content, ours, 'KZ-M6-R1: conflict content must preserve ours');
  assert.ok(Array.isArray(r.conflicts), 'conflicts must be an array');
  assert.ok(r.conflicts.length >= 1, 'must report at least one conflict region');
  // Validate conflict region shape.
  for (const c of r.conflicts) {
    assert.equal(typeof c.start, 'number');
    assert.equal(typeof c.end, 'number');
    assert.ok(c.end >= c.start, 'conflict end must be >= start');
    assert.equal(typeof c.ours, 'string');
    assert.equal(typeof c.theirs, 'string');
  }
});

test('M6.3 AC — deleted-by-ours fixture: surfaces conflict (no silent loss)', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs } = loadFixture('deleted-by-ours');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'conflict');
  assert.equal(r.content, '');
  assert.ok(Array.isArray(r.conflicts) && r.conflicts.length >= 1);
});

test('M6.3 AC — deleted-by-theirs fixture: surfaces conflict (no silent loss)', () => {
  const { merge3 } = loadMergeLib();
  const { base, ours, theirs } = loadFixture('deleted-by-theirs');
  const r = merge3({ base, ours, theirs });
  assert.equal(r.status, 'conflict');
  assert.equal(r.content, ours, 'preserve-ours fallback');
  assert.ok(Array.isArray(r.conflicts) && r.conflicts.length >= 1);
});

// ---------------------------------------------------------------------------
// Side-effect-free guarantee (purity at runtime)
// ---------------------------------------------------------------------------

test('M6.3 AC — merge3 does not write any files (caller responsibility)', () => {
  const { merge3 } = loadMergeLib();
  // Snapshot mtimes of the fixture files before the call.
  const target = path.join(FIXTURES, 'both-conflicting-same-region');
  const filesBefore = fs.readdirSync(target).map((f) => {
    const p = path.join(target, f);
    return { p, mtime: fs.statSync(p).mtimeMs };
  });
  const { base, ours, theirs } = loadFixture('both-conflicting-same-region');
  merge3({ base, ours, theirs, path: 'fake/output.txt' });
  for (const { p, mtime } of filesBefore) {
    assert.equal(fs.statSync(p).mtimeMs, mtime, 'merge3 mutated fixture file: ' + p);
  }
  // No new files must appear either.
  const after = fs.readdirSync(target);
  assert.equal(after.length, filesBefore.length);
});

// ---------------------------------------------------------------------------
// Renamed-detection fixture is documented as out-of-scope
// ---------------------------------------------------------------------------

test('M6.3 AC — renamed-detection fixture has TODO.md documenting v1.5 deferral', () => {
  const todo = path.join(FIXTURES, 'renamed-detection', 'TODO.md');
  assert.ok(fs.existsSync(todo), 'renamed-detection/TODO.md must exist');
  const content = fs.readFileSync(todo, 'utf8');
  assert.match(content, /OUT OF SCOPE for v1\.5/i);
  assert.match(content, /delete \+ add|delete\+add/i);
});

// ---------------------------------------------------------------------------
// Argument validation
// ---------------------------------------------------------------------------

test('M6.3 — merge3 throws on missing/invalid arguments', () => {
  const { merge3 } = loadMergeLib();
  assert.throws(() => merge3(null), /object/);
  assert.throws(() => merge3({ base: 1, ours: '', theirs: '' }), /string/);
  assert.throws(() => merge3({ base: '', ours: null, theirs: '' }), /string/);
});

// ---------------------------------------------------------------------------
// Determinism / golden file regression
// ---------------------------------------------------------------------------

test('M6.3 — merge3 is deterministic across repeated invocations', () => {
  const { merge3 } = loadMergeLib();
  const cases = [
    'clean-no-changes',
    'ours-only',
    'theirs-only',
    'both-non-conflicting',
    'both-conflicting-same-region',
    'deleted-by-ours',
    'deleted-by-theirs',
  ];
  for (const name of cases) {
    const { base, ours, theirs } = loadFixture(name);
    const r1 = merge3({ base, ours, theirs });
    const r2 = merge3({ base, ours, theirs });
    assert.deepEqual(r1, r2, `non-deterministic output for ${name}`);
  }
});
