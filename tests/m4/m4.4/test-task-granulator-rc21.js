'use strict';

// AC 4 (M4.4) — task-granulator persona declares RC-21 hierarchy
// (Role > Workflow > Task > Action) and frontmatter tier 3, phases [8].
// FR-108.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('task-granulator.md persona exists at expected path (AC 4)', () => {
  assert.ok(
    fs.existsSync(helpers.TASK_GRANULATOR_PATH),
    'task-granulator.md missing at ' + helpers.TASK_GRANULATOR_PATH
  );
});

test('task-granulator frontmatter declares agent_id, tier 3, phases [8] (AC 4)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'task-granulator');
  assert.ok(
    String(frontmatter.tier) === '3',
    'tier expected 3, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['8']);
});

test('task-granulator references diretrizes-escrita.md (FR-121)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(
    raw.includes('diretrizes-escrita.md'),
    'task-granulator persona must reference diretrizes-escrita.md (FR-121)'
  );
});

test('task-granulator persona declares RC-21 hierarchy in canonical order (AC 4)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  // Persona prose must surface Role -> Workflow -> Task -> Action in
  // the dedicated RC-21 section. Scope the search to that section to
  // avoid earlier mentions of "Task" in the persona heading dragging
  // ordering checks.
  assert.ok(raw.includes('RC-21'), 'must name RC-21');
  const sectionStart = raw.indexOf('## Hierarquia RC-21');
  assert.ok(sectionStart > -1, 'persona must have ## Hierarquia RC-21 section');
  const nextHeading = raw.indexOf('\n## ', sectionStart + 1);
  const section = raw.slice(
    sectionStart,
    nextHeading === -1 ? raw.length : nextHeading
  );
  // Use the table-row markers ("| Role |", "| Workflow |", etc.) to
  // pin the canonical RC-21 ordering and ignore narrative mentions.
  const roleIdx = section.indexOf('| Role |');
  const workflowIdx = section.indexOf('| Workflow |');
  const taskIdx = section.indexOf('| Task |');
  const actionIdx = section.indexOf('| Action |');
  assert.ok(roleIdx > -1, 'RC-21 section must name Role row');
  assert.ok(workflowIdx > -1, 'RC-21 section must name Workflow row');
  assert.ok(taskIdx > -1, 'RC-21 section must name Task row');
  assert.ok(actionIdx > -1, 'RC-21 section must name Action row');
  assert.ok(roleIdx < workflowIdx, 'Role row precedes Workflow row');
  assert.ok(workflowIdx < taskIdx, 'Workflow row precedes Task row');
  assert.ok(taskIdx < actionIdx, 'Task row precedes Action row');
});

test('phase-8 task declares RC-21 hierarchy in frontmatter (AC 4)', () => {
  const raw = helpers.readFileText(helpers.PHASE_8_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.ok(Array.isArray(frontmatter.hierarchy));
  assert.deepStrictEqual(frontmatter.hierarchy, [
    'role',
    'workflow',
    'task',
    'action',
  ]);
});

test('task-granulator persona names Task scope ~5-10 min and Action ~30s (AC 4)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(
    raw.includes('5 a 10') || raw.includes('5-10') || raw.includes('5 a 10 min'),
    'persona must declare Task scope of 5 to 10 minutes'
  );
  assert.ok(
    raw.includes('30s') || raw.includes('30 segundos') || raw.includes('cerca de 30'),
    'persona must declare Action scope of about 30 seconds'
  );
});

test('task-granulator declares F8 as the only granularization phase (AC 4)', () => {
  const raw = helpers.readFileText(helpers.TASK_GRANULATOR_PATH);
  assert.ok(
    raw.includes('unica fase') || raw.includes('UNICA fase') || raw.includes('apenas F8') || raw.includes('Apenas F8'),
    'persona must state F8 is the only granularization phase (v1.2 consolidation)'
  );
});
