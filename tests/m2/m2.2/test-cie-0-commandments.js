'use strict';

// AC 2, 6, 8: CIE-0 reads `.kaizen-dvir/commandments.md` and injects verbatim
// (pt-BR preserved). On read failure, an injection_error is logged in pt-BR
// without throwing.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpLogs, rmTmp, cieFresh, readLogFiles, PROJECT_ROOT } =
  require('./_helpers');

test('CIE-0 injects Commandments verbatim with pt-BR text preserved (AC 2)', () => {
  const tmp = mkTmpLogs('cie0-happy');
  try {
    const cie = cieFresh();
    const result = cie.injectCommandments({ sessionId: 's-cie0-happy' });

    assert.strictEqual(result.layer, 'CIE-0');
    assert.strictEqual(typeof result.payload, 'string');
    assert.ok(result.payload.length > 0, 'payload must not be empty');
    assert.ok(
      result.payload.includes('Commandments'),
      'payload must contain the Commandments header'
    );
    // pt-BR markers from commandments.md: accented characters must survive.
    assert.ok(
      result.payload.includes('inegociáveis') ||
        result.payload.includes('célula') ||
        result.payload.includes('princípios'),
      'pt-BR characters must be preserved verbatim'
    );
    assert.ok(
      typeof result.elapsedMs === 'number' && result.elapsedMs >= 0,
      'elapsedMs must be a non-negative number'
    );
    assert.deepStrictEqual(result.warnings, [], 'no warnings on happy path');
  } finally {
    rmTmp(tmp);
  }
});

test('CIE-0 logs pt-BR error when commandments.md is missing (AC 8)', () => {
  const tmp = mkTmpLogs('cie0-missing');
  // Temporarily rename commandments.md so the reader fails.
  const real = path.join(PROJECT_ROOT, '.kaizen-dvir', 'commandments.md');
  const backup = real + '.bak-m2.2-test';
  fs.renameSync(real, backup);
  try {
    const cie = cieFresh();
    const result = cie.injectCommandments({ sessionId: 's-cie0-missing' });

    assert.strictEqual(result.payload, '', 'empty payload on failure');
    assert.strictEqual(result.warnings.length, 1, 'one warning recorded');
    assert.match(
      result.warnings[0].message,
      /CIE-0|commandments/i,
      'warning mentions the failing layer'
    );

    const entries = readLogFiles(tmp);
    assert.ok(entries.length >= 1, 'at least one log entry was written');
    const e = entries[0];
    assert.strictEqual(e.event_type, 'injection_error');
    assert.strictEqual(e.hook_name, 'UserPromptSubmit');
    assert.strictEqual(e.layer, 'CIE-0');
    assert.match(
      e.message,
      /não|nao|continua/i,
      'error message is pt-BR (no English-only words)'
    );
    // Language Policy: message should NOT look like an English sentence.
    assert.doesNotMatch(
      e.message,
      /^(failed|error|could not) /i,
      'error message must not start with English-only error words'
    );
  } finally {
    fs.renameSync(backup, real);
    rmTmp(tmp);
  }
});
