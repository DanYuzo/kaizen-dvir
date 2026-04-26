'use strict';

/*
 * test-n-minus-1-violation.js — M6.5 / CON-010.
 *
 * Validates the N-1 backward compatibility gate exposed by the migration
 * loader. Per CON-010, `kaizen update` must support exactly the previous
 * minor version. Any other configuration aborts with a pt-BR message and
 * a non-zero exit recommendation.
 *
 * The gate is a pure function (`validateN1`) plus a renderer
 * (`formatN1AbortMessage`). M6.2's update flow consumes both: it calls
 * `validateN1` BEFORE creating a snapshot (so an aborted upgrade does not
 * leave a useless snapshot directory behind), and then writes the
 * formatted abort message to stderr.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const MIGRATIONS_LOADER = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'migrations.js'
);

function loadFresh() {
  delete require.cache[require.resolve(MIGRATIONS_LOADER)];
  return require(MIGRATIONS_LOADER);
}

// -- Happy path ---------------------------------------------------------

test('M6.5 N-1 — 1.4.0 -> 1.5.0 is a single-step upgrade and passes the gate', () => {
  const loader = loadFresh();
  const result = loader.validateN1({ installed: '1.4.0', target: '1.5.0' });
  assert.equal(result.ok, true);
  assert.equal(result.installedMinor, 4);
  assert.equal(result.targetMinor, 5);
});

test('M6.5 N-1 — release candidate strings are accepted', () => {
  const loader = loadFresh();
  const result = loader.validateN1({
    installed: '1.4.0',
    target: '1.5.0-rc.0',
  });
  assert.equal(result.ok, true);
});

// -- Multi-step jump (the canonical CON-010 violation) -----------------

test('M6.5 N-1 — 1.3.0 -> 1.5.0 jump is rejected with reason "jump"', () => {
  const loader = loadFresh();
  const result = loader.validateN1({ installed: '1.3.0', target: '1.5.0' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'jump');
});

test('M6.5 N-1 — abort message is pt-BR, lists intermediate versions, suggests step-wise path', () => {
  const loader = loadFresh();
  const message = loader.formatN1AbortMessage({
    installed: '1.3.0',
    target: '1.5.0',
  });
  // pt-BR keywords expected.
  assert.match(message, /minor por vez|N-1/);
  assert.match(message, /Atualize|intermediaria|intermediarias/);
  assert.match(message, /1\.4\.0/);
  // No "ERROR" English uppercase sentinel — the message starts with pt-BR
  // "erro:" lowercase per diretrizes-escrita.md (clarity > shouting).
  assert.doesNotMatch(message, /^ERROR/);
});

// -- Same version (already up to date) ----------------------------------

test('M6.5 N-1 — same version emits an aviso (warn) message', () => {
  const loader = loadFresh();
  const result = loader.validateN1({ installed: '1.5.0', target: '1.5.0' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'same_version');

  const message = loader.formatN1AbortMessage({
    installed: '1.5.0',
    target: '1.5.0',
  });
  assert.match(message, /aviso:/);
  assert.match(message, /ja e igual/);
});

// -- Downgrade ---------------------------------------------------------

test('M6.5 N-1 — downgrade is rejected; message points to kaizen rollback', () => {
  const loader = loadFresh();
  const result = loader.validateN1({ installed: '1.5.0', target: '1.4.0' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'downgrade');

  const message = loader.formatN1AbortMessage({
    installed: '1.5.0',
    target: '1.4.0',
  });
  assert.match(message, /downgrade/);
  assert.match(message, /kaizen rollback/);
});

// -- Major change ------------------------------------------------------

test('M6.5 N-1 — cross-major change is rejected', () => {
  const loader = loadFresh();
  const result = loader.validateN1({ installed: '1.5.0', target: '2.0.0' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'major_change');

  const message = loader.formatN1AbortMessage({
    installed: '1.5.0',
    target: '2.0.0',
  });
  assert.match(message, /MAJOR/);
  assert.match(message, /release note/);
});

// -- Invalid version strings -------------------------------------------

test('M6.5 N-1 — malformed version strings are rejected with reason "invalid"', () => {
  const loader = loadFresh();
  const r1 = loader.validateN1({ installed: 'not-a-version', target: '1.5.0' });
  assert.equal(r1.ok, false);
  assert.equal(r1.reason, 'invalid');

  const r2 = loader.validateN1({ installed: '1.4.0', target: undefined });
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'invalid');

  const message = loader.formatN1AbortMessage({
    installed: 'foo',
    target: 'bar',
  });
  assert.match(message, /erro:/);
});

// -- parseMinor helper -------------------------------------------------

test('M6.5 parseMinor — extracts minor component from SemVer strings', () => {
  const loader = loadFresh();
  assert.equal(loader.parseMinor('1.4.0'), 4);
  assert.equal(loader.parseMinor('1.5.0'), 5);
  assert.equal(loader.parseMinor('1.5.0-rc.0'), 5);
  assert.equal(loader.parseMinor('2.10.3'), 10);
  assert.equal(loader.parseMinor('not-a-version'), null);
  assert.equal(loader.parseMinor(''), null);
  assert.equal(loader.parseMinor(null), null);
});

test('M6.5 shortMinor — extracts MAJOR.MINOR pair', () => {
  const loader = loadFresh();
  assert.equal(loader.shortMinor('1.4.0'), '1.4');
  assert.equal(loader.shortMinor('1.5.0-rc.0'), '1.5');
  assert.equal(loader.shortMinor('2.10.3'), '2.10');
  assert.equal(loader.shortMinor(''), null);
});
