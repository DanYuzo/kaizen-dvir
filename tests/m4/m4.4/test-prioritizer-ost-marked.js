'use strict';

// AC 3 (M4.4) — prioritizer marks Solutions in OST.md as `mvp` or
// `roadmap` with per-item ICE rationale. Closes OST progression at F7.
// AC-117.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('prioritizer persona declares OST marking responsibility (AC 3, AC-117)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(
    raw.includes('OST'),
    'prioritizer persona must mention OST'
  );
  assert.ok(
    raw.includes('mvp') && raw.includes('roadmap'),
    'prioritizer persona must mention mvp and roadmap marking'
  );
});

test('prioritizer persona names appendChangeLog as the OST writing path (AC 3)', () => {
  const raw = helpers.readFileText(helpers.PRIORITIZER_PATH);
  assert.ok(
    raw.includes('appendChangeLog') || raw.includes('ost-writer'),
    'prioritizer must name the ost-writer.appendChangeLog API'
  );
});

test('phase-7 task instructs Solution marking via ost-writer.appendChangeLog (AC 3)', () => {
  const raw = helpers.readFileText(helpers.PHASE_7_TASK);
  assert.ok(raw.includes('appendChangeLog'));
  assert.ok(raw.includes('mvp'));
  assert.ok(raw.includes('roadmap'));
});

test('appendChangeLog writes prioritizer marking line to OST (AC 3, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f7-ost-mark');
  try {
    ostWriter.writeRoot(cell, {
      type: 'melhoria',
      description: 'reduzo erro humano em 50%',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'gargalo na coleta',
      pus: ['PU-001'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'importador automatico',
      origin: opp.id,
    });
    // F7 marks the Solution as mvp via Change Log.
    const mark = ostWriter.appendChangeLog(
      cell,
      '@prioritizer',
      'marcou ' + sol.id + ' como mvp. rationale: alto impact, alto confidence, medio ease.'
    );
    assert.ok(mark.line.includes('@prioritizer'));
    assert.ok(mark.line.includes(sol.id));
    assert.ok(mark.line.includes('mvp'));
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('marcou ' + sol.id + ' como mvp'));
  } finally {
    helpers.rm(cell);
  }
});

test('appendChangeLog writes roadmap marking line to OST (AC 3, AC-117)', () => {
  const ostWriter = helpers.freshOstWriter();
  const cell = helpers.mkTmpCell('f7-ost-mark-roadmap');
  try {
    ostWriter.writeRoot(cell, {
      type: 'desejo',
      description: 'fluxo novo',
    });
    const opp = ostWriter.appendOpportunity(cell, {
      description: 'dor secundaria',
      pus: ['PU-002'],
    });
    const sol = ostWriter.appendSolution(cell, {
      description: 'enriquecimento futuro',
      origin: opp.id,
    });
    const mark = ostWriter.appendChangeLog(
      cell,
      '@prioritizer',
      'marcou ' + sol.id + ' como roadmap. rationale: medio impact, alto confidence, alto ease.'
    );
    const text = helpers.readFileText(cell + '/OST.md');
    assert.ok(text.includes('marcou ' + sol.id + ' como roadmap'));
    assert.ok(mark.line.includes('roadmap'));
  } finally {
    helpers.rm(cell);
  }
});
