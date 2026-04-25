'use strict';

// AC 5, 6 — F2 offers 4 context modes as multi-select per D-v1.4-10.
// Expert picks a single mode, a combination, or all four. The task
// aggregates inputs across chosen modes into kbs/.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('phase-2 task declares the 4 context modes (AC 5)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  const modes = Array.isArray(frontmatter.context_modes) ? frontmatter.context_modes : [];
  assert.strictEqual(modes.length, 4);
  assert.ok(modes.includes('referenciar-etl-pronto'));
  assert.ok(modes.includes('fornecer-links-e-documentos'));
  assert.ok(modes.includes('delegar-pesquisa'));
  assert.ok(modes.includes('explicar-direto'));
});

test('phase-2 declares multi_select true per D-v1.4-10 (AC 5)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.multi_select), 'true');
});

test('phase-2 pt-BR prompt explicitly allows single, combinacao or all four (AC 5, D-v1.4-10)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  assert.ok(
    raw.includes('um, varios ou todos os quatro') ||
      raw.includes('um, varios, ou todos os quatro'),
    'prompt must state "um, varios ou todos os quatro"'
  );
});

/**
 * Simulate the F2 aggregation behavior. Given a set of expert-chosen modes
 * and per-mode inputs, the aggregator produces kbs/ entries that reflect
 * each chosen mode. This mirrors what the archaeologist runtime will do
 * in M4.6 end-to-end. The test locks the contract at the data layer.
 */
function simulateF2(cellPath, chosenModes, inputs) {
  const kbsDir = path.join(cellPath, 'kbs');
  fs.mkdirSync(kbsDir, { recursive: true });
  const mapping = {
    'referenciar-etl-pronto': 'etl-references.md',
    'fornecer-links-e-documentos': 'links-and-docs.md',
    'delegar-pesquisa': 'delegated-research.md',
    'explicar-direto': 'expert-explanation.md',
  };
  for (const mode of chosenModes) {
    const filename = mapping[mode];
    if (!filename) throw new Error('modo invalido: ' + mode);
    const body = inputs[mode] || 'entrada vazia';
    fs.writeFileSync(path.join(kbsDir, filename), '# ' + mode + '\n\n' + body + '\n', 'utf8');
  }
  return kbsDir;
}

test('single-mode case (mode 1 only) populates kbs/ with exactly one mode file (AC 5, 6)', () => {
  const cell = helpers.mkTmpCell('f2-single-1');
  try {
    const kbs = simulateF2(
      cell,
      ['referenciar-etl-pronto'],
      { 'referenciar-etl-pronto': 'path: ../etl-copywriting' }
    );
    const files = fs.readdirSync(kbs);
    assert.strictEqual(files.length, 1);
    assert.ok(files.includes('etl-references.md'));
  } finally {
    helpers.rm(cell);
  }
});

test('single-mode case (mode 3 only) populates kbs/ correctly (AC 5, 6)', () => {
  const cell = helpers.mkTmpCell('f2-single-3');
  try {
    const kbs = simulateF2(
      cell,
      ['delegar-pesquisa'],
      { 'delegar-pesquisa': 'pesquisa sobre retention do publico B' }
    );
    const files = fs.readdirSync(kbs);
    assert.strictEqual(files.length, 1);
    assert.ok(files.includes('delegated-research.md'));
  } finally {
    helpers.rm(cell);
  }
});

test('combination case (modes 1+2) aggregates inputs in kbs/ (AC 5, 6)', () => {
  const cell = helpers.mkTmpCell('f2-combo-12');
  try {
    const kbs = simulateF2(
      cell,
      ['referenciar-etl-pronto', 'fornecer-links-e-documentos'],
      {
        'referenciar-etl-pronto': 'path: ../etl-copy',
        'fornecer-links-e-documentos': 'https://exemplo.com/artigo',
      }
    );
    const files = fs.readdirSync(kbs).sort();
    assert.strictEqual(files.length, 2);
    assert.deepStrictEqual(files, ['etl-references.md', 'links-and-docs.md']);
  } finally {
    helpers.rm(cell);
  }
});

test('combination case (modes 2+3+4) aggregates inputs in kbs/ (AC 5, 6)', () => {
  const cell = helpers.mkTmpCell('f2-combo-234');
  try {
    const kbs = simulateF2(
      cell,
      ['fornecer-links-e-documentos', 'delegar-pesquisa', 'explicar-direto'],
      {
        'fornecer-links-e-documentos': 'docs anexos',
        'delegar-pesquisa': 'pesquisar concorrentes',
        'explicar-direto': 'o expert relatou em voz o processo atual',
      }
    );
    const files = fs.readdirSync(kbs).sort();
    assert.strictEqual(files.length, 3);
    assert.deepStrictEqual(files, [
      'delegated-research.md',
      'expert-explanation.md',
      'links-and-docs.md',
    ]);
  } finally {
    helpers.rm(cell);
  }
});

test('all-four case aggregates all modes in kbs/ (AC 5, 6, D-v1.4-10)', () => {
  const cell = helpers.mkTmpCell('f2-all-four');
  try {
    const kbs = simulateF2(
      cell,
      [
        'referenciar-etl-pronto',
        'fornecer-links-e-documentos',
        'delegar-pesquisa',
        'explicar-direto',
      ],
      {
        'referenciar-etl-pronto': 'path: ../etl',
        'fornecer-links-e-documentos': 'links',
        'delegar-pesquisa': 'pesquisa',
        'explicar-direto': 'explicacao direta',
      }
    );
    const files = fs.readdirSync(kbs).sort();
    assert.strictEqual(files.length, 4);
  } finally {
    helpers.rm(cell);
  }
});
