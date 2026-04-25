'use strict';

// AC 7 — F2 requires 3+ success examples. Fewer than 3 blocks the
// Playback Gate PASS with a pt-BR error.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('phase-2 frontmatter declares min_success_examples: 3 (AC 7)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  const { frontmatter } = helpers.parseFrontmatter(raw);
  assert.strictEqual(String(frontmatter.min_success_examples), '3');
});

test('phase-2 task carries pt-BR reject copy for <3 examples (AC 7)', () => {
  const raw = helpers.readFileText(helpers.PHASE_2_TASK);
  assert.ok(
    raw.includes('preciso de 3 exemplos de sucesso. traga mais 2.'),
    'reject message must guide expert to bring 2 more examples'
  );
});

/**
 * Simulate the gate check. Returns { pass: true } when examples >= 3,
 * otherwise { pass: false, message } with pt-BR error.
 */
function checkExamplesGate(count) {
  if (count >= 3) return { pass: true, message: null };
  return {
    pass: false,
    message: 'preciso de 3 exemplos de sucesso. traga mais ' + (3 - count) + '.',
  };
}

test('gate PASSes when 3 examples provided (AC 7)', () => {
  const r = checkExamplesGate(3);
  assert.strictEqual(r.pass, true);
});

test('gate PASSes when more than 3 provided (AC 7)', () => {
  const r = checkExamplesGate(5);
  assert.strictEqual(r.pass, true);
});

test('gate BLOCKS at 2 examples with pt-BR error guiding correction (AC 7, NFR-101)', () => {
  const r = checkExamplesGate(2);
  assert.strictEqual(r.pass, false);
  assert.ok(r.message.includes('preciso de 3 exemplos'));
  assert.ok(r.message.includes('traga mais 1'));
});

test('gate BLOCKS at 0 examples with pt-BR error (AC 7)', () => {
  const r = checkExamplesGate(0);
  assert.strictEqual(r.pass, false);
  assert.ok(r.message.includes('preciso de 3 exemplos'));
  assert.ok(r.message.includes('traga mais 3'));
});
