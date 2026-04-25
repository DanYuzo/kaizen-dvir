'use strict';

// AC 7 — F2 persists 3+ success examples to generated cell's
// kbs/success-examples.md in pt-BR following diretrizes-escrita.md
// (D-v1.4-09). Uses success-examples-tmpl.md as template.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const TEMPLATE_PATH = path.join(
  helpers.YOTZER_CELL_ROOT,
  'templates',
  'success-examples-tmpl.md'
);

test('success-examples-tmpl.md exists at yotzer templates/ (AC 7, 17)', () => {
  assert.ok(fs.existsSync(TEMPLATE_PATH));
});

test('success-examples-tmpl.md carries pt-BR prose and 3 example scaffolds (AC 7)', () => {
  const raw = helpers.readFileText(TEMPLATE_PATH);
  assert.ok(raw.includes('## Exemplo 1'));
  assert.ok(raw.includes('## Exemplo 2'));
  assert.ok(raw.includes('## Exemplo 3'));
  assert.ok(raw.includes('Fonte:'));
  assert.ok(raw.includes('Criterios de qualidade:'));
  assert.ok(raw.includes('Armadilhas a evitar:'));
});

/**
 * Simulate F2 persistence — archaeologist writes the expert's collected
 * examples to kbs/success-examples.md of the generated cell, in pt-BR,
 * following diretrizes-escrita.md. The simulation mirrors what the
 * runtime archaeologist will do in M4.6 end-to-end.
 */
function persistExamples(cellPath, examples) {
  const tmpl = helpers.readFileText(TEMPLATE_PATH);
  const header = tmpl.split('## Exemplo 1')[0];
  const parts = [header.trimEnd(), ''];
  let n = 1;
  for (const ex of examples) {
    parts.push('## Exemplo ' + n + ' — ' + ex.title);
    parts.push('');
    parts.push('**Fonte:** ' + ex.source);
    parts.push('');
    parts.push('**Criterios de qualidade:**');
    for (const c of ex.criteria) parts.push('- ' + c);
    parts.push('');
    parts.push('**Armadilhas a evitar:**');
    for (const a of ex.gotchas) parts.push('- ' + a);
    parts.push('');
    n++;
  }
  const kbsDir = path.join(cellPath, 'kbs');
  fs.mkdirSync(kbsDir, { recursive: true });
  const target = path.join(kbsDir, 'success-examples.md');
  fs.writeFileSync(target, parts.join('\n'), 'utf8');
  return target;
}

test('F2 persists 3 expert examples at kbs/success-examples.md (D-v1.4-09, AC 7)', () => {
  const cell = helpers.mkTmpCell('examples-3');
  try {
    const examples = [
      {
        title: 'lancamento de junho',
        source: 'planilha de resultados do expert',
        criteria: ['headline direta', 'oferta clara', 'prova social em numero'],
        gotchas: ['promessa vaga', 'prova social em adjetivo'],
      },
      {
        title: 'email de reativacao',
        source: 'campanha de agosto da propria base',
        criteria: ['assunto curto', 'corpo em primeira pessoa', 'uma acao clara'],
        gotchas: ['assunto generico', 'corpo em voz passiva'],
      },
      {
        title: 'pagina de vendas pix',
        source: 'pagina no hotmart do expert',
        criteria: ['depoimento em video', 'garantia visivel', 'escassez real'],
        gotchas: ['depoimento textual longo', 'escassez inventada'],
      },
    ];
    const target = persistExamples(cell, examples);
    assert.ok(fs.existsSync(target));
    const content = fs.readFileSync(target, 'utf8');
    // 3+ entries present.
    assert.ok(content.includes('## Exemplo 1 — lancamento de junho'));
    assert.ok(content.includes('## Exemplo 2 — email de reativacao'));
    assert.ok(content.includes('## Exemplo 3 — pagina de vendas pix'));
    // Source + criteria + gotchas present.
    assert.ok(content.includes('planilha de resultados'));
    assert.ok(content.includes('headline direta'));
    assert.ok(content.includes('promessa vaga'));
  } finally {
    helpers.rm(cell);
  }
});

test('persistence target is inside generated cell kbs/ (D-v1.4-11)', () => {
  const cell = helpers.mkTmpCell('examples-path');
  try {
    const target = persistExamples(cell, [
      { title: 't1', source: 's1', criteria: ['c1'], gotchas: ['g1'] },
      { title: 't2', source: 's2', criteria: ['c2'], gotchas: ['g2'] },
      { title: 't3', source: 's3', criteria: ['c3'], gotchas: ['g3'] },
    ]);
    // Path structure: {cell}/kbs/success-examples.md
    const expected = path.join(cell, 'kbs', 'success-examples.md');
    assert.strictEqual(target, expected);
  } finally {
    helpers.rm(cell);
  }
});

test('phase-2 task references kbs/success-examples.md persistence (D-v1.4-09, AC 7)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  assert.ok(raw.includes('kbs/success-examples.md'));
  assert.ok(raw.includes('success-examples-tmpl.md'));
});
