'use strict';

// M7.2 — verify KAIZEN_FRAMEWORK_SECTION_CONTENT is a CommonJS-compatible
// named export consumable by M6.5 (legacy migration script).
//
// Cross-milestone contract: M6.5's v1.4-to-v1.5 migration script imports
// this constant via `require()` to construct the framework block when
// upgrading a v1.4 project (which has the 17-line scaffold without
// delimiters) to v1.5 (which wraps the new framework section in
// KAIZEN:FRAMEWORK delimiters).

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const scaffoldPath = path.join(ROOT, 'bin', 'lib', 'claude-md-scaffold.js');

test('module exports KAIZEN_FRAMEWORK_SECTION_CONTENT via require', () => {
  // Bypass require cache to simulate a fresh import.
  delete require.cache[require.resolve(scaffoldPath)];
  const m = require(scaffoldPath);
  assert.ok(
    Object.prototype.hasOwnProperty.call(m, 'KAIZEN_FRAMEWORK_SECTION_CONTENT'),
    'KAIZEN_FRAMEWORK_SECTION_CONTENT must be exported'
  );
  assert.strictEqual(
    typeof m.KAIZEN_FRAMEWORK_SECTION_CONTENT,
    'string',
    'export must be a string'
  );
});

test('exported framework content does NOT include the delimiter lines themselves', () => {
  const m = require(scaffoldPath);
  const exported = m.KAIZEN_FRAMEWORK_SECTION_CONTENT;
  assert.ok(
    !/<!--\s*KAIZEN:FRAMEWORK:START\s*-->/u.test(exported),
    'export must NOT include the FRAMEWORK:START delimiter line itself'
  );
  assert.ok(
    !/<!--\s*KAIZEN:FRAMEWORK:END\s*-->/u.test(exported),
    'export must NOT include the FRAMEWORK:END delimiter line itself'
  );
});

test('exported framework content matches what is between the delimiters in the full scaffold', () => {
  const m = require(scaffoldPath);
  const full = m.CLAUDE_MD_SCAFFOLD;
  const start = full.indexOf('<!-- KAIZEN:FRAMEWORK:START -->');
  const end = full.indexOf('<!-- KAIZEN:FRAMEWORK:END -->');
  assert.ok(start >= 0 && end > start, 'delimiters present in full scaffold');
  // Slice between the delimiters (exclusive of the markers themselves and
  // their trailing newlines).
  const between = full.slice(
    start + '<!-- KAIZEN:FRAMEWORK:START -->'.length,
    end
  );
  // Trim leading + trailing newlines for byte-equality check.
  const trimmed = between.replace(/^\n+/u, '').replace(/\n+$/u, '');
  const expectedTrimmed = m.KAIZEN_FRAMEWORK_SECTION_CONTENT.replace(/^\n+/u, '').replace(/\n+$/u, '');
  assert.strictEqual(
    trimmed,
    expectedTrimmed,
    'KAIZEN_FRAMEWORK_SECTION_CONTENT must equal the slice between FRAMEWORK delimiters'
  );
});

test('exported framework content is non-trivial (covers the 10 sections)', () => {
  const m = require(scaffoldPath);
  const exp = m.KAIZEN_FRAMEWORK_SECTION_CONTENT;
  // The export should hit the same 10 section headings as the full scaffold.
  const sections = [
    /Identidade do Projeto/u,
    /Commandments/u,
    /Framework Boundary/u,
    /Vocabulário/u,
    /DVIR/u,
    /Lifecycle de Célula/u,
    /Comandos CLI/u,
    /Hooks e Gates/u,
    /Git Conventions/u,
    /Como Estender/u,
  ];
  for (const re of sections) {
    assert.match(exp, re, 'export covers section: ' + re.toString());
  }
});
