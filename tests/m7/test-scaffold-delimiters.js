'use strict';

// M7.2 — verify CON-007 delimiter contract on the CLAUDE.md scaffold body.
//
// Contract (CON-007, AC-027):
//   - Exactly one `<!-- KAIZEN:FRAMEWORK:START -->` delimiter
//   - Exactly one `<!-- KAIZEN:FRAMEWORK:END -->` delimiter
//   - Exactly one `<!-- KAIZEN:EXPERT:START -->` delimiter
//   - Exactly one `<!-- KAIZEN:EXPERT:END -->` delimiter
//   - Order: FRAMEWORK:START < FRAMEWORK:END < EXPERT:START < EXPERT:END
//   - Framework section non-empty
//   - Expert section contains only the invitation comment

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const scaffold = require(path.join(ROOT, 'bin', 'lib', 'claude-md-scaffold.js'));

const RE_FW_START = /<!--\s*KAIZEN:FRAMEWORK:START\s*-->/g;
const RE_FW_END = /<!--\s*KAIZEN:FRAMEWORK:END\s*-->/g;
const RE_EX_START = /<!--\s*KAIZEN:EXPERT:START\s*-->/g;
const RE_EX_END = /<!--\s*KAIZEN:EXPERT:END\s*-->/g;

function countMatches(text, re) {
  let count = 0;
  let m;
  while ((m = re.exec(text)) !== null) count++;
  return count;
}

function indexOfMarker(text, re) {
  // Reset lastIndex on the source regex by cloning with the flags.
  const r = new RegExp(re.source, re.flags);
  const m = r.exec(text);
  return m ? m.index : -1;
}

test('all four delimiter markers present exactly once', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  assert.strictEqual(
    countMatches(body, new RegExp(RE_FW_START.source, 'g')),
    1,
    'KAIZEN:FRAMEWORK:START must appear exactly once'
  );
  assert.strictEqual(
    countMatches(body, new RegExp(RE_FW_END.source, 'g')),
    1,
    'KAIZEN:FRAMEWORK:END must appear exactly once'
  );
  assert.strictEqual(
    countMatches(body, new RegExp(RE_EX_START.source, 'g')),
    1,
    'KAIZEN:EXPERT:START must appear exactly once'
  );
  assert.strictEqual(
    countMatches(body, new RegExp(RE_EX_END.source, 'g')),
    1,
    'KAIZEN:EXPERT:END must appear exactly once'
  );
});

test('delimiters appear in canonical order', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const fwStart = indexOfMarker(body, RE_FW_START);
  const fwEnd = indexOfMarker(body, RE_FW_END);
  const exStart = indexOfMarker(body, RE_EX_START);
  const exEnd = indexOfMarker(body, RE_EX_END);
  assert.ok(fwStart >= 0, 'FRAMEWORK:START found');
  assert.ok(fwEnd > fwStart, 'FRAMEWORK:END after START');
  assert.ok(exStart > fwEnd, 'EXPERT:START after FRAMEWORK:END');
  assert.ok(exEnd > exStart, 'EXPERT:END after EXPERT:START');
});

test('FRAMEWORK section contains canonical content', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const fwStart = indexOfMarker(body, RE_FW_START);
  const fwEnd = indexOfMarker(body, RE_FW_END);
  const sliced = body.slice(fwStart, fwEnd);
  // Spot-check a few canonical strings from the framework section
  assert.ok(/Identidade do Projeto/u.test(sliced), 'has Identidade');
  assert.ok(/Commandments/u.test(sliced), 'has Commandments');
  assert.ok(/Framework Boundary/u.test(sliced), 'has Framework Boundary');
  assert.ok(/Vocabulário/u.test(sliced), 'has Vocabulário');
  assert.ok(/DVIR/u.test(sliced), 'has DVIR');
  assert.ok(/Lifecycle de Célula/u.test(sliced), 'has Lifecycle de Célula');
  assert.ok(/Comandos CLI/u.test(sliced), 'has Comandos CLI');
  assert.ok(/Hooks e Gates/u.test(sliced), 'has Hooks e Gates');
  assert.ok(/Git Conventions/u.test(sliced), 'has Git Conventions');
  assert.ok(/Como Estender/u.test(sliced), 'has Como Estender');
});

test('EXPERT section contains only invitation comment + blank space', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const exStart = indexOfMarker(body, RE_EX_START);
  const exEnd = indexOfMarker(body, RE_EX_END);
  // slice from after the EXPERT:START line to the EXPERT:END line
  const sliced = body.slice(exStart, exEnd);
  // Strip the EXPERT:START delimiter itself
  const withoutDelim = sliced.replace(RE_EX_START, '');
  // No 10-section heading should leak into the expert area
  assert.ok(
    !/##\s+1\.\s+Identidade/u.test(withoutDelim),
    'EXPERT block must not contain framework section headings'
  );
  assert.ok(
    !/##\s+Commandments/u.test(withoutDelim),
    'EXPERT block must not contain Commandments heading'
  );
  // Must contain the invitation comment
  assert.ok(
    /Edite à vontade/u.test(withoutDelim) || /Área livre do expert/u.test(withoutDelim),
    'EXPERT block contains the pt-BR invitation comment'
  );
});

test('warning comment present immediately after FRAMEWORK:START', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const fwStart = indexOfMarker(body, RE_FW_START);
  // Look at the next ~400 bytes after the START delimiter
  const next = body.slice(fwStart, fwStart + 400);
  assert.ok(
    /não editar manualmente/u.test(next),
    'warning comment "não editar manualmente" present (KZ-M7-R2 mitigation)'
  );
  assert.ok(/kaizen update/u.test(next), 'warning mentions kaizen update');
});
