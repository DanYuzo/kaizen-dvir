'use strict';

// AC 10 (M4.3) — F5 does NOT granularize PUs. Any attempt to split a
// PU into Tasks emits Quality Gate FAIL with pt-BR error naming
// D-v1.2-03 and redirecting to F8. FR-104, AC-108, D-v1.2-03.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('detectGranularization returns false for plain risk entry (AC 10)', () => {
  const candidate = {
    pu_id: 'PU-001',
    riscos: [
      { id: 'RISK-001', categoria: 'operacional', descricao: 'd', mitigacao: 'm' },
    ],
  };
  const r = helpers.detectGranularization(candidate);
  assert.strictEqual(r.granularized, false);
});

test('detectGranularization returns true when tasks field present (AC 10, D-v1.2-03)', () => {
  const candidate = {
    pu_id: 'PU-001',
    tasks: ['T-001 — abrir', 'T-002 — preencher'],
  };
  const r = helpers.detectGranularization(candidate);
  assert.strictEqual(r.granularized, true);
  assert.ok(r.message.includes('granularizacao em F5 nao roda'));
  assert.ok(r.message.includes('D-v1.2-03'));
  assert.ok(r.message.includes('F8'));
  assert.ok(r.message.includes('task-granulator'));
  assert.strictEqual(r.reference, 'D-v1.2-03');
});

test('detectGranularization returns true when subTasks field present (AC 10)', () => {
  const candidate = { pu_id: 'PU-001', subTasks: ['ST-001'] };
  const r = helpers.detectGranularization(candidate);
  assert.strictEqual(r.granularized, true);
  assert.ok(r.message.includes('D-v1.2-03'));
});

test('detectGranularization returns true when split_into present (AC 10)', () => {
  const candidate = { pu_id: 'PU-001', split_into: ['PU-001a', 'PU-001b'] };
  const r = helpers.detectGranularization(candidate);
  assert.strictEqual(r.granularized, true);
  assert.ok(r.message.includes('D-v1.2-03'));
});

test('granularization error names D-v1.2-03 and redirects to F8 (AC 10, D-v1.2-03)', () => {
  const r = helpers.detectGranularization({ pu_id: 'PU-001', tasks: ['t'] });
  assert.ok(r.message.includes('D-v1.2-03'));
  assert.ok(r.message.includes('F8'));
  assert.ok(r.message.includes('task-granulator'));
  assert.ok(
    r.message.includes('reabra') || r.message.includes('volte'),
    'message must guide reopening without splitting'
  );
});

test('Quality Gate emits FAIL when granularization detected (AC 10)', () => {
  const logs = helpers.mkTmpLogs('granular-fail');
  try {
    const qg = helpers.freshGate('quality-gate.js');
    const out = qg.evaluate(
      { id: 'F5-granular', content: '## Change Log\n- entry\n' },
      [
        {
          id: 'F5-NO-GRANULARIZATION',
          severity: 'critical',
          check: 'automated',
          run: () => ({
            passed: false,
            message:
              'granularizacao em F5 nao roda. D-v1.2-03 manda Tasks para F8 (task-granulator). reabra esta analise sem dividir a PU.',
          }),
        },
      ],
      { gateId: 'F5' }
    );
    assert.strictEqual(out.verdict, 'FAIL');
    assert.ok(out.issues[0].message.includes('D-v1.2-03'));
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('risk-mapper persona declares no-granularization boundary in prose (AC 10, FR-104)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  // The boundary is stated twice — verify both mentions.
  const occurrences = (raw.match(/granulariza/giu) || []).length;
  assert.ok(
    occurrences >= 2,
    'risk-mapper persona must state no-granularization boundary at least twice (got ' +
      occurrences +
      ')'
  );
  assert.ok(raw.includes('D-v1.2-03'));
  assert.ok(raw.includes('F8'));
});

test('risk-mapper frontmatter sets granularization_allowed: false (AC 10)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.granularization_allowed), 'false');
  assert.strictEqual(frontmatter.granularization_verdict, 'FAIL');
});

test('phase-5 task declares granularization FAIL path with D-v1.2-03 (AC 10)', () => {
  const raw = helpers.readFileText(helpers.PHASE_5_TASK);
  assert.ok(raw.includes('D-v1.2-03'));
  assert.ok(raw.includes('FAIL'));
  assert.ok(raw.includes('F8') || raw.includes('task-granulator'));
});
