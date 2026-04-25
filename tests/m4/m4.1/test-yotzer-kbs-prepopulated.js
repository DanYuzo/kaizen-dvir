'use strict';

// AC 13, CON-103 — Yotzer ships its runtime KB pre-populated at
// `.kaizen-dvir/celulas/yotzer/kbs/yotzer/`. The regular source-tree copy
// performed by `installYotzer` carries the KB content into the target
// project. No runtime import from etlmaker is required.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

const YOTZER_KBS_SOURCE = path.join(
  helpers.PROJECT_ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer',
  'kbs',
  'yotzer'
);

function listFiles(dir) {
  const out = [];
  function walk(d, rel) {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      const r = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) walk(full, r);
      else if (entry.isFile()) out.push(r);
    }
  }
  walk(dir, '');
  return out.sort();
}

test('Yotzer source ships kbs/yotzer/ pre-populated (AC 13 precondition)', () => {
  assert.ok(
    fs.existsSync(YOTZER_KBS_SOURCE),
    'Yotzer kbs/yotzer source missing at ' + YOTZER_KBS_SOURCE
  );
  const files = listFiles(YOTZER_KBS_SOURCE);
  assert.ok(
    files.length > 0,
    'Yotzer kbs/yotzer source should ship with at least one file'
  );
});

test('installYotzer carries kbs/yotzer content into the target (AC 13)', () => {
  const target = helpers.mkTmpDir('kbs-prepopulated');
  try {
    const ki = helpers.freshKaizenInit();
    ki.installYotzer(target);
    const kbsTargetInTmp = path.join(
      target,
      '.kaizen-dvir',
      'celulas',
      'yotzer',
      'kbs',
      'yotzer'
    );
    const files = listFiles(kbsTargetInTmp);
    assert.ok(
      files.length > 0,
      'kbs/yotzer should have content copied into the tmp target'
    );
  } finally {
    helpers.rm(target);
  }
});

test('installYotzer copy is idempotent on kbs/yotzer (AC 13)', () => {
  const target = helpers.mkTmpDir('kbs-idempotent');
  try {
    const ki = helpers.freshKaizenInit();
    ki.installYotzer(target);
    const kbsTargetInTmp = path.join(
      target,
      '.kaizen-dvir',
      'celulas',
      'yotzer',
      'kbs',
      'yotzer'
    );
    const filesAfterFirst = listFiles(kbsTargetInTmp);
    ki.installYotzer(target);
    const filesAfterSecond = listFiles(kbsTargetInTmp);
    assert.deepStrictEqual(
      filesAfterSecond,
      filesAfterFirst,
      'second installYotzer run should not corrupt or duplicate kbs/yotzer content'
    );
  } finally {
    helpers.rm(target);
  }
});
