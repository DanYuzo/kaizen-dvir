'use strict';

// AC 4, 7: Self-Healing escalates after 2 iterations with full history and
// pt-BR message; escalation logged to .kaizen/logs/gate-verdicts/.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkTmpLogs,
  rmTmp,
  requireFreshGate,
  makeScriptedExecutor,
  makeScriptedGate,
} = require('./_helpers');

test('Self-Healing escalates with max_iterations_reached after 2 iterations', () => {
  const tmp = mkTmpLogs('healing-escalation');
  try {
    const sh = requireFreshGate('self-healing.js');
    const executor = makeScriptedExecutor();
    const gate = makeScriptedGate([
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'falha persistente' }],
      },
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'falha persistente' }],
      },
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'falha persistente' }],
      },
    ]);
    const result = sh.run(executor, { id: 'art-escalate' }, gate, {
      maxIterations: 2,
    });
    assert.strictEqual(result.finalVerdict, 'FAIL');
    assert.strictEqual(result.iterations, 2);
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.escalationTrigger, 'max_iterations_reached');
    assert.match(
      result.escalationMessage,
      /self-healing esgotou 2 tentativas/i
    );
    assert.strictEqual(result.history.length, 3, 'iter 0 + 2 retries');

    // Verify log entry persisted with full history.
    const logFile = path.join(
      tmp,
      'gate-verdicts',
      new Date().toISOString().slice(0, 10) + '.jsonl'
    );
    assert.ok(fs.existsSync(logFile), 'gate-verdicts log file written');
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]);
    assert.strictEqual(entry.escalation_trigger, 'max_iterations_reached');
    assert.ok(Array.isArray(entry.history));
    assert.ok(entry.history.length >= 1);
  } finally {
    rmTmp(tmp);
  }
});
