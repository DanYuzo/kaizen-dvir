'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const loader = require(path.join(ROOT, '.kaizen-dvir', 'dvir', 'config-loader.js'));

test('getConfig() loads default dvir-config.yaml and returns 4 root fields', () => {
  const cfg = loader.getConfig();
  assert.ok(cfg && typeof cfg === 'object', 'config must be an object');
  assert.strictEqual(cfg.version, '1.4.0', 'version must be "1.4.0" string');
  assert.ok(cfg.boundary, 'boundary must be present');
  assert.strictEqual(
    cfg.boundary.frameworkProtection,
    true,
    'default frameworkProtection must be true'
  );
  assert.ok(cfg.paths, 'paths must be present');
  assert.ok(Array.isArray(cfg.paths.L1), 'paths.L1 must be a list');
  assert.ok(Array.isArray(cfg.paths.L2), 'paths.L2 must be a list');
  assert.ok(Array.isArray(cfg.paths.L3), 'paths.L3 must be a list');
  assert.ok(Array.isArray(cfg.paths.L4), 'paths.L4 must be a list');
  assert.ok(cfg.cli, 'cli must be present');
  assert.strictEqual(cfg.cli.command, 'kaizen', 'cli.command must be kaizen');
});

test('default paths reflect v1.4 renames (no legacy names)', () => {
  const cfg = loader.getConfig();
  const all = [].concat(cfg.paths.L1, cfg.paths.L2, cfg.paths.L3, cfg.paths.L4);
  const legacy = ['core/', 'development/', 'infrastructure/', 'docs/', 'knowledge/'];
  for (const p of all) {
    for (const bad of legacy) {
      assert.ok(
        !p.includes(bad),
        'legacy path fragment should not appear in dvir-config.yaml: ' + bad
      );
    }
  }
  assert.ok(cfg.paths.L1.includes('.kaizen-dvir/dvir/'), 'L1 must include dvir/');
  assert.ok(
    cfg.paths.L2.includes('.kaizen-dvir/instructions/'),
    'L2 must include instructions/'
  );
});
