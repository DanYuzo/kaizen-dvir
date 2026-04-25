'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 6, D-v1.4-03, FR-041: .claude/CLAUDE.md scaffold is present and references commandments.

test('.claude/CLAUDE.md is emitted and contains the required scaffold markers (pt-BR)', () => {
  const tmp = mkTmp('claudemd');
  try {
    runInit(tmp);
    const abs = path.join(tmp, '.claude', 'CLAUDE.md');
    assert.ok(fs.existsSync(abs), '.claude/CLAUDE.md must exist');

    const content = fs.readFileSync(abs, 'utf8');
    assert.match(content, /KaiZen v1\.4/, 'KaiZen version marker');
    assert.match(
      content,
      /\.kaizen-dvir\/commandments\.md/,
      'references the Commandments path'
    );
    assert.match(content, /Comandos de entrada/, 'entry command section (pt-BR)');
    assert.match(content, /kaizen doctor/, 'mentions kaizen doctor');
    assert.match(content, /Yotzer/, 'mentions Yotzer');
    assert.match(content, /Espaço do expert/, 'customization block (pt-BR)');
    assert.match(content, /L3 \(mutável\)/, 'L3 mutability marker (pt-BR)');
  } finally {
    rmTmp(tmp);
  }
});
