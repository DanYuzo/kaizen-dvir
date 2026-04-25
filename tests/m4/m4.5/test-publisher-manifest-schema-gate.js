'use strict';

// AC 12 (M4.5) — publisher validates the final manifest against
// celula-schema.json via M3.4 Schema Gate in under 500ms (NFR-003).

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('publisher.schemaGateOnManifest validates a well-formed manifest in PASS (AC 12)', () => {
  const tmp = helpers.mkTmpDir('schema-gate');
  try {
    const publisher = helpers.freshPublisher();
    const manifest = helpers.buildValidManifest();
    const result = publisher.materializeCell(
      { manifest: manifest, name: manifest.name },
      tmp
    );
    // Warm the schema cache by running once before measuring.
    publisher.schemaGateOnManifest(result.manifestPath);
    const sg = publisher.schemaGateOnManifest(result.manifestPath);
    assert.strictEqual(sg.verdict, 'PASS', JSON.stringify(sg.errors || []));
    assert.ok(
      sg.durationMs < 500,
      'Schema Gate must complete under 500ms (NFR-003), got ' + sg.durationMs + 'ms'
    );
  } finally {
    helpers.rm(tmp);
  }
});

test('publisher.schemaGateOnManifest fails when manifest missing required field (AC 12)', () => {
  const tmp = helpers.mkTmpDir('schema-gate-fail');
  try {
    const publisher = helpers.freshPublisher();
    // Manifest missing required `description`. We bypass materializeCell
    // by crafting the YAML directly to ensure schema-gate sees the
    // invalid shape.
    const cellPath = path.join(tmp, 'broken-cell');
    fs.mkdirSync(cellPath, { recursive: true });
    const manifestPath = path.join(cellPath, 'celula.yaml');
    const yaml =
      'name: "broken-cell"\n' +
      'version: "1.0.0"\n' +
      'boot:\n' +
      '  - "README.md"\n' +
      'tiers:\n' +
      '  tier_1:\n' +
      '    role: "coordinator"\n' +
      'commands:\n' +
      '  - name: "*x"\n' +
      '    description: "x"\n' +
      'components:\n' +
      '  templates: []\n' +
      '  checklists: []\n' +
      '  kbs: []\n' +
      'critical_invariants:\n' +
      '  - "phase-1"\n';
    fs.writeFileSync(manifestPath, yaml, 'utf8');
    const sg = publisher.schemaGateOnManifest(manifestPath);
    assert.strictEqual(sg.verdict, 'FAIL');
    assert.ok(sg.errors.length > 0);
  } finally {
    helpers.rm(tmp);
  }
});

test('publisher.schemaGateOnManifest under 500ms even on FAIL (AC 12, NFR-003)', () => {
  const tmp = helpers.mkTmpDir('schema-gate-perf');
  try {
    const publisher = helpers.freshPublisher();
    const cellPath = path.join(tmp, 'cell');
    fs.mkdirSync(cellPath, { recursive: true });
    const manifestPath = path.join(cellPath, 'celula.yaml');
    fs.writeFileSync(manifestPath, 'name: "x"\n', 'utf8');
    // Warm.
    publisher.schemaGateOnManifest(manifestPath);
    const sg = publisher.schemaGateOnManifest(manifestPath);
    assert.ok(
      sg.durationMs < 500,
      'Schema Gate must complete under 500ms even on FAIL, got ' + sg.durationMs + 'ms'
    );
  } finally {
    helpers.rm(tmp);
  }
});
