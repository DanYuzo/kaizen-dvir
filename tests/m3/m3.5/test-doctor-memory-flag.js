'use strict';

// AC 4 + AC-209 surface: `--memory` flag reports Ikigai 4-doc status,
// MEMORY.md per cell, handoff count, waiver count, and Ikigai biblioteca/
// adjacent presence.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const {
  mkSandbox,
  rmSandbox,
  seedAllIkigai,
  seedIkigai,
  seedIkigaiBiblioteca,
  seedCellMemory,
  seedHandoff,
  seedWaiver,
  freshDoctorReporter,
} = require('./_helpers');

test('--memory renders Ikigai presente / ausente / vazio per dimension (AC 4)', () => {
  const sb = mkSandbox('memflag');
  try {
    // Seed: 2 present, 1 empty, 1 absent.
    seedIkigai(sb, 'o-que-faco', '# o que faço\n\ntexto\n');
    seedIkigai(sb, 'quem-sou', '# quem sou\n\ntexto\n');
    seedIkigai(sb, 'para-quem', ''); // empty
    // como-faco — absent (no seed)
    seedIkigaiBiblioteca(sb);
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: true });
    assert.match(out, /Memória:/);
    assert.match(out, /Ikigai:/);
    assert.match(out, /o-que-faco .+ presente/);
    assert.match(out, /quem-sou .+ presente/);
    assert.match(out, /para-quem .+ vazio/);
    assert.match(out, /como-faco .+ ausente/);
    assert.match(out, /biblioteca\/ .+ presente/, 'AC-209 biblioteca presence');
  } finally {
    rmSandbox(sb);
  }
});

test('--memory renders MEMORY.md per cell with size and timestamp (AC 4)', () => {
  const sb = mkSandbox('memcells');
  try {
    seedAllIkigai(sb);
    seedCellMemory(sb, 'yotzer', '# Memory\n\n## Padrões\n- exemplo\n');
    seedCellMemory(sb, 'archaeologist', '# Memory\n');
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: true });
    assert.match(out, /MEMORY\.md por célula:/);
    assert.match(out, /yotzer\/MEMORY\.md/);
    assert.match(out, /archaeologist\/MEMORY\.md/);
    // ISO timestamp pattern.
    assert.match(out, /\d{4}-\d{2}-\d{2}T/);
  } finally {
    rmSandbox(sb);
  }
});

test('--memory counts handoffs and waivers (AC 4)', () => {
  const sb = mkSandbox('memcounts');
  try {
    seedAllIkigai(sb);
    seedHandoff(sb, 'handoff-a-to-b-2026-04-24.yaml', 'handoff: {}\n');
    seedHandoff(sb, 'handoff-c-to-d-2026-04-24.yaml', 'handoff: {}\n');
    seedHandoff(sb, 'handoff-x-to-y-2026-04-25.yaml', 'handoff: {}\n');
    seedWaiver(sb, '2026-04-24T10-00.yaml', 'gate_id: "x"\n');
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: true });
    assert.match(out, /Handoffs: 3/);
    assert.match(out, /Waivers: 1/);
  } finally {
    rmSandbox(sb);
  }
});

test('--memory exits cleanly when ikigai dir is empty', () => {
  const sb = mkSandbox('memempty');
  try {
    // No ikigai files, no biblioteca, no cells, no logs.
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: true });
    // 4 dimensions all ausente, biblioteca ausente.
    assert.match(out, /o-que-faco .+ ausente/);
    assert.match(out, /biblioteca\/ .+ ausente/);
    assert.match(out, /Handoffs: 0/);
    assert.match(out, /Waivers: 0/);
    assert.match(out, /nenhuma MEMORY\.md registrada/);
  } finally {
    rmSandbox(sb);
  }
});
