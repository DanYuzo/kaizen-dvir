'use strict';

// AC 4, 5 (M4.5) — publisher persona declares the 4 Hook Model
// components and instrumentHookModel() renders them all into the
// generated cell's README. AC-109A, FR-109.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('publisher.md exists at expected path (AC 4)', () => {
  assert.ok(
    fs.existsSync(helpers.PUBLISHER_PATH),
    'publisher.md missing at ' + helpers.PUBLISHER_PATH
  );
});

test('publisher persona declares 4 Hook Model components (AC 5, AC-109A)', () => {
  const text = helpers.readFileText(helpers.PUBLISHER_PATH);
  assert.ok(/Trigger/u.test(text), 'persona must mention Trigger');
  assert.ok(/Action/u.test(text), 'persona must mention Action');
  assert.ok(/Variable Reward/u.test(text), 'persona must mention Variable Reward');
  assert.ok(/Investment/u.test(text), 'persona must mention Investment');
});

test('publisher frontmatter declares hook_model_components: 4 items (AC 5)', () => {
  const text = helpers.readFileText(helpers.PUBLISHER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(text);
  const components = frontmatter.hook_model_components;
  assert.ok(
    Array.isArray(components) && components.length === 4,
    'hook_model_components must list exactly 4 items, got ' +
      JSON.stringify(components)
  );
  assert.ok(components.includes('trigger'));
  assert.ok(components.includes('action'));
  assert.ok(components.includes('variable_reward'));
  assert.ok(components.includes('investment'));
});

test('publisher.instrumentHookModel renders 4 sections in README (AC 5)', () => {
  const tmp = helpers.mkTmpDir('hook-model');
  try {
    const publisher = helpers.freshPublisher();
    const result = publisher.instrumentHookModel(tmp, {
      cellName: 'celula-teste',
      description: 'celula de teste em pt-BR.',
    });
    assert.ok(fs.existsSync(result.readmePath), 'README.md must be created');
    const readme = fs.readFileSync(result.readmePath, 'utf8');
    assert.ok(readme.includes('## Hook Model'));
    assert.ok(readme.includes('### Trigger'));
    assert.ok(readme.includes('### Action'));
    assert.ok(readme.includes('### Variable Reward'));
    assert.ok(readme.includes('### Investment'));
    // Each component must carry pt-BR narrative.
    assert.ok(result.narratives.trigger.length > 10);
    assert.ok(result.narratives.action.length > 10);
    assert.ok(result.narratives.variable_reward.length > 10);
    assert.ok(result.narratives.investment.length > 10);
  } finally {
    helpers.rm(tmp);
  }
});

test('publisher persona references diretrizes-escrita.md (AC 7, FR-121)', () => {
  const text = helpers.readFileText(helpers.PUBLISHER_PATH);
  assert.ok(text.includes('diretrizes-escrita.md'));
});
