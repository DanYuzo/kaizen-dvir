'use strict';

// M3 end-to-end integration test (AC 14, 15, 16, 17, 18).
//
// Single-run loop wiring the full memory-and-gates layer:
//   cell seed -> Quality Gate FAIL -> Self-Healing iteration -> PASS
//   -> Handoff generated and persisted -> Ikigai mutation routed via
//   Playback Gate -> MEMORY.md pattern flagged for promotion -> expert-
//   simulated `kaizen doctor --promotion approve` promotes to .claude/rules/.
//
// Assertions along the way:
//   AC 14 — all 4 Quality Gate verdicts (PASS, CONCERNS, FAIL, WAIVED) covered
//   AC 15 — waiver with approved_by: expert under .kaizen/logs/waivers/
//   AC 16 — Executor-=-Judge separation produces FAIL when violated
//   AC 17 — Change-log append-only enforced (rewrite produces FAIL)
//   AC 18 — MEMORY.md survives 10 consecutive autocompact cycles + Ikigai
//           4 docs present + biblioteca/ adjacent.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkSandbox,
  rmSandbox,
  loadHandoffEngine,
  loadQualityGate,
  loadSelfHealing,
  loadPlaybackGate,
  loadIkigaiWriter,
  loadMemoryWriter,
  loadPromoter,
  loadWaiver,
  freshAll,
  readJsonl,
  seedAllIkigai,
} = require('./_helpers');

test('end-to-end — full memory-and-gates loop (AC 14-17)', async () => {
  // M3.5-R1 mitigation — drop the module cache BEFORE the sandbox env-vars
  // are bound and AGAIN immediately after, so every M3 module reads the
  // sandbox-scoped paths from this test instead of paths captured by a
  // sibling test that ran earlier in the same node:test process.
  // Determinism > retry. M4 hardening hook: promote freshAll() into
  // mkSandbox() once all integration tests confirm idempotence.
  freshAll();
  const sb = mkSandbox('e2e');
  freshAll();
  try {
    seedAllIkigai(sb);

    // ----- AC 14 sub-case 1: Quality Gate FAIL on a CRITICAL criterion --
    const qg = loadQualityGate();
    const failVerdict = qg.evaluate(
      { id: 'cell-yotzer-art' },
      [
        {
          id: 'crit-1',
          severity: 'critical',
          check: 'automated',
          run: () => false,
        },
      ]
    );
    assert.strictEqual(failVerdict.verdict, 'FAIL', 'AC 14: FAIL verdict');

    // ----- AC 16: Executor-=-Judge violation also produces FAIL --------
    const ejFail = qg.evaluate(
      { id: 'ej-art' },
      [{ id: 'ok', severity: 'low', check: 'automated', run: () => true }],
      { executor: 'sub-agent-x', judge: 'sub-agent-x' }
    );
    assert.strictEqual(ejFail.verdict, 'FAIL', 'AC 16: same executor and judge -> FAIL');

    // ----- AC 14 sub-case 2: PASS via Self-Healing recovery -----------
    const sh = loadSelfHealing();
    let hits = 0;
    const flipGate = {
      evaluate: function () {
        hits += 1;
        if (hits === 1) {
          return {
            verdict: 'FAIL',
            criteria_results: [],
            issues: [{ severity: 'critical', message: 'falha 1' }],
          };
        }
        return { verdict: 'PASS', criteria_results: [], issues: [] };
      },
    };
    const executor = {
      invoke: (payload) => ({ revisedArtifact: { id: payload.artifact.id, fixed: true } }),
    };
    const recovered = sh.run(executor, { id: 'recover-art' }, flipGate, {
      maxIterations: 2,
    });
    assert.strictEqual(recovered.finalVerdict, 'PASS', 'AC 14: PASS verdict');

    // ----- AC 14 sub-case 3: CONCERNS verdict --------------------------
    const concernsVerdict = qg.evaluate(
      { id: 'concerns-art' },
      [
        { id: 'med-1', severity: 'medium', check: 'automated', run: () => false },
      ]
    );
    assert.strictEqual(concernsVerdict.verdict, 'CONCERNS', 'AC 14: CONCERNS verdict');

    // ----- AC 14 + AC 15: WAIVED with approved_by: expert --------------
    const waiverModule = loadWaiver();
    const waiverInput = {
      gateId: 'quality-gate-x',
      artifactId: 'waived-art',
      reason: 'compromisso temporario.',
      approvedBy: 'expert',
      scope: 'esta-sessao',
    };
    const recordRes = waiverModule.recordWaiver(waiverInput);
    assert.strictEqual(recordRes.recorded, true, 'AC 15: waiver recorded');
    assert.ok(fs.existsSync(recordRes.path), 'waiver YAML on disk');
    const waiverBody = fs.readFileSync(recordRes.path, 'utf8');
    assert.match(waiverBody, /approved_by: "expert"/, 'AC 15: approved_by: expert');

    // Companion negative sub-case (AC 15): missing approved_by rejected.
    const badWaiverRes = waiverModule.recordWaiver({
      gateId: 'q',
      artifactId: 'a',
      reason: 'r',
      // approvedBy missing
      scope: 's',
    });
    assert.strictEqual(badWaiverRes.recorded, false, 'AC 15: missing approved_by rejected');

    // Now use the waiver via quality-gate to demonstrate WAIVED verdict.
    const waivedVerdict = qg.evaluate(
      { id: 'waived-art' },
      [{ id: 'crit-x', severity: 'critical', check: 'automated', run: () => false }],
      {
        waiver: {
          gate_id: waiverInput.gateId,
          artifact_id: waiverInput.artifactId,
          reason: waiverInput.reason,
          approved_by: waiverInput.approvedBy,
          date: new Date().toISOString(),
          scope: waiverInput.scope,
        },
      }
    );
    assert.strictEqual(waivedVerdict.verdict, 'WAIVED', 'AC 14: WAIVED verdict');

    // ----- AC 17: change-log append-only enforced ---------------------
    const tmpArtifactPath = path.join(sb.root, 'artifact-with-changelog.md');
    fs.writeFileSync(
      tmpArtifactPath,
      '# Artifact\n\n## Change Log\n\n- 2026-04-01 — initial entry\n- 2026-04-02 — second entry\n',
      'utf8'
    );
    // First call records baseline.
    const firstClg = qg.evaluate(
      { id: 'clg-art', path: tmpArtifactPath },
      [{ id: 'ok', severity: 'low', check: 'automated', run: () => true }]
    );
    // The first call returns PASS because the baseline was just recorded.
    assert.notStrictEqual(firstClg.verdict, undefined);
    // Now rewrite the historical first entry (mutation).
    fs.writeFileSync(
      tmpArtifactPath,
      '# Artifact\n\n## Change Log\n\n- 2026-04-01 — REWRITTEN entry\n- 2026-04-02 — second entry\n',
      'utf8'
    );
    const secondClg = qg.evaluate(
      { id: 'clg-art', path: tmpArtifactPath },
      [{ id: 'ok', severity: 'low', check: 'automated', run: () => true }]
    );
    assert.strictEqual(
      secondClg.verdict,
      'FAIL',
      'AC 17: rewriting historical change-log entry produces FAIL'
    );

    // ----- handoff persisted --------------------------------------------
    const engine = loadHandoffEngine();
    const handoff = engine.generate(
      'archaeologist',
      'forge-smith',
      {
        artifact_id: 'e2e-art',
        artifact_path: 'docs/yotzer/e2e.md',
        current_phase: '2',
        branch: 'main',
      },
      ['decisao 1', 'decisao 2'],
      ['docs/yotzer/e2e.md'],
      [],
      'continuar fase 3'
    );
    const handoffPath = engine.persist(handoff);
    assert.ok(fs.existsSync(handoffPath), 'handoff persisted');

    // ----- Ikigai mutation via Playback Gate (FR-027) --------------------
    const ikiWriter = loadIkigaiWriter();
    const writeRes = ikiWriter.write(
      'o-que-faco',
      'Adicionar nova faceta operacional.',
      'expansao do escopo aprovada pelo expert.',
      {
        author: 'archaeologist',
        mode: 'interativo',
        prompt: () => 'sim',
      }
    );
    assert.strictEqual(writeRes.applied, true, 'Ikigai write applied via Playback');
    assert.ok(fs.existsSync(writeRes.path), 'Ikigai dimension file exists');

    // ----- Pattern flagged via memory-writer.flagForPromotion ----------
    const memWriter = loadMemoryWriter();
    await memWriter.flagForPromotion(
      'padrão verificado e2e',
      'yotzer'
    );

    // ----- Expert-simulated promotion via pattern-promoter -------------
    const promoter = loadPromoter();
    const candidates = promoter.listCandidates();
    assert.ok(candidates.length >= 1, 'at least one candidate flagged');
    const target = candidates.find((c) => c.pattern.indexOf('padrão verificado e2e') !== -1);
    assert.ok(target, 'flagged pattern found in candidates');
    const proRes = promoter.approve(target.id, {
      __expertCli__: true,
      targetLayer: 'rules',
    });
    assert.strictEqual(proRes.promoted, true, 'promotion to rules succeeded');
    assert.ok(fs.existsSync(proRes.path), 'promoted rule file exists');

    // ----- Verdict log includes verdicts from this run -----------------
    const verdicts = readJsonl(sb.logs, 'gate-verdicts');
    const verdictTypes = new Set(verdicts.map((v) => v.verdict));
    // PASS, FAIL, CONCERNS appear during this loop. WAIVED is the final
    // verdict of the WAIVED-sub-case evaluation.
    assert.ok(verdictTypes.has('FAIL'), 'AC 14: FAIL recorded');
    assert.ok(verdictTypes.has('PASS'), 'AC 14: PASS recorded');
    assert.ok(verdictTypes.has('CONCERNS'), 'AC 14: CONCERNS recorded');
    assert.ok(verdictTypes.has('WAIVED'), 'AC 14: WAIVED recorded');
  } finally {
    rmSandbox(sb);
  }
});

test('AC 18 — MEMORY.md survives 10 consecutive autocompact cycles (AC-200, NFR-012)', async () => {
  // M3.5-R1 mitigation — see header note on the e2e test above.
  freshAll();
  const sb = mkSandbox('e2e-autocompact');
  freshAll();
  try {
    const expected = [];
    let lastSize = 0;
    for (let cycle = 0; cycle < 10; cycle++) {
      // Drop module cache to mimic a real session-start (autocompact resets
      // LLM context but not on-disk state).
      freshAll();
      const writer = loadMemoryWriter();
      const tag = 'cycle-' + cycle;
      // eslint-disable-next-line no-await-in-loop
      await writer.appendPattern('survivor', tag, 'low');
      expected.push(tag);
      const target = path.join(sb.celulas, 'survivor', 'MEMORY.md');
      const body = fs.readFileSync(target, 'utf8');
      // Every prior tag still present.
      for (const t of expected) {
        assert.ok(body.includes(t), 'after cycle ' + cycle + ', tag ' + t + ' must persist');
      }
      // Monotonic size growth — guards against silent no-op (M3.5-R2).
      assert.ok(body.length > lastSize, 'MEMORY.md size must grow each cycle');
      lastSize = body.length;
    }
    // Final row count == cycle count.
    const finalBody = fs.readFileSync(
      path.join(sb.celulas, 'survivor', 'MEMORY.md'),
      'utf8'
    );
    let rowCount = 0;
    for (const tag of expected) {
      if (finalBody.includes(tag)) rowCount += 1;
    }
    assert.strictEqual(rowCount, 10, 'final row count must equal cycle count (10)');
  } finally {
    rmSandbox(sb);
  }
});

test('AC 18 — Ikigai 4 docs present and biblioteca/ adjacent (AC-209, FR-026)', () => {
  // M3.5-R1 mitigation — see header note on the e2e test above.
  freshAll();
  const sb = mkSandbox('e2e-ikigai');
  freshAll();
  try {
    seedAllIkigai(sb);
    for (const d of ['o-que-faco', 'quem-sou', 'para-quem', 'como-faco']) {
      const file = path.join(sb.ikigai, d + '.md');
      assert.ok(fs.existsSync(file), 'dimension ' + d + ' present');
      const body = fs.readFileSync(file, 'utf8');
      assert.match(body, /## Change Log/, 'dimension ' + d + ' has Change Log section');
    }
    const bib = path.join(sb.ikigai, 'biblioteca');
    assert.ok(fs.existsSync(bib) && fs.statSync(bib).isDirectory(), 'biblioteca/ adjacent');
  } finally {
    rmSandbox(sb);
  }
});
