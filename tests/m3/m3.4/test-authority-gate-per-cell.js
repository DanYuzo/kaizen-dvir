'use strict';

// AC 6 / FR-012 — Authority Gate blocks tool calls outside the active
// cell's authorities.exclusive with a pt-BR message naming the violated
// authority.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('tool call outside authorities.exclusive blocked with pt-BR message', () => {
  const logs = helpers.mkTmpLogs('ag-block');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    const out = authority.evaluate(
      { tool_name: 'Bash', parameters: { command: 'git push origin main' } },
      { authorities: { exclusive: ['Read', 'Write'] } }
    );
    assert.strictEqual(out.verdict, 'BLOCK');
    assert.ok(out.violatedAuthority, 'must name the violated authority');
    assert.match(out.message, /acao bloqueada/);
    assert.match(out.message, /celula\.yaml/);
    // Cites the MOST-specific token (composite 'git push' > 'git').
    assert.match(out.message, /git push/);
    assert.strictEqual(out.violatedAuthority, 'git push');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});

test('cell name resolution loads authorities from celula.yaml', () => {
  const logs = helpers.mkTmpLogs('ag-byname');
  const celulas = helpers.mkTmpCelulas('ag-byname');
  try {
    helpers.writeCelulaYaml(
      celulas,
      'yotzer',
      'description: "yotzer"\n' +
        'authorities:\n' +
        '  exclusive:\n' +
        '    - "Read"\n' +
        '    - "Write"\n'
    );
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    const out = authority.evaluate(
      { tool_name: 'Bash', parameters: { command: 'rm -rf /' } },
      'yotzer'
    );
    assert.strictEqual(out.verdict, 'BLOCK');
    assert.match(out.message, /acao bloqueada/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(celulas);
  }
});

test('verdict log entry records BLOCK with violated_authority', () => {
  const logs = helpers.mkTmpLogs('ag-log');
  try {
    const authority = helpers.freshGate('authority-gate.js');
    authority._resetCacheForTests();
    authority.evaluate(
      { tool_name: 'Bash', parameters: { command: 'git push' } },
      { authorities: { exclusive: ['Read'] } }
    );
    const entries = helpers.readJsonl(logs, 'gate-verdicts');
    const blocks = entries.filter((e) => e.verdict === 'BLOCK');
    assert.ok(blocks.length >= 1);
    assert.ok(blocks[0].violated_authority);
    assert.match(blocks[0].reason, /bloqueada/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
  }
});
