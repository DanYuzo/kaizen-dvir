'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const COMMANDMENTS_PATH = path.join(ROOT, '.kaizen-dvir', 'commandments.md');

function readCommandments() {
  assert.ok(fs.existsSync(COMMANDMENTS_PATH), 'missing file: .kaizen-dvir/commandments.md');
  return fs.readFileSync(COMMANDMENTS_PATH, 'utf8');
}

test('commandments.md exists at the required path', () => {
  assert.ok(fs.existsSync(COMMANDMENTS_PATH), 'missing file: .kaizen-dvir/commandments.md');
  const stat = fs.statSync(COMMANDMENTS_PATH);
  assert.ok(stat.isFile(), '.kaizen-dvir/commandments.md exists but is not a file');
});

test('header declares version, status and effective_date', () => {
  const content = readCommandments();
  assert.match(content, /version:\s*1\.4\.0/, 'missing version: 1.4.0');
  assert.match(content, /status:\s*Active/, 'missing status: Active');
  assert.match(content, /effective_date:\s*2026-04-23/, 'missing effective_date: 2026-04-23');
});

test('all 7 Commandment headings are present in order (I..VII)', () => {
  const content = readCommandments();
  const expected = [
    /^##\s+Commandment\s+I\s+—\s+CLI First/m,
    /^##\s+Commandment\s+II\s+—\s+Authority Boundaries/m,
    /^##\s+Commandment\s+III\s+—\s+No Invention/m,
    /^##\s+Commandment\s+IV\s+—\s+Quality First/m,
    /^##\s+Commandment\s+V\s+—\s+Documentação Contínua/m,
    /^##\s+Commandment\s+VI\s+—\s+Human-in-Loop/m,
    /^##\s+Commandment\s+VII\s+—\s+Evolução Incremental/m,
  ];

  let cursor = 0;
  const labels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  for (let i = 0; i < expected.length; i++) {
    const slice = content.slice(cursor);
    const match = slice.match(expected[i]);
    assert.ok(match, 'missing or out-of-order Commandment ' + labels[i]);
    cursor += match.index + match[0].length;
  }
});

test('each Commandment contains Descrição, Implicações and Violação exemplo subsections', () => {
  const content = readCommandments();
  const required = ['### Descrição', '### Implicações', '### Violação exemplo'];
  for (const marker of required) {
    const occurrences = content.split(marker).length - 1;
    assert.ok(
      occurrences >= 7,
      'subsection "' + marker + '" occurs ' + occurrences + ' times; expected at least 7'
    );
  }
});

test('Change Log section exists and is declared append-only', () => {
  const content = readCommandments();
  assert.match(content, /##\s+Change Log\s+\(append-only\)/, 'missing "## Change Log (append-only)" heading');
  assert.match(content, /2026-04-23\s+—\s+v1\.4\.0\s+—\s+@dev/, 'missing initial change log entry by @dev');
});

test('traceability appendix maps Commandments to PRD v1.4', () => {
  const content = readCommandments();
  assert.match(content, /Rastreabilidade/, 'missing "Rastreabilidade" appendix heading');
  assert.match(content, /PRD v1\.4/, 'traceability appendix must reference PRD v1.4');
});

test('governance section covers amendment, versioning, compliance and severity', () => {
  const content = readCommandments();
  assert.match(content, /##\s+Governança/, 'missing "## Governança" section');
  assert.match(content, /Processo de emenda/, 'missing amendment process subsection');
  assert.match(content, /Versionamento/, 'missing versioning subsection');
  assert.match(content, /Compliance/, 'missing compliance subsection');
  assert.match(content, /Níveis de severidade/, 'missing severity levels subsection');
  assert.match(content, /NON-NEGOTIABLE/, 'missing NON-NEGOTIABLE severity');
  assert.match(content, /MUST/, 'missing MUST severity');
  assert.match(content, /SHOULD/, 'missing SHOULD severity');
  assert.match(content, /BLOCK/, 'missing BLOCK gate level');
  assert.match(content, /WARN/, 'missing WARN gate level');
});
