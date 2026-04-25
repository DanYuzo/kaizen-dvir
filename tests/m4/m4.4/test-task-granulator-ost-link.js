'use strict';

// AC 9 (M4.4) — task-granulator links each F8 Task to the Solution in
// OST.md it implements, closing the OST traceability chain
// Task -> Solution -> Opportunity -> Outcome. AC-117.

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const helpers = require('./_helpers');

test('task-granulator persona declares OST closure responsibility (AC 9, AC-117)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(raw.includes('OST'));
  assert.ok(
    raw.includes('Task → Solution') ||
      raw.includes('Task -> Solution') ||
      raw.includes('Task → Solution → Opportunity → Outcome') ||
      raw.includes('Task -> Solution -> Opportunity -> Outcome'),
    'persona must declare the Task -> Solution -> Opportunity -> Outcome chain'
  );
  assert.ok(raw.includes('AC-117'), 'persona must cite AC-117');
});

test('phase-8 task instructs Task->Solution link via ost-writer.appendChangeLog (AC 9, AC-117)', () => {
  const raw = helpers.readFileText(helpers.PHASE_8_TASK);
  assert.ok(raw.includes('appendChangeLog'));
  assert.ok(raw.includes('SOL-'));
  assert.ok(raw.includes('TASK-'));
});

test('OST writes Task->Solution link line via appendChangeLog (AC 9, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f8-task-link');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo tempo de venda em 30%',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo no fechamento',
      pus: ['PU-001'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'roteiro de fechamento padrao',
      origin: opp.id,
    });
    const link = ostWriter.appendChangeLog(
      cell,
      '@task-granulator',
      'ligou TASK-001 a ' + sol.id + ' (PU-001).'
    );
    assert.ok(link.line.includes('TASK-001'));
    assert.ok(link.line.includes(sol.id));
    assert.ok(link.line.includes('@task-granulator'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('ligou TASK-001 a ' + sol.id));
  } finally {
    helpers.rm(cell);
  }
});

test('every Task in tasks/ maps to exactly one solution_id in frontmatter (AC 9)', () => {
  const dir = helpers.mkTmpCell('f8-task-pu-pai');
  try {
    const tasksDir = path.join(dir, 'tasks');
    helpers.makeTaskFile(tasksDir, 'TASK-001', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: ['levante o tom', 'pause 2 segundos'],
    });
    helpers.makeTaskFile(tasksDir, 'TASK-002', {
      pu_pai: 'PU-002',
      solution_id: 'SOL-002',
      actions: ['olhe para o cliente'],
    });
    helpers.makeTaskFile(tasksDir, 'TASK-003', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001', // multiple Tasks may share a Solution
      actions: ['confirme entendimento'],
    });
    // Inspect each Task's frontmatter and assert solution_id present.
    const fs = require('node:fs');
    for (const id of ['TASK-001', 'TASK-002', 'TASK-003']) {
      const raw = fs.readFileSync(path.join(tasksDir, id + '.md'), 'utf8');
      const { frontmatter } = helpers.parseFrontmatter(raw);
      assert.ok(
        typeof frontmatter.solution_id === 'string' &&
          frontmatter.solution_id.length > 0,
        id + ' must declare solution_id'
      );
      assert.ok(
        typeof frontmatter.pu_pai === 'string' &&
          frontmatter.pu_pai.length > 0,
        id + ' must declare pu_pai'
      );
    }
  } finally {
    helpers.rm(dir);
  }
});

test('action-observability checklist enforces Task->Solution link (AC 9, AC-117)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  assert.ok(raw.includes('Solution'), 'checklist must mention Solution link');
  assert.ok(raw.includes('OST'), 'checklist must mention OST');
  assert.ok(
    raw.includes('FAIL') || raw.includes('dispara FAIL'),
    'checklist must cite FAIL on missing link'
  );
});
