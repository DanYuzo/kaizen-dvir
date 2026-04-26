'use strict';

/*
 * test-publish-workflow-shape.js — M6.1 AC3, AC4 verification
 *
 * Validates that .github/workflows/publish.yml:
 *   - Triggers only on tag pattern v[0-9]+.[0-9]+.[0-9]+* (AC3).
 *   - Allows workflow_dispatch (AC3).
 *   - Runs lint, typecheck, test BEFORE npm publish (AC4 — Commandment IV).
 *   - Runs the canonical manifest builder BEFORE npm publish (Q1).
 *   - Wires the whitelist drift guard step (KZ-M6-R5 mitigation).
 *   - Publishes with --access=restricted.
 *
 * We deliberately avoid pulling a YAML parser dep (CON-003 — zero new deps).
 * The workflow is small enough that string-level assertions are sufficient
 * and documenting because YAML is structured, this test asserts on stable
 * substrings that any well-formed invocation must contain.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = path.join(ROOT, '.github', 'workflows', 'publish.yml');

function readWorkflow() {
  return fs.readFileSync(WF, 'utf8');
}

test('M6.1 AC3 — publish.yml exists', () => {
  assert.ok(fs.existsSync(WF), '.github/workflows/publish.yml must exist');
});

test('M6.1 AC3 — workflow triggers on version tag pattern only', () => {
  const wf = readWorkflow();
  // The trigger must include the version-tag glob and must NOT include a
  // bare push.branches trigger (which would publish on every commit).
  assert.match(wf, /tags:\s*\n\s*-\s*'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+\*'/);
  assert.ok(
    !/push:\s*\n\s*branches:/m.test(wf),
    'publish.yml must not trigger on branch push'
  );
});

test('M6.1 AC3 — workflow_dispatch is enabled for break-glass releases', () => {
  const wf = readWorkflow();
  assert.match(wf, /workflow_dispatch:/);
});

test('M6.1 AC4 — quality gate sequence runs before publish (Commandment IV)', () => {
  const wf = readWorkflow();
  // Required ordering: lint -> typecheck -> test -> manifest build -> drift guard -> publish.
  // Anchor on the `- name:` step declarations so comments at the top of
  // the file (which legitimately describe the same names) do not confuse
  // ordering checks.
  const lintIdx = wf.indexOf('- name: Quality gate — lint');
  const typecheckIdx = wf.indexOf('- name: Quality gate — typecheck');
  const testIdx = wf.indexOf('- name: Quality gate — test');
  const manifestIdx = wf.indexOf('- name: Build canonical manifest (Q1)');
  const guardIdx = wf.indexOf('- name: Whitelist drift guard (KZ-M6-R5)');
  const publishIdx = wf.indexOf('- name: Publish to GitHub Packages');

  assert.ok(lintIdx > -1, 'lint step missing');
  assert.ok(typecheckIdx > -1, 'typecheck step missing');
  assert.ok(testIdx > -1, 'test step missing');
  assert.ok(manifestIdx > -1, 'canonical manifest build step missing');
  assert.ok(guardIdx > -1, 'whitelist drift guard step missing');
  assert.ok(publishIdx > -1, 'publish step missing');

  assert.ok(lintIdx < typecheckIdx, 'lint must precede typecheck');
  assert.ok(typecheckIdx < testIdx, 'typecheck must precede test');
  assert.ok(testIdx < manifestIdx, 'test must precede manifest build');
  assert.ok(manifestIdx < guardIdx, 'manifest build must precede drift guard');
  assert.ok(guardIdx < publishIdx, 'drift guard must precede publish');
});

test('M6.1 — workflow uses GITHUB_TOKEN for GitHub Packages auth', () => {
  const wf = readWorkflow();
  assert.match(wf, /NODE_AUTH_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/);
  assert.match(wf, /registry-url:\s*'https:\/\/npm\.pkg\.github\.com'/);
});

test('M6.1 — npm publish uses --access=restricted (D-v1.5-01)', () => {
  const wf = readWorkflow();
  assert.match(wf, /npm publish --access=restricted/);
});

test('M6.1 — workflow declares packages:write permission', () => {
  const wf = readWorkflow();
  assert.match(wf, /packages:\s*write/);
});
