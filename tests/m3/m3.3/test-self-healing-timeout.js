'use strict';

// AC 6, 7: Per-iteration timeout triggers fix_failure escalation.
// Strategy: inject a tiny timeoutMs and a deliberately slow executor stub.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  mkTmpLogs,
  rmTmp,
  requireFreshGate,
  makeScriptedGate,
} = require('./_helpers');

function makeSlowExecutor(delayMs) {
  return {
    invoke: function (payload) {
      // Busy-wait to simulate slow executor (synchronous contract).
      const start = Date.now();
      while (Date.now() - start < delayMs) {
        // intentional spin
      }
      return {
        revisedArtifact: Object.assign({}, payload.artifact, { slow: true }),
      };
    },
  };
}

test('Self-Healing escalates with fix_failure on iteration timeout', () => {
  const tmp = mkTmpLogs('healing-timeout');
  try {
    const sh = requireFreshGate('self-healing.js');
    const executor = makeSlowExecutor(60); // takes ~60ms
    const gate = makeScriptedGate([
      {
        verdict: 'FAIL',
        issues: [{ severity: 'critical', message: 'erro inicial' }],
      },
      // Should never be called — executor times out first.
      { verdict: 'PASS', issues: [] },
    ]);
    const result = sh.run(executor, { id: 'art-timeout' }, gate, {
      maxIterations: 2,
      timeoutMs: 5, // 5ms — guaranteed timeout
    });
    assert.strictEqual(result.escalated, true);
    assert.strictEqual(result.escalationTrigger, 'fix_failure');
    assert.match(
      result.escalationMessage,
      /excedeu o orcamento de tempo|escalando ao expert/i
    );
  } finally {
    rmTmp(tmp);
  }
});
