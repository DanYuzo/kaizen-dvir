'use strict';

/*
 * test-migrations.js — M6.5 general migration harness.
 *
 * Validates:
 *   - loadMigration resolves an existing script and returns the module.
 *   - loadMigration returns null when no script exists for the requested
 *     version pair.
 *   - For every shipped migration script: running `forward` twice produces
 *     a byte-identical state hash (AC-028 — idempotency).
 *   - The manifest layer-backfill step assigns the correct layer per
 *     prefix rule and is itself idempotent.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const MIGRATIONS_LOADER = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'update',
  'migrations.js'
);

const MIGRATIONS_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '.kaizen-dvir',
  'dvir',
  'migrations'
);

function loadFreshLoader() {
  delete require.cache[require.resolve(MIGRATIONS_LOADER)];
  return require(MIGRATIONS_LOADER);
}

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-5-mig-'));
  fs.mkdirSync(path.join(root, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(root, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.claude', 'CLAUDE.md'),
    '# legacy v1.4 body\n',
    'utf8'
  );
  return root;
}

function noopLog() {}

function fileSha256(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function projectStateHash(root) {
  // Hash every file under the sandbox to detect any byte drift between
  // migration runs. Walks deterministically (sorted) so ordering is stable.
  const out = [];
  function walk(absDir, relDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
    for (const e of entries) {
      const abs = path.join(absDir, e.name);
      const rel = relDir ? path.join(relDir, e.name) : e.name;
      if (e.isDirectory()) walk(abs, rel);
      else if (e.isFile()) {
        const h = fileSha256(abs);
        out.push(rel.split(path.sep).join('/') + ' ' + h);
      }
    }
  }
  walk(root, '');
  return crypto.createHash('sha256').update(out.join('\n')).digest('hex');
}

function discoverMigrationScripts() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((n) => /^v\d+\.\d+-to-v\d+\.\d+\.js$/.test(n))
    .sort();
}

// -- loadMigration -------------------------------------------------------

test('M6.5 loadMigration — resolves the v1.4-to-v1.5 script', () => {
  const loader = loadFreshLoader();
  const mig = loader.loadMigration({ from: '1.4.0', to: '1.5.0' });
  assert.ok(mig, 'expected a migration module for 1.4 -> 1.5');
  assert.equal(typeof mig.forward, 'function');
  assert.equal(mig.from, '1.4.0');
  assert.equal(mig.to, '1.5.0');
  assert.ok(typeof mig.description === 'string' && mig.description.length > 0);
});

test('M6.5 loadMigration — accepts short minor strings', () => {
  const loader = loadFreshLoader();
  const mig = loader.loadMigration({ from: '1.4', to: '1.5' });
  assert.ok(mig);
  assert.equal(typeof mig.forward, 'function');
});

test('M6.5 loadMigration — returns null when no script exists', () => {
  const loader = loadFreshLoader();
  const mig = loader.loadMigration({ from: '0.9', to: '1.0' });
  assert.equal(mig, null, 'expected null for unknown version pair');
});

test('M6.5 loadMigration — requires both from and to', () => {
  const loader = loadFreshLoader();
  assert.throws(() => loader.loadMigration({ from: '1.4.0' }));
  assert.throws(() => loader.loadMigration({ to: '1.5.0' }));
  assert.throws(() => loader.loadMigration({}));
});

// -- migrationScriptPath -------------------------------------------------

test('M6.5 migrationScriptPath — emits the correct filename', () => {
  const loader = loadFreshLoader();
  const p = loader.migrationScriptPath({ from: '1.4.0', to: '1.5.0' });
  assert.equal(path.basename(p), 'v1.4-to-v1.5.js');
});

// -- idempotency harness across all shipped migrations -------------------

test('M6.5 idempotency — every shipped migration script is idempotent (AC-028)', async () => {
  const scripts = discoverMigrationScripts();
  assert.ok(scripts.length >= 1, 'at least one migration script must ship in v1.5');

  for (const filename of scripts) {
    const root = makeSandbox();
    const manifest = {
      version: '1.4.0',
      files: {
        'bin/kaizen.js': { hash: 'sha256:aaa', size: 100 },
        '.kaizen-dvir/celulas/yotzer/celula.yaml': { hash: 'sha256:bbb', size: 50 },
        '.claude/settings.json': { hash: 'sha256:ccc', size: 25 },
      },
    };

    delete require.cache[require.resolve(path.join(MIGRATIONS_DIR, filename))];
    const mig = require(path.join(MIGRATIONS_DIR, filename));

    await mig.forward({ projectRoot: root, manifest: manifest, log: noopLog });
    const stateAfterFirst = projectStateHash(root);
    const manifestAfterFirst = JSON.stringify(manifest);

    // Re-run with a fresh manifest copy that has the same starting shape but
    // already contains the layer field — the migration must detect it and
    // skip the backfill, so the post-second-run state must match.
    await mig.forward({ projectRoot: root, manifest: manifest, log: noopLog });
    const stateAfterSecond = projectStateHash(root);
    const manifestAfterSecond = JSON.stringify(manifest);

    assert.equal(
      stateAfterFirst,
      stateAfterSecond,
      'project state hash must be byte-identical after a second forward() run (' + filename + ')'
    );
    assert.equal(
      manifestAfterFirst,
      manifestAfterSecond,
      'manifest must be byte-identical after a second forward() run (' + filename + ')'
    );
  }
});

// -- manifest layer backfill --------------------------------------------

test('M6.5 v1.4-to-v1.5 — manifest layer backfill assigns layers per prefix rule', async () => {
  const root = makeSandbox();
  const manifest = {
    version: '1.4.0',
    files: {
      'bin/kaizen.js': { hash: 'sha256:aaa', size: 100 },
      '.kaizen-dvir/dvir/config-loader.js': { hash: 'sha256:bbb', size: 200 },
      '.kaizen-dvir/commandments.md': { hash: 'sha256:ccc', size: 300 },
      '.kaizen-dvir/celulas/yotzer/celula.yaml': { hash: 'sha256:ddd', size: 50 },
      '.kaizen-dvir/instructions/note.txt': { hash: 'sha256:eee', size: 10 },
      '.claude/settings.json': { hash: 'sha256:fff', size: 25 },
      '.claude/README.md': { hash: 'sha256:ggg', size: 40 },
      '.kaizen-dvir/dvir-config.yaml': { hash: 'sha256:hhh', size: 15 },
      // Path that does not match any framework prefix rule.
      'docs/expert-notes.md': { hash: 'sha256:iii', size: 80 },
    },
  };

  const migration = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));
  delete require.cache[require.resolve(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'))];
  const fresh = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));

  await fresh.forward({ projectRoot: root, manifest: manifest, log: noopLog });

  assert.equal(manifest.files['bin/kaizen.js'].layer, 'L1');
  assert.equal(manifest.files['.kaizen-dvir/dvir/config-loader.js'].layer, 'L1');
  assert.equal(manifest.files['.kaizen-dvir/commandments.md'].layer, 'L1');
  assert.equal(manifest.files['.kaizen-dvir/celulas/yotzer/celula.yaml'].layer, 'L2');
  assert.equal(manifest.files['.kaizen-dvir/instructions/note.txt'].layer, 'L2');
  assert.equal(manifest.files['.claude/settings.json'].layer, 'L3');
  assert.equal(manifest.files['.claude/README.md'].layer, 'L3');
  assert.equal(manifest.files['.kaizen-dvir/dvir-config.yaml'].layer, 'L1');
  assert.equal(manifest.files['docs/expert-notes.md'].layer, 'L4-readonly');

  // Make sure migration did not touch hashes or sizes.
  assert.equal(manifest.files['bin/kaizen.js'].hash, 'sha256:aaa');
  assert.equal(manifest.files['bin/kaizen.js'].size, 100);
});

test('M6.5 v1.4-to-v1.5 — manifest backfill skips entries that already have a layer', async () => {
  const root = makeSandbox();
  const manifest = {
    version: '1.4.0',
    files: {
      'bin/kaizen.js': {
        hash: 'sha256:aaa',
        size: 100,
        // Pre-existing layer that disagrees with the prefix rule. The
        // migration must NOT overwrite the existing value (idempotency).
        layer: 'L4-readonly',
      },
      '.claude/settings.json': { hash: 'sha256:bbb', size: 25 },
    },
  };

  const migration = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));
  delete require.cache[require.resolve(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'))];
  const fresh = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));

  await fresh.forward({ projectRoot: root, manifest: manifest, log: noopLog });

  // Pre-existing field preserved.
  assert.equal(manifest.files['bin/kaizen.js'].layer, 'L4-readonly');
  // Missing field assigned.
  assert.equal(manifest.files['.claude/settings.json'].layer, 'L3');
});

test('M6.5 v1.4-to-v1.5 — handles missing manifest gracefully', async () => {
  const root = makeSandbox();
  const migration = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));
  delete require.cache[require.resolve(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'))];
  const fresh = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));

  // Should not throw when manifest is null or has no files.
  const result = await fresh.forward({
    projectRoot: root,
    manifest: null,
    log: noopLog,
  });
  assert.equal(result.layersUpdated, 0);

  const result2 = await fresh.forward({
    projectRoot: root,
    manifest: { version: '1.4.0' },
    log: noopLog,
  });
  assert.equal(result2.layersUpdated, 0);
});

// -- log helper contract --------------------------------------------------

test('M6.5 v1.4-to-v1.5 — log helper receives EN event names and pt-BR messages', async () => {
  const root = makeSandbox();
  const events = [];
  const log = (eventName, message) => {
    events.push({ eventName: eventName, message: message });
  };

  const migration = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));
  delete require.cache[require.resolve(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'))];
  const fresh = require(path.join(MIGRATIONS_DIR, 'v1.4-to-v1.5.js'));

  await fresh.forward({
    projectRoot: root,
    manifest: { version: '1.4.0', files: { 'bin/kaizen.js': {} } },
    log: log,
  });

  // Always emits start + complete.
  assert.ok(events.some((e) => e.eventName === 'migration_start'));
  assert.ok(events.some((e) => e.eventName === 'migration_complete'));

  // Event names use snake_case ASCII (machine-friendly).
  for (const e of events) {
    assert.match(e.eventName, /^[a-z][a-z0-9_]*$/);
    assert.equal(typeof e.message, 'string');
    assert.ok(e.message.length > 0, 'every log entry must include a non-empty message');
  }

  // Spot-check that messages are pt-BR — none of the canonical event
  // descriptions use pure English words like "started" or "completed".
  const allMessages = events.map((e) => e.message).join(' ');
  assert.ok(
    /[ãõçáéíóúâêôà]/i.test(allMessages) ||
      /(iniciada|concluida|migrado|atualizado|preservado|ignorado|ja|seguro)/i.test(allMessages),
    'log messages must be pt-BR per Language Policy'
  );
});
