'use strict';

/*
 * _helpers-delimiter.js — KaiZen v1.5 / Story M7.4
 *
 * Shared sandbox builder for the M7.4 delimiter contract integration tests.
 * Sets up a temp project directory + a sibling canonical package directory
 * with the minimum manifest entries needed for `bin/kaizen-update.js` to
 * exercise the L3 path `.claude/CLAUDE.md` end-to-end.
 *
 * Why this helper exists
 * ----------------------
 * Multiple M7.4 tests need the same scaffolding (project root, canonical
 * root, version pair, manifest plumbing) but with different `.claude/CLAUDE.md`
 * fixture bodies. Centralizing the boilerplate keeps the test files
 * focused on the assertion contract.
 *
 * Stdlib only (CON-003). Mirrors the style of tests/m6/_helpers-channels.js.
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

function sha256(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

function readFixture(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

function mkRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function rmRoot(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

/**
 * Build a minimal sandbox where:
 *   - `<project>/.claude/CLAUDE.md` holds the `oursBody` content
 *   - `<canonical>/.claude/CLAUDE.md` holds the `theirsBody` content
 *   - Both manifests reference exactly that one L3 file
 *
 * The test runner can then invoke `kaizen-update.runUpdate` with
 * `--canonical-root <canonical>` and assert the post-update state of
 * `<project>/.claude/CLAUDE.md`.
 *
 * @param {{ oursBody: string, theirsBody: string,
 *           fromVersion?: string, toVersion?: string }} opts
 * @returns {{ project: string, canonical: string }}
 */
function setupDelimiterSandbox(opts) {
  if (!opts || typeof opts.oursBody !== 'string' || typeof opts.theirsBody !== 'string') {
    throw new TypeError('setupDelimiterSandbox: oursBody and theirsBody required');
  }
  const fromVersion = opts.fromVersion || '1.5.0';
  const toVersion = opts.toVersion || '1.6.0';

  const project = mkRoot('kaizen-m7.4-project-');
  const canonical = mkRoot('kaizen-m7.4-canonical-');

  // -- Project (installed) -----------------------------------------------
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.claude', 'CLAUDE.md'),
    opts.oursBody,
    'utf8'
  );
  fs.mkdirSync(path.join(project, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(project, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: fromVersion,
        generatedAt: '2026-04-25T00:00:00.000Z',
        generator: 'kaizen-init@1',
        files: {
          '.claude/CLAUDE.md': {
            hash: sha256(Buffer.from(opts.oursBody)),
            layer: 'L3',
            size: Buffer.byteLength(opts.oursBody),
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  // -- Canonical package -------------------------------------------------
  fs.mkdirSync(path.join(canonical, '.claude'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.claude', 'CLAUDE.md'),
    opts.theirsBody,
    'utf8'
  );
  fs.mkdirSync(path.join(canonical, '.kaizen-dvir'), { recursive: true });
  fs.writeFileSync(
    path.join(canonical, '.kaizen-dvir', 'manifest.json'),
    JSON.stringify(
      {
        version: toVersion,
        generatedAt: '2026-04-26T00:00:00.000Z',
        generator: 'build-canonical-manifest@1',
        files: {
          '.claude/CLAUDE.md': {
            hash: sha256(Buffer.from(opts.theirsBody)),
            layer: 'L3',
            size: Buffer.byteLength(opts.theirsBody),
          },
        },
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  return { project, canonical };
}

/**
 * Run kaizen-update.runUpdate against a project root, capturing stdout +
 * stderr. Mirrors tests/m6/test-update-layered-policy.js's `runUpdate`
 * helper so the assertion shapes are aligned.
 *
 * @param {string[]} args
 * @param {string} projectRoot
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
function runUpdate(args, projectRoot) {
  const UPDATE_BIN = path.resolve(__dirname, '..', '..', 'bin', 'kaizen-update.js');
  delete require.cache[require.resolve(UPDATE_BIN)];
  const updateMod = require(UPDATE_BIN);

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
  const origEnv = process.env.KAIZEN_PROJECT_ROOT;
  process.env.KAIZEN_PROJECT_ROOT = projectRoot;
  let exitCode;
  try {
    exitCode = updateMod.runUpdate(args);
  } finally {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    if (origEnv === undefined) {
      delete process.env.KAIZEN_PROJECT_ROOT;
    } else {
      process.env.KAIZEN_PROJECT_ROOT = origEnv;
    }
    process.chdir(origCwd);
  }
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

/**
 * Extract the bytes between `<!-- KAIZEN:EXPERT:START -->` and
 * `<!-- KAIZEN:EXPERT:END -->`, exclusive of the delimiter lines themselves.
 *
 * Returns the empty string if either delimiter is missing — tests that
 * require well-formed delimiters should assert that explicitly first.
 *
 * The slice excludes:
 *   - the EXPERT:START line and its terminating '\n'
 *   - the EXPERT:END line itself (we cut at lineStart of EXPERT:END)
 *
 * Trailing-newline policy: the slice keeps every byte the file emitted
 * between those two boundaries verbatim, which is the correct contract
 * surface to hash (CON-007 byte-equality).
 */
function extractExpertBlockBytes(text) {
  const reStart = /<!--\s*KAIZEN:EXPERT:START\s*-->/;
  const reEnd = /<!--\s*KAIZEN:EXPERT:END\s*-->/;
  const mStart = reStart.exec(text);
  const mEnd = reEnd.exec(text);
  if (!mStart || !mEnd) return '';
  // Find the line break after the START match.
  let after = mStart.index + mStart[0].length;
  // Skip to next '\n' inclusive.
  while (after < text.length && text.charCodeAt(after) !== 10) after++;
  if (after < text.length) after++; // step past the '\n'
  // Find the start of the END line.
  const endIdx = mEnd.index;
  let endLineStart = endIdx;
  while (endLineStart > 0 && text.charCodeAt(endLineStart - 1) !== 10) {
    endLineStart--;
  }
  if (endLineStart < after) return '';
  return text.slice(after, endLineStart);
}

function hashString(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

module.exports = {
  setupDelimiterSandbox,
  runUpdate,
  readFixture,
  rmRoot,
  extractExpertBlockBytes,
  hashString,
  FIXTURES_DIR,
};
