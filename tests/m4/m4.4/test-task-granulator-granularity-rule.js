'use strict';

// AC 7 (M4.4) — task-granulator enforces the granularity rule at F8:
// any Task with more than 5-7 Actions splits into 2 Tasks OR extracts
// a reusable skill. Test covers the 8-Action split case. FR-108.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('task-granulator persona declares granularity rule 5-7 Actions per Task (AC 7)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(
    raw.includes('5 a 7') || raw.includes('5-7'),
    'persona must declare 5-7 Actions per Task threshold'
  );
  assert.ok(
    raw.includes('split') ||
      raw.includes('quebrar') ||
      raw.includes('Quebrar') ||
      raw.includes('duas Tasks'),
    'persona must declare split path'
  );
  assert.ok(
    raw.includes('skill'),
    'persona must declare skill extraction path'
  );
});

test('phase-8 task declares granularity_max_actions in frontmatter (AC 7)', () => {
  const raw = helpers.readFileText(helpers.PHASE_8_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(
    String(frontmatter.granularity_max_actions),
    '7',
    'granularity_max_actions must be 7'
  );
});

test('countActions counts inline numbered Actions in markdown Task (AC 7)', () => {
  const dir = helpers.mkTmpCell('granularity-count');
  try {
    const target = helpers.makeTaskFile(dir, 'TASK-001', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: [
        'levante o tom de voz',
        'aumente 20% a velocidade',
        'pause 2 segundos',
      ],
    });
    assert.strictEqual(helpers.countActions(target), 3);
  } finally {
    helpers.rm(dir);
  }
});

test('Task with 8 Actions exceeds threshold and triggers split (AC 7)', () => {
  const dir = helpers.mkTmpCell('granularity-eight');
  try {
    const eight = [
      'levante o tom de voz',
      'aumente 20% a velocidade',
      'pause 2 segundos',
      'olhe para a camera',
      'sorria ao falar do beneficio',
      'aponte para a tela ao mostrar dado',
      'fale o nome do cliente',
      'confirme entendimento com pergunta direta',
    ];
    const single = helpers.makeTaskFile(dir, 'TASK-BIG', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: eight,
    });
    const count = helpers.countActions(single);
    assert.strictEqual(count, 8);
    assert.ok(count > 7, 'Task with 8 Actions exceeds threshold of 7');
    // Split path: produce 2 Tasks each with <= 4 Actions.
    const splitA = helpers.makeTaskFile(dir, 'TASK-SPLIT-A', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: eight.slice(0, 4),
    });
    const splitB = helpers.makeTaskFile(dir, 'TASK-SPLIT-B', {
      pu_pai: 'PU-001',
      solution_id: 'SOL-001',
      actions: eight.slice(4),
    });
    assert.ok(helpers.countActions(splitA) <= 7);
    assert.ok(helpers.countActions(splitB) <= 7);
    assert.strictEqual(
      helpers.countActions(splitA) + helpers.countActions(splitB),
      8
    );
  } finally {
    helpers.rm(dir);
  }
});

test('action-observability checklist declares granularity rule (AC 7)', () => {
  const raw = helpers.readFileText(helpers.ACTION_OBS_CHECKLIST);
  // Range may be expressed as "5 a 7" or "5-7" or "1 e 7" (1 to 7).
  assert.ok(
    raw.includes('5 a 7') ||
      raw.includes('5-7') ||
      raw.includes('1 e 7') ||
      raw.includes('entre 1 e 7'),
    'checklist must declare Action-per-Task range'
  );
  assert.ok(raw.includes('skill'));
  assert.ok(raw.includes('FAIL'));
});
