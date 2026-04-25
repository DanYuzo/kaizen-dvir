'use strict';

// AC 4: generate() rejects schema-invalid artifacts with a pt-BR error
// naming the missing or invalid field.

const { test } = require('node:test');
const assert = require('node:assert');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = require('./_helpers');

test('missing next_action triggers pt-BR error citing the field (AC 4)', () => {
  const tmp = mkTmp('missing-next-action');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.nextAction = ''; // schema requires minLength >= 1
    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw');
    assert.strictEqual(caught.code, 'HANDOFF_SCHEMA_INVALID');
    // pt-BR phrasing per Dev Notes:
    assert.ok(
      /handoff invalido/.test(caught.message),
      'pt-BR prefix expected: ' + caught.message
    );
    assert.ok(
      /next_action/.test(caught.message),
      'message must name next_action: ' + caught.message
    );
  } finally {
    rmTmp(tmp);
  }
});

test('missing work_context.branch triggers pt-BR error citing the nested field (AC 4)', () => {
  const tmp = mkTmp('missing-branch');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    delete args.workContext.branch;
    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw');
    assert.strictEqual(caught.code, 'HANDOFF_SCHEMA_INVALID');
    assert.ok(/handoff invalido/.test(caught.message), 'pt-BR prefix: ' + caught.message);
    assert.ok(/branch/.test(caught.message), 'message must name branch: ' + caught.message);
  } finally {
    rmTmp(tmp);
  }
});

test('exceeding decisions cap (>5) triggers pt-BR error naming the list field (AC 2, AC 4)', () => {
  const tmp = mkTmp('decisions-overflow');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.decisions = ['a', 'b', 'c', 'd', 'e', 'f']; // 6 > maxItems=5
    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw');
    assert.strictEqual(caught.code, 'HANDOFF_SCHEMA_INVALID');
    assert.ok(/handoff invalido/.test(caught.message), 'pt-BR prefix: ' + caught.message);
    assert.ok(/decisions/.test(caught.message), 'message must name decisions: ' + caught.message);
  } finally {
    rmTmp(tmp);
  }
});
