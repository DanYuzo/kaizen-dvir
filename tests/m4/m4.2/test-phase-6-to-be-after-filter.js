'use strict';

// AC 12 — F6 enforces pre-condition F4 PASS AND F5 PASS. Attempting F6
// without both raises a pt-BR error that guides correction and blocks
// execution.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('phase-6-to-be.md declares pre-condition requires F4 AND F5 PASS (AC 12)', () => {
  const raw = helpers.readFileText(helpers.PHASE_6_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  const pre = frontmatter.pre_condition;
  const preJoined = Array.isArray(pre) ? pre.join(' ') : String(pre || '');
  assert.ok(preJoined.includes('phase_4_pass'));
  assert.ok(preJoined.includes('phase_5_pass'));
});

test('phase-6-to-be.md carries pt-BR block message for missing pre-condition (AC 12, NFR-101)', () => {
  const raw = helpers.readFileText(helpers.PHASE_6_TASK);
  assert.ok(
    raw.includes('F6 precisa de F4 PASS e F5 PASS. execute a M4.3 antes.'),
    'F6 must emit pt-BR block message pointing to M4.3'
  );
});

/**
 * Simulate the F6 pre-condition checker. Given two handoff availability
 * flags, return {ok, message}.
 */
function checkF6PreCondition(f4Pass, f5Pass) {
  if (f4Pass && f5Pass) return { ok: true, message: null };
  return {
    ok: false,
    message: 'F6 precisa de F4 PASS e F5 PASS. execute a M4.3 antes.',
  };
}

test('pre-condition PASS when both F4 and F5 are available (AC 12)', () => {
  const r = checkF6PreCondition(true, true);
  assert.strictEqual(r.ok, true);
});

test('pre-condition BLOCKS when F4 missing (AC 12)', () => {
  const r = checkF6PreCondition(false, true);
  assert.strictEqual(r.ok, false);
  assert.ok(r.message.includes('F6 precisa de F4 PASS e F5 PASS'));
});

test('pre-condition BLOCKS when F5 missing (AC 12)', () => {
  const r = checkF6PreCondition(true, false);
  assert.strictEqual(r.ok, false);
  assert.ok(r.message.includes('execute a M4.3'));
});

test('pre-condition BLOCKS when both missing (AC 12)', () => {
  const r = checkF6PreCondition(false, false);
  assert.strictEqual(r.ok, false);
  assert.ok(r.message.includes('F6 precisa'));
});

/**
 * Use handoff-engine to simulate the real F6 check. The archaeologist
 * looks for handoffs addressed to it (or to the to-be phase) that
 * originate from F4 and F5.
 */
test('F6 check via handoff-engine: BLOCK when no F4/F5 handoff exists (AC 12)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f6-no-handoffs');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    // No handoffs written — readLatest returns null for any target.
    const latest = engine.readLatest('archaeologist');
    assert.strictEqual(latest, null);
    const r = checkF6PreCondition(latest !== null, latest !== null);
    assert.strictEqual(r.ok, false);
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('F6 check via handoff-engine: PASS when both F4 and F5 handoffs present (AC 12)', () => {
  const handoffsDir = helpers.mkTmpHandoffs('f6-handoffs-ok');
  try {
    const engine = helpers.freshMemory('handoff-engine.js');
    // Generate F4 and F5 handoffs addressed to archaeologist.
    const f4 = engine.generate(
      'stress-tester',
      'archaeologist',
      {
        artifact_id: 'stress-report',
        artifact_path: 'stress.yaml',
        current_phase: 'phase-4-stress-test',
        branch: 'main',
      },
      ['cortou 30% das PUs'],
      ['stress.yaml'],
      [],
      'iniciar F5 risk-map.'
    );
    engine.persist(f4);
    const f5 = engine.generate(
      'risk-mapper',
      'archaeologist',
      {
        artifact_id: 'risk-map',
        artifact_path: 'risk.yaml',
        current_phase: 'phase-5-risk-map',
        branch: 'main',
      },
      ['identificou 4 riscos'],
      ['risk.yaml'],
      [],
      'iniciar F6 to-be.'
    );
    engine.persist(f5);
    const latest = engine.readLatest('archaeologist');
    assert.notStrictEqual(latest, null);
    assert.ok(fs.existsSync(latest.path));
  } finally {
    helpers.clearEnv();
    helpers.rm(handoffsDir);
  }
});

test('phase-6-to-be.md frontmatter has critical_invariant: false (non-critical, AC 14)', () => {
  const raw = helpers.readFileText(helpers.PHASE_6_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.critical_invariant), 'false');
});
