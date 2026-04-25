'use strict';

// AC 10: same sub-agent as executor and judge -> FAIL before verdict written.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('validateSeparation rejects identical executor and judge', () => {
  const tmp = mkTmpLogs('ej-separation-validator');
  try {
    const v = requireFreshGate('executor-judge-validator.js');
    const out = v.validateSeparation('sub-agent-A', 'sub-agent-A');
    assert.strictEqual(out.valid, false);
    assert.match(out.reason, /executor nao pode julgar o proprio output/i);
  } finally {
    rmTmp(tmp);
  }
});

test('quality-gate.evaluate short-circuits to FAIL on executor=judge', () => {
  const tmp = mkTmpLogs('ej-separation-gate');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const out = gate.evaluate(
      { id: 'art-ej-1' },
      [{ id: 'c1', severity: 'critical', check: 'automated', run: () => true }],
      { executor: 'sub-agent-A', judge: 'sub-agent-A' }
    );
    assert.strictEqual(out.verdict, 'FAIL');
    assert.strictEqual(
      out.criteria_results.length,
      0,
      'criteria not executed when invariant fails'
    );
    assert.ok(
      out.issues.some((i) => /AC-206/.test(i.message)),
      'AC-206 cited in pt-BR issue'
    );
  } finally {
    rmTmp(tmp);
  }
});

test('different sub-agent for executor and judge passes the validator', () => {
  const tmp = mkTmpLogs('ej-separation-different');
  try {
    const v = requireFreshGate('executor-judge-validator.js');
    const out = v.validateSeparation('sub-agent-A', 'sub-agent-B');
    assert.strictEqual(out.valid, true);
  } finally {
    rmTmp(tmp);
  }
});
