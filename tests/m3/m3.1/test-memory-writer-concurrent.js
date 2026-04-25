'use strict';

// AC 6, KZ-M3-R2, R-008: two concurrent appendPattern calls preserve both
// entries — no lost writes, no interleaved half-lines.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmpCelulas, rmTmp, requireFresh } = require('./_helpers');

test('two concurrent appendPattern calls both persist (AC 6, KZ-M3-R2)', async () => {
  const tmp = mkTmpCelulas('concurrent2');
  try {
    const writer = requireFresh('memory-writer.js');
    const target = path.join(tmp, 'racer', 'MEMORY.md');

    await Promise.all([
      writer.appendPattern('racer', 'agente A escreveu primeiro', 'medium'),
      writer.appendPattern('racer', 'agente B escreveu segundo', 'high'),
    ]);

    const body = fs.readFileSync(target, 'utf8');
    assert.ok(
      body.includes('agente A escreveu primeiro'),
      'entry A must be present after concurrent writes'
    );
    assert.ok(
      body.includes('agente B escreveu segundo'),
      'entry B must be present after concurrent writes'
    );

    // No interleaved half-lines: every line containing "agente" must be a
    // complete entry ending with a confidence value.
    const lines = body.split(/\r?\n/);
    const agentLines = lines.filter((l) => l.includes('agente'));
    assert.strictEqual(agentLines.length, 2, 'exactly 2 agent rows persisted');
    for (const l of agentLines) {
      assert.ok(
        /confiança:\s+(low|medium|high)/.test(l),
        'each row must end with a complete confidence marker: ' + l
      );
    }
  } finally {
    rmTmp(tmp);
  }
});

test('five concurrent appends all persist (stress; AC 6)', async () => {
  const tmp = mkTmpCelulas('concurrent5');
  try {
    const writer = requireFresh('memory-writer.js');
    const target = path.join(tmp, 'storm', 'MEMORY.md');

    const writers = [];
    for (let i = 0; i < 5; i++) {
      writers.push(writer.appendPattern('storm', 'p-' + i, 'low'));
    }
    await Promise.all(writers);

    const body = fs.readFileSync(target, 'utf8');
    for (let i = 0; i < 5; i++) {
      assert.ok(
        body.includes('p-' + i),
        'entry p-' + i + ' must be present after 5 concurrent writes'
      );
    }
  } finally {
    rmTmp(tmp);
  }
});
