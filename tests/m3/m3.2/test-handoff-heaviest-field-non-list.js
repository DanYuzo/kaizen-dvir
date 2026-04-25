'use strict';

// M3.2 architect-review CONCERN #1 — _heaviestField extension.
//
// Originally _heaviestField only ranked list-typed fields (decisions,
// files_modified, blockers) with next_action as a fallback. The architect
// review flagged that a future overflow concentrated in next_action or
// work_context would misattribute the heaviest field.
//
// This test exercises the extension: an over-budget artifact whose
// heaviest field is the `next_action` scalar (not any list field) MUST be
// reported as `next_action` in both the pt-BR error message and the
// `field` attribute on the thrown error.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = helpers;

test('over-budget artifact whose heaviest field is next_action is correctly attributed', () => {
  const tmp = mkTmp('heaviest-na');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    // Strip the lists so they cannot be the offender.
    args.decisions = [];
    args.filesModified = [];
    args.blockers = [];
    // Inflate next_action well past the 500-token ceiling. Word-count +
    // per-line bonus from the token-counter heuristic must exceed 500
    // from this single scalar.
    const longWord = (
      'lorem ipsum dolor sit amet consectetur adipiscing elit sed do ' +
      'eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ' +
      'ad minim veniam quis nostrud exercitation ullamco laboris nisi ut ' +
      'aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit'
    );
    args.nextAction = (longWord + ' ').repeat(20).trim();

    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw on over-budget next_action');
    assert.strictEqual(caught.code, 'HANDOFF_OVER_BUDGET');
    assert.strictEqual(caught.field, 'next_action', 'field attribute names next_action');
    assert.ok(/excede 500 tokens/.test(caught.message), 'pt-BR ceiling phrase: ' + caught.message);
    assert.ok(/next_action/.test(caught.message), 'message names next_action: ' + caught.message);
    assert.ok(typeof caught.tokens === 'number' && caught.tokens > 500, 'attached tokens > 500');
  } finally {
    rmTmp(tmp);
  }
});

test('over-budget artifact whose heaviest field is work_context is attributed correctly', () => {
  const tmp = mkTmp('heaviest-wc');
  try {
    const engine = engineFresh();
    const args = validHandoffArgs();
    args.decisions = [];
    args.filesModified = [];
    args.blockers = [];
    args.nextAction = 'curto';
    // Schema requires the four work_context sub-fields; we balloon the
    // ones whose minLength is 1 with no upper bound (artifact_id,
    // artifact_path, current_phase, branch).
    const long = (
      'lorem ipsum dolor sit amet consectetur adipiscing elit sed do ' +
      'eiusmod tempor incididunt ut labore et dolore magna aliqua '
    );
    args.workContext = {
      artifact_id: (long + ' ').repeat(8).trim(),
      artifact_path: (long + ' ').repeat(8).trim(),
      current_phase: (long + ' ').repeat(8).trim(),
      branch: (long + ' ').repeat(8).trim(),
    };

    let caught = null;
    try {
      callGenerate(engine, args);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected generate() to throw on over-budget work_context');
    assert.strictEqual(caught.code, 'HANDOFF_OVER_BUDGET');
    assert.strictEqual(caught.field, 'work_context', 'field attribute names work_context');
    assert.ok(/work_context/.test(caught.message), 'message names work_context: ' + caught.message);
  } finally {
    rmTmp(tmp);
  }
});
