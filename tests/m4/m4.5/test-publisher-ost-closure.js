'use strict';

// AC 9 (M4.5) — publisher.ostClosureValidator walks OST.md and asserts
// every Task -> Solution -> Opportunity -> Outcome edge is present.
// Orphan triggers FAIL with pt-BR error naming the offending node.
// AC-117.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

function writeOst(cellRoot, body) {
  fs.mkdirSync(cellRoot, { recursive: true });
  fs.writeFileSync(path.join(cellRoot, 'OST.md'), body, 'utf8');
}

const VALID_OST = [
  '# OST',
  '',
  '## Outcome',
  '',
  '- id: OUT-001 tipo: melhoria descricao: x.',
  '',
  '## Opportunities',
  '',
  '- id: OPP-001 descricao: y. pus: PU-001.',
  '',
  '## Solutions',
  '',
  '- id: SOL-001 descricao: z.',
  '',
  '## Links',
  '',
  '- SOL-001 resolve OPP-001.',
  '',
  '## Tasks',
  '',
  '- id: TASK-001 descricao: w. solution: SOL-001.',
  '',
  '## Change Log',
  '',
  '- 2026-04-25 — @publisher — closed.',
  '',
].join('\n');

test('ostClosureValidator PASS on closed chain (AC 9, AC-117)', () => {
  const tmp = helpers.mkTmpDir('ost-pass');
  try {
    const publisher = helpers.freshPublisher();
    writeOst(tmp, VALID_OST);
    const result = publisher.ostClosureValidator(tmp);
    assert.strictEqual(result.verdict, 'PASS', JSON.stringify(result.errors));
    assert.deepStrictEqual(result.orphans, []);
  } finally {
    helpers.rm(tmp);
  }
});

test('ostClosureValidator FAIL on Task without Solution link (AC 9, AC-117)', () => {
  const tmp = helpers.mkTmpDir('ost-orphan-task');
  try {
    const publisher = helpers.freshPublisher();
    const broken = VALID_OST.replace(
      '- id: TASK-001 descricao: w. solution: SOL-001.',
      '- id: TASK-001 descricao: w sem solution.'
    );
    writeOst(tmp, broken);
    const result = publisher.ostClosureValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(result.orphans.includes('TASK-001'));
    assert.ok(/TASK-001/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('ostClosureValidator FAIL on Solution without Link (AC 9, AC-117)', () => {
  const tmp = helpers.mkTmpDir('ost-orphan-sol');
  try {
    const publisher = helpers.freshPublisher();
    const broken = VALID_OST.replace(
      '- SOL-001 resolve OPP-001.',
      '- sem links ainda.'
    );
    writeOst(tmp, broken);
    const result = publisher.ostClosureValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(/SOL-001/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('ostClosureValidator FAIL on Outcome root not filled (AC 9)', () => {
  const tmp = helpers.mkTmpDir('ost-no-outcome');
  try {
    const publisher = helpers.freshPublisher();
    const broken = VALID_OST.replace(
      '- id: OUT-001 tipo: melhoria descricao: x.',
      '- raiz ainda nao preenchida.'
    );
    writeOst(tmp, broken);
    const result = publisher.ostClosureValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(/Outcome/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('ostClosureValidator FAIL when OST.md missing (AC 9)', () => {
  const tmp = helpers.mkTmpDir('ost-missing');
  try {
    const publisher = helpers.freshPublisher();
    const result = publisher.ostClosureValidator(tmp);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(/OST\.md ausente/u.test(result.errors[0].message));
  } finally {
    helpers.rm(tmp);
  }
});

test('ostClosureValidator pt-BR error names offending node (AC 9, NFR-101)', () => {
  const tmp = helpers.mkTmpDir('ost-name-node');
  try {
    const publisher = helpers.freshPublisher();
    const broken = VALID_OST.replace(
      '- id: TASK-001 descricao: w. solution: SOL-001.',
      '- id: TASK-001 descricao: w sem solution.'
    );
    writeOst(tmp, broken);
    const result = publisher.ostClosureValidator(tmp);
    assert.ok(
      /publisher bloqueou publicacao/u.test(result.errors[0].message),
      'must include "publisher bloqueou publicacao"'
    );
  } finally {
    helpers.rm(tmp);
  }
});
