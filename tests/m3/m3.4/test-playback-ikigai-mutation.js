'use strict';

// AC 3 — Ikigai write routed through Playback Gate; no write without PASS.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('ikigai write applies on PASS verdict', () => {
  const logs = helpers.mkTmpLogs('iki-pass');
  const ikigai = helpers.mkTmpIkigai('iki-pass');
  try {
    const writer = helpers.freshIkigaiWriter();
    const out = writer.write(
      'o-que-faco',
      'novo produto: workshop de 2 dias',
      'mercado pediu formato curto',
      {
        mode: 'interativo',
        prompt: () => 'sim',
        author: 'expert',
      }
    );
    assert.strictEqual(out.verdict, 'PASS');
    assert.strictEqual(out.applied, true);
    assert.ok(out.path.endsWith('o-que-faco.md'));
    const content = fs.readFileSync(out.path, 'utf8');
    assert.match(content, /workshop de 2 dias/);
    assert.match(content, /## Change Log/);
    assert.match(content, /mercado pediu formato curto/);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(ikigai);
  }
});

test('ikigai write does NOT apply on HALT verdict', () => {
  const logs = helpers.mkTmpLogs('iki-halt');
  const ikigai = helpers.mkTmpIkigai('iki-halt');
  try {
    const writer = helpers.freshIkigaiWriter();
    const out = writer.write(
      'quem-sou',
      'mudar valor: simplicidade -> profundidade',
      'precisa pensar mais',
      {
        mode: 'interativo',
        prompt: () => 'nao',
        reasonCollector: () => 'mudanca prematura.',
      }
    );
    assert.strictEqual(out.verdict, 'HALT');
    assert.strictEqual(out.applied, false);
    assert.match(out.reason, /prematura/);
    // File must not have been written.
    const target = path.join(ikigai, 'quem-sou.md');
    assert.strictEqual(fs.existsSync(target), false, 'file must not exist after HALT');
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(ikigai);
  }
});

test('ikigai write does NOT apply on ADJUST verdict', () => {
  const logs = helpers.mkTmpLogs('iki-adj');
  const ikigai = helpers.mkTmpIkigai('iki-adj');
  try {
    const writer = helpers.freshIkigaiWriter();
    const out = writer.write(
      'para-quem',
      'novo ICP: dentistas',
      'expansao de mercado',
      {
        mode: 'interativo',
        prompt: () => 'ajustar',
        reasonCollector: () => 'reescreva o motivo.',
      }
    );
    assert.strictEqual(out.verdict, 'ADJUST');
    assert.strictEqual(out.applied, false);
    const target = path.join(ikigai, 'para-quem.md');
    assert.strictEqual(fs.existsSync(target), false);
  } finally {
    helpers.clearEnv();
    helpers.rm(logs);
    helpers.rm(ikigai);
  }
});

test('invalid dimension rejected before any gate call', () => {
  const ikigai = helpers.mkTmpIkigai('iki-bad-dim');
  try {
    const writer = helpers.freshIkigaiWriter();
    let promptCalls = 0;
    assert.throws(
      () =>
        writer.write('inventada', 'mudanca', 'motivo', {
          mode: 'interativo',
          prompt: function () {
            promptCalls += 1;
            return 'sim';
          },
        }),
      /dimensao invalida/
    );
    assert.strictEqual(promptCalls, 0);
  } finally {
    helpers.clearEnv();
    helpers.rm(ikigai);
  }
});
