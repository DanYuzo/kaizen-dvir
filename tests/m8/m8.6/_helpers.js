'use strict';

/**
 * tests/m8/m8.6/_helpers.js — shared fixture helpers for M8.6 doctor
 * skill-check tests.
 *
 * Workflow:
 *   1. mkProject(label) — creates a temp project directory.
 *   2. runInit(projectDir) — runs `kaizen init` to populate
 *      `.kaizen-dvir/celulas/` AND `.claude/commands/Kaizen/...`.
 *   3. runDoctorCells(projectDir) — runs `kaizen doctor --cells` against
 *      that project, with KAIZEN_CELULAS_DIR + KAIZEN_CLAUDE_COMMANDS_DIR
 *      pointing at the project's directories so the doctor (which loads
 *      from the framework dev tree) reads the project's state.
 *   4. snapshotDir / compareSnapshot — verify read-only contract by
 *      snapshotting `.claude/commands/` byte content before and after
 *      doctor runs.
 *   5. rmProject(dir) — best-effort cleanup.
 *
 * No external dependencies (CON-003).
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

function _rand() {
  return crypto.randomBytes(4).toString('hex');
}

function mkProject(label) {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m8.6-' + label + '-' + _rand() + '-')
  );
}

function rmProject(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort cleanup
  }
}

function runInit(cwd) {
  return spawnSync(process.execPath, [CLI, 'init'], {
    cwd: cwd,
    encoding: 'utf8',
  });
}

function runDoctorCells(projectDir) {
  // The doctor loads cells from `KAIZEN_CELULAS_DIR` and skills from
  // `KAIZEN_CLAUDE_COMMANDS_DIR`. Pointing both at the project's matching
  // directories yields a clean cross-process check.
  const env = Object.assign({}, process.env, {
    KAIZEN_CELULAS_DIR: path.join(projectDir, '.kaizen-dvir', 'celulas'),
    KAIZEN_CLAUDE_COMMANDS_DIR: path.join(projectDir, '.claude', 'commands'),
  });
  return spawnSync(process.execPath, [CLI, 'doctor', '--cells'], {
    cwd: projectDir,
    encoding: 'utf8',
    env: env,
  });
}

function fileExists(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

/**
 * Snapshot every regular file under `dir` recursively. Returns a Map of
 * (relative-path → sha256-hex). Used to assert byte-equality across runs.
 */
function snapshotDir(dir) {
  const out = new Map();
  if (!fs.existsSync(dir)) return out;
  function walk(rel) {
    const abs = path.join(dir, rel);
    let entries;
    try {
      entries = fs.readdirSync(abs, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const ent of entries) {
      const childRel = rel ? path.join(rel, ent.name) : ent.name;
      if (ent.isDirectory()) {
        walk(childRel);
      } else if (ent.isFile()) {
        const buf = fs.readFileSync(path.join(dir, childRel));
        const hash = crypto.createHash('sha256').update(buf).digest('hex');
        out.set(childRel.split(path.sep).join('/'), hash);
      }
    }
  }
  walk('');
  return out;
}

function compareSnapshot(before, after) {
  if (before.size !== after.size) {
    return {
      equal: false,
      reason:
        'file count differs: before=' + before.size + ' after=' + after.size,
    };
  }
  for (const [rel, hash] of before) {
    const otherHash = after.get(rel);
    if (!otherHash) {
      return { equal: false, reason: 'missing after run: ' + rel };
    }
    if (otherHash !== hash) {
      return { equal: false, reason: 'content changed: ' + rel };
    }
  }
  return { equal: true, reason: null };
}

module.exports = {
  SOURCE_ROOT: SOURCE_ROOT,
  CLI: CLI,
  mkProject: mkProject,
  rmProject: rmProject,
  runInit: runInit,
  runDoctorCells: runDoctorCells,
  fileExists: fileExists,
  snapshotDir: snapshotDir,
  compareSnapshot: compareSnapshot,
};
