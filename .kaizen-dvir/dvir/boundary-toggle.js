'use strict';

/**
 * dvir/boundary-toggle.js — path (a) realization of boundary.frameworkProtection.
 *
 * Scope (M1.4, CON-003 — stdlib only):
 *   Deterministic rewrite of .claude/settings.json based on the current value
 *   of `boundary.frameworkProtection` in dvir-config.yaml.
 *
 *   - flag === true  → ensure L1/L2 deny entries are present (idempotent)
 *   - flag === false → produce a variant with L1/L2 deny entries REMOVED
 *                      (L2 MEMORY allow, L3 allow, L4 allow all stay put)
 *
 * By default this function is side-effect free: it returns the resulting
 * settings.json object so the caller (kaizen doctor, tests, M2 hook wiring)
 * can inspect or persist it. Pass { write: true } to atomically write via
 * temp-file + rename.
 *
 * Full invocation wiring (kaizen doctor → applyBoundaryToggle({ write: true }))
 * lands in M2. M1.4 delivers only the stub + the documented contract.
 */

const fs = require('node:fs');
const path = require('node:path');

const { getBoundaryFlag } = require('./config-loader');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SETTINGS_PATH = path.join(REPO_ROOT, '.claude', 'settings.json');
const RELATIVE_SETTINGS_PATH = '.claude/settings.json';

// L1/L2 deny patterns that the toggle manages.
// Kept in sync with .claude/settings.json and .claude/README.md.
const L1_L2_DENY_PATTERNS = [
  'Write(.kaizen-dvir/dvir/**)',
  'Write(.kaizen-dvir/commandments.md)',
  'Write(bin/**)',
  'Write(.kaizen-dvir/instructions/**)',
  'Write(.kaizen-dvir/infra/**)',
  'Edit(.kaizen-dvir/dvir/**)',
  'Edit(.kaizen-dvir/commandments.md)',
  'Edit(bin/**)',
  'Edit(.kaizen-dvir/instructions/**)',
  'Edit(.kaizen-dvir/infra/**)',
];

/**
 * Public API — compute the settings.json contents that correspond to the
 * current value of boundary.frameworkProtection. Optionally persists.
 *
 * @param {object} [options]
 * @param {boolean} [options.write=false] — when true, writes the result back
 *   to .claude/settings.json via temp-file + rename (atomic).
 * @returns {object} resulting settings.json object
 */
function applyBoundaryToggle(options) {
  const opts = options || {};
  const flag = getBoundaryFlag();
  const current = readSettings();

  const next = rewriteSettings(current, flag);

  if (opts.write === true) {
    writeSettingsAtomic(next);
  }

  return next;
}

/**
 * Read the current .claude/settings.json. Throws a pt-BR error if missing.
 */
function readSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) {
    throw new Error(
      "Arquivo " +
        RELATIVE_SETTINGS_PATH +
        " não encontrado. Rode 'kaizen init' ou recrie o esqueleto de M1.4."
    );
  }
  const raw = fs.readFileSync(SETTINGS_PATH, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      'Erro ao ler ' +
        RELATIVE_SETTINGS_PATH +
        ': JSON inválido (' +
        msg +
        '). Verifique a sintaxe do arquivo.'
    );
  }
}

/**
 * Produce a new settings object based on the flag.
 *   flag === true  → ensure L1/L2 deny patterns are present (dedup preserved)
 *   flag === false → remove L1/L2 deny patterns from the deny list
 * Always preserves unrelated deny/allow entries.
 */
function rewriteSettings(current, flag) {
  const base = current && typeof current === 'object' ? current : {};
  const permissions =
    base.permissions && typeof base.permissions === 'object'
      ? base.permissions
      : {};

  const existingDeny = Array.isArray(permissions.deny) ? permissions.deny : [];
  const existingAllow = Array.isArray(permissions.allow)
    ? permissions.allow
    : [];

  const managed = new Set(L1_L2_DENY_PATTERNS);

  let nextDeny;
  if (flag === true) {
    // Keep all non-managed entries, then append managed ones not yet present.
    const nonManaged = existingDeny.filter((p) => !managed.has(p));
    const present = new Set(existingDeny);
    const managedToAdd = L1_L2_DENY_PATTERNS.filter((p) => !present.has(p));
    nextDeny = nonManaged
      .concat(existingDeny.filter((p) => managed.has(p)))
      .concat(managedToAdd);
    // Preserve order stability: start from current, append missing managed.
    nextDeny = dedupePreserveOrder(existingDeny.concat(managedToAdd));
  } else {
    // flag === false → strip managed entries.
    nextDeny = existingDeny.filter((p) => !managed.has(p));
  }

  return Object.assign({}, base, {
    permissions: Object.assign({}, permissions, {
      deny: nextDeny,
      allow: existingAllow.slice(),
    }),
  });
}

function dedupePreserveOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

/**
 * Atomic write: write to a temp sibling file then rename over the target.
 * Guarded behind { write: true } to keep M1.4 side-effect free by default.
 */
function writeSettingsAtomic(obj) {
  const json = JSON.stringify(obj, null, 2) + '\n';
  const dir = path.dirname(SETTINGS_PATH);
  const tmp = path.join(dir, '.settings.json.tmp-' + process.pid);
  fs.writeFileSync(tmp, json, 'utf8');
  fs.renameSync(tmp, SETTINGS_PATH);
}

module.exports = {
  applyBoundaryToggle,
  // Exposed for tests (not part of the stable public API):
  rewriteSettings,
  L1_L2_DENY_PATTERNS,
};
