'use strict';

// AC 2 (M4.3) — F4 enforces Musk 5-step in strict order. Reordering any
// step emits Quality Gate FAIL with pt-BR error naming the expected and
// attempted steps. FR-103B.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const helpers = require('./_helpers');

test('stress-tester.md persona exists at expected path (AC 1)', () => {
  assert.ok(
    fs.existsSync(helpers.STRESS_TESTER_PATH),
    'stress-tester.md missing at ' + helpers.STRESS_TESTER_PATH
  );
});

test('stress-tester frontmatter declares agent_id, tier 3, phases [4] (AC 1)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(frontmatter.agent_id, 'stress-tester');
  assert.ok(
    String(frontmatter.tier) === '3',
    'tier expected 3, got ' + String(frontmatter.tier)
  );
  assert.deepStrictEqual(frontmatter.phases, ['4']);
});

test('stress-tester references diretrizes-escrita.md in system prompt (FR-121)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  assert.ok(
    raw.includes('diretrizes-escrita.md'),
    'stress-tester persona must reference diretrizes-escrita.md (FR-121)'
  );
});

test('stress-tester body declares Musk strict order in pt-BR (AC 2)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  // Order must appear in canonical sequence within prose.
  const qIdx = raw.indexOf('Questionar');
  const dIdx = raw.indexOf('Deletar');
  const sIdx = raw.indexOf('Simplificar');
  const aIdx = raw.indexOf('Acelerar');
  const auIdx = raw.indexOf('Automatizar');
  assert.ok(qIdx > -1, 'Questionar must be named');
  assert.ok(qIdx < dIdx, 'Questionar precedes Deletar');
  assert.ok(dIdx < sIdx, 'Deletar precedes Simplificar');
  assert.ok(sIdx < aIdx, 'Simplificar precedes Acelerar');
  assert.ok(aIdx < auIdx, 'Acelerar precedes Automatizar');
});

test('phase-4-stress-test.md task declares strict-order check with FAIL (AC 2)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  assert.ok(
    raw.includes('ordem Musk') && raw.includes('FAIL'),
    'phase-4 task must declare FAIL on Musk order violation'
  );
  assert.ok(
    /esperado:.*tentado:/u.test(raw),
    'phase-4 task must declare error message naming expected and attempted steps'
  );
});

test('applyMuskStep accepts canonical order Questionar->Automatizar (AC 2)', () => {
  let state = helpers.newMuskState();
  for (const step of helpers.MUSK_STEPS) {
    state = helpers.applyMuskStep(state, step);
  }
  assert.deepStrictEqual(state.applied, [
    'Questionar',
    'Deletar',
    'Simplificar',
    'Acelerar',
    'Automatizar',
  ]);
});

test('applyMuskStep throws MUSK_ORDER_VIOLATED on reorder Deletar before Questionar (AC 2)', () => {
  const state = helpers.newMuskState();
  let err = null;
  try {
    helpers.applyMuskStep(state, 'Deletar');
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null, 'must throw on reorder');
  assert.strictEqual(err.code, 'MUSK_ORDER_VIOLATED');
  assert.strictEqual(err.expected, 'Questionar');
  assert.strictEqual(err.attempted, 'Deletar');
});

test('Musk reorder error message names expected and attempted steps in pt-BR (AC 2, NFR-101)', () => {
  let state = helpers.newMuskState();
  state = helpers.applyMuskStep(state, 'Questionar');
  let err = null;
  try {
    helpers.applyMuskStep(state, 'Simplificar');
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.ok(err.message.includes('ordem Musk quebrada'));
  assert.ok(err.message.includes('Deletar'));
  assert.ok(err.message.includes('Simplificar'));
  assert.ok(err.message.includes('volte'));
});

test('Musk reorder skipping a step triggers FAIL (AC 2)', () => {
  let state = helpers.newMuskState();
  state = helpers.applyMuskStep(state, 'Questionar');
  state = helpers.applyMuskStep(state, 'Deletar');
  // Skip Simplificar — try Acelerar directly.
  let err = null;
  try {
    helpers.applyMuskStep(state, 'Acelerar');
  } catch (e) {
    err = e;
  }
  assert.notStrictEqual(err, null);
  assert.strictEqual(err.code, 'MUSK_ORDER_VIOLATED');
  assert.strictEqual(err.expected, 'Simplificar');
});

test('Quality Gate evaluates Musk order criterion as critical FAIL on reorder (AC 2)', () => {
  const logs = helpers.mkTmpLogs('musk-fail');
  try {
    const qg = helpers.freshGate('quality-gate.js');
    const out = qg.evaluate(
      { id: 'F4-musk-test', content: '## Change Log\n- ok\n' },
      [
        {
          id: 'F4-MUSK-ORDER',
          severity: 'critical',
          check: 'automated',
          run: () => ({
            passed: false,
            message:
              'ordem Musk quebrada. esperado: Deletar. tentado: Simplificar. volte antes de seguir.',
          }),
        },
      ],
      { gateId: 'F4' }
    );
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.issues.length > 0);
    assert.ok(out.issues[0].message.includes('ordem Musk'));
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
