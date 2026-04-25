'use strict';

// M3 Gate Criterion 1 (Epic KZ-M3 § Gate Criteria):
//   "Handoff Artifact under 500 tokens in valid YAML, persisted at
//   .kaizen/handoffs/handoff-{from}-to-{to}-{timestamp}.yaml, surviving
//   session change (new session reads artifact and reconstitutes context
//   without asking the expert)."
//
// AC 11, AC-201, FR-008, FR-034, NFR-011.
//
// Methodology (Dev Notes line 233 — session-restore via subprocess pair):
//   The "writer side" persists a handoff in a child process that exits.
//   The "reader side" runs in a SECOND child process — different pid, no
//   shared memory, no module cache reuse — and asserts the artifact is
//   readable + reconstitutable via handoff-engine.readLatest().restore().
//   Different pids confirm the handoff survives genuine session boundary,
//   not just a require-cache flush.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  mkSandbox,
  rmSandbox,
  loadHandoffEngine,
  PROJECT_ROOT,
} = require('./_helpers');

function _validHandoffArgs() {
  return {
    fromAgent: 'archaeologist',
    toAgent: 'forge-smith',
    workContext: {
      artifact_id: 'm3-gate-1-art',
      artifact_path: 'docs/yotzer/celula-x.md',
      current_phase: '2',
      branch: 'main',
    },
    decisions: [
      'Adotada arquitetura PU para a celula',
      'Validacao via playback gate aprovada',
    ],
    filesModified: ['docs/yotzer/celula-x.md'],
    blockers: [],
    nextAction: 'Iniciar fase 3',
  };
}

test('Gate 1 — handoff is under 500 tokens, valid YAML, on canonical path (AC 11, FR-008, FR-034)', () => {
  const sb = mkSandbox('gate1-shape');
  try {
    const engine = loadHandoffEngine();
    const args = _validHandoffArgs();
    const generated = engine.generate(
      args.fromAgent,
      args.toAgent,
      args.workContext,
      args.decisions,
      args.filesModified,
      args.blockers,
      args.nextAction
    );
    assert.ok(generated.tokenCount < 500, 'token count must be < 500 (FR-008): ' + generated.tokenCount);
    const written = engine.persist(generated, new Date('2026-04-24T10:00:00.000Z'));
    // Filename pattern: handoff-{from}-to-{to}-{timestamp}.yaml
    const base = path.basename(written);
    assert.match(
      base,
      /^handoff-archaeologist-to-forge-smith-.*\.yaml$/,
      'canonical filename pattern (FR-034)'
    );
    // YAML body parses round-trip via the engine's strict-mode parser.
    const restored = engine.restore(written);
    assert.strictEqual(restored.handoff.from, args.fromAgent);
    assert.strictEqual(restored.handoff.to, args.toAgent);
    assert.deepStrictEqual(restored.handoff.work_context, args.workContext);
  } finally {
    rmSandbox(sb);
  }
});

test('Gate 1 — session change: writer in subprocess A, reader in subprocess B (AC 11, AC-201, NFR-011)', () => {
  const sb = mkSandbox('gate1-session');
  try {
    const writerScript = `
      'use strict';
      const path = require('node:path');
      const enginePath = path.join(${JSON.stringify(PROJECT_ROOT)}, '.kaizen-dvir', 'dvir', 'memory', 'handoff-engine.js');
      const engine = require(enginePath);
      const args = {
        fromAgent: 'archaeologist',
        toAgent: 'forge-smith',
        workContext: { artifact_id: 'cross-session-art', artifact_path: 'x.md', current_phase: '2', branch: 'main' },
        decisions: ['A escolhida', 'B validada'],
        filesModified: ['x.md'],
        blockers: [],
        nextAction: 'continuar fase 3'
      };
      const out = engine.generate(args.fromAgent, args.toAgent, args.workContext, args.decisions, args.filesModified, args.blockers, args.nextAction);
      const written = engine.persist(out, new Date('2026-04-24T10:00:00.000Z'));
      process.stdout.write(JSON.stringify({ tokens: out.tokenCount, path: written, pid: process.pid }));
    `;
    const writerEnv = Object.assign({}, process.env, {
      KAIZEN_HANDOFFS_DIR: sb.handoffs,
      KAIZEN_LOGS_DIR: sb.logs,
      KAIZEN_STATE_DIR: sb.state,
    });
    const writerRun = spawnSync(process.execPath, ['-e', writerScript], {
      env: writerEnv,
      encoding: 'utf8',
    });
    assert.strictEqual(writerRun.status, 0, 'writer subprocess: stderr=' + writerRun.stderr);
    const writerOut = JSON.parse(writerRun.stdout);
    assert.ok(writerOut.tokens < 500, 'tokens < 500 from writer: ' + writerOut.tokens);
    assert.ok(fs.existsSync(writerOut.path), 'writer wrote handoff file');

    // Reader subprocess — different pid, no shared module cache.
    const readerScript = `
      'use strict';
      const path = require('node:path');
      const enginePath = path.join(${JSON.stringify(PROJECT_ROOT)}, '.kaizen-dvir', 'dvir', 'memory', 'handoff-engine.js');
      const engine = require(enginePath);
      let stdinReads = 0;
      const origRead = process.stdin.read;
      process.stdin.read = function () { stdinReads++; return null; };
      const found = engine.readLatest('forge-smith');
      if (!found) { process.stderr.write('NO_HANDOFF'); process.exit(2); }
      const restored = engine.restore(found.path);
      process.stdin.read = origRead;
      process.stdout.write(JSON.stringify({
        pid: process.pid,
        from: restored.handoff.from,
        to: restored.handoff.to,
        artifact_id: restored.handoff.work_context.artifact_id,
        next_action: restored.handoff.next_action,
        stdinReads: stdinReads
      }));
    `;
    const readerEnv = Object.assign({}, process.env, {
      KAIZEN_HANDOFFS_DIR: sb.handoffs,
      KAIZEN_LOGS_DIR: sb.logs,
      KAIZEN_STATE_DIR: sb.state,
    });
    const readerRun = spawnSync(process.execPath, ['-e', readerScript], {
      env: readerEnv,
      encoding: 'utf8',
    });
    assert.strictEqual(readerRun.status, 0, 'reader subprocess: stderr=' + readerRun.stderr);
    const readerOut = JSON.parse(readerRun.stdout);
    // Different PIDs — confirms a real cross-session boundary.
    assert.notStrictEqual(readerOut.pid, writerOut.pid, 'reader pid != writer pid');
    // Context fully reconstituted without prompting.
    assert.strictEqual(readerOut.from, 'archaeologist');
    assert.strictEqual(readerOut.to, 'forge-smith');
    assert.strictEqual(readerOut.artifact_id, 'cross-session-art');
    assert.strictEqual(readerOut.next_action, 'continuar fase 3');
    assert.strictEqual(readerOut.stdinReads, 0, 'reader must not read from stdin (AC-201)');
  } finally {
    rmSandbox(sb);
  }
});
