'use strict';

// AC 1, 2 (M4.5) — progressive-systemizer persona declares the strict
// 4-tier order and blocks tier-skipping plans (AC-109, FR-107).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('progressive-systemizer.md exists at expected path (AC 1)', () => {
  assert.ok(
    fs.existsSync(helpers.PROGRESSIVE_SYSTEMIZER_PATH),
    'progressive-systemizer.md missing at ' + helpers.PROGRESSIVE_SYSTEMIZER_PATH
  );
});

test('progressive-systemizer frontmatter declares agent_id, tier 3, phases [10] (AC 1)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(text);
  assert.strictEqual(frontmatter.agent_id, 'progressive-systemizer');
  assert.strictEqual(String(frontmatter.tier), '3');
  assert.ok(
    Array.isArray(frontmatter.phases) && frontmatter.phases.includes('10'),
    'phases must include 10, got ' + JSON.stringify(frontmatter.phases)
  );
});

test('progressive-systemizer declares STRICT 4-tier order (AC 2, AC-109, FR-107)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  // The body must declare manual -> simplificado -> batch -> automatizado.
  assert.ok(text.includes('manual'), 'must declare manual tier');
  assert.ok(text.includes('simplificado'), 'must declare simplificado tier');
  assert.ok(text.includes('batch'), 'must declare batch tier');
  assert.ok(text.includes('automatizado'), 'must declare automatizado tier');
  // Order must appear sequentially in the prose.
  const idxManual = text.indexOf('manual');
  const idxSimpl = text.indexOf('simplificado');
  const idxBatch = text.indexOf('batch');
  const idxAuto = text.indexOf('automatizado');
  assert.ok(
    idxManual < idxSimpl && idxSimpl < idxBatch && idxBatch < idxAuto,
    '4-tier order must appear manual < simplificado < batch < automatizado'
  );
});

test('progressive-systemizer authority blocks tier skipping (AC 2)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    /block_tier_skipping_plan/u.test(text),
    'authorities must include block_tier_skipping_plan'
  );
});

test('progressive-systemizer pt-BR error message names tier-skipping rule (AC 2)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(
    /sem justificativa do tier/u.test(text),
    'pt-BR error message must mention "sem justificativa do tier"'
  );
  assert.ok(
    /ordem fixa/u.test(text),
    'pt-BR error message must mention "ordem fixa"'
  );
});

test('progressive-systemizer references diretrizes-escrita.md (AC 1, FR-121)', () => {
  const text = helpers.readFileText(helpers.PROGRESSIVE_SYSTEMIZER_PATH);
  assert.ok(text.includes('diretrizes-escrita.md'));
});
