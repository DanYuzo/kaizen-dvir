'use strict';

/**
 * tests/m8/m8.2/_helpers.js — shared fixture helpers for M8.2 tests.
 *
 * Builds a temporary cell directory tree mirroring the Yotzer manifest
 * shape so each test can mutate its own copy without touching the
 * canonical fixture under .kaizen-dvir/celulas/yotzer/.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..');
const YOTZER_SOURCE = path.join(
  ROOT,
  '.kaizen-dvir',
  'celulas',
  'yotzer'
);

const REGISTRY_PATH = path.join(
  ROOT,
  '.kaizen-dvir',
  'dvir',
  'cell-registry.js'
);

function loadRegistry() {
  delete require.cache[require.resolve(REGISTRY_PATH)];
  return require(REGISTRY_PATH);
}

function makeTempDir(label) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'kz-m8-2-' + label + '-'));
  return base;
}

function rmRf(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {
    // best-effort cleanup
  }
}

/**
 * Copy the Yotzer cell scaffold (manifest + agents/) into a fresh temp dir.
 * Returns the absolute path to the copied cell root.
 */
function cloneYotzerCell() {
  const cellRoot = makeTempDir('cell');
  // Copy celula.yaml and agents/ only — that is all registerCellSkills reads.
  fs.copyFileSync(
    path.join(YOTZER_SOURCE, 'celula.yaml'),
    path.join(cellRoot, 'celula.yaml')
  );
  fs.mkdirSync(path.join(cellRoot, 'agents'), { recursive: true });
  const agentsSrc = path.join(YOTZER_SOURCE, 'agents');
  for (const ent of fs.readdirSync(agentsSrc, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.md')) continue;
    fs.copyFileSync(
      path.join(agentsSrc, ent.name),
      path.join(cellRoot, 'agents', ent.name)
    );
  }
  return cellRoot;
}

function writeManifest(cellRoot, yamlText) {
  fs.writeFileSync(path.join(cellRoot, 'celula.yaml'), yamlText, 'utf8');
}

function readFileUtf8(abs) {
  return fs.readFileSync(abs, 'utf8');
}

function fileExists(abs) {
  try {
    return fs.statSync(abs).isFile();
  } catch (_) {
    return false;
  }
}

function listDirFiles(abs) {
  try {
    return fs
      .readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .sort();
  } catch (_) {
    return [];
  }
}

module.exports = {
  ROOT,
  YOTZER_SOURCE,
  loadRegistry,
  makeTempDir,
  rmRf,
  cloneYotzerCell,
  writeManifest,
  readFileUtf8,
  fileExists,
  listDirFiles,
};
