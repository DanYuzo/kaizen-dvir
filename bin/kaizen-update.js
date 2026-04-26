#!/usr/bin/env node
'use strict';

/*
 * kaizen-update.js — KaiZen v1.5 / Story M6.2
 *
 * Purpose
 * -------
 * Implements the `kaizen update` command end-to-end. Orchestrates the layered
 * update policy (FR-043, FR-044), wiring the four constituent libraries:
 *
 *   - manifest.js     (M6.2)  read/write local manifest, resolve canonical
 *   - migrations.js   (M6.5)  validateN1 / formatN1AbortMessage / loadMigration
 *   - snapshot.js     (M6.4)  createSnapshot — pre-mutation safety net
 *   - merge.js        (M6.3)  merge3 — 3-way merge for L3 paths + pt-BR labels
 *
 * Execution order (per M6.5 NOTES_FOR_DOWNSTREAM and AC-022):
 *
 *   1. Read local manifest (current installed state).
 *   2. Resolve canonical manifest (target state from npm package).
 *   3. validateN1 — abort with pt-BR if not the +1 minor (CON-010).
 *   4. createSnapshot — pre-mutation safety net (KZ-M6-R3).
 *   5. Run migration script v{from}-to-v{to}.js if present.
 *   6. Apply layered policy file-by-file:
 *        L1            -> overwrite always (record old/new hash).
 *        L2            -> overwrite, except .kaizen-dvir/celulas/* /MEMORY.md
 *                         which is preserved byte-for-byte (D-v1.1-09).
 *        L3            -> 3-way merge via merge3; on conflict write
 *                         {path}.ours and {path}.theirs sidecars and halt.
 *        L4-readonly   -> never written; warn on drift but do not modify.
 *   7. Refresh local manifest with the new state.
 *   8. Emit pt-BR three-block summary (NFR-104).
 *   9. Write structured pt-BR log to .kaizen/logs/updates/{ISO-timestamp}.log.
 *
 * Conflict resume (--continue)
 * ----------------------------
 * When step 6 surfaces an L3 conflict, the orchestrator writes a state file
 * at `.kaizen/update-state.json` capturing the in-flight update. The expert
 * resolves conflicts by editing the original file (and removing the
 * `.ours`/`.theirs` sidecars) then runs `kaizen update --continue`. The
 * resume path re-attempts ONLY the previously-conflicted L3 files.
 *
 * --dry-run
 * ---------
 * Walks the same code paths but writes nothing to disk. Emits the pt-BR
 * three-block summary as if the update had happened. Always exits 0.
 *
 * Constraints
 * -----------
 * - Stdlib only (CON-003): `fs`, `path`. crypto via manifest.js.
 * - Language Policy: every console.log/error string is pt-BR; structured
 *   log event names are English (machine readable).
 * - No external dependencies. CommonJS (CON-002).
 *
 * CLI surface
 * -----------
 *   kaizen update [--dry-run] [--continue] [--force] [--canonical-root <path>]
 *
 * Exit codes
 * ----------
 *   0 — success (or dry-run, or no-op same-version, or no-snapshot warn).
 *   1 — fatal error (manifest missing, canonical missing, IO failure).
 *   2 — N-1 violation (CON-010 abort).
 *   3 — L3 conflict halt; expert must run `kaizen update --continue`.
 */

const fs = require('node:fs');
const path = require('node:path');

// M8.4 — shared cell-skill registration helpers. Used to re-register the
// `.claude/commands/Kaizen/*` slash skills after the layered policy applies
// updated cell manifests, so a new specialist agent appearing in the new
// version's `celula.yaml` lands without requiring a manual `kaizen init`.
// The helper is stdlib-only and idempotent (no writes when nothing changed).
const _registerCellsLib = require('./lib/register-cells.js');

// Anchor for loading framework code (`.kaizen-dvir/dvir/cell-registry.js`).
// Same convention as `bin/kaizen-init.js`: `INSTALL_ROOT` is the package root
// where this file lives — either the dev checkout or
// `node_modules/@DanYuzo/kaizen-dvir/`.
const INSTALL_ROOT = path.resolve(__dirname, '..');

// -- Module loaders --------------------------------------------------------
//
// The four libraries are loaded lazily so a syntax error in one does not
// prevent `kaizen --help` from rendering. Each loader uses a delete-cache
// pattern so test sandboxes that swap module bodies between runs see the
// fresh content.

function loadManifestModule(projectRoot) {
  // Prefer the framework's own copy (ensures the dvir source on disk
  // matches the binary that ships in the package). When the kaizen-dvir
  // package is installed under node_modules, the path resolution below
  // walks up from this file (`bin/kaizen-update.js`) into
  // `.kaizen-dvir/dvir/update/manifest.js`.
  const candidates = [
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'update', 'manifest.js'),
    path.join(projectRoot, '.kaizen-dvir', 'dvir', 'update', 'manifest.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      delete require.cache[require.resolve(p)];
      return require(p);
    }
  }
  throw new Error(
    'manifest module not found. expected at .kaizen-dvir/dvir/update/manifest.js'
  );
}

function loadSnapshotModule(projectRoot) {
  const candidates = [
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'update', 'snapshot.js'),
    path.join(projectRoot, '.kaizen-dvir', 'dvir', 'update', 'snapshot.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      delete require.cache[require.resolve(p)];
      return require(p);
    }
  }
  throw new Error('snapshot module not found.');
}

function loadMergeModule(projectRoot) {
  const candidates = [
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'update', 'merge.js'),
    path.join(projectRoot, '.kaizen-dvir', 'dvir', 'update', 'merge.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      delete require.cache[require.resolve(p)];
      return require(p);
    }
  }
  throw new Error('merge module not found.');
}

function loadMigrationsModule(projectRoot) {
  const candidates = [
    path.join(__dirname, '..', '.kaizen-dvir', 'dvir', 'update', 'migrations.js'),
    path.join(projectRoot, '.kaizen-dvir', 'dvir', 'update', 'migrations.js'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      delete require.cache[require.resolve(p)];
      return require(p);
    }
  }
  throw new Error('migrations module not found.');
}

// -- CLI argument parsing --------------------------------------------------

function parseArgs(args) {
  const out = {
    dryRun: false,
    continue: false,
    force: false,
    help: false,
    canonicalRoot: null,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run' || a === '-n') {
      out.dryRun = true;
    } else if (a === '--continue') {
      out.continue = true;
    } else if (a === '--force') {
      out.force = true;
    } else if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a === '--canonical-root') {
      out.canonicalRoot = args[i + 1] || null;
      i++;
    } else if (a.startsWith('--canonical-root=')) {
      out.canonicalRoot = a.slice('--canonical-root='.length);
    }
    // Unknown flags are ignored quietly — the CLI dispatcher in bin/kaizen.js
    // is the canonical authority for unknown commands. Tolerating unknown
    // flags here lets the test suite probe the orchestrator without coupling
    // to the dispatcher's flag inventory.
  }
  return out;
}

const HELP_TEXT_PT_BR = [
  'Uso: kaizen update [opcoes]',
  '',
  'Aplica a nova versao do framework respeitando suas customizacoes.',
  'A politica em camadas (L1/L2/L3/L4) preserva 100% do seu trabalho em L4 e',
  'roda merge automatico em L3. L1 e L2 sao sobrescritos (com excecao do',
  'MEMORY.md de cada celula, que e preservado).',
  '',
  'Opcoes:',
  '  --dry-run         Mostra o que seria feito sem escrever em disco',
  '  --continue        Retoma um update interrompido por conflito em L3',
  '  --force           Forca operacoes mesmo quando haveria aviso (uso reservado)',
  '  --canonical-root  Caminho do pacote canonico (uso de teste)',
  '  --help            Mostra esta ajuda',
  '',
  'Em caso de conflito em arquivos L3:',
  '  1. revise os arquivos {caminho}.ours e {caminho}.theirs criados ao lado',
  '  2. edite manualmente o arquivo original ate ficar como voce quer',
  '  3. apague os arquivos .ours e .theirs',
  '  4. rode `kaizen update --continue` para retomar e finalizar',
  '',
].join('\n');

function printHelp() {
  process.stdout.write(HELP_TEXT_PT_BR);
}

// -- Project / path helpers ------------------------------------------------

function projectRoot() {
  if (process.env.KAIZEN_PROJECT_ROOT) return process.env.KAIZEN_PROJECT_ROOT;
  // When invoked from the dispatcher, __dirname is `<projectRoot>/bin`, so
  // process.cwd() is what the expert ran the command in — that is our
  // canonical project root.
  return process.cwd();
}

function relPosix(p) {
  return p.split(path.sep).join('/');
}

function absInProject(root, rel) {
  const norm = rel.split('/').join(path.sep);
  return path.join(root, norm);
}

function absInCanonical(canonicalRoot, rel) {
  const norm = rel.split('/').join(path.sep);
  return path.join(canonicalRoot, norm);
}

// -- MEMORY.md exception (D-v1.1-09) ---------------------------------------

const MEMORY_MD_PATTERN = /^\.kaizen-dvir\/celulas\/[^/]+\/MEMORY\.md$/;

function isMemoryMdException(relPath) {
  return MEMORY_MD_PATTERN.test(relPath);
}

// -- Update state (--continue support) -------------------------------------
//
// `.kaizen/update-state.json` schema (English machine doc):
//   {
//     "schema":     "kaizen-update-state@1",
//     "createdAt":  "ISO 8601",
//     "fromVersion":"1.4.0",
//     "toVersion":  "1.5.0",
//     "snapshotPath": "<absolute path>",
//     "conflicts":  [ { path, oursPath, theirsPath } ],
//     "appliedFiles": [ relPath, ... ]   // files already overwritten/merged
//   }
//
// The state file is written when the orchestrator halts on an L3 conflict.
// `kaizen update --continue` reads the file, re-runs ONLY the conflicted
// files (re-attempts merge), and clears the state on success.

const UPDATE_STATE_REL = path.join('.kaizen', 'update-state.json');

function updateStatePath(root) {
  return path.join(root, UPDATE_STATE_REL);
}

function readUpdateState(root) {
  const p = updateStatePath(root);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return null;
  }
}

function writeUpdateState(root, state) {
  const p = updateStatePath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function clearUpdateState(root) {
  const p = updateStatePath(root);
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch (_) {
      // best-effort
    }
  }
}

// -- Update log ------------------------------------------------------------
//
// `.kaizen/logs/updates/{ISO-timestamp}.log` — structured, append-only,
// pt-BR human-readable lines mixed with structured English event names so
// a future tooling pass can grep both.

function makeLogger(root, dryRun) {
  const start = new Date();
  const safeStamp = start.toISOString().replace(/:/g, '-');
  const logDir = path.join(root, '.kaizen', 'logs', 'updates');
  const logPath = path.join(logDir, safeStamp + '.log');
  const lines = [];

  function append(eventName, message) {
    const ts = new Date().toISOString();
    const line = '[' + ts + '] ' + eventName + ' — ' + message;
    lines.push(line);
  }

  function flush() {
    if (dryRun) return null;
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(logPath, lines.join('\n') + '\n', 'utf8');
    return logPath;
  }

  return { append: append, flush: flush, logPath: logPath };
}

// -- Layered file processing -----------------------------------------------

/**
 * processL1 / processL2 — overwrite the local file with canonical content.
 * Returns:
 *   { action: 'overwrite' | 'identical' | 'memory_md_preserved',
 *     oldHash, newHash, bytesNew }
 *
 * Reads canonical bytes once. Compares against local bytes (when present).
 * When dryRun is true, never writes.
 */
function processOverwrite(args) {
  const {
    relPath,
    layer,
    canonicalRoot,
    projectRoot: pr,
    dryRun,
  } = args;
  const canonAbs = absInCanonical(canonicalRoot, relPath);
  const localAbs = absInProject(pr, relPath);

  // L2 + MEMORY.md exception — preserve byte-for-byte.
  if (layer === 'L2' && isMemoryMdException(relPath)) {
    return {
      action: 'memory_md_preserved',
      reason: 'celula/MEMORY.md preservada (D-v1.1-09)',
      relPath: relPath,
    };
  }

  if (!fs.existsSync(canonAbs)) {
    // Canonical entry exists in manifest but file missing on disk —
    // surface as a soft warning. The caller decides how to render it.
    return {
      action: 'canonical_missing',
      relPath: relPath,
    };
  }

  const canonBuf = fs.readFileSync(canonAbs);
  const localExisted = fs.existsSync(localAbs);
  const localBuf = localExisted ? fs.readFileSync(localAbs) : null;

  if (localBuf && Buffer.compare(localBuf, canonBuf) === 0) {
    return {
      action: 'identical',
      relPath: relPath,
      bytes: canonBuf.length,
    };
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(localAbs), { recursive: true });
    fs.writeFileSync(localAbs, canonBuf);
  }

  return {
    action: 'overwrite',
    relPath: relPath,
    bytesNew: canonBuf.length,
    bytesOld: localBuf ? localBuf.length : 0,
    layer: layer,
  };
}

/**
 * processL3 — three-way merge. Returns one of:
 *   { action: 'merged_clean'   }     ours === theirs, nothing to do
 *   { action: 'merged_applied' }     merge succeeded (write performed)
 *   { action: 'conflict' }           wrote .ours/.theirs sidecars
 *   { action: 'canonical_missing' }  canonical file not present on disk
 *
 * `base` is sourced from the most recent snapshot (when available). When
 * no base is reachable (e.g., virgin install), we fall back to `ours` so
 * merge3 reduces to "adopt theirs when ours == base" semantics.
 */
function processMerge3(args) {
  const {
    relPath,
    canonicalRoot,
    projectRoot: pr,
    snapshotPath,
    dryRun,
    mergeLib,
  } = args;
  const canonAbs = absInCanonical(canonicalRoot, relPath);
  const localAbs = absInProject(pr, relPath);

  if (!fs.existsSync(canonAbs)) {
    return { action: 'canonical_missing', relPath: relPath };
  }
  const theirs = fs.readFileSync(canonAbs, 'utf8');
  const ours = fs.existsSync(localAbs)
    ? fs.readFileSync(localAbs, 'utf8')
    : '';
  let base = ours; // safe default — leads to "adopt theirs" or "preserve ours"
  if (snapshotPath) {
    const baseAbs = path.join(snapshotPath, relPath.split('/').join(path.sep));
    if (fs.existsSync(baseAbs)) {
      base = fs.readFileSync(baseAbs, 'utf8');
    }
  }

  const result = mergeLib.merge3({
    base: base,
    ours: ours,
    theirs: theirs,
    path: relPath,
  });

  if (result.status === 'clean') {
    return { action: 'merged_clean', relPath: relPath };
  }
  if (result.status === 'merged') {
    if (!dryRun) {
      fs.mkdirSync(path.dirname(localAbs), { recursive: true });
      fs.writeFileSync(localAbs, result.content, 'utf8');
    }
    return {
      action: 'merged_applied',
      relPath: relPath,
      bytes: result.content ? result.content.length : 0,
    };
  }
  // conflict path — write .ours and .theirs sidecars (never on dry-run).
  const oursPath = localAbs + '.ours';
  const theirsPath = localAbs + '.theirs';
  if (!dryRun) {
    fs.mkdirSync(path.dirname(localAbs), { recursive: true });
    // Preserve the local file as-is (preserve-ours fallback in merge3).
    fs.writeFileSync(
      oursPath,
      mergeLib.MERGE_LABEL_OURS + '\n' + ours,
      'utf8'
    );
    fs.writeFileSync(
      theirsPath,
      mergeLib.MERGE_LABEL_THEIRS + '\n' + theirs,
      'utf8'
    );
  }
  return {
    action: 'conflict',
    relPath: relPath,
    oursPath: relPosix(path.relative(pr, oursPath)),
    theirsPath: relPosix(path.relative(pr, theirsPath)),
  };
}

// -- Three-block summary (pt-BR; NFR-104) ----------------------------------

function emitUpdateSummary(summary) {
  const lines = [];
  lines.push('');
  lines.push('=== Resumo do kaizen update ===');
  if (summary.dryRun) {
    lines.push(
      '(modo --dry-run: nenhum arquivo foi escrito; a previa abaixo descreve o que aconteceria)'
    );
  }
  lines.push('De: ' + summary.fromVersion + ' -> Para: ' + summary.toVersion);
  if (summary.snapshotPath) {
    lines.push('Snapshot pre-update: ' + summary.snapshotPath);
  }
  lines.push('');

  // Block A — arquivos atualizados
  lines.push('Bloco A — arquivos atualizados (' + summary.updated.length + '):');
  if (summary.updated.length === 0) {
    lines.push('  (nenhum)');
  } else {
    for (const u of summary.updated) {
      const detail = ' bytes=' + (u.bytesNew || 0);
      lines.push('  - ' + u.relPath + ' [' + (u.layer || 'L?') + ']' + detail);
    }
  }
  lines.push('');

  // Block B — arquivos preservados
  lines.push(
    'Bloco B — arquivos preservados (' + summary.preserved.length + '):'
  );
  if (summary.preserved.length === 0) {
    lines.push('  (nenhum)');
  } else {
    for (const p of summary.preserved) {
      lines.push('  - ' + p.relPath + ' — razao: ' + p.reason);
    }
  }
  lines.push('');

  // Block C — conflitos L3
  lines.push('Bloco C — conflitos L3 (' + summary.conflicts.length + '):');
  if (summary.conflicts.length === 0) {
    lines.push('  (nenhum)');
  } else {
    for (const c of summary.conflicts) {
      lines.push(
        '  - ' +
          c.relPath +
          '\n      .ours:   ' +
          c.oursPath +
          '\n      .theirs: ' +
          c.theirsPath
      );
    }
    lines.push('');
    lines.push(
      'Para resolver: edite o arquivo original ate ficar como voce quer,'
    );
    lines.push(
      'apague os arquivos .ours e .theirs, e rode `kaizen update --continue`.'
    );
  }
  lines.push('');

  // Footer summary line
  if (summary.conflicts.length > 0) {
    lines.push(
      'Resultado: ' +
        summary.updated.length +
        ' atualizado(s), ' +
        summary.preserved.length +
        ' preservado(s), ' +
        summary.conflicts.length +
        ' conflito(s) — update interrompido.'
    );
  } else if (summary.dryRun) {
    lines.push(
      'Resultado (dry-run): ' +
        summary.updated.length +
        ' atualizado(s), ' +
        summary.preserved.length +
        ' preservado(s), 0 conflito(s).'
    );
  } else {
    lines.push(
      'Resultado: ' +
        summary.updated.length +
        ' atualizado(s), ' +
        summary.preserved.length +
        ' preservado(s), 0 conflito(s) — update concluido.'
    );
  }

  process.stdout.write(lines.join('\n') + '\n');
}

// -- Skill resync (Story M8.4) ---------------------------------------------

/**
 * Re-runs registerCellSkills() for all bundled cells after the layered
 * policy completes. Idempotent — unchanged cells produce zero writes.
 * Orphan detection is delegated to the M8.2 helper, which scans
 * `.claude/commands/Kaizen/<Cell>/` and emits a pt-BR WARN per file whose
 * agent is no longer declared in the cell manifest. Orphans are NOT
 * auto-deleted — the expert may have customized them.
 *
 * Skipped on --dry-run. Throws on malformed cell manifest; the caller
 * surfaces a pt-BR error and halts the update.
 *
 * @param {object} ctx
 * @param {string} ctx.root           project root being updated
 * @param {boolean} ctx.dryRun        when true, this function is a no-op
 * @param {object} ctx.logger         the update logger (append/flush)
 * @returns {{
 *   skipped: boolean,
 *   perCell: Array<{ name, entryWritten, specialistsCount,
 *                    atualizadas, preservadas, warnings }>,
 *   warnings: string[],
 * }}
 *
 * @throws {Error} pt-BR-prefixed error when any cell manifest is malformed.
 */
function resyncCellSkills(ctx) {
  const { root, dryRun, logger } = ctx;
  if (dryRun) {
    if (logger) {
      logger.append(
        'skills_skipped_dry_run',
        'resync de skills nao executado em --dry-run.'
      );
    }
    return { skipped: true, perCell: [], warnings: [] };
  }
  let result;
  try {
    result = _registerCellsLib.registerSkillsForCells(root, {
      frameworkRoot: INSTALL_ROOT,
    });
  } catch (err) {
    // Re-throw with pt-BR preamble; caller halts the update.
    const inner = (err && err.message) || String(err);
    const wrapped = new Error(
      'erro ao registrar skills das celulas: ' + inner
    );
    wrapped.cellName = err && err.cellName;
    wrapped.cellRoot = err && err.cellRoot;
    wrapped.cause = err;
    throw wrapped;
  }
  if (logger) {
    for (const entry of result.perCell) {
      logger.append(
        'skills_resynced',
        entry.name +
          ' — atualizadas=' +
          entry.atualizadas +
          ' preservadas=' +
          entry.preservadas +
          ' specialists=' +
          entry.specialistsCount
      );
    }
    for (const w of result.warnings) {
      logger.append('skills_warn', w);
    }
  }
  return { skipped: false, perCell: result.perCell, warnings: result.warnings };
}

/**
 * Append the M8.4 "Skills sincronizadas" section to the update summary
 * already emitted by emitUpdateSummary. Rendered as a top-level block (NOT
 * nested) per story Dev Notes § "M6 NFR-104 summary template".
 *
 * @param {object} skillsResult
 * @param {boolean} dryRun
 */
function emitSkillsSummary(skillsResult, dryRun) {
  const lines = [];
  lines.push('Skills sincronizadas:');
  if (skillsResult.skipped) {
    lines.push(
      '  (modo --dry-run: registro de skills nao executado)'
    );
  } else if (skillsResult.perCell.length === 0) {
    lines.push('  (nenhuma celula bundled detectada)');
  } else {
    for (const entry of skillsResult.perCell) {
      lines.push(
        '  - ' +
          entry.name +
          ' (' +
          entry.atualizadas +
          ' atualizadas, ' +
          entry.preservadas +
          ' preservadas)'
      );
    }
  }
  if (skillsResult.warnings && skillsResult.warnings.length > 0) {
    lines.push('');
    lines.push('Avisos durante registro de skills:');
    for (const w of skillsResult.warnings) {
      lines.push('  - ' + w);
    }
  }
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
  // dryRun parameter retained for future divergence; currently unused.
  void dryRun;
}

// -- Orchestration ---------------------------------------------------------

function runUpdate(args) {
  const opts = parseArgs(args || []);
  if (opts.help) {
    printHelp();
    return 0;
  }

  const root = projectRoot();
  const manifestLib = loadManifestModule(root);
  const snapshotLib = loadSnapshotModule(root);
  const mergeLib = loadMergeModule(root);
  const migrationsLib = loadMigrationsModule(root);

  // Step 0 — handle --continue first.
  if (opts.continue) {
    return runContinue({
      root: root,
      opts: opts,
      manifestLib: manifestLib,
      mergeLib: mergeLib,
    });
  }

  // Step 1 — read local manifest.
  let local = manifestLib.readManifest(root);
  if (!local) {
    process.stderr.write(
      'erro: manifesto local nao encontrado em ' +
        path.join(root, '.kaizen-dvir', 'manifest.json') +
        '.\n' +
        'execute `kaizen init` primeiro para inicializar o projeto.\n'
    );
    return 1;
  }
  const fromVersion = typeof local.version === 'string' ? local.version : '';

  // Step 2 — resolve canonical manifest.
  const canon = manifestLib.resolveCanonicalManifest({
    projectRoot: root,
    canonicalRoot: opts.canonicalRoot || null,
  });
  if (!canon) {
    process.stderr.write(
      'erro: manifesto canonico nao encontrado.\n' +
        'verifique se o pacote @DanYuzo/kaizen-dvir esta instalado em node_modules/\n' +
        'ou exporte KAIZEN_CANONICAL_ROOT apontando para o pacote.\n'
    );
    return 1;
  }
  const toVersion = typeof canon.manifest.version === 'string'
    ? canon.manifest.version
    : '';
  const canonicalRoot = canon.canonicalRoot;

  const logger = makeLogger(root, opts.dryRun);
  logger.append(
    'update_start',
    'kaizen update iniciado: ' + fromVersion + ' -> ' + toVersion +
      (opts.dryRun ? ' (dry-run)' : '')
  );

  // Step 3 — N-1 validation.
  const n1 = migrationsLib.validateN1({
    installed: fromVersion,
    target: toVersion,
  });
  if (!n1.ok) {
    if (n1.reason === 'same_version') {
      // Not an error — emit pt-BR notice and exit 0.
      const msg = migrationsLib.formatN1AbortMessage({
        installed: fromVersion,
        target: toVersion,
        result: n1,
      });
      process.stdout.write(msg);
      logger.append('update_noop', 'versao ja atualizada (' + fromVersion + ').');
      logger.flush();
      return 0;
    }
    const msg = migrationsLib.formatN1AbortMessage({
      installed: fromVersion,
      target: toVersion,
      result: n1,
    });
    process.stderr.write(msg);
    logger.append(
      'update_abort_n1',
      'verificacao N-1 falhou (' + (n1.reason || 'desconhecido') + ').'
    );
    logger.flush();
    return 2;
  }

  // Step 4 — snapshot (skipped on dry-run).
  let snapshotResult = null;
  if (!opts.dryRun) {
    try {
      snapshotResult = snapshotLib.createSnapshot({
        projectRoot: root,
        version: fromVersion,
        timestamp: new Date().toISOString(),
      });
      logger.append(
        'snapshot_created',
        'snapshot pre-update em ' + snapshotResult.snapshotPath
      );
    } catch (err) {
      process.stderr.write(
        'erro: falha ao criar snapshot: ' + (err && err.message ? err.message : String(err)) + '.\n' +
          'update interrompido — nenhum arquivo foi modificado.\n'
      );
      logger.append('snapshot_failed', String(err && err.message ? err.message : err));
      logger.flush();
      return 1;
    }
  } else {
    logger.append('snapshot_skipped_dry_run', 'snapshot nao criado em --dry-run.');
  }

  // Step 5 — migration script (when present).
  if (!opts.dryRun) {
    let migration = null;
    try {
      migration = migrationsLib.loadMigration({
        from: fromVersion,
        to: toVersion,
      });
    } catch (err) {
      process.stderr.write(
        'erro: falha ao carregar script de migracao: ' +
          (err && err.message ? err.message : String(err)) +
          '.\n'
      );
      logger.append('migration_load_failed', String(err && err.message ? err.message : err));
      logger.flush();
      return 1;
    }
    if (migration && typeof migration.forward === 'function') {
      try {
        const migrationLog = function migrationLogger(eventName, message) {
          logger.append('migration:' + eventName, message);
          // Echo migration progress to stdout in pt-BR.
          process.stdout.write('[migracao] ' + message + '\n');
        };
        // Migrations may be declared `async` but the v1.5 baseline migration
        // performs only synchronous fs operations. We surface any thrown
        // error from sync code immediately. For migrations that return a
        // Promise without performing real async I/O, we capture the result
        // and rely on the fact that pure-sync work inside the async function
        // has already executed before the function returns.
        const fwdResult = migration.forward({
          projectRoot: root,
          manifest: local,
          log: migrationLog,
        });
        if (fwdResult && typeof fwdResult.then === 'function') {
          // Capture rejections (sync work inside an async function still
          // surfaces here as a rejected Promise on the next microtask).
          // eslint-disable-next-line promise/catch-or-return -- intentional fire-and-forget; rejects are caught by the .catch()
          fwdResult.catch((e) => {
            // Best-effort log; the orchestrator continues since the
            // sync work has already executed.
            logger.append(
              'migration_async_rejection',
              'rejeicao assincrona ignorada: ' +
                (e && e.message ? e.message : String(e))
            );
          });
        }
      } catch (err) {
        process.stderr.write(
          'erro: migracao ' +
            fromVersion +
            ' -> ' +
            toVersion +
            ' falhou: ' +
            (err && err.message ? err.message : String(err)) +
            '.\n' +
            'snapshot preservado em ' +
            (snapshotResult ? snapshotResult.snapshotPath : '(indisponivel)') +
            '. use `kaizen rollback` se necessario.\n'
        );
        logger.append('migration_forward_failed', String(err && err.message ? err.message : err));
        logger.flush();
        return 1;
      }
    } else {
      logger.append('migration_none', 'sem script de migracao para esta transicao.');
    }
  }

  // Step 6 — layered policy walk.
  const summary = {
    fromVersion: fromVersion,
    toVersion: toVersion,
    dryRun: opts.dryRun,
    snapshotPath: snapshotResult ? snapshotResult.snapshotPath : null,
    updated: [],
    preserved: [],
    conflicts: [],
  };

  const canonicalFiles = canon.manifest.files || {};
  const sortedRels = Object.keys(canonicalFiles).sort();

  for (const rel of sortedRels) {
    const entry = canonicalFiles[rel];
    if (!entry || typeof entry !== 'object') continue;
    const layer = entry.layer || null;
    if (layer === 'L4-readonly') {
      // Never written, no drift surfacing in this story.
      summary.preserved.push({
        relPath: rel,
        reason: 'L4 (read-only) — area do expert',
      });
      logger.append(
        'l4_preserved',
        rel + ' — L4 (intocado).'
      );
      continue;
    }
    if (layer === 'L1' || layer === 'L2') {
      const r = processOverwrite({
        relPath: rel,
        layer: layer,
        canonicalRoot: canonicalRoot,
        projectRoot: root,
        dryRun: opts.dryRun,
      });
      if (r.action === 'memory_md_preserved') {
        summary.preserved.push({
          relPath: r.relPath,
          reason: r.reason,
        });
        logger.append(
          'l2_memory_md_preserved',
          r.relPath + ' — preservado (D-v1.1-09).'
        );
      } else if (r.action === 'identical') {
        // Not user-facing noise — log only.
        logger.append(
          'identical',
          rel + ' (' + layer + ') — identico ao canonico, nada a fazer.'
        );
      } else if (r.action === 'overwrite') {
        summary.updated.push({
          relPath: r.relPath,
          layer: r.layer,
          bytesNew: r.bytesNew,
          bytesOld: r.bytesOld,
        });
        logger.append(
          'overwrite',
          r.relPath + ' (' + r.layer + ') — sobrescrito (' + r.bytesNew + ' bytes).'
        );
      } else if (r.action === 'canonical_missing') {
        logger.append(
          'canonical_missing',
          rel + ' — listado no manifesto canonico mas ausente em disco.'
        );
      }
      continue;
    }
    if (layer === 'L3') {
      const r = processMerge3({
        relPath: rel,
        canonicalRoot: canonicalRoot,
        projectRoot: root,
        snapshotPath: snapshotResult ? snapshotResult.snapshotPath : null,
        dryRun: opts.dryRun,
        mergeLib: mergeLib,
      });
      if (r.action === 'merged_clean') {
        logger.append('l3_clean', rel + ' — merge limpo (sem mudanca).');
      } else if (r.action === 'merged_applied') {
        summary.updated.push({
          relPath: r.relPath,
          layer: 'L3',
          bytesNew: r.bytes,
          bytesOld: 0,
        });
        logger.append(
          'l3_merged',
          r.relPath + ' — merge L3 aplicado (' + r.bytes + ' bytes).'
        );
      } else if (r.action === 'conflict') {
        summary.conflicts.push({
          relPath: r.relPath,
          oursPath: r.oursPath,
          theirsPath: r.theirsPath,
        });
        logger.append(
          'l3_conflict',
          r.relPath +
            ' — conflito; sidecars ' +
            r.oursPath +
            ' e ' +
            r.theirsPath +
            ' criados.'
        );
      } else if (r.action === 'canonical_missing') {
        logger.append(
          'canonical_missing',
          rel + ' (L3) — listado no manifesto canonico mas ausente em disco.'
        );
      }
      continue;
    }
    // Unknown layer — log and skip without writing.
    logger.append(
      'unknown_layer',
      rel + ' — camada "' + (layer || 'null') + '" nao reconhecida; ignorado.'
    );
  }

  // Step 6.5 — Skill resync (Story M8.4).
  // Re-register Claude Code slash skills for every bundled cell so changes
  // to `celula.yaml` between framework versions (new specialist added,
  // specialist removed, slashPrefix changed) propagate to
  // `.claude/commands/Kaizen/*` without requiring a manual `kaizen init`.
  // Runs ONLY when:
  //   - no L3 conflicts (otherwise the update will halt for --continue;
  //     the resync runs in runContinue once conflicts resolve);
  //   - not --dry-run (resyncCellSkills returns { skipped: true } early).
  // Errors halt the update with a pt-BR stderr message.
  let skillsResult = { skipped: opts.dryRun, perCell: [], warnings: [] };
  if (summary.conflicts.length === 0) {
    try {
      skillsResult = resyncCellSkills({
        root: root,
        dryRun: opts.dryRun,
        logger: logger,
      });
    } catch (err) {
      process.stderr.write(
        (err && err.message ? err.message : String(err)) +
          '\nUpdate interrompido para preservar estado consistente. ' +
          "Corrija o manifesto da celula e rode 'kaizen update' novamente.\n"
      );
      logger.append(
        'skills_failed',
        String(err && err.message ? err.message : err)
      );
      logger.flush();
      return 1;
    }
  }

  // Step 7 — refresh local manifest (skipped on dry-run AND on conflict halt).
  if (!opts.dryRun && summary.conflicts.length === 0) {
    const refreshed = {
      version: toVersion,
      generatedAt: new Date().toISOString(),
      generator: 'kaizen-update@1',
      files: {},
    };
    // Re-hash only the canonical files we are responsible for. Use sha256
    // via manifest.computeFileEntry; for files we did not write (identical,
    // memory-md preserved, L4) we still record them so the local manifest
    // reflects the current layered state.
    for (const rel of sortedRels) {
      const entry = canonicalFiles[rel] || {};
      const layer = entry.layer || null;
      const localAbs = absInProject(root, rel);
      if (fs.existsSync(localAbs)) {
        try {
          refreshed.files[rel] = manifestLib.computeFileEntry(localAbs, layer);
        } catch (_) {
          refreshed.files[rel] = {
            hash: entry.hash || 'sha256:0',
            layer: layer,
            size: entry.size || 0,
          };
        }
      } else {
        // File doesn't exist locally — record canonical reference so the
        // manifest stays a complete inventory. Layer preserved.
        refreshed.files[rel] = {
          hash: entry.hash || 'sha256:0',
          layer: layer,
          size: entry.size || 0,
        };
      }
    }
    manifestLib.writeManifest(root, refreshed);
    logger.append(
      'manifest_refreshed',
      'manifesto local atualizado para ' + toVersion + ' com ' +
        Object.keys(refreshed.files).length + ' entrada(s).'
    );
  } else if (opts.dryRun) {
    logger.append('manifest_skip_dry_run', 'manifesto local nao atualizado em --dry-run.');
  } else if (summary.conflicts.length > 0) {
    // Persist update-state for --continue.
    writeUpdateState(root, {
      schema: 'kaizen-update-state@1',
      createdAt: new Date().toISOString(),
      fromVersion: fromVersion,
      toVersion: toVersion,
      snapshotPath: snapshotResult ? snapshotResult.snapshotPath : null,
      conflicts: summary.conflicts.slice(),
      canonicalRoot: canonicalRoot,
    });
    logger.append(
      'update_state_written',
      'estado de update salvo em ' + UPDATE_STATE_REL + ' para suportar --continue.'
    );
  }

  // Step 8 — emit pt-BR three-block summary.
  emitUpdateSummary(summary);
  // Story M8.4: emit "Skills sincronizadas" block after the three-block
  // summary. Always rendered (even on conflict halt) so the expert sees
  // what happened with skill registration when relevant.
  emitSkillsSummary(skillsResult, opts.dryRun);

  const logPath = logger.flush();
  if (logPath) {
    process.stdout.write('Log estruturado: ' + path.relative(root, logPath) + '\n');
  }

  if (summary.conflicts.length > 0) {
    return 3; // conflict halt
  }
  return 0;
}

/**
 * runContinue — re-attempt previously conflicted L3 files.
 *
 * Reads .kaizen/update-state.json. For each conflict, re-runs merge3 with
 * the current local content (assuming the expert resolved it) and the
 * canonical content. If the file still conflicts, the state file remains in
 * place and the orchestrator halts again.
 */
function runContinue(ctx) {
  const { root, opts, manifestLib, mergeLib } = ctx;
  const state = readUpdateState(root);
  if (!state) {
    process.stderr.write(
      'erro: nenhum update em andamento detectado.\n' +
        'arquivo ' + UPDATE_STATE_REL + ' nao encontrado.\n' +
        'rode `kaizen update` (sem --continue) para iniciar um novo update.\n'
    );
    return 1;
  }
  const canonicalRoot = state.canonicalRoot;
  if (!canonicalRoot || !fs.existsSync(canonicalRoot)) {
    process.stderr.write(
      'erro: pacote canonico ' + canonicalRoot + ' nao acessivel.\n' +
        'reinstale @DanYuzo/kaizen-dvir e rode `kaizen update` novamente.\n'
    );
    return 1;
  }

  const logger = makeLogger(root, opts.dryRun);
  logger.append(
    'continue_start',
    'kaizen update --continue para ' + (state.conflicts || []).length + ' conflito(s).'
  );

  // Re-resolve canonical for hash refresh later.
  const canon = manifestLib.resolveCanonicalManifest({
    projectRoot: root,
    canonicalRoot: canonicalRoot,
  });
  if (!canon) {
    process.stderr.write(
      'erro: manifesto canonico nao encontrado em ' + canonicalRoot + '.\n'
    );
    logger.flush();
    return 1;
  }

  const remaining = [];
  const resolved = [];
  for (const conflict of state.conflicts || []) {
    const rel = conflict.relPath;
    const localAbs = absInProject(root, rel);
    const oursAbs = absInProject(root, conflict.oursPath);
    const theirsAbs = absInProject(root, conflict.theirsPath);

    // The expert's "done" signal is removing the .ours and .theirs sidecars.
    // While they still exist, we treat the conflict as unresolved.
    const stillHasSidecars =
      fs.existsSync(oursAbs) || fs.existsSync(theirsAbs);
    if (stillHasSidecars && !opts.force) {
      logger.append(
        'continue_pending',
        rel + ' — sidecars ainda presentes; conflito nao resolvido.'
      );
      remaining.push(conflict);
      continue;
    }

    // Re-attempt: try a fresh merge with current local content (which the
    // expert just edited) against canonical. If they're now equal, accept.
    // If they merge cleanly, accept. If they still conflict, keep in remaining.
    const canonAbs = absInCanonical(canonicalRoot, rel);
    if (!fs.existsSync(canonAbs)) {
      logger.append(
        'continue_canonical_missing',
        rel + ' — canonico ausente; ignorado.'
      );
      continue;
    }
    const theirs = fs.readFileSync(canonAbs, 'utf8');
    const ours = fs.existsSync(localAbs)
      ? fs.readFileSync(localAbs, 'utf8')
      : '';
    const result = mergeLib.merge3({
      base: ours, // approximate base — ours is the resolved state
      ours: ours,
      theirs: theirs,
      path: rel,
    });
    if (result.status === 'clean' || result.status === 'merged') {
      // Accept the local file as-is when status is clean (ours == theirs)
      // or when merge3 produced a clean merge string.
      if (result.status === 'merged' && !opts.dryRun && result.content !== ours) {
        fs.writeFileSync(localAbs, result.content, 'utf8');
      }
      resolved.push({ relPath: rel });
      logger.append('continue_resolved', rel + ' — resolvido.');
    } else {
      logger.append(
        'continue_still_conflict',
        rel + ' — ainda em conflito apos --continue.'
      );
      remaining.push(conflict);
    }
  }

  // Render summary
  process.stdout.write('\n=== kaizen update --continue ===\n');
  process.stdout.write('Resolvidos: ' + resolved.length + '\n');
  for (const r of resolved) {
    process.stdout.write('  - ' + r.relPath + '\n');
  }
  process.stdout.write('Pendentes: ' + remaining.length + '\n');
  for (const r of remaining) {
    process.stdout.write('  - ' + r.relPath + '\n');
  }

  if (remaining.length > 0) {
    // Persist updated state with only the remaining conflicts.
    writeUpdateState(root, Object.assign({}, state, { conflicts: remaining }));
    process.stdout.write(
      '\nResolva os arquivos restantes (apague .ours e .theirs)' +
        ' e rode `kaizen update --continue` de novo.\n'
    );
    logger.flush();
    return 3;
  }

  // All resolved — refresh local manifest to target version and clear state.
  const refreshed = {
    version: state.toVersion,
    generatedAt: new Date().toISOString(),
    generator: 'kaizen-update@1',
    files: {},
  };
  const canonicalFiles = canon.manifest.files || {};
  for (const rel of Object.keys(canonicalFiles).sort()) {
    const entry = canonicalFiles[rel] || {};
    const layer = entry.layer || null;
    const localAbs = absInProject(root, rel);
    if (fs.existsSync(localAbs)) {
      try {
        refreshed.files[rel] = manifestLib.computeFileEntry(localAbs, layer);
      } catch (_) {
        refreshed.files[rel] = {
          hash: entry.hash || 'sha256:0',
          layer: layer,
          size: entry.size || 0,
        };
      }
    } else {
      refreshed.files[rel] = {
        hash: entry.hash || 'sha256:0',
        layer: layer,
        size: entry.size || 0,
      };
    }
  }
  if (!opts.dryRun) {
    manifestLib.writeManifest(root, refreshed);
    clearUpdateState(root);
  }

  // Story M8.4: skill resync runs on the --continue success path too, so
  // the expert never has to re-run `kaizen init` after resolving conflicts.
  // Idempotent — unchanged cells produce zero writes.
  let skillsResult = { skipped: opts.dryRun, perCell: [], warnings: [] };
  try {
    skillsResult = resyncCellSkills({
      root: root,
      dryRun: opts.dryRun,
      logger: logger,
    });
  } catch (err) {
    process.stderr.write(
      (err && err.message ? err.message : String(err)) +
        '\nResync de skills falhou apos --continue. Corrija o manifesto da' +
        " celula e rode 'kaizen update --continue' novamente.\n"
    );
    logger.append(
      'continue_skills_failed',
      String(err && err.message ? err.message : err)
    );
    logger.flush();
    return 1;
  }

  process.stdout.write(
    '\nUpdate finalizado: ' +
      state.fromVersion +
      ' -> ' +
      state.toVersion +
      '. Manifesto atualizado.\n'
  );
  emitSkillsSummary(skillsResult, opts.dryRun);
  logger.append(
    'continue_complete',
    'todos os conflitos resolvidos; manifesto atualizado para ' +
      state.toVersion +
      '.'
  );
  logger.flush();
  return 0;
}

// -- Module exports --------------------------------------------------------

module.exports = {
  runUpdate: runUpdate,
  parseArgs: parseArgs,
  emitUpdateSummary: emitUpdateSummary,
  emitSkillsSummary: emitSkillsSummary,
  resyncCellSkills: resyncCellSkills,
  isMemoryMdException: isMemoryMdException,
  HELP_TEXT_PT_BR: HELP_TEXT_PT_BR,
  UPDATE_STATE_REL: UPDATE_STATE_REL,
};

if (require.main === module) {
  const exitCode = runUpdate(process.argv.slice(2));
  process.exit(exitCode);
}

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M8.4: wired `kaizen update` to call
//   registerSkillsForCells() (shared helper at bin/lib/register-cells.js)
//   AFTER the layered policy step completes and BEFORE the manifest refresh,
//   so changes to bundled `celula.yaml` files (new specialist added,
//   specialist removed, slashPrefix changed) propagate to
//   `.claude/commands/Kaizen/*` without requiring a manual `kaizen init`.
//   Skipped on --dry-run; run on the --continue success path so the expert
//   never has to re-run init after resolving conflicts. Skipped when the
//   layered walk produced L3 conflicts (deferred to --continue). Helper
//   throws on malformed cell manifest -> update halts with pt-BR stderr +
//   "Update interrompido" guard. Helper warnings (orphan skill detection
//   from M8.2) are aggregated and surfaced in pt-BR under the new "Skills
//   sincronizadas" / "Avisos durante registro de skills" sections appended
//   to the M6 three-block summary. Orphans are NEVER auto-deleted (preserves
//   expert customization per story Dev Notes). New module exports:
//   resyncCellSkills, emitSkillsSummary. No new external dependencies; init
//   refactored in tandem to delegate to the same shared helper (single
//   source of truth — Constitution Art. VII).
// 2026-04-25 — @dev (Dex) — M6.2: initial implementation of `kaizen update`.
//   Orchestrates manifest.js / migrations.js / snapshot.js / merge.js into
//   the layered policy flow (L1 overwrite, L2 overwrite + MEMORY.md
//   preservation, L3 3-way merge, L4 untouched). Supports --dry-run and
//   --continue. State persisted at .kaizen/update-state.json. Structured
//   logs at .kaizen/logs/updates/{ISO-timestamp}.log. All expert-facing
//   strings pt-BR per Commandment IV / D-v1.4-06; structured event names EN.
//   Stdlib only (CON-003), CommonJS (CON-002).
