'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { mkTmp, rmTmp, runInit } = require('./_helpers');

// AC 8 + AC-011: frameworkProtection: false toggle deterministically disables
// the L1/L2 deny rules via path (a) — the boundary-toggle.js stub rewrites
// settings.json when the flag is false. We invoke the stub in-process.

test('boundary-toggle.js returns a stripped settings.json when frameworkProtection is false (AC-011)', () => {
  const tmp = mkTmp('toggle');
  try {
    runInit(tmp);

    const toggleModulePath = path.join(
      tmp,
      '.kaizen-dvir',
      'dvir',
      'boundary-toggle.js'
    );
    assert.ok(fs.existsSync(toggleModulePath), 'boundary-toggle.js must be materialized');

    // Flip the YAML to false.
    const yamlPath = path.join(tmp, '.kaizen-dvir', 'dvir-config.yaml');
    const original = fs.readFileSync(yamlPath, 'utf8');
    const flipped = original.replace(
      /frameworkProtection:\s*true/,
      'frameworkProtection: false'
    );
    fs.writeFileSync(yamlPath, flipped);

    // Load the toggle module fresh from the temp project.
    delete require.cache[require.resolve(toggleModulePath)];
    delete require.cache[require.resolve(path.join(tmp, '.kaizen-dvir', 'dvir', 'config-loader.js'))];
    const toggle = require(toggleModulePath);

    const result = toggle.applyBoundaryToggle({ targetRoot: tmp });
    const denyLen = Array.isArray(result.permissions?.deny)
      ? result.permissions.deny.length
      : null;
    assert.strictEqual(
      denyLen,
      0,
      'with frameworkProtection: false, deny list must be empty (got ' + denyLen + ')'
    );

    // Allow entries must survive.
    assert.ok(
      Array.isArray(result.permissions.allow) && result.permissions.allow.length > 0,
      'allow entries preserved when toggled off'
    );

    // Flip back to true.
    fs.writeFileSync(yamlPath, original);
    delete require.cache[require.resolve(toggleModulePath)];
    delete require.cache[require.resolve(path.join(tmp, '.kaizen-dvir', 'dvir', 'config-loader.js'))];
    const toggleTrue = require(toggleModulePath);
    const resultTrue = toggleTrue.applyBoundaryToggle({ targetRoot: tmp });
    assert.ok(
      Array.isArray(resultTrue.permissions.deny) && resultTrue.permissions.deny.length > 0,
      'deny entries re-applied when toggled on'
    );
  } finally {
    rmTmp(tmp);
  }
});
