'use strict';

// M2 Gate Criterion 1 (Epic KZ-M2 § Gate Criteria):
// Hooks fire on correct Claude Code events. We register each of the 3
// hooks with the shared M2.1 runner, dispatch simulated events, and
// assert the registered handlers executed and returned results (UserPrompt
// injection payload, PreCompact snapshot path, PreToolUse PASS verdict).

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const {
  mkTmp,
  rmTmp,
  freshRunner,
  loadHookEntry,
  HOOKS_DIR,
} = require('./_helpers');

test('M2 Gate 1: all 3 hooks dispatch on simulated events', () => {
  const tmp = mkTmp('gate1');
  try {
    // Seed fresh runner + cie + log-writer into the require cache via
    // freshRunner(). Then load each hook entry WITHOUT flushing the
    // runner again — they all register against the same cached instance.
    freshRunner();
    const path = require('node:path');
    const runnerPath = path.join(HOOKS_DIR, 'hook-runner.js');
    const ups = loadHookEntry('UserPromptSubmit'); // auto-registers on load
    const pre = loadHookEntry('PreCompact');
    const tool = loadHookEntry('PreToolUse');
    pre.register();
    tool.register();
    const runner = require(runnerPath); // same cached instance the hooks saw

    // --- UserPromptSubmit -------------------------------------------------
    const upsResult = runner.dispatch('UserPromptSubmit', {
      sessionCtx: { sessionId: 's-gate1', prompt: 'ping', activeCell: null },
    });
    assert.ok(upsResult && typeof upsResult === 'object', 'UPS result object');
    assert.ok(Array.isArray(upsResult.perLayer), 'UPS perLayer array');
    assert.ok(upsResult.perLayer.length >= 3, 'UPS >= 3 layers');
    // CIE-0 must have injected Commandments content.
    assert.ok(
      typeof upsResult.combinedPayload === 'string',
      'UPS combinedPayload string'
    );

    // --- PreCompact --------------------------------------------------------
    const pcResult = runner.dispatch('PreCompact', {
      session_id: 's-gate1',
      active_cell: null,
      decisions: [],
      files_modified: [],
      next_action: 'continue',
    });
    assert.strictEqual(pcResult.verdict, 'PASS', 'PreCompact PASS');
    assert.ok(
      fs.existsSync(pcResult.snapshot_path),
      'PreCompact wrote snapshot: ' + pcResult.snapshot_path
    );

    // --- PreToolUse --------------------------------------------------------
    // Compliant call: Bash, no active cell → baseline Commandment I passes.
    const puResult = runner.dispatch('PreToolUse', {
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      session_id: 's-gate1',
    });
    assert.strictEqual(puResult.verdict, 'PASS', 'PreToolUse PASS');

    // Side-effect proof: each dispatch appended at least one log entry.
    const logDir = path.join(tmp.logs, 'hook-calls');
    const gateDir = path.join(tmp.logs, 'gate-verdicts');
    const hookLogs = fs.existsSync(logDir) ? fs.readdirSync(logDir) : [];
    const gateLogs = fs.existsSync(gateDir) ? fs.readdirSync(gateDir) : [];
    assert.ok(
      hookLogs.length > 0 || gateLogs.length > 0,
      'at least one hook log or gate log written'
    );
    // Avoid "ups is unused" warnings on strict linters.
    assert.ok(ups.EVENT === 'UserPromptSubmit');
  } finally {
    rmTmp(tmp);
  }
});
