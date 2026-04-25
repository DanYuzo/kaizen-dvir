'use strict';

// AC 9: `--target commandments` requires a second pt-BR confirmation prompt.
// "não" leaves commandments.md untouched; "sim" appends the amendment +
// change-log row. Commandment-level promotion is lex-level governance.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const {
  mkSandbox,
  rmSandbox,
  seedCandidate,
  freshPromoter,
} = require('./_helpers');

test('confirm "não" aborts: commandments.md untouched, log records HALT (AC 9)', () => {
  const sb = mkSandbox('cmd-nao');
  try {
    seedCandidate(sb, 'yotzer', 'pequeno padrão de governança');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'pequeno padrão de governança');

    let promptShown = null;
    const r = promoter.approve(id, {
      __expertCli__: true,
      targetLayer: 'commandments',
      confirm: function (text) {
        promptShown = text;
        return 'não';
      },
    });

    assert.strictEqual(r.promoted, false);
    assert.match(r.reason, /confirmação dupla/);
    assert.match(promptShown, /Promover padrão para Commandments/);
    assert.match(promptShown, /\[sim\/não\]/);
    assert.strictEqual(
      fs.existsSync(sb.commandments),
      false,
      'commandments.md must NOT exist when confirmation rejected'
    );
  } finally {
    rmSandbox(sb);
  }
});

test('confirm empty string aborts (AC 9)', () => {
  const sb = mkSandbox('cmd-empty');
  try {
    seedCandidate(sb, 'yotzer', 'outro padrão');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'outro padrão');
    const r = promoter.approve(id, {
      __expertCli__: true,
      targetLayer: 'commandments',
      confirm: () => '',
    });
    assert.strictEqual(r.promoted, false);
    assert.strictEqual(fs.existsSync(sb.commandments), false);
  } finally {
    rmSandbox(sb);
  }
});

test('confirm "sim" appends amendment to commandments.md plus change-log row (AC 9, FR-023)', () => {
  const sb = mkSandbox('cmd-sim');
  try {
    seedCandidate(sb, 'yotzer', 'novo princípio operacional');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'novo princípio operacional');

    const r = promoter.approve(id, {
      __expertCli__: true,
      targetLayer: 'commandments',
      confirm: () => 'sim',
    });

    assert.strictEqual(r.promoted, true);
    assert.strictEqual(r.target, 'commandments');
    assert.ok(fs.existsSync(sb.commandments), 'commandments.md must be created');
    const body = fs.readFileSync(sb.commandments, 'utf8');
    assert.match(body, /novo princípio operacional/, 'amendment body present');
    assert.match(body, /## Change Log/, 'change log section present');
    assert.match(body, /pattern-promoter/, 'change-log row mentions pattern-promoter');
    assert.match(body, /yotzer/, 'change-log row cites source cell');
  } finally {
    rmSandbox(sb);
  }
});

test('approve to commandments without confirm callback fails (AC 9)', () => {
  const sb = mkSandbox('cmd-no-confirm');
  try {
    seedCandidate(sb, 'yotzer', 'sem confirm');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'sem confirm');
    const r = promoter.approve(id, {
      __expertCli__: true,
      targetLayer: 'commandments',
    });
    assert.strictEqual(r.promoted, false);
    assert.match(r.reason, /confirmação obrigatória/);
  } finally {
    rmSandbox(sb);
  }
});
