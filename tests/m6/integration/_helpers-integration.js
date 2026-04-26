'use strict';

/*
 * _helpers-integration.js — Shared utilities for the M6.7 integration gate
 * suite. Story M6.7. Stdlib only (CON-003).
 *
 * Provides:
 *   - SOURCE_ROOT — absolute path of the kaizen repo root
 *   - mkSandbox(label) / rmSandbox(dir)
 *   - sha256(buf) — "sha256:<hex>" prefix used by the manifest format
 *   - treeHash(rootDir, opts) — sha256 fingerprint of a directory tree
 *       (sorted POSIX path listing + per-file content hash); ignores
 *       timestamps and modes so the value is stable across environments.
 *   - buildV14Project(projectDir) — materializes a deterministic v1.4
 *       reference project (the M6.7 fixture). The fixture is built
 *       programmatically so it stays in lockstep with v1.4 layer rules
 *       without committing a binary tree.
 *   - buildV15Canonical(canonicalDir) — materializes a canonical v1.5
 *       package suitable for `runUpdate(['--canonical-root', canonical])`.
 *   - runUpdate({ project, canonical, args }) — captures stdout/stderr.
 *   - runRollback({ project, args }) — captures stdout/stderr.
 *   - hrtimeMs(start) — millisecond delta from a process.hrtime.bigint().
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..');
const UPDATE_BIN = path.join(SOURCE_ROOT, 'bin', 'kaizen-update.js');

function sha256(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function mkSandbox(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m67-' + label + '-'));
}

function rmSandbox(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function hrtimeMs(start) {
  const now = process.hrtime.bigint();
  return Number(now - start) / 1e6;
}

// -- Tree hash ------------------------------------------------------------

function _walk(absRoot, relBase, out) {
  const entries = fs.readdirSync(path.join(absRoot, relBase), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const rel = relBase ? relBase + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      _walk(absRoot, rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
}

/**
 * Sha256 fingerprint of a directory subtree. Optional `includePrefixes`
 * keeps only relative POSIX paths whose prefix matches; useful to scope
 * the hash to L4 paths or to a single layer for AC-022.
 */
function treeHash(rootDir, options) {
  const opts = options || {};
  const include = opts.includePrefixes || null;
  const exclude = opts.excludePrefixes || [];
  const entries = [];
  if (!fs.existsSync(rootDir)) {
    return crypto.createHash('sha256').update('<missing>').digest('hex');
  }
  _walk(rootDir, '', entries);
  entries.sort();
  const hasher = crypto.createHash('sha256');
  for (const rel of entries) {
    if (include && !include.some((p) => rel === p || rel.startsWith(p + '/'))) {
      continue;
    }
    if (exclude.some((p) => rel === p || rel.startsWith(p + '/'))) {
      continue;
    }
    const abs = path.join(rootDir, rel);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;
    const content = fs.readFileSync(abs);
    hasher.update(rel);
    hasher.update('\0');
    hasher.update(crypto.createHash('sha256').update(content).digest('hex'));
    hasher.update('\n');
  }
  return hasher.digest('hex');
}

// -- v1.4 reference project fixture --------------------------------------
//
// A deterministic v1.4 install. Layer assignment matches the canonical
// LAYER_RULES inside .kaizen-dvir/dvir/migrations/v1.4-to-v1.5.js so the
// migration's `inferLayer()` tags every entry correctly when the manifest
// arrives without `layer` annotations.

function _writeFile(root, rel, content) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
}

const V14_FILES = {
  // L1
  'bin/kaizen.js': '// v1.4 dispatcher\n',
  '.kaizen-dvir/commandments.md': '# Commandments v1.4\n',
  '.kaizen-dvir/dvir/config-loader.js': '// v1.4 config-loader\n',
  // L2 — instructions templates
  '.kaizen-dvir/instructions/templates/rules/boundary.md':
    '# Boundary v1.4\n',
  // L2 — célula MEMORY.md (the protected file — D-v1.1-09).
  // We deliberately omit celula.yaml from this fixture: the cell-registry
  // skill registration step (wired into update post-merge by M8.4) requires
  // a fully-formed manifest with `slashPrefix` + chief persona files. The
  // M6 gate validates the layered policy and MEMORY.md exception — not the
  // M8 skill-registration pipeline (covered by tests/m6/test-channel-* and
  // M8 unit tests). Without celula.yaml, register-cells' `enumerateBundledCells`
  // skips this directory cleanly and the gate stays focused on M6.
  '.kaizen-dvir/celulas/yotzer/MEMORY.md':
    '# Yotzer MEMORY v1.4\n\nSentinel: PRESERVED-BY-MIGRATION\n',
  // L3 — .claude config (mutable, mergeable)
  '.claude/CLAUDE.md': '# CLAUDE v1.4\n\nLegacy expert content.\n',
  '.gitignore': 'node_modules/\n.kaizen/\n',
  // L4 — expert content (NEVER modified by update)
  'celulas/expert/work.md': '# expert work — must survive\n',
  'refs/notes/journal.md': '# expert notes — must survive\n',
};

/**
 * Build a v1.4 project layout at `projectDir` with:
 *   - L1 + L2 + L3 framework files
 *   - Sentinel .kaizen-dvir/celulas/yotzer/MEMORY.md (D-v1.1-09)
 *   - L4 expert files at celulas/expert/* and refs/notes/* (NEVER touched)
 *   - .kaizen-dvir/manifest.json declaring version 1.4.0 with hashes but
 *     WITHOUT `layer` annotations (the v1.4-to-v1.5 migration backfills).
 */
function buildV14Project(projectDir) {
  for (const rel of Object.keys(V14_FILES)) {
    _writeFile(projectDir, rel, V14_FILES[rel]);
  }
  // Build a v1.4 manifest WITHOUT `layer` annotations to exercise the
  // migration backfill path.
  const files = {};
  for (const rel of Object.keys(V14_FILES)) {
    if (rel.startsWith('celulas/') || rel.startsWith('refs/')) continue; // L4
    const buf = Buffer.from(V14_FILES[rel], 'utf8');
    files[rel] = { hash: sha256(buf), size: buf.length };
  }
  _writeFile(
    projectDir,
    '.kaizen-dvir/manifest.json',
    JSON.stringify(
      {
        version: '1.4.0',
        generatedAt: '2026-04-25T00:00:00.000Z',
        files: files,
      },
      null,
      2
    ) + '\n'
  );
}

// -- v1.5 canonical package fixture --------------------------------------
//
// Mirrors the v1.4 file set but with mutated content for L1/L2/L3 entries.
// L4 is NOT shipped (canonical packages don't carry expert content). The
// `.layer` annotations in the canonical manifest signal the orchestrator's
// layered policy; matches LAYER_RULES.

const V15_CANONICAL_FILES = {
  'bin/kaizen.js': '// v1.5 dispatcher\n',
  '.kaizen-dvir/commandments.md': '# Commandments v1.5\n',
  '.kaizen-dvir/dvir/config-loader.js': '// v1.5 config-loader\n',
  '.kaizen-dvir/instructions/templates/rules/boundary.md':
    '# Boundary v1.5\n',
  // MEMORY.md exception — canonical package ships an L2 MEMORY.md but the
  // orchestrator MUST preserve the local sentinel byte-for-byte. The
  // canonical hash is provided so the manifest is well-formed.
  '.kaizen-dvir/celulas/yotzer/MEMORY.md':
    '# Yotzer MEMORY v1.5 (canonical — should NOT overwrite local)\n',
  // L3 — content is identical to v1.4 so merge3 returns clean (no
  // conflict). The L3 conflict integration test plants its own divergent
  // canonical ad-hoc.
  '.claude/CLAUDE.md': '# CLAUDE v1.4\n\nLegacy expert content.\n',
  '.gitignore': 'node_modules/\n.kaizen/\n',
};

const V15_LAYER = {
  'bin/kaizen.js': 'L1',
  '.kaizen-dvir/commandments.md': 'L1',
  '.kaizen-dvir/dvir/config-loader.js': 'L1',
  '.kaizen-dvir/instructions/templates/rules/boundary.md': 'L2',
  '.kaizen-dvir/celulas/yotzer/MEMORY.md': 'L2',
  '.claude/CLAUDE.md': 'L3',
  '.gitignore': 'L3',
};

function buildV15Canonical(canonicalDir, overrides) {
  const filesContent = Object.assign({}, V15_CANONICAL_FILES, overrides || {});
  for (const rel of Object.keys(filesContent)) {
    _writeFile(canonicalDir, rel, filesContent[rel]);
  }
  const files = {};
  for (const rel of Object.keys(filesContent)) {
    const buf = Buffer.from(filesContent[rel], 'utf8');
    files[rel] = {
      hash: sha256(buf),
      size: buf.length,
      layer: V15_LAYER[rel] || 'L4-readonly',
    };
  }
  _writeFile(
    canonicalDir,
    '.kaizen-dvir/manifest.json',
    JSON.stringify(
      {
        version: '1.5.0',
        generatedAt: '2026-04-25T01:00:00.000Z',
        files: files,
      },
      null,
      2
    ) + '\n'
  );
}

// -- runUpdate / runRollback wrappers ------------------------------------

function _captureStreams(fn) {
  const stdoutChunks = [];
  const stderrChunks = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  process.stdout.write = (s) => {
    stdoutChunks.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  process.stderr.write = (s) => {
    stderrChunks.push(typeof s === 'string' ? s : s.toString());
    return true;
  };
  let exitCode;
  try {
    exitCode = fn();
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return {
    exitCode: exitCode,
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
  };
}

function runUpdate(opts) {
  delete require.cache[require.resolve(UPDATE_BIN)];
  const updateMod = require(UPDATE_BIN);
  const args = (opts.args || []).slice();
  if (opts.canonical) {
    args.push('--canonical-root', opts.canonical);
  }
  const origEnv = process.env.KAIZEN_PROJECT_ROOT;
  process.env.KAIZEN_PROJECT_ROOT = opts.project;
  try {
    return _captureStreams(() => updateMod.runUpdate(args));
  } finally {
    if (origEnv === undefined) delete process.env.KAIZEN_PROJECT_ROOT;
    else process.env.KAIZEN_PROJECT_ROOT = origEnv;
  }
}

/**
 * Invoke the rollback subcommand by spawning the dispatcher with cwd set
 * to the sandbox project. We use a child process here because rollback
 * is implemented inside `bin/kaizen.js` (not exported as a module
 * function); this matches how the expert invokes it on disk.
 */
function runRollback(opts) {
  const { spawnSync } = require('node:child_process');
  const dispatcher = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');
  const args = ['rollback'].concat(opts.args || []);
  const result = spawnSync(process.execPath, [dispatcher, ...args], {
    cwd: opts.project,
    encoding: 'utf8',
    env: Object.assign({}, process.env, { KAIZEN_PROJECT_ROOT: opts.project }),
  });
  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

module.exports = {
  SOURCE_ROOT,
  sha256,
  mkSandbox,
  rmSandbox,
  hrtimeMs,
  treeHash,
  buildV14Project,
  buildV15Canonical,
  runUpdate,
  runRollback,
  V14_FILES,
  V15_CANONICAL_FILES,
};
