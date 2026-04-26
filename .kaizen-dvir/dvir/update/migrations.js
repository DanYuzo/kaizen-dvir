'use strict';

/*
 * migrations.js — KaiZen v1.5 / Story M6.5
 *
 * Purpose
 * -------
 * Loader and runtime contract for versioned migration scripts. Each minor
 * release that changes the structural shape of any framework artifact ships
 * exactly one migration script under `.kaizen-dvir/dvir/migrations/` named
 * `v{from}-to-v{to}.js` (e.g., `v1.4-to-v1.5.js`). The loader resolves the
 * script for a given (from, to) version pair and returns it for the
 * `kaizen update` engine (M6.2) to invoke between snapshot creation and
 * manifest refresh.
 *
 * Migration script contract (English machine doc — public API)
 * ------------------------------------------------------------
 *
 *   module.exports = {
 *     from: "1.4.0",
 *     to: "1.5.0",
 *     description: "...",          // one-line EN summary
 *     forward: async ({ projectRoot, manifest, log }) => { ... },
 *     // reverse: async (...) => {} // optional — CON-009 ("when feasible")
 *   };
 *
 * Argument shape passed to `forward`:
 *   - projectRoot — absolute path to the expert's project root.
 *   - manifest    — parsed local manifest JSON object (mutable copy);
 *                   migrations may rewrite `manifest.files[*].layer` etc.
 *                   The caller (M6.2) is responsible for persisting the
 *                   updated manifest after `forward` returns.
 *   - log         — function(eventName, message). `eventName` is an English
 *                   structured key for the update log file; `message` is
 *                   pt-BR for terminal display (per Language Policy / D-v1.4-06).
 *                   `log` MUST be safe to call any number of times and MUST
 *                   never throw.
 *
 * Idempotency
 * -----------
 * Every migration is idempotent: running `forward` twice produces the same
 * final state. Each operation inside `forward` uses detect-and-skip:
 *   - read current state
 *   - compare to target state
 *   - skip the write if already equivalent
 *
 * N-1 validation
 * --------------
 * Per CON-010, KaiZen v1.5 supports backward compatibility N-1 only. The
 * caller MUST invoke `validateN1({ installed, target })` BEFORE creating
 * a snapshot, so an aborted upgrade does not leave a useless snapshot
 * directory behind. This module exposes the helper here (rather than in
 * the migration script itself) because the check applies to every update
 * regardless of whether a migration script exists for the version pair.
 *
 * Design principles
 * -----------------
 * - Stdlib only (CON-003): uses `fs` and `path` from Node.js stdlib.
 * - Pure I/O surface for the loader: `loadMigration` does not log or
 *   mutate state; it returns the migration module or null.
 * - The N-1 helper is also pure (string in, struct out) so M6.2 can
 *   compose its own pt-BR terminal output without duplicating logic.
 *
 * Public API
 * ----------
 *   loadMigration({ from, to }) -> migrationModule | null
 *   validateN1({ installed, target }) -> { ok: boolean, ... }
 *   parseMinor(version) -> number | null
 *   migrationScriptPath({ from, to }) -> string
 *
 * Consumers
 * ---------
 *   - bin/kaizen-update.js (M6.2) — invokes both `validateN1` (before
 *     snapshot) and `loadMigration` + `forward` (after snapshot, before
 *     manifest refresh).
 *
 * Integration order with M6.4 / M6.2
 * ----------------------------------
 *   1. Read installed + target version.
 *   2. validateN1 → abort with pt-BR message if not satisfied.
 *   3. createSnapshot (M6.4) — must succeed before any mutation.
 *   4. loadMigration({ from, to }) → migrationModule | null.
 *   5. If module is non-null: await migrationModule.forward({ projectRoot, manifest, log }).
 *   6. Apply L1/L2/L3 layered policy (M6.2).
 *   7. Refresh local manifest.
 */

const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIRNAME = path.join('.kaizen-dvir', 'dvir', 'migrations');

/**
 * Convert a SemVer-ish version string like "1.4.0" or "1.5.0-rc.0" into the
 * minor component as a number. Returns null when the input is not a string
 * or does not start with `MAJOR.MINOR`.
 */
function parseMinor(version) {
  if (typeof version !== 'string' || version.length === 0) return null;
  const match = /^\s*(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return parseInt(match[2], 10);
}

/**
 * Convert a SemVer-ish version string into the major component as a number.
 * Returns null on parse failure.
 */
function parseMajor(version) {
  if (typeof version !== 'string' || version.length === 0) return null;
  const match = /^\s*(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Convert a version like "1.4.0" or "1.4.0-rc.1" into the short minor pair
 * "1.4" used in the migration script naming convention. Returns null when
 * the input cannot be parsed.
 */
function shortMinor(version) {
  const major = parseMajor(version);
  const minor = parseMinor(version);
  if (major === null || minor === null) return null;
  return major + '.' + minor;
}

/**
 * Compute the absolute path of the migration script for a given (from, to)
 * pair. Caller may pass either the short form ("1.4") or the full version
 * string ("1.4.0").
 */
function migrationScriptPath(opts) {
  opts = opts || {};
  const fromShort = shortMinor(opts.from) || opts.from;
  const toShort = shortMinor(opts.to) || opts.to;
  if (typeof fromShort !== 'string' || typeof toShort !== 'string') {
    throw new Error('migrationScriptPath: from and to are required');
  }
  const filename = 'v' + fromShort + '-to-v' + toShort + '.js';
  // The migrations directory is a sibling of `update/` under
  // `.kaizen-dvir/dvir/`. Resolve relative to this file so the loader
  // works whether the framework is installed under node_modules or run
  // directly from a source checkout.
  return path.resolve(__dirname, '..', 'migrations', filename);
}

/**
 * loadMigration — return the migration module for the requested version
 * pair, or null when no script exists. Never throws on missing file.
 *
 * Throws only when the script exists but fails to load (syntax error,
 * malformed export shape) — the caller surfaces such errors as pt-BR
 * messages via the `log` helper.
 */
function loadMigration(opts) {
  opts = opts || {};
  if (typeof opts.from !== 'string' || typeof opts.to !== 'string') {
    throw new Error('loadMigration: from and to are required');
  }
  const scriptPath = migrationScriptPath(opts);
  if (!fs.existsSync(scriptPath)) {
    return null;
  }
  // Allow re-loading during test runs that swap fixture content.
  delete require.cache[require.resolve(scriptPath)];
  const mod = require(scriptPath);
  if (!mod || typeof mod.forward !== 'function') {
    throw new Error(
      'loadMigration: migration at ' + scriptPath + ' missing required `forward` function'
    );
  }
  return mod;
}

/**
 * validateN1 — pure check that `target` is exactly the minor immediately
 * following `installed` within the same major version. CON-010.
 *
 * Returns:
 *   {
 *     ok: boolean,
 *     installedMinor: number | null,
 *     targetMinor: number | null,
 *     installedMajor: number | null,
 *     targetMajor: number | null,
 *     reason?: 'same_version' | 'downgrade' | 'jump' | 'major_change' | 'invalid'
 *   }
 *
 * The caller (M6.2) maps `reason` to a pt-BR terminal message. Keeping this
 * function pure (no I/O, no console output) lets tests assert the gate's
 * decision without intercepting stdout.
 */
function validateN1(opts) {
  opts = opts || {};
  const installedMinor = parseMinor(opts.installed);
  const targetMinor = parseMinor(opts.target);
  const installedMajor = parseMajor(opts.installed);
  const targetMajor = parseMajor(opts.target);

  if (
    installedMinor === null ||
    targetMinor === null ||
    installedMajor === null ||
    targetMajor === null
  ) {
    return {
      ok: false,
      installedMinor: installedMinor,
      targetMinor: targetMinor,
      installedMajor: installedMajor,
      targetMajor: targetMajor,
      reason: 'invalid',
    };
  }

  if (installedMajor !== targetMajor) {
    return {
      ok: false,
      installedMinor: installedMinor,
      targetMinor: targetMinor,
      installedMajor: installedMajor,
      targetMajor: targetMajor,
      reason: 'major_change',
    };
  }

  if (installedMinor === targetMinor) {
    return {
      ok: false,
      installedMinor: installedMinor,
      targetMinor: targetMinor,
      installedMajor: installedMajor,
      targetMajor: targetMajor,
      reason: 'same_version',
    };
  }

  if (targetMinor < installedMinor) {
    return {
      ok: false,
      installedMinor: installedMinor,
      targetMinor: targetMinor,
      installedMajor: installedMajor,
      targetMajor: targetMajor,
      reason: 'downgrade',
    };
  }

  if (targetMinor - installedMinor !== 1) {
    return {
      ok: false,
      installedMinor: installedMinor,
      targetMinor: targetMinor,
      installedMajor: installedMajor,
      targetMajor: targetMajor,
      reason: 'jump',
    };
  }

  return {
    ok: true,
    installedMinor: installedMinor,
    targetMinor: targetMinor,
    installedMajor: installedMajor,
    targetMajor: targetMajor,
  };
}

/**
 * formatN1AbortMessage — render the canonical pt-BR abort message for an
 * N-1 violation. Exposed so M6.2 and tests share a single source of truth
 * for the user-facing string. The caller writes the result to stderr and
 * exits non-zero.
 *
 * The message follows the actionable pattern required by NFR-101:
 *   - States the violation in one sentence.
 *   - Lists the intermediate version(s) the expert must install first.
 *   - Suggests the recovery path (`kaizen update` step-wise).
 */
function formatN1AbortMessage(opts) {
  opts = opts || {};
  const result = opts.result || validateN1(opts);
  const installed = opts.installed || '';
  const target = opts.target || '';

  if (result.reason === 'invalid') {
    return (
      'erro: nao foi possivel determinar versoes para a verificacao N-1.\n' +
      '  Instalada: "' + installed + '"\n' +
      '  Alvo:      "' + target + '"\n' +
      'Verifique .kaizen-dvir/manifest.json e o package.json do framework.\n'
    );
  }

  if (result.reason === 'major_change') {
    return (
      'erro: mudanca de versao MAJOR nao e suportada por kaizen update.\n' +
      '  Instalada: ' + installed + '\n' +
      '  Alvo:      ' + target + '\n' +
      'Migracoes cross-major (ex.: 1.x -> 2.0) sao tratadas fora do kaizen update.\n' +
      'Consulte o release note do alvo antes de prosseguir.\n'
    );
  }

  if (result.reason === 'same_version') {
    return (
      'aviso: a versao instalada (' + installed + ') ja e igual ao alvo (' + target + ').\n' +
      'Nada a atualizar. kaizen update encerrado sem mudancas.\n'
    );
  }

  if (result.reason === 'downgrade') {
    return (
      'erro: kaizen update nao realiza downgrade.\n' +
      '  Instalada: ' + installed + '\n' +
      '  Alvo:      ' + target + '\n' +
      'Para reverter para uma versao anterior, use kaizen rollback (M6.4).\n'
    );
  }

  if (result.reason === 'jump') {
    const intermediates = [];
    const major = result.installedMajor;
    for (let m = result.installedMinor + 1; m < result.targetMinor; m++) {
      intermediates.push(major + '.' + m + '.0');
    }
    const stepList =
      intermediates.length > 0
        ? '  Versoes intermediarias necessarias: ' + intermediates.join(', ') + '\n'
        : '';
    return (
      'erro: kaizen update suporta apenas saltos de uma versao minor por vez (N-1).\n' +
      '  Instalada: ' + installed + '\n' +
      '  Alvo:      ' + target + '\n' +
      stepList +
      'Atualize uma minor de cada vez:\n' +
      '  1. Instale a proxima versao minor (ex.: ' +
      result.installedMajor + '.' + (result.installedMinor + 1) + '.0).\n' +
      '  2. Rode kaizen update para aplicar a migracao incremental.\n' +
      '  3. Repita ate alcancar ' + target + '.\n'
    );
  }

  // Defensive — should be unreachable given the reason set above.
  return (
    'erro: verificacao N-1 falhou por motivo desconhecido (' + result.reason + ').\n'
  );
}

module.exports = {
  // Public API (story M6.5 contract — consumed by M6.2)
  loadMigration: loadMigration,
  validateN1: validateN1,
  formatN1AbortMessage: formatN1AbortMessage,
  // Helpers exposed for tests and the M6.2 integration
  parseMinor: parseMinor,
  parseMajor: parseMajor,
  shortMinor: shortMinor,
  migrationScriptPath: migrationScriptPath,
  // Constants (read-only)
  MIGRATIONS_DIRNAME: MIGRATIONS_DIRNAME,
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M6.5: initial implementation of the migration
//   loader and N-1 validation gate. loadMigration resolves migration scripts
//   at .kaizen-dvir/dvir/migrations/v{from}-to-v{to}.js and returns null
//   when no script exists. validateN1 implements CON-010 (single-step minor
//   upgrades only). formatN1AbortMessage renders the canonical pt-BR abort
//   message used by `kaizen update` (M6.2). Stdlib only (CON-003).
