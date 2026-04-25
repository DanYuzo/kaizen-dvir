'use strict';

// AC 8 (M4.5) — publisher.actionsInlineValidator detects action-*.md
// at root AND nested subdirectories. Empty / clean tasks/ -> PASS.
// FAIL message cites D-v1.3-04. AC-119, M4.5-R1.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('actionsInlineValidator PASS when no action-*.md present (AC 8)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-pass');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tasksDir, 'task-a.md'),
      '# Task A\n\n## Actions\n\n1. abra.\n',
      'utf8'
    );
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'PASS');
    assert.deepStrictEqual(result.offenders, []);
  } finally {
    helpers.rm(tmp);
  }
});

test('actionsInlineValidator FAIL on root-level action-login.md (AC 8, AC-119)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-root');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'action-login.md'), '# offender\n', 'utf8');
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.strictEqual(result.offenders.length, 1);
    assert.ok(/action-login\.md/u.test(result.offenders[0]));
  } finally {
    helpers.rm(tmp);
  }
});

test('actionsInlineValidator FAIL on nested-subdir action-*.md (AC 8, M4.5-R1)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-nested');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    const nested = path.join(tasksDir, 'sub', 'deeper');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'action-checkout.md'), '# offender\n', 'utf8');
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.strictEqual(result.offenders.length, 1);
    assert.ok(/action-checkout\.md/u.test(result.offenders[0]));
  } finally {
    helpers.rm(tmp);
  }
});

test('actionsInlineValidator FAIL message cites D-v1.3-04 (AC 8)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-msg');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'action-pay.md'), '# offender\n', 'utf8');
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.ok(
      result.errors[0].message.includes('D-v1.3-04'),
      'pt-BR error must cite D-v1.3-04, got: ' + result.errors[0].message
    );
    assert.ok(
      /publisher bloqueou publicacao/u.test(result.errors[0].message),
      'pt-BR error must say "publisher bloqueou publicacao"'
    );
  } finally {
    helpers.rm(tmp);
  }
});

test('actionsInlineValidator detects multiple offenders across nested levels (AC 8, M4.5-R1)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-many');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    fs.mkdirSync(path.join(tasksDir, 'a'), { recursive: true });
    fs.mkdirSync(path.join(tasksDir, 'b', 'c'), { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'action-1.md'), '# x\n', 'utf8');
    fs.writeFileSync(path.join(tasksDir, 'a', 'action-2.md'), '# x\n', 'utf8');
    fs.writeFileSync(path.join(tasksDir, 'b', 'c', 'action-3.md'), '# x\n', 'utf8');
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.strictEqual(result.offenders.length, 3);
  } finally {
    helpers.rm(tmp);
  }
});

test('actionsInlineValidator is case-insensitive for filename match (AC 8, M4.5-R1)', () => {
  const tmp = helpers.mkTmpDir('actions-inline-case');
  try {
    const publisher = helpers.freshPublisher();
    const tasksDir = path.join(tmp, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, 'Action-Login.md'), '# x\n', 'utf8');
    const result = publisher.actionsInlineValidator(tasksDir);
    assert.strictEqual(result.verdict, 'FAIL');
    assert.strictEqual(result.offenders.length, 1);
  } finally {
    helpers.rm(tmp);
  }
});
