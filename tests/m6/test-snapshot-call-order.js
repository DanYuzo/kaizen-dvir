'use strict';

/*
 * test-snapshot-call-order.js — M6.4 / KZ-M6-R3.
 * Asserts the contract that `createSnapshot` is invoked BEFORE any
 * write to the framework tree during a `kaizen update` flow. The
 * canonical update flow lives in M6.2, which is parallel-developed,
 * so this test stubs the consumer pattern: a synthetic update orchestrator
 * that calls snapshot.createSnapshot and then writeFile-equivalent
 * mutations. We capture the order via a probe wrapper.
 *
 * Validates: (a) snapshot fully created before any L1/L2 write;
 *            (b) snapshot directory contains the pre-mutation file
 *                content (proving snapshot is a true pre-state).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const SNAPSHOT_MOD = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'snapshot.js'
);

function loadFresh() {
  delete require.cache[require.resolve(SNAPSHOT_MOD)];
  return require(SNAPSHOT_MOD);
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-4-order-'));
  fs.mkdirSync(path.join(root, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.4.0', files: {} }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '.kaizen-dvir', 'commandments.md'),
    'PRE-UPDATE content\n',
    'utf8'
  );
  fs.writeFileSync(path.join(root, 'bin', 'kaizen.js'), '// pre-update stub\n', 'utf8');
  return root;
}

/**
 * Synthetic update orchestrator that emulates the M6.2 contract:
 *   step 1: N-1 check (assumed ok)
 *   step 2: createSnapshot
 *   step 3+: write files
 *
 * The probe records every observable side effect into `events`.
 */
function syntheticUpdateFlow(snapshot, projectRoot, events) {
  events.push({ kind: 'flow:start' });
  // Step 2 — snapshot creation.
  const result = snapshot.createSnapshot({
    projectRoot: projectRoot,
    version: '1.4.0',
    timestamp: '2026-04-25T14:30:00.000Z',
  });
  events.push({ kind: 'snapshot:created', path: result.snapshotPath });
  // Step 3+ — simulated framework writes.
  fs.writeFileSync(
    path.join(projectRoot, '.kaizen-dvir', 'commandments.md'),
    'POST-UPDATE content\n',
    'utf8'
  );
  events.push({ kind: 'write:l1', file: '.kaizen-dvir/commandments.md' });
  fs.writeFileSync(
    path.join(projectRoot, 'bin', 'kaizen.js'),
    '// post-update stub\n',
    'utf8'
  );
  events.push({ kind: 'write:l1', file: 'bin/kaizen.js' });
  return result;
}

test('M6.4 / KZ-M6-R3 — snapshot is created BEFORE any framework write', () => {
  const root = makeSandbox();
  const events = [];
  try {
    const snapshot = loadFresh();
    const result = syntheticUpdateFlow(snapshot, root, events);
    // First event after flow:start must be snapshot:created.
    const idxSnap = events.findIndex((e) => e.kind === 'snapshot:created');
    const idxWrite = events.findIndex((e) => e.kind === 'write:l1');
    assert.notEqual(idxSnap, -1, 'snapshot:created event must be present');
    assert.notEqual(idxWrite, -1, 'write:l1 event must be present');
    assert.ok(idxSnap < idxWrite, 'snapshot must precede the first write');
    // The snapshot must contain the PRE-UPDATE content, proving that the
    // copy happened before mutations landed.
    const snappedFile = path.join(
      result.snapshotPath,
      '.kaizen-dvir',
      'commandments.md'
    );
    const content = fs.readFileSync(snappedFile, 'utf8');
    assert.match(content, /PRE-UPDATE content/u, 'snapshot must capture pre-update file content');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
