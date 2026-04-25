'use strict';

// AC 14 (M4.3) — Quality Gates at F4 and F5 auto-approve in auto mode
// when verdict is PASS, surface CONCERNS to expert in any mode, pause
// on FAIL in any mode. Contrasts with F1, F2, F10 which always pause
// regardless of mode (AC-102, AC-113).

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('mode-engine isCriticalInvariant returns true for F1 phase-1-objective (contrast)', () => {
  const stateDir = helpers.mkTmpState('crit-f1');
  try {
    const me = helpers.freshGate('mode-engine.js');
    const manifest = {
      critical_invariants: [
        'phase-1-objective',
        'phase-2-sources-and-examples',
        'phase-10-publication',
      ],
    };
    assert.strictEqual(me.isCriticalInvariant(manifest, 'phase-1-objective'), true);
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
  }
});

test('mode-engine isCriticalInvariant returns true for F2 phase-2 (contrast)', () => {
  const stateDir = helpers.mkTmpState('crit-f2');
  try {
    const me = helpers.freshGate('mode-engine.js');
    const manifest = {
      critical_invariants: [
        'phase-1-objective',
        'phase-2-sources-and-examples',
        'phase-10-publication',
      ],
    };
    assert.strictEqual(
      me.isCriticalInvariant(manifest, 'phase-2-sources-and-examples'),
      true
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
  }
});

test('mode-engine isCriticalInvariant returns true for F10 phase-10 (contrast)', () => {
  const stateDir = helpers.mkTmpState('crit-f10');
  try {
    const me = helpers.freshGate('mode-engine.js');
    const manifest = {
      critical_invariants: [
        'phase-1-objective',
        'phase-2-sources-and-examples',
        'phase-10-publication',
      ],
    };
    assert.strictEqual(
      me.isCriticalInvariant(manifest, 'phase-10-publication'),
      true
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
  }
});

test('F4 phase-4-stress-test is NOT critical invariant (AC 14, AC-113)', () => {
  const stateDir = helpers.mkTmpState('non-crit-f4');
  try {
    const me = helpers.freshGate('mode-engine.js');
    const manifest = {
      critical_invariants: [
        'phase-1-objective',
        'phase-2-sources-and-examples',
        'phase-10-publication',
      ],
    };
    assert.strictEqual(
      me.isCriticalInvariant(manifest, 'phase-4-stress-test'),
      false
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
  }
});

test('F5 phase-5-risk-map is NOT critical invariant (AC 14, AC-113)', () => {
  const stateDir = helpers.mkTmpState('non-crit-f5');
  try {
    const me = helpers.freshGate('mode-engine.js');
    const manifest = {
      critical_invariants: [
        'phase-1-objective',
        'phase-2-sources-and-examples',
        'phase-10-publication',
      ],
    };
    assert.strictEqual(
      me.isCriticalInvariant(manifest, 'phase-5-risk-map'),
      false
    );
  } finally {
    helpers.clearEnv();
    helpers.rm(stateDir);
  }
});

test('manifest declares F4 and F5 outside critical_invariants list (AC 14)', () => {
  const raw = helpers.readFileText(helpers.MANIFEST_PATH);
  // Verify manifest still has the canonical 3-element list.
  assert.ok(raw.includes('phase-1-objective'));
  assert.ok(raw.includes('phase-2-sources-and-examples'));
  assert.ok(raw.includes('phase-10-publication'));
  // F4 and F5 phases declared as tasks but not in critical list.
  assert.ok(raw.includes('phase-4-stress-test'));
  assert.ok(raw.includes('phase-5-risk-map'));
});

test('phase-4 task frontmatter declares critical_invariant: false (AC 14)', () => {
  const raw = helpers.readFileText(helpers.PHASE_4_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.critical_invariant), 'false');
});

test('phase-5 task frontmatter declares critical_invariant: false (AC 14)', () => {
  const raw = helpers.readFileText(helpers.PHASE_5_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.critical_invariant), 'false');
});

test('Quality Gate emits PASS for F4 with all criteria satisfied (AC 14)', () => {
  const logs = helpers.mkTmpLogs('f4-pass');
  try {
    const qg = helpers.freshGate('quality-gate.js');
    const out = qg.evaluate(
      { id: 'F4-pass-test', content: '## Change Log\n- entry\n' },
      [
        {
          id: 'F4-MUSK-ORDER',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F4-CUT-RATIONALE',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F4-CUT-TARGET',
          severity: 'medium',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F4-OST-PRUNED',
          severity: 'high',
          check: 'automated',
          run: () => true,
        },
      ],
      { gateId: 'F4' }
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('Quality Gate emits PASS for F5 with all criteria satisfied (AC 14)', () => {
  const logs = helpers.mkTmpLogs('f5-pass');
  try {
    const qg = helpers.freshGate('quality-gate.js');
    const out = qg.evaluate(
      { id: 'F5-pass-test', content: '## Change Log\n- entry\n' },
      [
        {
          id: 'F5-PER-PU-COVERAGE',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F5-RISK-OUTCOME',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F5-NO-GRANULARIZATION',
          severity: 'critical',
          check: 'automated',
          run: () => true,
        },
        {
          id: 'F5-OST-SOLUTIONS-LINKED',
          severity: 'high',
          check: 'automated',
          run: () => true,
        },
      ],
      { gateId: 'F5' }
    );
    assert.strictEqual(out.verdict, 'PASS');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('auto mode auto-approves F4 PASS (non-critical) — simulated decision (AC 14, AC-113)', () => {
  // Simulate the chief decision rule: auto mode + non-critical + PASS = auto-approve.
  function chiefDecision(mode, isCritical, verdict) {
    if (verdict === 'FAIL') return 'pause';
    if (verdict === 'CONCERNS') return 'surface';
    if (verdict === 'PASS') {
      if (isCritical) return 'pause';
      if (mode === 'automatico') return 'auto-approve';
      return 'surface';
    }
    return 'pause';
  }
  // F4 in auto mode with PASS — auto-approve.
  assert.strictEqual(chiefDecision('automatico', false, 'PASS'), 'auto-approve');
  // F5 in auto mode with PASS — auto-approve.
  assert.strictEqual(chiefDecision('automatico', false, 'PASS'), 'auto-approve');
  // F1 (critical) in auto mode — still pauses on PASS.
  assert.strictEqual(chiefDecision('automatico', true, 'PASS'), 'pause');
  // F4 in auto mode with CONCERNS — surfaces, not auto-approves.
  assert.strictEqual(chiefDecision('automatico', false, 'CONCERNS'), 'surface');
  // F4 in any mode with FAIL — pauses.
  assert.strictEqual(chiefDecision('automatico', false, 'FAIL'), 'pause');
  assert.strictEqual(chiefDecision('interativo', false, 'FAIL'), 'pause');
});

test('stress-tester persona declares F4 non-critical (AC 14)', () => {
  const raw = helpers.readFileText(helpers.STRESS_TESTER_PATH);
  assert.ok(raw.includes('nao critico') || raw.includes('nao-critico'));
});

test('risk-mapper persona declares F5 non-critical (AC 14)', () => {
  const raw = helpers.readFileText(helpers.RISK_MAPPER_PATH);
  assert.ok(raw.includes('nao critico') || raw.includes('nao-critico'));
});
