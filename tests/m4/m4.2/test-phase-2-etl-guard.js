'use strict';

// AC 8, AC-116 — Yotzer does NOT process ETLs. If the expert asks for
// dense KB creation inside F2, the task emits a pt-BR WARN and
// recommends a dedicated ETL cell.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('phase-2 frontmatter declares etl_guard true (AC 8)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.etl_guard), 'true');
});

test('phase-2 task body carries pt-BR WARN for ETL requests (AC 8, AC-116)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  assert.ok(
    raw.includes('yotzer nao processa ETL'),
    'ETL guard WARN must state "yotzer nao processa ETL"'
  );
  assert.ok(
    raw.includes('etlmaker'),
    'ETL guard WARN must recommend the etlmaker cell'
  );
});

test('phase-2 body mentions "KB denso" as the trigger for the guard (AC 8)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  assert.ok(
    raw.toLowerCase().includes('kb denso'),
    'guard must describe the trigger as dense KB creation'
  );
});

/**
 * Simulate the guard — given an expert request signal, the guard
 * returns a pt-BR WARN when the signal indicates dense KB creation.
 */
function etlGuard(request) {
  const triggers = [
    'criar kb denso',
    'montar kb denso',
    'fazer etl',
    'gerar etl',
    'processar etl',
  ];
  const lower = String(request || '').toLowerCase();
  const triggered = triggers.some((t) => lower.includes(t));
  if (triggered) {
    return {
      warn: true,
      message: 'yotzer nao processa ETL. peca para o etlmaker criar um KB dedicado.',
    };
  }
  return { warn: false, message: null };
}

test('guard triggers WARN for explicit ETL request (AC 8)', () => {
  const result = etlGuard('quero criar KB denso pra esse tema');
  assert.strictEqual(result.warn, true);
  assert.ok(result.message.includes('yotzer nao processa ETL'));
  assert.ok(result.message.includes('etlmaker'));
});

test('guard does not trigger on regular F2 requests (AC 8)', () => {
  const result = etlGuard('quero fornecer links e documentos');
  assert.strictEqual(result.warn, false);
  assert.strictEqual(result.message, null);
});

test('guard message is pt-BR short-sentence per diretrizes-escrita (AC 8, FR-121)', () => {
  const result = etlGuard('fazer ETL pra essa fonte');
  // Short sentence, present tense, active voice, no adverbs.
  assert.ok(result.message.split('.').length <= 3);
  assert.ok(!/\bmuito\b|\bfortemente\b|\brapidamente\b/u.test(result.message));
});
