'use strict';

/*
 * snapshot.js — KaiZen v1.5 / Story M6.4
 *
 * Purpose
 * -------
 * Implements the atomic safety net of the `kaizen update` engine. Provides
 * snapshot creation, listing, restoration, and pruning APIs. The module is
 * a pure I/O library: it does not emit console output, so callers (the
 * `kaizen rollback` command and `kaizen update` flow) own all expert-facing
 * messages and can render them in pt-BR per Commandment IV / D-v1.4-06.
 *
 * Design principles
 * -----------------
 * - Stdlib only (CON-003): uses `fs` and `path` from Node.js stdlib.
 *   `crypto` is allowed (already used framework-wide) for the idempotency
 *   state-hash computation; in this module it is only invoked from the
 *   helper `computeStateFingerprint`.
 * - Pure I/O surface: returns data, never logs. Tests can capture every
 *   side effect deterministically.
 * - Layer-aware: snapshots include only L1/L2/L3 framework-managed paths.
 *   L4 (`celulas/`, `refs/` at project root, `.kaizen/` runtime) is
 *   intentionally excluded — L4 belongs to the expert and `kaizen update`
 *   never touches it. The snapshots directory itself
 *   (`.kaizen/snapshots/`) is also excluded to prevent recursive snapshot
 *   capture.
 *
 * Snapshot directory layout
 * -------------------------
 *
 *   .kaizen/snapshots/{version}-{timestamp}/
 *     manifest.json              (snapshot of pre-update .kaizen-dvir/manifest.json)
 *     .kaizen-dvir/              (full L1/L2 tree under .kaizen-dvir/, except snapshots)
 *     .claude/                   (L3 .claude/ tree if present)
 *     bin/                       (L1 bin/ tree)
 *
 * The `{version}-{timestamp}` segment uses an ISO 8601 timestamp with
 * colons replaced by hyphens (`2026-04-25T14-30-00Z`). The hyphenated
 * form is filesystem-safe on Windows (which forbids `:`) and remains
 * lexicographically sortable, so `listSnapshots()` ordering is
 * deterministic without parsing the timestamp.
 *
 * Public API
 * ----------
 *   createSnapshot({ projectRoot, version, timestamp }) -> { snapshotPath, ... }
 *   listSnapshots({ projectRoot })                      -> Array<entry> (newest first)
 *   restoreSnapshot({ projectRoot, snapshotPath })      -> { restoredCount, durationMs }
 *   pruneSnapshots({ projectRoot, keepLast })           -> { kept, removed }
 *   computeStateFingerprint({ projectRoot })            -> string (sha256 hex)
 *
 * `projectRoot` defaults to `process.cwd()` when omitted, which makes the
 * module convenient for the CLI while keeping tests explicit.
 *
 * Exclusions during copy
 * ----------------------
 * createSnapshot walks the framework roots listed in FRAMEWORK_ROOTS but
 * NEVER descends into:
 *   - `.kaizen/` (runtime directory; would include the snapshots dir
 *     itself, which is not allowed — recursive snapshot ban).
 *   - `node_modules/` (defensive; should not exist under L1/L2/L3 anyway).
 *   - `.git/` (defensive).
 *
 * Performance
 * -----------
 * NFR-105 requires `restoreSnapshot` to complete in under 5 seconds for a
 * reference project. The implementation uses synchronous fs primitives
 * with no compression and no extra hashing, so the dominant cost is the
 * raw file copy. For the v1.5 reference framework footprint (~50 files,
 * <500 KB) this comfortably stays under 100 ms on any modern disk.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Framework-managed roots that participate in snapshot/restore. Ordered
// for deterministic walk output; any path missing on disk is silently
// skipped (snapshots adapt to what is actually present).
const FRAMEWORK_ROOTS = ['.kaizen-dvir', '.claude', 'bin'];

// Per-walk excludes — paths under FRAMEWORK_ROOTS that must never be
// captured. `.kaizen` is L4 runtime and lives at project root, but it is
// listed defensively in case future refactors place runtime files under
// a framework root.
const WALK_EXCLUDES = new Set(['.kaizen', 'node_modules', '.git']);

const SNAPSHOTS_DIRNAME = path.join('.kaizen', 'snapshots');

// -- timestamp helpers -----------------------------------------------------

/**
 * Convert an ISO 8601 timestamp into a filesystem-safe form by replacing
 * colons with hyphens. Sortable lexicographically.
 */
function safeTimestamp(iso) {
  if (typeof iso !== 'string' || iso.length === 0) {
    iso = new Date().toISOString();
  }
  return iso.replace(/:/g, '-');
}

function nowSafeTimestamp() {
  return safeTimestamp(new Date().toISOString());
}

function snapshotDirName(version, timestamp) {
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('snapshot: version must be a non-empty string');
  }
  return version + '-' + safeTimestamp(timestamp);
}

// -- low-level file walk ---------------------------------------------------

function listFilesUnder(absRoot, relRoot, out) {
  let stat;
  try {
    stat = fs.statSync(absRoot);
  } catch (_) {
    return; // missing root — silently skip
  }
  if (stat.isDirectory()) {
    const baseName = path.basename(absRoot);
    if (relRoot !== '' && WALK_EXCLUDES.has(baseName)) return;
    let entries;
    try {
      entries = fs.readdirSync(absRoot).sort();
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (relRoot === '' && WALK_EXCLUDES.has(entry)) continue;
      const childAbs = path.join(absRoot, entry);
      const childRel = relRoot === '' ? entry : path.join(relRoot, entry);
      listFilesUnder(childAbs, childRel, out);
    }
    return;
  }
  if (stat.isFile()) {
    out.push(relRoot);
  }
}

/**
 * Enumerate every framework file relative to `projectRoot`. Returns a
 * sorted list of POSIX-style relative paths (forward slashes) so the
 * output is stable across Windows and POSIX hosts.
 */
function enumerateFrameworkFiles(projectRoot) {
  const files = [];
  for (const root of FRAMEWORK_ROOTS) {
    const abs = path.join(projectRoot, root);
    listFilesUnder(abs, root, files);
  }
  return files.map((p) => p.split(path.sep).join('/')).sort();
}

// -- copy primitives -------------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(srcAbs, destAbs) {
  ensureDir(path.dirname(destAbs));
  fs.copyFileSync(srcAbs, destAbs);
}

// -- size helpers ----------------------------------------------------------

function dirSizeBytes(absDir) {
  let total = 0;
  let stat;
  try {
    stat = fs.statSync(absDir);
  } catch (_) {
    return 0;
  }
  if (!stat.isDirectory()) return stat.size || 0;
  let entries;
  try {
    entries = fs.readdirSync(absDir);
  } catch (_) {
    return 0;
  }
  for (const e of entries) {
    total += dirSizeBytes(path.join(absDir, e));
  }
  return total;
}

// -- public API ------------------------------------------------------------

/**
 * createSnapshot — copy framework state into
 * `.kaizen/snapshots/{version}-{timestamp}/`.
 *
 * Returns an object with the snapshot path so the caller (the `kaizen
 * update` flow) can write it into the update log.
 */
function createSnapshot(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const version = opts.version;
  const timestamp = opts.timestamp || new Date().toISOString();

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('createSnapshot: version is required');
  }

  const dirName = snapshotDirName(version, timestamp);
  const snapshotPath = path.join(projectRoot, SNAPSHOTS_DIRNAME, dirName);
  ensureDir(snapshotPath);

  // Copy the pre-update local manifest into the snapshot root, when it
  // exists. The manifest is written by `kaizen init` (M6.2) and refreshed
  // by `kaizen update`; on a virgin v1.4 install the file may be absent,
  // which is non-fatal — the rollback path simply does not have a
  // pre-update manifest hash to compare against.
  const localManifestPath = path.join(projectRoot, '.kaizen-dvir', 'manifest.json');
  if (fs.existsSync(localManifestPath)) {
    copyFile(localManifestPath, path.join(snapshotPath, 'manifest.json'));
  }

  // Copy framework roots verbatim.
  const files = enumerateFrameworkFiles(projectRoot);
  let copied = 0;
  for (const rel of files) {
    const srcAbs = path.join(projectRoot, rel);
    const destAbs = path.join(snapshotPath, rel);
    copyFile(srcAbs, destAbs);
    copied++;
  }

  return {
    snapshotPath: snapshotPath,
    version: version,
    timestamp: safeTimestamp(timestamp),
    fileCount: copied,
  };
}

/**
 * listSnapshots — read `.kaizen/snapshots/`, return entries sorted newest
 * first by lexicographic timestamp.
 */
function listSnapshots(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const root = path.join(projectRoot, SNAPSHOTS_DIRNAME);
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const name = e.name;
    // Parse `{version}-{timestamp}` — the timestamp begins after the
    // first hyphen that introduces an ISO date prefix `YYYY-...`. We
    // locate the first `-2` followed by 3 digits to find the year start.
    // Simpler heuristic: split on `-` and treat the first 4 segments
    // before a date-like token as version.
    const match = /^(.+?)-(\d{4}-\d{2}-\d{2}T.+)$/.exec(name);
    let version = name;
    let timestamp = '';
    if (match) {
      version = match[1];
      timestamp = match[2];
    }
    const abs = path.join(root, name);
    out.push({
      version: version,
      timestamp: timestamp,
      path: abs,
      sizeBytes: dirSizeBytes(abs),
      name: name,
    });
  }
  // Lex sort by name descending (newest first because timestamps are
  // ISO-style and version strings sort consistently within a release).
  out.sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));
  return out;
}

/**
 * restoreSnapshot — copy files from `snapshotPath` back to canonical
 * locations under `projectRoot`. Returns the restored file count and
 * measured wall-clock duration in milliseconds for NFR-105 verification.
 *
 * The function does NOT delete files that exist locally but are absent
 * from the snapshot. This conservative behavior is deliberate: removing
 * unknown files would risk wiping expert work that landed under a
 * framework root after the snapshot was taken (e.g., a bin/ helper
 * created by the expert during the update window). The caller can
 * augment behavior in the future if a stricter mode is required.
 */
function restoreSnapshot(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const snapshotPath = opts.snapshotPath;
  if (typeof snapshotPath !== 'string' || snapshotPath.length === 0) {
    throw new Error('restoreSnapshot: snapshotPath is required');
  }
  if (!fs.existsSync(snapshotPath)) {
    throw new Error('restoreSnapshot: snapshot not found: ' + snapshotPath);
  }

  const start = Date.now();
  let restoredCount = 0;

  // Restore each framework root present inside the snapshot. The
  // top-level `manifest.json` companion file at the snapshot root is
  // intentionally NOT copied to the project — it is the snapshot's own
  // record of pre-update state, used by the idempotency check; the
  // canonical location for the local manifest is
  // `.kaizen-dvir/manifest.json`, which is restored as part of the
  // `.kaizen-dvir/` walk.
  for (const root of FRAMEWORK_ROOTS) {
    const srcRoot = path.join(snapshotPath, root);
    if (!fs.existsSync(srcRoot)) continue;
    const files = [];
    listFilesUnder(srcRoot, root, files);
    for (const rel of files) {
      // rel is relative to projectRoot (because we passed root as
      // relRoot). Snapshot-side absolute path strips the snapshotPath
      // prefix from rel.
      const destAbs = path.join(projectRoot, rel);
      const srcAbs = path.join(snapshotPath, rel);
      copyFile(srcAbs, destAbs);
      restoredCount++;
    }
  }

  const durationMs = Date.now() - start;
  return { restoredCount: restoredCount, durationMs: durationMs };
}

/**
 * pruneSnapshots — keep the N most recent snapshots, delete the rest.
 * Default `keepLast` is 5. Uses `fs.rm({ recursive: true, force: true })`
 * so partially-deleted snapshot directories are tolerated.
 */
function pruneSnapshots(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const keepLast = typeof opts.keepLast === 'number' && opts.keepLast >= 0
    ? opts.keepLast
    : 5;

  const list = listSnapshots({ projectRoot: projectRoot });
  const kept = list.slice(0, keepLast);
  const removed = list.slice(keepLast);

  for (const entry of removed) {
    try {
      fs.rmSync(entry.path, { recursive: true, force: true });
    } catch (_) {
      // best-effort — caller may surface the failure if needed
    }
  }
  return { kept: kept.map((e) => e.path), removed: removed.map((e) => e.path) };
}

/**
 * computeStateFingerprint — produce a deterministic sha256 hex digest of
 * the current framework file tree. Used by `kaizen rollback` to detect
 * the no-op case (state already matches the most recent snapshot) and
 * skip the restore.
 */
function computeStateFingerprint(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const files = enumerateFrameworkFiles(projectRoot);
  const hash = crypto.createHash('sha256');
  for (const rel of files) {
    const abs = path.join(projectRoot, rel);
    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch (_) {
      continue;
    }
    hash.update(rel);
    hash.update(' ');
    hash.update(buf);
    hash.update(' ');
  }
  return hash.digest('hex');
}

/**
 * computeSnapshotFingerprint — same as computeStateFingerprint but
 * walks a snapshot directory instead of the live project. This pair of
 * fingerprints lets the rollback command short-circuit when the live
 * state already matches the snapshot content byte-for-byte.
 */
function computeSnapshotFingerprint(snapshotPath) {
  const hash = crypto.createHash('sha256');
  const collected = [];
  for (const root of FRAMEWORK_ROOTS) {
    const abs = path.join(snapshotPath, root);
    listFilesUnder(abs, root, collected);
  }
  collected.sort();
  for (const rel of collected) {
    const abs = path.join(snapshotPath, rel);
    let buf;
    try {
      buf = fs.readFileSync(abs);
    } catch (_) {
      continue;
    }
    const norm = rel.split(path.sep).join('/');
    hash.update(norm);
    hash.update(' ');
    hash.update(buf);
    hash.update(' ');
  }
  return hash.digest('hex');
}

module.exports = {
  // Public API (story M6.4 contract)
  createSnapshot: createSnapshot,
  listSnapshots: listSnapshots,
  restoreSnapshot: restoreSnapshot,
  pruneSnapshots: pruneSnapshots,
  // Helpers exposed for the CLI rollback subcommand and tests
  computeStateFingerprint: computeStateFingerprint,
  computeSnapshotFingerprint: computeSnapshotFingerprint,
  enumerateFrameworkFiles: enumerateFrameworkFiles,
  snapshotDirName: snapshotDirName,
  safeTimestamp: safeTimestamp,
  nowSafeTimestamp: nowSafeTimestamp,
  // Constants (read-only — exported for tests and the M6.2 consumer)
  FRAMEWORK_ROOTS: FRAMEWORK_ROOTS,
  SNAPSHOTS_DIRNAME: SNAPSHOTS_DIRNAME,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M6.4: initial implementation of snapshot
//   module. createSnapshot copies framework roots .kaizen-dvir/, .claude/,
//   bin/ into .kaizen/snapshots/{version}-{timestamp}/; listSnapshots
//   returns entries sorted newest first with sizeBytes; restoreSnapshot
//   reverses the copy and reports duration; pruneSnapshots retains the N
//   most recent. State + snapshot fingerprint helpers added to support
//   the rollback CLI idempotency check (live state == snapshot -> no-op).
//   Stdlib only (CON-003); pure I/O surface — caller emits pt-BR.
