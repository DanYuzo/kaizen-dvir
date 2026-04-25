'use strict';

// AC 7, AC 8, AC 10: promotion approval to .claude/rules/ moves the
// pattern, writes a verdict log entry, removes the candidate from the
// queue. Includes the FR-025 expert-only invocation guard verification.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkSandbox,
  rmSandbox,
  seedCandidate,
  freshPromoter,
} = require('./_helpers');

test('expert-only guard rejects approve() called without __expertCli__ (FR-025)', () => {
  const sb = mkSandbox('guard');
  try {
    seedCandidate(sb, 'yotzer', 'hook curto converte mais');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'hook curto converte mais');
    const r = promoter.approve(id, { targetLayer: 'rules' });
    assert.strictEqual(r.promoted, false);
    assert.match(r.reason || '', /apenas .* doctor --promotion/);
    // No file should exist in rules dir.
    assert.deepStrictEqual(fs.readdirSync(sb.rules), []);
  } finally {
    rmSandbox(sb);
  }
});

test('approve to rules moves the pattern to .claude/rules/ and logs the verdict (AC 7, AC 8)', () => {
  const sb = mkSandbox('approve-rules');
  try {
    const cand = seedCandidate(sb, 'yotzer', 'hook curto converte melhor');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId(cand.celula, cand.pattern);
    const r = promoter.approve(id, {
      __expertCli__: true,
      targetLayer: 'rules',
    });
    assert.strictEqual(r.promoted, true, 'promoted=true');
    assert.strictEqual(r.target, 'rules');
    assert.ok(r.path && fs.existsSync(r.path), 'rule file must exist on disk');
    const body = fs.readFileSync(r.path, 'utf8');
    assert.match(body, /hook curto converte melhor/, 'rule body contains the pattern');
    assert.match(body, /yotzer/, 'rule body cites the source cell');
    // Candidate removed from queue (status flipped to "promoted").
    const remaining = promoter.listCandidates();
    assert.ok(
      !remaining.find((c) => c.id === id),
      'candidate id must be removed from active list'
    );
    // Verdict logged under gate-verdicts.
    const day = new Date().toISOString().slice(0, 10);
    const log = path.join(sb.logs, 'gate-verdicts', day + '.jsonl');
    assert.ok(fs.existsSync(log), 'verdict log file written');
    const raw = fs.readFileSync(log, 'utf8');
    assert.match(raw, /pattern-promoter/, 'verdict log mentions pattern-promoter');
    assert.match(raw, new RegExp(id), 'verdict log carries candidate id');
  } finally {
    rmSandbox(sb);
  }
});

test('approve fails on unknown candidate id with pt-BR reason (AC 10)', () => {
  const sb = mkSandbox('approve-missing');
  try {
    const promoter = freshPromoter();
    const r = promoter.approve('deadbeef0000', { __expertCli__: true });
    assert.strictEqual(r.promoted, false);
    assert.match(r.reason, /candidato não encontrado/);
  } finally {
    rmSandbox(sb);
  }
});

test('reject records rejection with reason and removes the candidate (AC 10)', () => {
  const sb = mkSandbox('reject');
  try {
    seedCandidate(sb, 'yotzer', 'padrão duvidoso');
    const promoter = freshPromoter();
    const id = promoter.computeCandidateId('yotzer', 'padrão duvidoso');
    const r = promoter.reject(id, 'fora de escopo', { __expertCli__: true });
    assert.strictEqual(r.rejected, true);
    const remaining = promoter.listCandidates();
    assert.ok(
      !remaining.find((c) => c.id === id),
      'candidate must be removed after rejection'
    );
    // Verdict log entry.
    const day = new Date().toISOString().slice(0, 10);
    const log = path.join(sb.logs, 'gate-verdicts', day + '.jsonl');
    assert.ok(fs.existsSync(log));
    const raw = fs.readFileSync(log, 'utf8');
    assert.match(raw, /fora de escopo/);
  } finally {
    rmSandbox(sb);
  }
});
