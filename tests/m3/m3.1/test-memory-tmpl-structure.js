'use strict';

// AC 3: memory-tmpl.md contains the 5 required surfaces:
// header `# Memory — {celula-name}` plus 4 sections.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const TEMPLATE_PATH = path.join(
  REPO_ROOT,
  '.kaizen-dvir',
  'instructions',
  'templates',
  'memory-tmpl.md'
);

test('memory-tmpl.md exists at the v1.4 template path (AC 3)', () => {
  assert.ok(
    fs.existsSync(TEMPLATE_PATH),
    'template must live at .kaizen-dvir/instructions/templates/memory-tmpl.md'
  );
});

test('memory-tmpl.md declares the 5 required surfaces (AC 3)', () => {
  const body = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const required = [
    '# Memory — {celula-name}',
    '## Padrões Validados',
    '## Exceções Conhecidas',
    '## Referências Cruzadas',
    '## Change Log',
  ];
  for (const surface of required) {
    assert.ok(
      body.includes(surface),
      'template must declare "' + surface + '"'
    );
  }
});

test('memory-tmpl.md row formats are documented in pt-BR (AC 3)', () => {
  const body = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  // Documented formats from the story (Task 3 sub-bullets):
  assert.ok(
    /confiança:\s*\[low\|medium\|high\]/.test(body),
    'Padrões Validados row format must include confidence enum'
  );
  assert.ok(
    /\[contexto\]\s+—\s+\[como tratar\]/.test(body),
    'Exceções Conhecidas row format must include context and handling'
  );
  assert.ok(
    /\[arquivo do Ikigai\]\s+—\s+quando consultar/.test(body),
    'Referências Cruzadas row format must point at Ikigai file + when to consult'
  );
  assert.ok(
    /\[autor\]\s+—\s+\[mudança\]/.test(body),
    'Change Log row format must include author + change'
  );
});
