'use strict';

// AC 1, R-015: YAML 1.2 strict-mode parser refuses ambiguous unquoted
// scalars. A handoff artifact whose `next_action: no` (unquoted) is rejected
// with the pt-BR message documented in Dev Notes.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, engineFresh, validHandoffArgs, callGenerate } = require('./_helpers');

function _writeRawYaml(dir, contents) {
  const file = path.join(dir, 'handoff-x-to-y-2026-04-24T15-00-00.000Z.yaml');
  fs.writeFileSync(file, contents, { encoding: 'utf8' });
  return file;
}

test('restore rejects bare "no" scalar (R-015 Norway Problem)', () => {
  const tmp = mkTmp('strict-no');
  try {
    const engine = engineFresh();
    // Hand-craft an invalid YAML where next_action is bare `no` (unquoted)
    // — a YAML 1.1 parser would coerce to boolean false and silently corrupt
    // the contract. Strict mode MUST reject.
    const yaml =
      'handoff:\n' +
      '  from: "x"\n' +
      '  to: "y"\n' +
      '  work_context:\n' +
      '    artifact_id: "id"\n' +
      '    artifact_path: "p"\n' +
      '    current_phase: "1"\n' +
      '    branch: "main"\n' +
      '  decisions: []\n' +
      '  files_modified: []\n' +
      '  blockers: []\n' +
      '  next_action: no\n';
    const file = _writeRawYaml(tmp.handoffs, yaml);
    let caught = null;
    try {
      engine.restore(file);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'restore must reject bare "no"');
    assert.ok(/handoff recusado/.test(caught.message),
      'pt-BR rejection phrase: ' + caught.message);
    assert.ok(/aspas/.test(caught.message),
      'message instructs the author to use quotes: ' + caught.message);
    assert.ok(/next_action/.test(caught.message),
      'message names the offending field: ' + caught.message);
  } finally {
    rmTmp(tmp);
  }
});

test('restore rejects bare "yes" scalar in any field (R-015)', () => {
  const tmp = mkTmp('strict-yes');
  try {
    const engine = engineFresh();
    const yaml =
      'handoff:\n' +
      '  from: "x"\n' +
      '  to: "y"\n' +
      '  work_context:\n' +
      '    artifact_id: "id"\n' +
      '    artifact_path: "p"\n' +
      '    current_phase: yes\n' +
      '    branch: "main"\n' +
      '  decisions: []\n' +
      '  files_modified: []\n' +
      '  blockers: []\n' +
      '  next_action: "ok"\n';
    const file = _writeRawYaml(tmp.handoffs, yaml);
    let caught = null;
    try {
      engine.restore(file);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'restore must reject bare "yes"');
    assert.ok(/handoff recusado/.test(caught.message), 'pt-BR rejection phrase');
    assert.ok(/current_phase/.test(caught.message), 'names the field');
  } finally {
    rmTmp(tmp);
  }
});

test('restore accepts quoted "no" / "yes" scalars (no false-positive)', () => {
  const tmp = mkTmp('strict-quoted-ok');
  try {
    const engine = engineFresh();
    // 5 items max per schema (decisions cap = 5).
    const norwayValues = ['no', 'yes', 'off', 'on', 'true'];
    const result = callGenerate(engine, {
      ...require('./_helpers').validHandoffArgs(),
      decisions: norwayValues,
    });
    const file = engine.persist(result, new Date('2026-04-24T16:00:00.000Z'));
    const restored = engine.restore(file);
    assert.deepStrictEqual(
      restored.handoff.decisions,
      norwayValues,
      'quoted Norway-Problem strings round-trip as strings'
    );
    // Defensively: the persisted file MUST quote each Norway value.
    const onDisk = fs.readFileSync(file, 'utf8');
    for (const v of norwayValues) {
      assert.ok(onDisk.includes('"' + v + '"'),
        'value "' + v + '" must be double-quoted on disk');
    }
  } finally {
    rmTmp(tmp);
  }
});
