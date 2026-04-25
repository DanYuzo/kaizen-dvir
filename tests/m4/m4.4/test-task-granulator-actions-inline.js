'use strict';

// AC 5, 6 (M4.4) — Actions are described as INLINE markdown
// instructions inside the task file. NO `action-*.md` file is emitted
// at runtime under any code path. AC-119, D-v1.3-04.
//
// This test asserts via fs.existsSync (and a recursive walk) that the
// task-granulator's emitted artifacts contain ZERO `action-*.md`
// files in the generated cell tasks dir.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('task-granulator persona declares Actions-inline contract verbatim (AC 5, AC-119)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  // Flatten whitespace (line wraps allowed) before substring match.
  const flat = raw.replace(/\s+/gu, ' ');
  assert.ok(
    flat.includes('Actions são descritas como instruções markdown inline DENTRO do arquivo da Task') ||
      flat.includes('Actions sao descritas como instrucoes markdown inline DENTRO do arquivo da Task'),
    'persona must declare Actions-inline contract verbatim (whitespace-flattened)'
  );
  assert.ok(
    raw.includes('action-*.md'),
    'persona must reference action-*.md filename pattern in the inline contract'
  );
  assert.ok(
    raw.includes('AC-119'),
    'persona must cite AC-119'
  );
  assert.ok(
    raw.includes('D-v1.3-04'),
    'persona must cite D-v1.3-04'
  );
});

test('phase-8 task declares no action-*.md emission post-condition (AC 6, AC-119)', () => {
  const raw = helpers.readFileText(helpers.PHASE_8_TASK);
  assert.ok(
    raw.includes('action-*.md'),
    'phase-8 task must reference action-*.md filename pattern'
  );
  assert.ok(
    raw.includes('Nenhum arquivo') || raw.includes('NENHUM arquivo') || raw.includes('nenhum arquivo'),
    'phase-8 task must state "no action-*.md file"'
  );
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(
    String(frontmatter.emit_action_md),
    'false',
    'phase-8 frontmatter must declare emit_action_md: false'
  );
  assert.strictEqual(
    String(frontmatter.actions_inline_contract),
    'true',
    'phase-8 frontmatter must declare actions_inline_contract: true'
  );
});

test('makeTaskFile produces inline Actions and NO action-*.md file (AC 6, AC-119)', () => {
  const dir = helpers.mkTmpCell('actions-inline');
  try {
    const tasksDir = path.join(dir, 'tasks');
    helpers.makeTaskFile(tasksDir, 'TASK-001', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: [
        'levante o tom de voz',
        'aumente 20% a velocidade',
        'pause 2 segundos antes de revelar o preco',
      ],
    });
    helpers.makeTaskFile(tasksDir, 'TASK-002', {
      pu_pai: 'PU-002',
      solution_id: 'SOL-002',
      actions: ['olhe para o cliente', 'confirme entendimento'],
    });
    // Explicit fs.existsSync check for any action-*.md under tasks/.
    const offenders = helpers.listActionMdFiles(tasksDir);
    assert.deepStrictEqual(
      offenders,
      [],
      'NO action-*.md file may exist under tasks/ (AC-119, D-v1.3-04). offenders: ' +
        JSON.stringify(offenders)
    );
    // And ensure inline Actions are present in each Task.
    for (const id of ['TASK-001', 'TASK-002']) {
      const taskPath = path.join(tasksDir, id + '.md');
      assert.ok(fs.existsSync(taskPath), id + '.md must exist');
      const txt = fs.readFileSync(taskPath, 'utf8');
      assert.ok(txt.includes('## Actions'), id + ' must carry "## Actions" inline section');
    }
  } finally {
    helpers.rm(dir);
  }
});

test('explicit fs.existsSync returns false for any action-*.md under cleared tasks dir (AC 6, AC-119, D-v1.3-04)', () => {
  const dir = helpers.mkTmpCell('actions-inline-fs');
  try {
    const tasksDir = path.join(dir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    helpers.makeTaskFile(tasksDir, 'TASK-001', {
      actions: ['levante o tom de voz', 'pause 2 segundos'],
    });
    // Explicit single-file existsSync check for known offending names.
    const knownOffenders = [
      'action-001.md',
      'action-1.md',
      'action-001-greeting.md',
      'action-greeting.md',
    ];
    for (const name of knownOffenders) {
      const full = path.join(tasksDir, name);
      assert.strictEqual(
        fs.existsSync(full),
        false,
        'fs.existsSync must return false for ' + name + ' (AC-119, D-v1.3-04)'
      );
    }
    // Recursive walk also returns empty.
    assert.deepStrictEqual(helpers.listActionMdFiles(tasksDir), []);
  } finally {
    helpers.rm(dir);
  }
});

test('action-conceptual-reference-tmpl declares REFERENCE ONLY, no runtime emission (AC 17, D-v1.3-04)', () => {
  const raw = helpers.readFileText(helpers.ACTION_REF_TMPL);
  assert.ok(
    raw.includes('REFERENCE ONLY') || raw.includes('reference only') || raw.includes('Reference Only'),
    'action template must declare REFERENCE ONLY in header'
  );
  assert.ok(
    raw.includes('NAO gera arquivos') ||
      raw.includes('nao gera arquivos') ||
      raw.includes('does NOT generate') ||
      raw.includes('does not generate'),
    'action template must state it does NOT generate files at runtime'
  );
  assert.ok(raw.includes('D-v1.3-04'));
  assert.ok(raw.includes('AC-119'));
});
