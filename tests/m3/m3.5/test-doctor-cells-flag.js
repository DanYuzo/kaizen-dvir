'use strict';

// AC 6: `--cells` lists installed cells with name + version + status.
// Status mapping: ativa (boot has entries) | bootavel (no boot) | erro
// (manifest fails parse or schema). Erro entries include a pt-BR reason.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  mkSandbox,
  rmSandbox,
  seedCellManifest,
  freshDoctorReporter,
} = require('./_helpers');

const WELL_FORMED = [
  'description: "celula yotzer"',
  'version: "0.1.0"',
  'boot:',
  '  - bootstrap',
  'tiers:',
  '  tier1: "essential"',
  'commands:',
  '  - name: "do"',
  '    description: "executa"',
  'components:',
  '  templates: []',
  '  checklists: []',
  '  kbs: []',
  '',
].join('\n');

const BOOTABLE_NO_BOOT = [
  'description: "celula minimal"',
  'version: "0.0.1"',
  'boot: []',
  'tiers:',
  '  tier1: "essential"',
  'commands: []',
  'components:',
  '  templates: []',
  '  checklists: []',
  '  kbs: []',
  '',
].join('\n');

// Missing required `tiers` field.
const MALFORMED_MISSING_REQUIRED = [
  'description: "celula errada"',
  'version: "0.0.1"',
  'boot: []',
  'commands: []',
  'components:',
  '  templates: []',
  '  checklists: []',
  '  kbs: []',
  '',
].join('\n');

test('--cells labels well-formed manifest with version and status (AC 6)', () => {
  const sb = mkSandbox('cells-ok');
  try {
    seedCellManifest(sb, 'yotzer', WELL_FORMED);
    const reporter = freshDoctorReporter('cells-reporter.js');
    const out = reporter.render();
    assert.match(out, /Células instaladas:/);
    assert.match(out, /yotzer\s+0\.1\.0\s+ativa/);
  } finally {
    rmSandbox(sb);
  }
});

test('--cells labels manifest without boot entries as bootável', () => {
  const sb = mkSandbox('cells-bootable');
  try {
    seedCellManifest(sb, 'no-boot', BOOTABLE_NO_BOOT);
    const reporter = freshDoctorReporter('cells-reporter.js');
    const out = reporter.render();
    assert.match(out, /no-boot\s+0\.0\.1\s+bootável/);
  } finally {
    rmSandbox(sb);
  }
});

test('--cells labels malformed manifest as erro with pt-BR reason (AC 6)', () => {
  const sb = mkSandbox('cells-err');
  try {
    seedCellManifest(sb, 'broken', MALFORMED_MISSING_REQUIRED);
    const reporter = freshDoctorReporter('cells-reporter.js');
    const out = reporter.render();
    assert.match(out, /broken/);
    assert.match(out, /erro/);
    assert.match(out, /motivo:.*tiers/, 'reason should cite missing tiers field');
  } finally {
    rmSandbox(sb);
  }
});

test('--cells handles empty celulas dir', () => {
  const sb = mkSandbox('cells-empty');
  try {
    const reporter = freshDoctorReporter('cells-reporter.js');
    const out = reporter.render();
    assert.match(out, /nenhuma célula instalada/);
  } finally {
    rmSandbox(sb);
  }
});
