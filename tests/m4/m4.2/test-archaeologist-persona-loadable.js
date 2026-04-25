'use strict';

// AC 1 — archaeologist.md persona loads, has valid frontmatter,
// declares tier 2, phases [1, 2, 3, 6], and references 4 phase tasks.
// Also: references `diretrizes-escrita.md` in system_prompt_refs (FR-121).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('archaeologist.md exists at expected path (AC 1)', () => {
  assert.ok(
    fs.existsSync(helpers.ARCHAEOLOGIST_PATH),
    'archaeologist.md missing at ' + helpers.ARCHAEOLOGIST_PATH
  );
});

test('archaeologist frontmatter declares agent_id, tier 2, phases [1,2,3,6] (AC 1)', () => {
  const raw = helpers.readFileText(helpers.ARCHAEOLOGIST_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'archaeologist');
  // tier may parse as number or string depending on quoting; accept both.
  assert.ok(
    String(frontmatter.tier) === '2',
    'tier expected 2, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['1', '2', '3', '6']);
});

test('archaeologist frontmatter references 4 phase tasks (AC 1)', () => {
  const raw = helpers.readFileText(helpers.ARCHAEOLOGIST_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  const tasks = Array.isArray(frontmatter.tasks) ? frontmatter.tasks : [];
  assert.strictEqual(tasks.length, 4);
  assert.ok(tasks.includes('phase-1-objective.md'));
  assert.ok(tasks.includes('phase-2-sources-and-examples.md'));
  assert.ok(tasks.includes('phase-3-as-is.md'));
  assert.ok(tasks.includes('phase-6-to-be.md'));
});

test('archaeologist references diretrizes-escrita.md in system prompt (FR-121)', () => {
  const raw = helpers.readFileText(helpers.ARCHAEOLOGIST_PATH);
  assert.ok(
    raw.includes('diretrizes-escrita.md'),
    'archaeologist persona must reference diretrizes-escrita.md (FR-121)'
  );
});

test('archaeologist body describes role, responsibilities, authority, delegation (AC 1)', () => {
  const raw = helpers.readFileText(helpers.ARCHAEOLOGIST_PATH);
  const body = raw.toLowerCase();
  assert.ok(body.includes('papel'), 'body must describe role (papel)');
  assert.ok(
    body.includes('responsabilidades'),
    'body must describe responsibilities'
  );
  assert.ok(
    body.includes('autoridades') || body.includes('autoridade'),
    'body must describe authority'
  );
  assert.ok(
    body.includes('delegacao') || body.includes('delegação'),
    'body must describe delegation'
  );
});
