'use strict';

// AC 3: `--gates` flag reports invocation counts per gate type in the
// last 100 verdict entries + last 5 verdicts per gate type. Verdict
// tokens render in pt-BR (aprovado / atenções / rejeitado / waiver).

const { test } = require('node:test');
const assert = require('node:assert');
const { mkSandbox, rmSandbox, seedVerdict, freshDoctorReporter } = require('./_helpers');

test('--gates aggregates per-type counts and last-5 verdicts (AC 3)', () => {
  const sb = mkSandbox('gates');
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Seed a spread across all 5 gate types — 3 quality, 2 playback, 1 schema,
    // 1 authority, 1 reuse. The `mode-engine` entry buckets under playback.
    const base = (gid, verdict, i) => ({
      timestamp: '2026-04-24T10:00:' + String(i).padStart(2, '0') + 'Z',
      event_type: 'gate',
      hook_name: gid,
      session_id: 's-test',
      gate_id: gid,
      artifact_id: 'artifact-' + i,
      verdict: verdict,
    });
    seedVerdict(sb, today, [
      base('quality-gate', 'PASS', 1),
      base('quality-gate', 'FAIL', 2),
      base('quality-gate', 'WAIVED', 3),
      base('playback-gate', 'PASS', 4),
      base('playback-gate.ikigai', 'PASS', 5),
      base('schema-gate', 'CONCERNS', 6),
      base('authority-gate', 'PASS', 7),
      base('reuse-gate', 'PASS', 8),
    ]);

    const reporter = freshDoctorReporter('gates-reporter.js');
    const out = reporter.render();

    assert.match(out, /Gates \(últimos 100 veredictos\):/);
    assert.match(out, /quality .+ 3 invocações/);
    assert.match(out, /playback .+ 2 invocações/);
    assert.match(out, /schema .+ 1 invocações/);
    assert.match(out, /authority .+ 1 invocações/);
    assert.match(out, /reuse .+ 1 invocações/);
    // pt-BR verdict tokens.
    assert.match(out, /aprovado/, 'PASS renders as aprovado');
    assert.match(out, /rejeitado/, 'FAIL renders as rejeitado');
    assert.match(out, /atenções/, 'CONCERNS renders as atenções');
    assert.match(out, /waiver/, 'WAIVED renders as waiver');
    // At least one artifact_id appears.
    assert.match(out, /artifact-1/);
  } finally {
    rmSandbox(sb);
  }
});

test('--gates handles empty log directory with pt-BR notice (AC 3)', () => {
  const sb = mkSandbox('gates-empty');
  try {
    const reporter = freshDoctorReporter('gates-reporter.js');
    const out = reporter.render();
    assert.match(out, /nenhum veredicto registrado/);
  } finally {
    rmSandbox(sb);
  }
});

test('--gates last-5-per-type caps at 5 entries when more exist', () => {
  const sb = mkSandbox('gates-cap');
  try {
    const today = new Date().toISOString().slice(0, 10);
    const entries = [];
    for (let i = 0; i < 8; i++) {
      entries.push({
        timestamp: '2026-04-24T10:00:' + String(i).padStart(2, '0') + 'Z',
        event_type: 'gate',
        hook_name: 'quality-gate',
        session_id: 's-test',
        gate_id: 'quality-gate',
        artifact_id: 'q-' + i,
        verdict: 'PASS',
      });
    }
    seedVerdict(sb, today, entries);
    const reporter = freshDoctorReporter('gates-reporter.js');
    const out = reporter.render();
    // First 3 entries should be dropped (kept last 5).
    assert.ok(!/q-0\b/.test(out), 'oldest entry q-0 must be dropped');
    assert.ok(!/q-1\b/.test(out), 'oldest entry q-1 must be dropped');
    assert.ok(!/q-2\b/.test(out), 'oldest entry q-2 must be dropped');
    assert.match(out, /q-7/, 'latest entry q-7 kept');
  } finally {
    rmSandbox(sb);
  }
});
