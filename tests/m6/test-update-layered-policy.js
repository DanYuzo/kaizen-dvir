'use strict';

/*
 * test-update-layered-policy.js — M6.2 / FR-043 / FR-044 / AC-022.
 *
 * Validates the full layered policy round-trip:
 *   - Set up a sandbox project with a v1.4 local manifest + framework files.
 *   - Plant a mock canonical package at a sibling path declaring v1.5 with
 *     mutated L1 + L2 + L3 + L4-readonly entries.
 *   - Run `kaizen-update.runUpdate()` against the sandbox.
 *   - Assert the four-layer behavior:
 *       L1                 -> overwritten with canonical bytes
 *       L2 (regular)       -> overwritten with canonical bytes
 *       L2 MEMORY.md       -> preserved byte-for-byte (D-v1.1-09)
 *       L3                 -> 3-way merged (no conflict in this fixture)
 *       L4-readonly        -> never written
 *   - Local manifest refreshed to v1.5.
 *   - Snapshot created.
 *   - Update log emitted at .kaizen/logs/updates/<ts>.log.
 *
 * Three additional tests cover --dry-run (no writes), N-1 reject, and
 * the L3 conflict halt + .ours/.theirs sidecar emission with pt-BR
 * --continue guidance.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const UPDATE_BIN = path.resolve(__dirname, '..', '..', 'bin', 'kaizen-update.js');

function loadUpdate() {
  delete require.cache[require.resolve(UPDATE_BIN)];
  return require(UPDATE_BIN);
}

function sha256(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function makeRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-2-policy-'));
}

/**
 * Build a sandbox project with a known v1.4 install + a separate canonical
 * package at v1.5 with mutated content. Returns { project, canonical }.
 */
function setupSandbox(opts) {
  opts = opts || {};
  const project = makeRoot();
  const canonical = makeRoot();
  // Default to 1.5.0 -> 1.6.0 so no migration script exists for the version
  // pair (the v1.4 -> v1.5 script mutates .claude/CLAUDE.md and would
  // collide with the layered policy walk on the same file). Tests that
  // exercise the migration explicitly override fromVersion / toVersion.
  if (!opts.fromVersion) opts.fromVersion = '1.5.0';
  if (!opts.toVersion) opts.toVersion = '1.6.0';

  // ---- Project (installed v1.4) ----
  // L1 — bin/kaizen.js
  fs.mkdirSync(path.join(project, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(project, 'bin', 'kaizen.js'),
    '// v1.4 dispatcher\n',
    'utf8'
  );
  // L1 — .kaizen-dvir/commandments.md
  fs.mkdirSync(path.join(project, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'commandments.md'),
    '# Commandments v1.4\n',
    'utf8'
  );
  // L2 — instructions/templates/rules/boundary.md
  fs.mkdirSync(
    path.join(project, '.kaizen-dvir', 'instructions', 'templates', 'rules'),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(
      project,
      '.kaizen-dvir',
      'instructions',
      'templates',
      'rules',
      'boundary.md'
    ),
    '# boundary v1.4\n',
    'utf8'
  );
  // L2 — célula MEMORY.md (the protected file — D-v1.1-09)
  fs.mkdirSync(
    path.join(project, '.kaizen-dvir', 'celulas', 'yotzer'),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'celulas', 'yotzer', 'MEMORY.md'),
    '# expert memory — DO NOT TOUCH\n',
    'utf8'
  );
  // L3 — .claude/CLAUDE.md (the only L3 we exercise here)
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  const claudeBody = opts.claudeBody || '# CLAUDE.md\n\nExpert content here.\n';
  fs.writeFileSync(path.join(project, '.claude', 'CLAUDE.md'), claudeBody, 'utf8');
  // L4 — celulas/expert-cell/notes.md (must be untouched)
  fs.mkdirSync(path.join(project, 'celulas', 'expert-cell'), { recursive: true });
  fs.writeFileSync(
    path.join(project, 'celulas', 'expert-cell', 'notes.md'),
    '# expert work — NEVER touch\n',
    'utf8'
  );

  // ---- Local manifest at v1.4 ----
  const localFiles = {
    'bin/kaizen.js': {
      hash: sha256(Buffer.from('// v1.4 dispatcher\n')),
      layer: 'L1',
      size: 19,
    },
    '.kaizen-dvir/commandments.md': {
      hash: sha256(Buffer.from('# Commandments v1.4\n')),
      layer: 'L1',
      size: 21,
    },
    '.kaizen-dvir/instructions/templates/rules/boundary.md': {
      hash: sha256(Buffer.from('# boundary v1.4\n')),
      layer: 'L2',
      size: 17,
    },
    '.kaizen-dvir/celulas/yotzer/MEMORY.md': {
      hash: sha256(Buffer.from('# expert memory — DO NOT TOUCH\n')),
      layer: 'L2',
      size: 32,
    },
    '.claude/CLAUDE.md': {
      hash: sha256(Buffer.from(claudeBody)),
      layer: 'L3',
      size: claudeBody.length,
    },
  };
  const localManifestPath = path.join(project, '.kaizen-dvir', 'manifest.json');
  fs.writeFileSync(
    localManifestPath,
    JSON.stringify(
      {
        version: opts.fromVersion || '1.4.0',
        generatedAt: '2026-04-24T00:00:00.000Z',
        generator: 'kaizen-init@1',
        files: localFiles,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  // ---- Canonical package at v1.5 (mutated content) ----
  fs.mkdirSync(path.join(canonical, 'bin'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, 'bin', 'kaizen.js'),
    '// v1.5 dispatcher (canonical)\n',
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir', 'dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'commandments.md'),
    '# Commandments v1.5\n',
    'utf8'
  );
  fs.mkdirSync(
    path.join(canonical, '.kaizen-dvir', 'instructions', 'templates', 'rules'),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(
      canonical,
      '.kaizen-dvir',
      'instructions',
      'templates',
      'rules',
      'boundary.md'
    ),
    '# boundary v1.5 (atualizado)\n',
    'utf8'
  );
  // Canonical also ships an updated MEMORY.md template — but the local
  // expert MEMORY.md MUST be preserved per D-v1.1-09.
  fs.mkdirSync(
    path.join(canonical, '.kaizen-dvir', 'celulas', 'yotzer'),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'celulas', 'yotzer', 'MEMORY.md'),
    '# template v1.5 (canonical)\n',
    'utf8'
  );
  // L3 — canonical CLAUDE.md (different from local but mergeable cleanly
  // when local edits are in a different region)
  fs.mkdirSync(path.join(canonical, '.claude'), { recursive: true });
  const canonicalClaude =
    opts.canonicalClaude || '# CLAUDE.md\n\nExpert content here.\n\nNew framework footer v1.5.\n';
  fs.writeFileSync(
    path.join(canonical, '.claude', 'CLAUDE.md'),
    canonicalClaude,
    'utf8'
  );

  // Canonical manifest at v1.5
  const canonicalFiles = {
    'bin/kaizen.js': {
      hash: sha256(Buffer.from('// v1.5 dispatcher (canonical)\n')),
      layer: 'L1',
      size: 30,
    },
    '.kaizen-dvir/commandments.md': {
      hash: sha256(Buffer.from('# Commandments v1.5\n')),
      layer: 'L1',
      size: 21,
    },
    '.kaizen-dvir/instructions/templates/rules/boundary.md': {
      hash: sha256(Buffer.from('# boundary v1.5 (atualizado)\n')),
      layer: 'L2',
      size: 30,
    },
    '.kaizen-dvir/celulas/yotzer/MEMORY.md': {
      hash: sha256(Buffer.from('# template v1.5 (canonical)\n')),
      layer: 'L2',
      size: 28,
    },
    '.claude/CLAUDE.md': {
      hash: sha256(Buffer.from(canonicalClaude)),
      layer: 'L3',
      size: canonicalClaude.length,
    },
    // L4 entry — must be preserved untouched even though listed
    'celulas/expert-cell/notes.md': {
      hash: sha256(Buffer.from('# expert work\n')),
      layer: 'L4-readonly',
      size: 14,
    },
  };
  const canonicalManifestPath = path.join(canonical, '.kaizen-dvir', 'manifest.json');
  fs.writeFileSync(
    canonicalManifestPath,
    JSON.stringify(
      {
        version: opts.toVersion || '1.5.0',
        generatedAt: '2026-04-25T00:00:00.000Z',
        generator: 'build-canonical-manifest@1',
        files: canonicalFiles,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { project, canonical };
}

/**
 * Run the update orchestrator against the sandbox. Captures stdout/stderr
 * and returns { exitCode, stdout, stderr }.
 */
function runUpdate(args, projectRoot, opts) {
  opts = opts || {};
  const { runUpdate } = loadUpdate();
  const stdout = [];
  const stderr = [];
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  process.stdout.write = (s) => {
    stdout.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  process.stderr.write = (s) => {
    stderr.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  const origCwd = process.cwd();
  const origEnvProject = process.env.KAIZEN_PROJECT_ROOT;
  process.env.KAIZEN_PROJECT_ROOT = projectRoot;
  let exitCode;
  try {
    exitCode = runUpdate(args);
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    if (origEnvProject === undefined) {
      delete process.env.KAIZEN_PROJECT_ROOT;
    } else {
      process.env.KAIZEN_PROJECT_ROOT = origEnvProject;
    }
    process.chdir(origCwd);
  }
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

// ---------------------------------------------------------------------------
// Round-trip happy path: L1 + L2 + L3 + L4 layered policy
// ---------------------------------------------------------------------------

test('M6.2 AC-022 — L1/L2/L3/L4 layered policy applied correctly', () => {
  const { project, canonical } = setupSandbox();

  // L4 file pre-state hash for tree-diff assertion.
  const l4Path = path.join(project, 'celulas', 'expert-cell', 'notes.md');
  const l4Before = fs.readFileSync(l4Path);

  const result = runUpdate(
    ['--canonical-root', canonical],
    project
  );
  assert.equal(result.exitCode, 0, 'exit code should be 0 — got\n' + result.stderr);

  // L1 — overwritten with canonical bytes.
  const l1 = fs.readFileSync(path.join(project, 'bin', 'kaizen.js'), 'utf8');
  assert.equal(l1, '// v1.5 dispatcher (canonical)\n');

  // L1 — commandments.md overwritten.
  const cmd = fs.readFileSync(
    path.join(project, '.kaizen-dvir', 'commandments.md'),
    'utf8'
  );
  assert.equal(cmd, '# Commandments v1.5\n');

  // L2 — boundary.md overwritten.
  const boundary = fs.readFileSync(
    path.join(
      project,
      '.kaizen-dvir',
      'instructions',
      'templates',
      'rules',
      'boundary.md'
    ),
    'utf8'
  );
  assert.equal(boundary, '# boundary v1.5 (atualizado)\n');

  // L2 — MEMORY.md PRESERVED (D-v1.1-09).
  const mem = fs.readFileSync(
    path.join(project, '.kaizen-dvir', 'celulas', 'yotzer', 'MEMORY.md'),
    'utf8'
  );
  assert.equal(
    mem,
    '# expert memory — DO NOT TOUCH\n',
    'MEMORY.md must be preserved byte-for-byte (D-v1.1-09)'
  );

  // L3 — CLAUDE.md merged cleanly (canonical adds a footer; expert content kept).
  const claude = fs.readFileSync(path.join(project, '.claude', 'CLAUDE.md'), 'utf8');
  assert.match(claude, /Expert content here\./, 'expert content must remain');
  assert.match(claude, /New framework footer v1\.5\./, 'canonical footer must merge');

  // L4 — untouched (tree-diff equality).
  const l4After = fs.readFileSync(l4Path);
  assert.equal(
    Buffer.compare(l4Before, l4After),
    0,
    'L4 file must be byte-identical pre/post update'
  );

  // Manifest refreshed to v1.5 with at least the canonical entries.
  const refreshed = JSON.parse(
    fs.readFileSync(path.join(project, '.kaizen-dvir', 'manifest.json'), 'utf8')
  );
  assert.equal(refreshed.version, '1.6.0');
  assert.ok(refreshed.files['bin/kaizen.js']);
  assert.ok(refreshed.files['.kaizen-dvir/celulas/yotzer/MEMORY.md']);

  // Snapshot directory created.
  const snapsDir = path.join(project, '.kaizen', 'snapshots');
  assert.ok(fs.existsSync(snapsDir), 'snapshots dir must exist');
  const snapEntries = fs.readdirSync(snapsDir);
  assert.ok(snapEntries.length >= 1, 'at least one snapshot must exist');

  // Update log emitted.
  const logsDir = path.join(project, '.kaizen', 'logs', 'updates');
  assert.ok(fs.existsSync(logsDir), 'logs/updates must exist');
  const logEntries = fs.readdirSync(logsDir);
  assert.ok(logEntries.length >= 1, 'at least one log file must be written');
});

// ---------------------------------------------------------------------------
// Three-block summary in pt-BR
// ---------------------------------------------------------------------------

test('M6.2 NFR-104 — three-block pt-BR summary is emitted', () => {
  const { project, canonical } = setupSandbox();
  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 0);
  // Block headers present in pt-BR.
  assert.match(result.stdout, /Bloco A — arquivos atualizados/);
  assert.match(result.stdout, /Bloco B — arquivos preservados/);
  assert.match(result.stdout, /Bloco C — conflitos L3/);
  // pt-BR vocabulary check.
  assert.match(result.stdout, /Resumo do kaizen update/);
  assert.match(result.stdout, /Resultado:/);
  // Summary should mention MEMORY.md preservation.
  assert.match(result.stdout, /MEMORY\.md/);
});

// ---------------------------------------------------------------------------
// --dry-run never writes
// ---------------------------------------------------------------------------

test('M6.2 — --dry-run never writes to disk', () => {
  const { project, canonical } = setupSandbox();
  // Capture pre-state of a file that WOULD be overwritten.
  const l1Path = path.join(project, 'bin', 'kaizen.js');
  const l1Before = fs.readFileSync(l1Path);

  const result = runUpdate(
    ['--canonical-root', canonical, '--dry-run'],
    project
  );
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /dry-run/);

  const l1After = fs.readFileSync(l1Path);
  assert.equal(
    Buffer.compare(l1Before, l1After),
    0,
    'dry-run must NOT modify L1 files'
  );

  // No snapshot directory should be created on dry-run.
  const snapsDir = path.join(project, '.kaizen', 'snapshots');
  assert.ok(
    !fs.existsSync(snapsDir),
    'dry-run must not create snapshots'
  );
});

// ---------------------------------------------------------------------------
// L3 conflict path: .ours / .theirs sidecars + halt + pt-BR --continue msg
// ---------------------------------------------------------------------------

test('M6.2 AC-023 — L3 conflict emits .ours/.theirs and halts with pt-BR --continue', () => {
  // Set up so local CLAUDE.md and canonical CLAUDE.md edit the same line.
  const project = makeRoot();
  const canonical = makeRoot();

  // Local: replaced line 1 with "expert version"
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  const localBody = 'expert version of line one\nline 2\nline 3\n';
  fs.writeFileSync(path.join(project, '.claude', 'CLAUDE.md'), localBody, 'utf8');
  // Manifest declaring base = "line 1" so both sides diverge from base on the
  // same line.
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: '1.4.0',
        generatedAt: '2026-04-24T00:00:00.000Z',
        files: {
          '.claude/CLAUDE.md': {
            hash: sha256(Buffer.from(localBody)),
            layer: 'L3',
            size: localBody.length,
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  // Canonical: changed line 1 to "framework version"
  fs.mkdirSync(path.join(canonical, '.claude'), { recursive: true });
  const canonicalBody = 'framework version of line one\nline 2\nline 3\n';
  fs.writeFileSync(
    path.join(canonical, '.claude', 'CLAUDE.md'),
    canonicalBody,
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: '1.5.0',
        files: {
          '.claude/CLAUDE.md': {
            hash: sha256(Buffer.from(canonicalBody)),
            layer: 'L3',
            size: canonicalBody.length,
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 3, 'conflict halt should exit code 3');

  // Sidecars present.
  const oursPath = path.join(project, '.claude', 'CLAUDE.md.ours');
  const theirsPath = path.join(project, '.claude', 'CLAUDE.md.theirs');
  assert.ok(fs.existsSync(oursPath), '.ours sidecar must exist');
  assert.ok(fs.existsSync(theirsPath), '.theirs sidecar must exist');

  // pt-BR --continue guidance present.
  assert.match(result.stdout, /kaizen update --continue/);
  assert.match(result.stdout, /\.ours/);
  assert.match(result.stdout, /\.theirs/);
  assert.match(result.stdout, /Bloco C — conflitos L3/);

  // update-state.json persisted.
  const statePath = path.join(project, '.kaizen', 'update-state.json');
  assert.ok(fs.existsSync(statePath), 'update-state.json must persist');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.equal(state.schema, 'kaizen-update-state@1');
  assert.equal(state.conflicts.length, 1);
});

// ---------------------------------------------------------------------------
// --continue resumes after manual conflict resolution
// ---------------------------------------------------------------------------

test('M6.2 — --continue resumes after expert removes sidecars', () => {
  // Reuse the conflict setup, then resolve and continue.
  const project = makeRoot();
  const canonical = makeRoot();
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.claude', 'CLAUDE.md'),
    'expert version\nline 2\n',
    'utf8'
  );
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.4.0',
      files: {
        '.claude/CLAUDE.md': {
          hash: sha256(Buffer.from('expert version\nline 2\n')),
          layer: 'L3',
        },
      },
    }) + '\n',
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.claude', 'CLAUDE.md'),
    'framework version\nline 2\n',
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({
      version: '1.5.0',
      files: {
        '.claude/CLAUDE.md': {
          hash: sha256(Buffer.from('framework version\nline 2\n')),
          layer: 'L3',
        },
      },
    }) + '\n',
    'utf8'
  );

  const r1 = runUpdate(['--canonical-root', canonical], project);
  assert.equal(r1.exitCode, 3);

  // Expert "resolves" the conflict by overwriting CLAUDE.md and removing
  // sidecars.
  fs.writeFileSync(
    path.join(project, '.claude', 'CLAUDE.md'),
    'merged final version\nline 2\n',
    'utf8'
  );
  fs.unlinkSync(path.join(project, '.claude', 'CLAUDE.md.ours'));
  fs.unlinkSync(path.join(project, '.claude', 'CLAUDE.md.theirs'));

  const r2 = runUpdate(['--continue'], project);
  assert.equal(r2.exitCode, 0, 'continue must succeed: ' + r2.stderr);
  assert.match(r2.stdout, /Resolvidos: 1/);
  assert.match(r2.stdout, /Update finalizado/);

  // update-state.json must be cleared.
  assert.ok(
    !fs.existsSync(path.join(project, '.kaizen', 'update-state.json')),
    'update-state.json must be removed after successful continue'
  );

  // Manifest now at v1.5
  const m = JSON.parse(
    fs.readFileSync(path.join(project, '.kaizen-dvir', 'manifest.json'), 'utf8')
  );
  assert.equal(m.version, '1.5.0');
});

// ---------------------------------------------------------------------------
// N-1 violation
// ---------------------------------------------------------------------------

test('M6.2 CON-010 — N-1 violation aborts with pt-BR + exit code 2', () => {
  // Local at 1.3.0; canonical at 1.5.0 — jump is two minors.
  const { project, canonical } = setupSandbox({
    fromVersion: '1.3.0',
    toVersion: '1.5.0',
  });
  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 2);
  assert.match(result.stderr, /minor por vez|N-1/);
  assert.match(result.stderr, /1\.4\.0/, 'must mention intermediate 1.4.0');
});

// ---------------------------------------------------------------------------
// No local manifest
// ---------------------------------------------------------------------------

test('M6.2 — no local manifest produces a clean pt-BR error', () => {
  const project = makeRoot();
  const canonical = makeRoot();
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify({ version: '1.5.0', files: {} }) + '\n',
    'utf8'
  );
  const result = runUpdate(['--canonical-root', canonical], project);
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /manifesto local nao encontrado/);
  assert.match(result.stderr, /kaizen init/);
});
