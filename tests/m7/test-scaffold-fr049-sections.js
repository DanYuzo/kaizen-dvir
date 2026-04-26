'use strict';

// M7.2 — verify all 10 FR-049 sections present in canonical order.
//
// FR-049 sections (canonical order):
//   1. Identidade do Projeto
//   2. Commandments
//   3. Framework Boundary (L1-L4)
//   4. Vocabulário Essencial
//   5. DVIR (o Engine)
//   6. Lifecycle de Célula
//   7. Comandos CLI
//   8. Hooks e Gates
//   9. Git Conventions
//   10. Como Estender

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const scaffold = require(path.join(ROOT, 'bin', 'lib', 'claude-md-scaffold.js'));

const SECTION_HEADINGS = [
  /^##\s+1\.\s+Identidade do Projeto\s*$/m,
  /^##\s+2\.\s+Commandments\s*$/m,
  /^##\s+3\.\s+Framework Boundary\s*\(L1-L4\)\s*$/m,
  /^##\s+4\.\s+Vocabulário Essencial\s*$/m,
  /^##\s+5\.\s+DVIR\s*\(o Engine\)\s*$/m,
  /^##\s+6\.\s+Lifecycle de Célula\s*$/m,
  /^##\s+7\.\s+Comandos CLI\s*$/m,
  /^##\s+8\.\s+Hooks e Gates\s*$/m,
  /^##\s+9\.\s+Git Conventions\s*$/m,
  /^##\s+10\.\s+Como Estender\s*$/m,
];

test('all 10 FR-049 sections present with correct heading format', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  for (const re of SECTION_HEADINGS) {
    assert.match(body, re, 'expected section heading not found: ' + re.toString());
  }
});

test('sections appear in canonical order', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  let lastIndex = -1;
  for (const re of SECTION_HEADINGS) {
    const m = re.exec(body);
    assert.ok(m, 'section heading missing: ' + re.toString());
    assert.ok(
      m.index > lastIndex,
      'section out of order: ' + re.toString() + ' (index ' + m.index + ' <= ' + lastIndex + ')'
    );
    lastIndex = m.index;
    // Reset lastIndex on the regex (it has the m flag, so .exec is stateless,
    // but assigning to ensure no surprise).
    re.lastIndex = 0;
  }
});

test('Vocabulário section defines Célula and Agente per D-v1.5-08', () => {
  // Slice from the Vocabulário heading to the next ## heading.
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const start = body.search(/^##\s+4\.\s+Vocabulário Essencial/m);
  const after = body.slice(start);
  const end = after.search(/^##\s+5\./m);
  const section = after.slice(0, end > 0 ? end : after.length);

  assert.match(section, /\*\*Célula\*\*/u, 'Célula bolded definition present');
  assert.match(section, /\*\*Agente\*\*/u, 'Agente bolded definition present');
  // Canonical Célula phrasing fragments (D-v1.5-08)
  assert.match(section, /unidade de distribuição/u, 'Célula = unit of distribution');
  assert.match(section, /tiers/u, 'Célula has tiers');
  assert.match(section, /\/Kaizen:\{Nome\}/u, 'Célula activated via slash command');
  // Canonical Agente phrasing fragments (D-v1.5-08)
  assert.match(section, /persona/u, 'Agente has persona');
  assert.match(section, /Componente interno de uma célula/u, 'Agente is internal component');
  // Sub-agente, Workflow, Task also present
  assert.match(section, /\*\*Sub-agente\*\*/u, 'Sub-agente defined');
  assert.match(section, /\*\*Workflow\*\*/u, 'Workflow defined');
  assert.match(section, /\*\*Task\*\*/u, 'Task defined');
});

test('Commandments section covers all 7 commandments I-VII', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const start = body.search(/^##\s+2\.\s+Commandments/m);
  const after = body.slice(start);
  const end = after.search(/^##\s+3\./m);
  const section = after.slice(0, end > 0 ? end : after.length);

  // Commandment list — each row in the table or list mentions roman numeral
  for (const numeral of ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']) {
    assert.match(
      section,
      new RegExp('\\|\\s*' + numeral + '\\s*\\|', 'u'),
      'Commandment ' + numeral + ' present in table'
    );
  }
  // Reference to the canonical Commandments file
  assert.match(
    section,
    /\.kaizen-dvir\/commandments\.md/u,
    'links to .kaizen-dvir/commandments.md'
  );
});

test('Framework Boundary section reflects v1.4 paths only (no invention)', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const start = body.search(/^##\s+3\.\s+Framework Boundary/m);
  const after = body.slice(start);
  const end = after.search(/^##\s+4\./m);
  const section = after.slice(0, end > 0 ? end : after.length);

  // v1.4 canonical paths
  assert.match(section, /\.kaizen-dvir\/dvir\//u, 'L1 path .kaizen-dvir/dvir/');
  assert.match(section, /\.kaizen-dvir\/instructions\//u, 'L2 path .kaizen-dvir/instructions/');
  // v1.1/v1.3 legacy fragments must NOT appear
  const legacy = ['/core/', '/development/', '/infrastructure/'];
  for (const bad of legacy) {
    assert.ok(
      !section.includes(bad),
      'legacy path fragment must not appear in scaffold body: ' + bad
    );
  }
});

test('Comandos CLI section enumerates v1.5 shipped commands only', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const start = body.search(/^##\s+7\.\s+Comandos CLI/m);
  const after = body.slice(start);
  const end = after.search(/^##\s+8\./m);
  const section = after.slice(0, end > 0 ? end : after.length);

  for (const cmd of ['kaizen init', 'kaizen doctor', 'kaizen update', 'kaizen rollback', 'kaizen install']) {
    assert.ok(
      section.includes(cmd),
      'expected command in CLI section: ' + cmd
    );
  }
});

test('cross-references to .claude/rules/*.md match M7.1 seed filenames', () => {
  const body = scaffold.CLAUDE_MD_SCAFFOLD;
  const M71_SEEDS = [
    'boundary.md',
    'cells.md',
    'yotzer.md',
    'doctor.md',
    'commit-conventions.md',
  ];
  for (const seed of M71_SEEDS) {
    assert.ok(
      body.includes('.claude/rules/' + seed),
      'expected cross-reference to .claude/rules/' + seed
    );
  }
  // language-policy.md is the sixth seed file from M7.1; it is allowed but
  // not strictly required to be referenced from CLAUDE.md (CLAUDE.md is the
  // index, language policy may live as a deeper-detail rule the expert
  // discovers via the rules directory). Do not assert its presence here.
});
