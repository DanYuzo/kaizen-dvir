'use strict';

// AC 14 (M4.5) — generated cell's manifest carries version: "1.0.0" and
// CHANGELOG.md is initialized at 1.0.0. FR-115, AC-111.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./_helpers');

test('initializeChangelog writes 1.0.0 entry (AC 14, FR-115)', () => {
  const tmp = helpers.mkTmpDir('changelog-1-0-0');
  try {
    const publisher = helpers.freshPublisher();
    fs.mkdirSync(tmp, { recursive: true });
    const result = publisher.initializeChangelog(tmp, {
      cellName: 'celula-x',
      author: 'expert',
      components: { agents: ['chief'], tasks: ['start'] },
    });
    assert.ok(fs.existsSync(result.path));
    const text = fs.readFileSync(result.path, 'utf8');
    assert.ok(/##\s+1\.0\.0\s+—/u.test(text));
    assert.ok(/celula criada via Yotzer F10/u.test(text));
    assert.ok(/autor:\s+expert/u.test(text));
  } finally {
    helpers.rm(tmp);
  }
});

test('materializeCell records version "1.0.0" in manifest (AC 14)', () => {
  const tmp = helpers.mkTmpDir('manifest-1-0-0');
  try {
    const publisher = helpers.freshPublisher();
    const manifest = helpers.buildValidManifest({ name: 'celula-x' });
    delete manifest.version;
    const result = publisher.materializeCell(
      { manifest: manifest, name: 'celula-x' },
      tmp
    );
    const yaml = fs.readFileSync(result.manifestPath, 'utf8');
    assert.ok(/version:\s*"1\.0\.0"/u.test(yaml), 'manifest must declare version: "1.0.0"');
  } finally {
    helpers.rm(tmp);
  }
});

test('appendChangelogVersion appends 1.0.1 without overwriting (AC 14, FR-115)', () => {
  const tmp = helpers.mkTmpDir('changelog-bump');
  try {
    const publisher = helpers.freshPublisher();
    fs.mkdirSync(tmp, { recursive: true });
    publisher.initializeChangelog(tmp, { cellName: 'celula-x' });
    const before = fs.readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8');
    publisher.appendChangelogVersion(tmp, '1.0.1', 'pequeno ajuste.');
    const after = fs.readFileSync(path.join(tmp, 'CHANGELOG.md'), 'utf8');
    assert.ok(after.startsWith(before), 'append must preserve prior content');
    assert.ok(/##\s+1\.0\.1\s+—/u.test(after));
    assert.ok(/pequeno ajuste/u.test(after));
  } finally {
    helpers.rm(tmp);
  }
});

test('appendChangelogVersion throws when CHANGELOG missing (AC 14)', () => {
  const tmp = helpers.mkTmpDir('changelog-missing');
  try {
    const publisher = helpers.freshPublisher();
    fs.mkdirSync(tmp, { recursive: true });
    assert.throws(() => publisher.appendChangelogVersion(tmp, '1.0.1', 'x'), {
      code: 'CHANGELOG_MISSING',
    });
  } finally {
    helpers.rm(tmp);
  }
});
