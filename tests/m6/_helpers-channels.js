'use strict';

/*
 * _helpers-channels.js — M6.6 shared helpers for channel smoke tests
 *
 * Provides a stdlib-only (CON-003) toolkit that the two channel tests share:
 *
 *   - packTarball(projectRoot, destDir) → absolute path of the .tgz
 *   - extractTarball(tgzPath, destDir) → absolute path of the extracted root
 *     (the `package/` folder per npm convention)
 *   - runInitFromExtracted(extractedRoot, targetDir) → spawn result
 *   - treeHash(rootDir, options) → sha256 hex of a normalized file listing
 *   - mkTmp(label) / rmTmp(dir) — temp directory plumbing
 *   - HASH_RECORD_PATH / readHashRecord() / writeHashRecord(channel, hash)
 *     — inter-test coordination so test-channel-github-packages.js can assert
 *     identity against test-channel-npx-github.js's recorded hash and vice
 *     versa, regardless of test execution order.
 *
 * No external dependencies. Tar parsing is implemented inline against the
 * POSIX `ustar` format used by `npm pack` output.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..');

// Cross-test hash record. Sits under the system tmp dir so it is process-
// independent, survives between test files in the same `node --test` run, and
// is wiped automatically by the OS later. The path includes the calling pid's
// parent (the test runner) is NOT used because `node --test` spawns each test
// file in its own subprocess; we want a stable filename per test session.
const HASH_RECORD_PATH = path.join(os.tmpdir(), 'kaizen-m6-channel-hashes.json');

function mkTmp(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m6-' + label + '-'));
}

function rmTmp(dir) {
  if (dir && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Materialize the canonical npm tarball using `npm pack`. The tarball name is
 * resolved from the JSON output to be portable across npm versions.
 *
 * @param {string} projectRoot — absolute path to the project containing package.json
 * @param {string} destDir — absolute path where the .tgz will be written
 * @returns {string} absolute path of the produced .tgz file
 */
function packTarball(projectRoot, destDir) {
  const isWin = process.platform === 'win32';
  const npmBin = isWin ? 'npm.cmd' : 'npm';
  const out = execFileSync(
    npmBin,
    ['pack', '--pack-destination', destDir, '--json'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      shell: isWin, // npm.cmd on Windows requires shell
    }
  );
  const parsed = JSON.parse(out);
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].filename) {
    throw new Error('npm pack JSON output missing filename: ' + out);
  }
  // npm reports `filename` already on disk under `--pack-destination`. Resolve
  // robustly: prefer the destDir/<basename> path; fall back to the reported
  // filename if absolute.
  const reported = parsed[0].filename;
  const candidate = path.isAbsolute(reported)
    ? reported
    : path.join(destDir, path.basename(reported));
  if (!fs.existsSync(candidate)) {
    throw new Error('expected tarball not on disk: ' + candidate);
  }
  return candidate;
}

/**
 * Extract a gzipped POSIX tar (`.tgz`) into destDir using only Node stdlib.
 * Honors regular files (typeflag '0' or '\0') and directory entries
 * (typeflag '5'). PAX extended headers (typeflag 'x' / 'g') are skipped — npm
 * pack does not emit PAX records for v1.5 contents (validated against
 * package.json `files` whitelist). Long names (typeflag 'L') are not used by
 * npm pack either; we throw if encountered to surface unexpected formats
 * loudly.
 *
 * @param {string} tgzPath — absolute path to the .tgz
 * @param {string} destDir — absolute path of the extraction target (created)
 * @returns {string} absolute path of the extracted root (`destDir/package`)
 */
function extractTarball(tgzPath, destDir) {
  const compressed = fs.readFileSync(tgzPath);
  const tar = zlib.gunzipSync(compressed);

  fs.mkdirSync(destDir, { recursive: true });

  const BLOCK = 512;
  let offset = 0;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    // Two consecutive zero blocks mark the archive end.
    if (isZeroBlock(header)) {
      offset += BLOCK;
      continue;
    }

    const name = readString(header, 0, 100);
    const sizeOctal = readString(header, 124, 12).trim();
    const size = sizeOctal ? parseInt(sizeOctal, 8) : 0;
    const typeflag = String.fromCharCode(header[156]) || '0';
    const prefix = readString(header, 345, 155);
    const fullName = prefix ? prefix + '/' + name : name;

    offset += BLOCK;
    const padded = Math.ceil(size / BLOCK) * BLOCK;

    if (typeflag === 'x' || typeflag === 'g') {
      // PAX extended headers — skip (npm pack does not depend on them for
      // simple file records, but tolerate if present).
      offset += padded;
      continue;
    }
    if (typeflag === 'L' || typeflag === 'K') {
      throw new Error(
        'GNU long-name records are not supported by this stdlib reader; ' +
          'unexpected entry: ' + fullName
      );
    }

    const target = path.join(destDir, fullName);

    if (typeflag === '5') {
      fs.mkdirSync(target, { recursive: true });
    } else if (typeflag === '0' || typeflag === '\0' || typeflag === '') {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const content = tar.subarray(offset, offset + size);
      fs.writeFileSync(target, content);
    } else {
      // Other typeflags (symlinks, hardlinks, etc.) are not expected from
      // `npm pack` output for this project.
      throw new Error(
        'unsupported tar typeflag "' + typeflag + '" for entry ' + fullName
      );
    }

    offset += padded;
  }

  // npm pack always produces a top-level `package/` directory.
  const extractedRoot = path.join(destDir, 'package');
  if (!fs.existsSync(extractedRoot)) {
    throw new Error(
      'extracted tarball missing top-level package/ directory at ' +
        extractedRoot
    );
  }
  return extractedRoot;
}

function readString(buf, offset, len) {
  const slice = buf.subarray(offset, offset + len);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul === -1 ? slice.length : nul).toString('utf8');
}

function isZeroBlock(buf) {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
}

/**
 * Run `bin/kaizen-init.js` from an extracted tarball against `targetDir`.
 *
 * @param {string} extractedRoot — package/ folder produced by extractTarball
 * @param {string} targetDir — empty directory to install into
 * @returns {{status:number, stdout:string, stderr:string}}
 */
function runInitFromExtracted(extractedRoot, targetDir) {
  const cli = path.join(extractedRoot, 'bin', 'kaizen.js');
  if (!fs.existsSync(cli)) {
    throw new Error('extracted package missing bin/kaizen.js at ' + cli);
  }
  return spawnSync(process.execPath, [cli, 'init'], {
    cwd: targetDir,
    encoding: 'utf8',
  });
}

/**
 * Compute a deterministic sha256 fingerprint of a directory tree.
 *
 * The hash is built from a sorted listing of relative POSIX paths, with each
 * file's content sha256 prepended. This excludes timestamps, file modes, and
 * any other non-content metadata — making it suitable for cross-channel
 * equivalence assertions.
 *
 * The `excludeFields` option redacts specified JSON fields from
 * `manifest.json`-like files BEFORE hashing them. This is required because
 * `manifest.json` contains a `generatedAt` ISO timestamp that is
 * non-deterministic across runs but does NOT affect channel equivalence (per
 * AC: "modulo timestamps in manifest.json").
 *
 * @param {string} rootDir — absolute path of the directory to hash
 * @param {object} [options]
 * @param {string[]} [options.includePrefixes] — only entries whose relative
 *        path starts with one of these prefixes (POSIX style) are hashed.
 *        If omitted, every file is hashed.
 * @param {{file:string, fields:string[]}[]} [options.redactJsonFields] — for
 *        listed files (relative POSIX path), parse JSON, delete specified
 *        fields, then hash the canonicalized JSON.
 * @returns {string} 64-char hex sha256
 */
function treeHash(rootDir, options) {
  const opts = options || {};
  const include = opts.includePrefixes || null;
  const redactMap = new Map();
  for (const r of opts.redactJsonFields || []) {
    redactMap.set(r.file, r.fields);
  }

  const entries = [];
  walk(rootDir, '', entries);
  entries.sort();

  const accumulator = crypto.createHash('sha256');
  for (const rel of entries) {
    if (include && !include.some((p) => rel === p || rel.startsWith(p + '/'))) {
      continue;
    }
    const abs = path.join(rootDir, rel);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;

    let content;
    if (redactMap.has(rel)) {
      const raw = fs.readFileSync(abs, 'utf8');
      const parsed = JSON.parse(raw);
      for (const f of redactMap.get(rel)) {
        delete parsed[f];
      }
      content = Buffer.from(canonicalJSON(parsed), 'utf8');
    } else {
      content = fs.readFileSync(abs);
    }

    const fileHash = crypto.createHash('sha256').update(content).digest('hex');
    accumulator.update(rel + '\0' + fileHash + '\n');
  }
  return accumulator.digest('hex');
}

function walk(rootDir, relDir, out) {
  const here = path.join(rootDir, relDir);
  let entries;
  try {
    entries = fs.readdirSync(here, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const e of entries) {
    const childRel = relDir ? relDir + '/' + e.name : e.name;
    if (e.isDirectory()) {
      walk(rootDir, childRel, out);
    } else if (e.isFile()) {
      out.push(childRel);
    }
  }
}

function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJSON).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(value[k]));
  return '{' + pairs.join(',') + '}';
}

/**
 * Inter-test hash coordination. The two channel tests each write their
 * computed hash to a shared file under `os.tmpdir()`. Whichever test runs
 * second performs the cross-channel identity assertion. The first to run
 * simply records its hash; if it is alone (running test files in isolation)
 * its own self-equivalence is still validated within its own file.
 */
function readHashRecord() {
  if (!fs.existsSync(HASH_RECORD_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(HASH_RECORD_PATH, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeHashRecord(channel, hash) {
  const record = readHashRecord();
  record[channel] = hash;
  fs.writeFileSync(HASH_RECORD_PATH, JSON.stringify(record, null, 2));
}

module.exports = {
  SOURCE_ROOT,
  HASH_RECORD_PATH,
  mkTmp,
  rmTmp,
  packTarball,
  extractTarball,
  runInitFromExtracted,
  treeHash,
  readHashRecord,
  writeHashRecord,
};
