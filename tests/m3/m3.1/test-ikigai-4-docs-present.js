'use strict';

// AC 1, AC-209: the 4 Ikigai scaffold docs exist at refs/ikigai/ with the
// expected pt-BR section headings and an append-only `## Change Log` section.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const IKIGAI_DIR = path.join(REPO_ROOT, 'refs', 'ikigai');

const EXPECTED_SECTIONS = {
  'o-que-faco.md': ['Atividade', 'Produto', 'Oferta', 'Esteira de Produtos'],
  'quem-sou.md': ['Identidade', 'História', 'Valores', 'Propósito', 'Tom de Voz', 'Assessments'],
  'para-quem.md': ['ICP', 'Público-alvo', 'Persona'],
  'como-faco.md': ['Metodologia', 'Framework', 'Teoria', 'Criações Originais'],
};

for (const [file, sections] of Object.entries(EXPECTED_SECTIONS)) {
  test('Ikigai doc ' + file + ' exists with expected sections (AC 1)', () => {
    const target = path.join(IKIGAI_DIR, file);
    assert.ok(fs.existsSync(target), file + ' must exist at refs/ikigai/');
    const body = fs.readFileSync(target, 'utf8');
    for (const sec of sections) {
      assert.ok(
        body.includes('## ' + sec),
        file + ' must declare section "## ' + sec + '"'
      );
    }
    assert.ok(
      body.includes('## Change Log'),
      file + ' must carry a `## Change Log` section'
    );
  });
}

test('all 4 Ikigai docs share the same Change Log header convention (AC 1)', () => {
  for (const file of Object.keys(EXPECTED_SECTIONS)) {
    const body = fs.readFileSync(path.join(IKIGAI_DIR, file), 'utf8');
    // The change log must include at least one creation entry — table row
    // or bullet row, both accepted by the guard.
    const hasEntry = /\|\s*2026-/.test(body) || /-\s+2026-/.test(body);
    assert.ok(hasEntry, file + ' must include a creation entry in the Change Log');
  }
});
