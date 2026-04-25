'use strict';

// AC 11: Single-sub-agent cell with automated checklist (or expert) as
// judge — invariant satisfied even when the cell has only one sub-agent.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmpLogs, rmTmp, requireFreshGate } = require('./_helpers');

test('validator accepts checklist as judge for single-sub-agent cells', () => {
  const tmp = mkTmpLogs('ej-checklist');
  try {
    const v = requireFreshGate('executor-judge-validator.js');
    const out = v.validateSeparation('sub-agent-only', {
      type: 'checklist',
      id: 'cell-checklist-v1',
    });
    assert.strictEqual(out.valid, true);
  } finally {
    rmTmp(tmp);
  }
});

test('validator accepts expert as judge for single-sub-agent cells', () => {
  const tmp = mkTmpLogs('ej-expert');
  try {
    const v = requireFreshGate('executor-judge-validator.js');
    const out = v.validateSeparation('sub-agent-only', 'expert');
    assert.strictEqual(out.valid, true);
  } finally {
    rmTmp(tmp);
  }
});

test('quality-gate accepts checklist judge and runs criteria', () => {
  const tmp = mkTmpLogs('ej-checklist-gate');
  try {
    const gate = requireFreshGate('quality-gate.js');
    const out = gate.evaluate(
      { id: 'art-checklist-1' },
      [{ id: 'c1', severity: 'critical', check: 'automated', run: () => true }],
      {
        executor: 'sub-agent-only',
        judge: { type: 'checklist', id: 'cell-checklist-v1' },
      }
    );
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.criteria_results.length, 1);
  } finally {
    rmTmp(tmp);
  }
});

test('checklist judge without id is rejected', () => {
  const tmp = mkTmpLogs('ej-checklist-no-id');
  try {
    const v = requireFreshGate('executor-judge-validator.js');
    const out = v.validateSeparation('sub-agent-only', { type: 'checklist' });
    assert.strictEqual(out.valid, false);
  } finally {
    rmTmp(tmp);
  }
});
