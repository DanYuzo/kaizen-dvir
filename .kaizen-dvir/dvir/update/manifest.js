'use strict';

/*
 * manifest.js — KaiZen v1.5 / Story M6.2
 *
 * Purpose
 * -------
 * Loader / writer for the LOCAL manifest at `<projectRoot>/.kaizen-dvir/manifest.json`.
 * Pairs with the CANONICAL manifest (built by `bin/build-canonical-manifest.js`,
 * shipped inside the npm tarball at
 * `node_modules/kaizen-dvir/.kaizen-dvir/manifest.json`) to drive the
 * layered update policy implemented by `bin/kaizen-update.js`.
 *
 * Schema (single source of truth — kept aligned with the canonical builder)
 * ------------------------------------------------------------------------
 *   {
 *     "version":     "1.X.Y",            // string, mirrors framework version
 *     "generatedAt": "ISO 8601",          // string
 *     "generator":   "kaizen-update@1",   // string (optional; identifies writer)
 *     "files": {
 *       "<relativePath>": {
 *         "hash":  "sha256:<hex>",        // "sha256:" prefix + 64 hex chars
 *         "layer": "L1" | "L2" | "L3" | "L4-readonly",
 *         "size":  <bytes>                // additive; included for diagnostics
 *       },
 *       ...
 *     }
 *   }
 *
 * Public API
 * ----------
 *   readManifest(projectRoot) -> ManifestObject | null
 *   writeManifest(projectRoot, data) -> string  (absolute path written)
 *   computeHash(filePath) -> "sha256:<hex>"
 *   computeFileEntry(filePath, layer?) -> { hash, layer?, size }
 *   resolveCanonicalManifest(opts) -> { manifestPath, manifest, canonicalRoot } | null
 *
 * Constraints
 * -----------
 * - Stdlib only (CON-003): uses `fs`, `path`, `crypto` from Node.js stdlib.
 * - No console output: this module is a library, not a UI surface. Callers
 *   own all expert-facing strings (pt-BR per Commandment IV / D-v1.4-06).
 * - JSON written with 2-space indent + trailing newline (matches the canonical
 *   builder so `npm pack` diffs stay quiet on round-trip).
 * - Files map is sorted by key for deterministic output.
 *
 * Consumers
 * ---------
 *   bin/kaizen-update.js (M6.2) — reads local + canonical, dispatches the
 *     layered policy, refreshes local at the end.
 *   bin/kaizen-init.js   (M6.2 cross-task, future wiring) — may write the
 *     initial local manifest at the end of `kaizen init`.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const LOCAL_MANIFEST_REL = path.join('.kaizen-dvir', 'manifest.json');
const CANONICAL_PACKAGE_REL = path.join('node_modules', 'kaizen-dvir');
// Canonical manifests are emitted by `bin/build-canonical-manifest.js` with
// this generator string. Used as a guard so a project's LOCAL manifest (which
// is written by `kaizen-update@1` / `kaizen-init@1`) is never mistaken for
// the canonical source — the bug fixed by M9.7.
const CANONICAL_GENERATOR_PREFIX = 'build-canonical-manifest';

/**
 * Compute the canonical sha256 hex digest of a file with the "sha256:" prefix
 * the manifest stores. Returns "sha256:<64-hex>".
 */
function computeHash(filePath) {
  const buf = fs.readFileSync(filePath);
  const hex = crypto.createHash('sha256').update(buf).digest('hex');
  return 'sha256:' + hex;
}

/**
 * Compute the same per-file entry shape stored under `files`. Layer is
 * optional — callers that already classify files supply it; otherwise it is
 * left undefined and a downstream layer-classifier may fill it in.
 */
function computeFileEntry(filePath, layer) {
  const buf = fs.readFileSync(filePath);
  const hex = crypto.createHash('sha256').update(buf).digest('hex');
  const entry = {
    hash: 'sha256:' + hex,
    size: buf.length,
  };
  if (typeof layer === 'string' && layer.length > 0) {
    entry.layer = layer;
  }
  return entry;
}

function localManifestPath(projectRoot) {
  return path.join(projectRoot || process.cwd(), LOCAL_MANIFEST_REL);
}

/**
 * readManifest — return the parsed local manifest at
 * `<projectRoot>/.kaizen-dvir/manifest.json`, or `null` when the file is
 * absent. Throws on parse failure (caller surfaces the failure to the
 * expert as a pt-BR error and aborts the update).
 */
function readManifest(projectRoot) {
  const abs = localManifestPath(projectRoot);
  if (!fs.existsSync(abs)) return null;
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
}

/**
 * writeManifest — atomically replace the local manifest at
 * `<projectRoot>/.kaizen-dvir/manifest.json`. Returns the absolute path of
 * the written file.
 *
 * Files map is sorted by key so the output is byte-stable across runs that
 * do not change the underlying file set. The `generator` field is added
 * when missing so consumers can tell which writer produced the manifest.
 */
function writeManifest(projectRoot, data) {
  if (!data || typeof data !== 'object') {
    throw new TypeError('writeManifest: data must be an object');
  }
  const out = {};
  out.version = typeof data.version === 'string' ? data.version : '';
  out.generatedAt =
    typeof data.generatedAt === 'string' && data.generatedAt.length > 0
      ? data.generatedAt
      : new Date().toISOString();
  out.generator =
    typeof data.generator === 'string' && data.generator.length > 0
      ? data.generator
      : 'kaizen-update@1';

  const filesIn =
    data.files && typeof data.files === 'object' ? data.files : {};
  const sortedKeys = Object.keys(filesIn).sort();
  const filesOut = {};
  for (const key of sortedKeys) {
    filesOut[key] = filesIn[key];
  }
  out.files = filesOut;

  const abs = localManifestPath(projectRoot);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(out, null, 2) + '\n', 'utf8');
  return abs;
}

/**
 * resolveCanonicalManifest — locate the canonical manifest shipped inside
 * the published npm package. Returns `null` when the package is not
 * resolvable (e.g., the expert ran the framework from a source checkout
 * before the package was installed under node_modules).
 *
 * Lookup order:
 *   1. opts.canonicalRoot (explicit override — used by tests).
 *   2. process.env.KAIZEN_CANONICAL_ROOT (explicit override — used by
 *      tests that swap a fixture between init and update).
 *   3. opts.installRoot (the running binary's own package root — critical
 *      for npx invocations where the framework code lives in the npx cache
 *      and `<projectRoot>/node_modules/kaizen-dvir/` does NOT exist).
 *   4. `<projectRoot>/node_modules/kaizen-dvir/` (local install path).
 *   5. The framework checkout itself (when projectRoot IS the kaizen-dvir
 *      repo; this lets the dev tree run `kaizen update` against itself
 *      during integration tests).
 *
 * Generator guard: a candidate is only accepted when its manifest's
 * `generator` field starts with `build-canonical-manifest`. This prevents
 * the project's own LOCAL manifest (written by `kaizen-update@1` /
 * `kaizen-init@1`) from being mistaken for the canonical source — the
 * exact bug fixed by M9.7 where npx invocations fell through every other
 * candidate and silently read the local manifest as canonical, producing
 * a no-op `installed === target` even when a real upgrade was published.
 *
 * The return shape carries the full parsed manifest plus the absolute path
 * of the canonical root so the caller can resolve per-file content for
 * L1/L2 overwrites and L3 3-way merges.
 */
function resolveCanonicalManifest(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();

  const candidates = [];
  if (typeof opts.canonicalRoot === 'string' && opts.canonicalRoot.length > 0) {
    candidates.push(opts.canonicalRoot);
  }
  if (
    typeof process.env.KAIZEN_CANONICAL_ROOT === 'string' &&
    process.env.KAIZEN_CANONICAL_ROOT.length > 0
  ) {
    candidates.push(process.env.KAIZEN_CANONICAL_ROOT);
  }
  // installRoot is the package root of the running binary (the directory
  // where bin/kaizen-update.js lives, resolved via path.resolve(__dirname,
  // '..')). Under npx that's the npx cache extract path; under a local
  // npm install it's `<projectRoot>/node_modules/kaizen-dvir/` (covered
  // again below as candidate #4 for clarity).
  if (typeof opts.installRoot === 'string' && opts.installRoot.length > 0) {
    candidates.push(opts.installRoot);
  }
  candidates.push(path.join(projectRoot, CANONICAL_PACKAGE_REL));
  // Self-checkout fallback: kaizen-dvir repo is its own canonical source.
  candidates.push(projectRoot);

  for (const root of candidates) {
    const manifestPath = path.join(root, '.kaizen-dvir', 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    let raw;
    try {
      raw = fs.readFileSync(manifestPath, 'utf8');
    } catch (_) {
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      continue;
    }
    // Sanity guard — must look like a canonical manifest.
    if (!parsed || typeof parsed !== 'object' || !parsed.files) continue;
    // Generator guard (M9.7): only accept manifests emitted by the
    // canonical builder. LOCAL manifests written by kaizen-update@1 /
    // kaizen-init@1 must never be served as canonical, even if the
    // candidate path happens to host one (e.g., projectRoot fallback when
    // every higher-priority candidate misses).
    if (
      typeof parsed.generator !== 'string' ||
      parsed.generator.indexOf(CANONICAL_GENERATOR_PREFIX) !== 0
    ) {
      continue;
    }
    return {
      manifestPath: manifestPath,
      manifest: parsed,
      canonicalRoot: root,
    };
  }
  return null;
}

module.exports = {
  // Public API (story M6.2 contract)
  readManifest: readManifest,
  writeManifest: writeManifest,
  computeHash: computeHash,
  computeFileEntry: computeFileEntry,
  resolveCanonicalManifest: resolveCanonicalManifest,
  // Constants exposed for tests + downstream consumers
  LOCAL_MANIFEST_REL: LOCAL_MANIFEST_REL,
  CANONICAL_PACKAGE_REL: CANONICAL_PACKAGE_REL,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M6.2: initial implementation. readManifest /
//   writeManifest / computeHash / computeFileEntry / resolveCanonicalManifest
//   pure I/O surface. Stdlib only (CON-003). Schema documented in header
//   matches the canonical builder. JSON output deterministic (sorted keys,
//   2-space indent, trailing newline) so round-trip writes do not rattle
//   diffs. Resolves canonical via opts.canonicalRoot ->
//   KAIZEN_CANONICAL_ROOT env -> node_modules/@DanYuzo/kaizen-dvir/ ->
//   project-root self-checkout fallback (latter enables dev-tree integration
//   tests without a real npm install).
// 2026-04-29 — @dev (Dex) — M9.7: fix canonical-resolution-via-npx bug.
//   (a) CANONICAL_PACKAGE_REL changed from `node_modules/@DanYuzo/kaizen-dvir`
//   to unscoped `node_modules/kaizen-dvir` (package is published unscoped on
//   npm; `npm view @DanYuzo/kaizen-dvir` returns 404). (b) resolveCanonicalManifest
//   accepts opts.installRoot — the running binary's own package root —
//   inserted as the third-priority candidate so npx invocations (where
//   INSTALL_ROOT is the npx cache extract path, NOT under projectRoot) can
//   find their bundled canonical manifest. (c) Generator guard: candidates
//   are now rejected unless `manifest.generator` starts with
//   `build-canonical-manifest`. Prevents the projectRoot self-checkout
//   fallback from silently serving the user's LOCAL manifest as canonical
//   — the exact failure mode that caused `installed=1.8.0, target=1.8.0`
//   reports against a published 2.0.1 release.
