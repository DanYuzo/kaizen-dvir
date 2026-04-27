#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INSTALL_ROOT = path.resolve(__dirname, '..');

// CLAUDE.md scaffold body (M7.2). Authored as a separate module so the same
// bytes feed both the init wiring and the M6.5 cross-milestone migration
// path. See bin/lib/claude-md-scaffold.js for delimiter contract notes.
const { CLAUDE_MD_SCAFFOLD } = require('./lib/claude-md-scaffold.js');

// Rule template seeds (M7.1). Source bodies live at
// `.kaizen-dvir/instructions/templates/rules/{name}.md` (L2 — shipped via the
// package `files` whitelist). Init copies them into `.claude/rules/` (L3 —
// expert-mutable) so the expert can edit local copies without touching L2.
// Reading from disk at runtime keeps a single source of truth and avoids
// duplicating ~28 KB of pt-BR rule prose inside this CLI entry point.
const RULE_SEED_NAMES = [
  'boundary',
  'cells',
  'yotzer',
  'doctor',
  'language-policy',
  'commit-conventions',
];

function readRuleSeed(name) {
  const sourceRel = path.join(
    '.kaizen-dvir',
    'instructions',
    'templates',
    'rules',
    name + '.md'
  );
  return fs.readFileSync(path.join(INSTALL_ROOT, sourceRel));
}

// Files copied verbatim from the canonical installation into the target.
// Tuple: [source-relative-to-INSTALL_ROOT, target-relative-to-process.cwd()]
//
// NOTE (v1.7.3): the entire `.kaizen-dvir/dvir/` tree is now copied recursively
// via `RECURSIVE_COPY_DIRS` below — Option A (resolve from node_modules) failed
// in fresh `npx kaizen-dvir@latest init` flows because npx does not populate
// `node_modules/kaizen-dvir/` in the user's project. Option B (copy the tree
// to the target) makes the hooks self-contained post-init.
const COPY_MANIFEST = [
  ['.kaizen-dvir/commandments.md', '.kaizen-dvir/commandments.md'],
  ['.kaizen-dvir/dvir-config.yaml', '.kaizen-dvir/dvir-config.yaml'],
  ['.claude/settings.json', '.claude/settings.json'],
  ['.claude/README.md', '.claude/README.md'],
  // M6.1.2 fix: ship .claude/hooks/ shim scripts referenced by settings.json.
  // Without these, every PreToolUse/UserPromptSubmit/PreCompact event fails
  // with cjs/loader Cannot-find-module errors after `npx kaizen-dvir init`.
  ['.claude/hooks/PreCompact.js', '.claude/hooks/PreCompact.js'],
  ['.claude/hooks/PreToolUse.js', '.claude/hooks/PreToolUse.js'],
  ['.claude/hooks/UserPromptSubmit.js', '.claude/hooks/UserPromptSubmit.js'],
  ['package.json', 'package.json'],
  ['bin/kaizen.js', 'bin/kaizen.js'],
  ['bin/kaizen-init.js', 'bin/kaizen-init.js'],
  // .gitignore is NOT copied — npm excludes .gitignore from tarballs by
  // default (regardless of `files` whitelist), so reading it from
  // INSTALL_ROOT after `npm install` raises ENOENT. M6.1.1 fix: ship the
  // template via INLINE_TEMPLATES instead. See GITIGNORE_SCAFFOLD below.
];

// Recursive directory copies. Each entry is `[sourceRel, targetRel]` (relative
// to INSTALL_ROOT and process.cwd() respectively). The whole subtree is mirrored
// — every file under `sourceRel` is written under `targetRel` preserving
// structure. Idempotent: existing files with identical bytes are left alone;
// existing files with different bytes are PRESERVED (treated as expert forks)
// so `kaizen update` (which knows merge semantics) owns subsequent updates.
//
// v1.7.3 fix: the dvir/ runtime (hooks, gates, doctor, memory, schemas, update,
// migrations, yotzer, cell-registry) is shipped in the npm package via the
// `files` whitelist and now lands inside the target project at init-time. The
// hook shims in `.claude/hooks/*.js` resolve `dvir/hooks/` locally (no
// `require.resolve('kaizen-dvir/...')` fallback needed) — the lookup is now
// always satisfied because init copied the tree.
const RECURSIVE_COPY_DIRS = [
  ['.kaizen-dvir/dvir', '.kaizen-dvir/dvir'],
];

const DIRS_TO_CREATE = [
  '.kaizen-dvir',
  '.kaizen-dvir/dvir',
  '.kaizen-dvir/instructions',
  '.kaizen-dvir/celulas',
  '.kaizen-dvir/celulas/yotzer',
  '.kaizen-dvir/celulas/yotzer/agents',
  '.kaizen-dvir/celulas/yotzer/tasks',
  '.kaizen-dvir/celulas/yotzer/workflows',
  '.kaizen-dvir/celulas/yotzer/templates',
  '.kaizen-dvir/celulas/yotzer/checklists',
  '.kaizen-dvir/celulas/yotzer/kbs',
  '.kaizen-dvir/celulas/yotzer/kbs/yotzer',
  '.kaizen-dvir/infra',
  '.kaizen-dvir/refs',
  '.claude',
  '.claude/hooks',
  '.claude/rules',
  '.claude/commands',
  '.claude/commands/Kaizen',
  '.kaizen',
  'bin',
  'refs',
  'refs/ikigai',
  'refs/ikigai/biblioteca',
];

const GITKEEP_TARGETS = [
  '.kaizen-dvir/instructions/.gitkeep',
  '.kaizen-dvir/celulas/.gitkeep',
  '.kaizen-dvir/infra/.gitkeep',
  '.kaizen-dvir/refs/.gitkeep',
  '.kaizen/.gitkeep',
  'refs/ikigai/biblioteca/.gitkeep',
];

// Inline pt-BR scaffolds (user-facing). See story M1.5 § Dev Notes.
// CLAUDE_MD_SCAFFOLD is sourced from bin/lib/claude-md-scaffold.js (M7.2);
// see top-of-file require for the wiring.
const IKIGAI_SCAFFOLDS = {
  'refs/ikigai/quem-sou.md':
    '# Quem sou\n' +
    '\n' +
    '<!-- Identidade, história, valores, tom de voz. Preencha com suas palavras. -->\n',
  'refs/ikigai/o-que-faco.md':
    '# O que faço\n' +
    '\n' +
    '<!-- Método, teoria, produtos, ofertas. Descreva o seu jeito de fazer. -->\n',
  'refs/ikigai/para-quem.md':
    '# Para quem\n' +
    '\n' +
    '<!-- Persona, dor, desejo, contexto. Seja específico. -->\n',
  'refs/ikigai/como-faco.md':
    '# Como faço\n' +
    '\n' +
    '<!-- Processo, esteira, roteiro, etapas de entrega. -->\n',
};

// Build .claude/rules/*.md entries by reading the L2 seed templates from
// disk at module-load time. The seed files are shipped via the package
// `files` whitelist (.kaizen-dvir/instructions/) and live under INSTALL_ROOT
// in both dev and installed contexts. Reading at module-load (rather than
// embedding the bodies inline) keeps a single source of truth in L2 and
// shrinks the bin/ footprint by ~28 KB. M7.3 § Dev Notes.
const RULE_TEMPLATES = (function buildRuleTemplates() {
  const out = {};
  for (const name of RULE_SEED_NAMES) {
    out['.claude/rules/' + name + '.md'] = readRuleSeed(name);
  }
  return out;
})();

// .gitignore template (M6.1.1). Inlined here because npm hard-excludes
// `.gitignore` from published tarballs (default behavior, not overridable
// via package.json `files`). Source of truth lives here so `npm install`
// receives the bytes inside `bin/kaizen-init.js`.
const GITIGNORE_SCAFFOLD =
  '# KaiZen runtime directory — ephemeral, never committed (CON-004)\n' +
  '# Criado pelo `kaizen init` no workspace do usuário; logs/handoffs lá são\n' +
  '# histórico LOCAL da instância de uso, não do framework. Não distribuir.\n' +
  '.kaizen/\n' +
  '\n' +
  '# Node.js\n' +
  'node_modules/\n' +
  'npm-debug.log*\n' +
  'yarn-debug.log*\n' +
  'yarn-error.log*\n' +
  'pnpm-debug.log*\n' +
  '\n' +
  '# Editor / OS artifacts\n' +
  '.DS_Store\n' +
  'Thumbs.db\n' +
  '.vscode/\n' +
  '.idea/\n' +
  '*.swp\n' +
  '*.swo\n' +
  '*~\n' +
  '\n' +
  '# Build / distribution\n' +
  '*.tarball\n' +
  '*.log\n' +
  'dist/\n';

const INLINE_TEMPLATES = Object.assign(
  {},
  IKIGAI_SCAFFOLDS,
  RULE_TEMPLATES,
  {
    '.claude/CLAUDE.md': CLAUDE_MD_SCAFFOLD,
    '.gitignore': GITIGNORE_SCAFFOLD,
  }
);

function bufferFromContent(content) {
  return Buffer.isBuffer(content) ? content : Buffer.from(content);
}

function readCanonicalCopy(sourceRel) {
  const abs = path.join(INSTALL_ROOT, sourceRel);
  return fs.readFileSync(abs);
}

function plannedWrites() {
  // Returns: [{ targetRel, canonical: Buffer, kind: 'copy' | 'inline' | 'gitkeep' }]
  const out = [];
  for (const [sourceRel, targetRel] of COPY_MANIFEST) {
    out.push({ targetRel, canonical: readCanonicalCopy(sourceRel), kind: 'copy' });
  }
  for (const targetRel of GITKEEP_TARGETS) {
    out.push({ targetRel, canonical: Buffer.alloc(0), kind: 'gitkeep' });
  }
  for (const [targetRel, content] of Object.entries(INLINE_TEMPLATES)) {
    out.push({ targetRel, canonical: bufferFromContent(content), kind: 'inline' });
  }
  return out;
}

function ensureDirs(targetRoot) {
  for (const rel of DIRS_TO_CREATE) {
    fs.mkdirSync(path.join(targetRoot, rel), { recursive: true });
  }
}

// M6.1.3: paths whose published content is a *placeholder* or *user template*.
// When the target already has different bytes here, that means the expert has
// filled it in with their own content — preserve it instead of treating as a
// conflict. Anything NOT listed here is framework-strict (commandments, dvir
// code, hooks, etc.) — different bytes there means the framework is being
// modified locally and we abort to avoid silent breakage.
//
// The matching is exact path or directory-prefix (trailing `/`). This stays
// in sync with INLINE_TEMPLATES + the user-facing slots in COPY_MANIFEST.
const USER_CUSTOMIZABLE_PATHS = new Set([
  // Ikigai placeholders — the expert's identity content
  'refs/ikigai/quem-sou.md',
  'refs/ikigai/o-que-faco.md',
  'refs/ikigai/para-quem.md',
  'refs/ikigai/como-faco.md',
  // Project-level files the expert owns
  'package.json',
  '.gitignore',
  // Configurable surfaces
  '.claude/CLAUDE.md',
  '.claude/settings.json',
  '.kaizen-dvir/dvir-config.yaml',
]);

const USER_CUSTOMIZABLE_PREFIXES = [
  // Rule templates — seeded once, expert edits freely
  '.claude/rules/',
];

function isUserCustomizable(targetRel) {
  if (USER_CUSTOMIZABLE_PATHS.has(targetRel)) return true;
  for (const prefix of USER_CUSTOMIZABLE_PREFIXES) {
    if (targetRel.startsWith(prefix)) return true;
  }
  return false;
}

function diffScan(targetRoot, plan) {
  const conflicts = [];
  const identical = [];
  const missing = [];
  const userPreserved = [];
  for (const item of plan) {
    const abs = path.join(targetRoot, item.targetRel);
    if (!fs.existsSync(abs)) {
      missing.push(item);
      continue;
    }
    const current = fs.readFileSync(abs);
    if (Buffer.compare(current, item.canonical) === 0) {
      identical.push(item);
    } else if (isUserCustomizable(item.targetRel)) {
      userPreserved.push(item);
    } else {
      conflicts.push(item);
    }
  }
  return { conflicts, identical, missing, userPreserved };
}

function formatNotCleanError(conflicts) {
  const lines = conflicts.map((c) => '  - ' + c.targetRel);
  return (
    'Diretório não está limpo para executar \'kaizen init\'.\n' +
    'Os seguintes arquivos já existem com conteúdo customizado e seriam sobrescritos:\n' +
    lines.join('\n') +
    '\n' +
    'Remova ou renomeie esses arquivos e rode \'kaizen init\' novamente.\n'
  );
}

function writeFileAtomic(absPath, canonical) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, canonical);
}

/**
 * Recursively copy a directory tree from `<INSTALL_ROOT>/<srcRel>` into
 * `<targetRoot>/<dstRel>`. Returns counts:
 *   { copied: number, identical: number, preserved: number }
 *
 * Semantics (matches `installYotzer` for consistency):
 *   - Missing target file → write canonical bytes (counts as `copied`).
 *   - Existing target file with identical bytes → no-op (counts as `identical`).
 *   - Existing target file with different bytes → PRESERVE target. Treated
 *     as expert customization; v1.7.3 leaves any local edits alone so
 *     `kaizen update` (M6.x) can resolve via merge semantics. Counts as
 *     `preserved`.
 *
 * Stdlib only (CON-003). v1.7.3.
 */
function copyDirRecursive(srcRel, dstRel, targetRoot) {
  const srcRoot = path.join(INSTALL_ROOT, srcRel);
  const dstRoot = path.join(targetRoot, dstRel);
  const counts = { copied: 0, identical: 0, preserved: 0 };

  if (!fs.existsSync(srcRoot) || !fs.statSync(srcRoot).isDirectory()) {
    return counts;
  }

  const files = walkSourceTree(srcRoot);
  for (const rel of files) {
    const absSrc = path.join(srcRoot, rel);
    const absDst = path.join(dstRoot, rel);
    const srcBuf = fs.readFileSync(absSrc);
    if (fs.existsSync(absDst)) {
      const dstBuf = fs.readFileSync(absDst);
      if (Buffer.compare(srcBuf, dstBuf) === 0) {
        counts.identical++;
      } else {
        counts.preserved++;
      }
      continue;
    }
    fs.mkdirSync(path.dirname(absDst), { recursive: true });
    fs.writeFileSync(absDst, srcBuf);
    counts.copied++;
  }
  return counts;
}

// -- Yotzer auto-install (Story M4.1, FR-002, AC-100) ---------------------
// Copies the Yotzer meta-cell scaffold from the canonical source into the
// target project. Idempotent on re-run. Emits pt-BR warning when the target
// Yotzer manifest `version` is newer than the source. Yotzer ships with its
// runtime KB pre-populated at `.kaizen-dvir/celulas/yotzer/kbs/yotzer/`; the
// regular source-tree copy carries the KB content into the target without a
// separate runtime import from etlmaker (CON-103 — Yotzer is owner runtime).
// CommonJS + stdlib only (CON-002, CON-003). All user-facing strings pt-BR.

const YOTZER_SOURCE_REL = '.kaizen-dvir/celulas/yotzer';
const YOTZER_TARGET_REL = '.kaizen-dvir/celulas/yotzer';

function readFileSafe(abs) {
  try {
    return fs.readFileSync(abs);
  } catch (_) {
    return null;
  }
}

function parseVersionFromManifest(abs) {
  const buf = readFileSafe(abs);
  if (!buf) return null;
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = /^\s*version\s*:\s*"?([^"\s#]+)"?/.exec(line);
    if (m) return m[1].trim();
  }
  return null;
}

function compareSemver(a, b) {
  // Returns: -1 if a<b, 0 if a==b, +1 if a>b.
  if (a === b) return 0;
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function walkSourceTree(sourceRoot) {
  // Returns relative file paths (relative to sourceRoot) discovered under
  // sourceRoot, sorted for deterministic copy order.
  const results = [];
  function walk(absDir, relDir) {
    const entries = fs.readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      const absChild = path.join(absDir, entry.name);
      const relChild = relDir ? path.join(relDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(absChild, relChild);
      } else if (entry.isFile()) {
        results.push(relChild);
      }
    }
  }
  if (fs.existsSync(sourceRoot) && fs.statSync(sourceRoot).isDirectory()) {
    walk(sourceRoot, '');
  }
  results.sort();
  return results;
}

function installYotzer(targetRoot) {
  // Returns: { copied: number, skipped: number, warning?: string }
  const sourceRoot = path.join(INSTALL_ROOT, YOTZER_SOURCE_REL);
  const targetCellRoot = path.join(targetRoot, YOTZER_TARGET_REL);

  // Same root — self-install. Skip copy; the source IS the target. Still
  // perform the kbs/ copy step because etlmaker source is separate.
  const selfInstall = sourceRoot === targetCellRoot;

  let copied = 0;
  let skipped = 0;
  let warning = null;

  // Ensure all 6 subdirectories exist even when the source has empty dirs
  // (AC 1). These may stay empty in M4.1; tier-2/3 specialists land in
  // M4.2-M4.5.
  const SUB_DIRS = ['agents', 'tasks', 'workflows', 'templates', 'checklists', 'kbs'];
  for (const sub of SUB_DIRS) {
    fs.mkdirSync(path.join(targetCellRoot, sub), { recursive: true });
  }

  // Version detection for idempotency + newer-version warning.
  const sourceManifestAbs = path.join(sourceRoot, 'celula.yaml');
  const targetManifestAbs = path.join(targetCellRoot, 'celula.yaml');
  const sourceVersion = parseVersionFromManifest(sourceManifestAbs);
  const targetVersion = parseVersionFromManifest(targetManifestAbs);

  if (!selfInstall && targetVersion && sourceVersion) {
    const cmp = compareSemver(targetVersion, sourceVersion);
    if (cmp >= 0) {
      // Target is equal or newer — preserve expert fork.
      if (cmp > 0) {
        warning =
          'aviso: Yotzer no alvo (versao ' +
          targetVersion +
          ') e mais nova que a do pacote (versao ' +
          sourceVersion +
          '). escrita ignorada para preservar fork do expert.';
      }
      skipped = 1;
      // Still run kbs copy below (kbs has no version).
    }
  }

  if (!selfInstall && skipped === 0) {
    const files = walkSourceTree(sourceRoot);
    for (const rel of files) {
      const absSource = path.join(sourceRoot, rel);
      const absTarget = path.join(targetCellRoot, rel);
      const srcBuf = fs.readFileSync(absSource);
      if (fs.existsSync(absTarget)) {
        const tgtBuf = fs.readFileSync(absTarget);
        if (Buffer.compare(srcBuf, tgtBuf) === 0) continue;
        // Same path, different content — preserve target (idempotent rule).
        continue;
      }
      fs.mkdirSync(path.dirname(absTarget), { recursive: true });
      fs.writeFileSync(absTarget, srcBuf);
      copied++;
    }
  }

  return { copied: copied, skipped: skipped, warning: warning };
}

// -- Bundled-cell skill registration (Story M8.3, FR-047, AC-025) ---------
// After the Yotzer scaffold lands, walk `.kaizen-dvir/celulas/{*}/` and call
// the M8.2 `registerCellSkills()` helper for each cell that has a
// `celula.yaml` on disk. Generic per D-v1.5-05: today the iteration set is
// `{yotzer}`, but ANY future first-party cell bundled under
// `.kaizen-dvir/celulas/` auto-registers without a code change here.
//
// Errors thrown by `registerCellSkills()` (malformed manifest, missing chief
// persona, etc.) are caught by `init()` and converted into a pt-BR stderr
// message + non-zero exit. Soft warnings (`warnings[]` from the helper) are
// printed to stdout in pt-BR as part of the post-init summary block.

// M8.4 — delegate to the shared helper at bin/lib/register-cells.js so init
// and update share a single source of truth for cell enumeration + skill
// registration. The shared module also classifies actions as `atualizadas` vs
// `preservadas` (used by update; init only consumes the count + warnings).
// REUSE > ADAPT > CREATE — Constitution Art. VII; D-v1.5-05 (generic per-cell
// registration). Local re-exports below preserve the M8.3 public surface.
const _registerCellsLib = require('./lib/register-cells.js');
const CELL_REGISTRY_REL = _registerCellsLib.CELL_REGISTRY_REL;

/**
 * Enumerate bundled cells under `<targetRoot>/.kaizen-dvir/celulas/`.
 * Thin re-export — implementation lives in `bin/lib/register-cells.js`.
 *
 * @param {string} targetRoot
 * @returns {Array<{ name: string, cellRoot: string }>}
 */
function enumerateBundledCells(targetRoot) {
  return _registerCellsLib.enumerateBundledCells(targetRoot);
}

/**
 * Register Claude Code slash skills for every bundled cell at
 * `.kaizen-dvir/celulas/{*}/`. Generic per D-v1.5-05.
 *
 * Delegates to the shared helper, then strips the action-classification
 * fields (`atualizadas`/`preservadas`) the init summary does not surface.
 * The shape kept here is the M8.3 contract:
 *   { perCell: [{ name, entryWritten, specialistsCount, warnings }],
 *     warnings: string[] }
 *
 * @param {string} targetRoot
 * @returns {{
 *   perCell: Array<{ name: string, entryWritten: boolean,
 *                    specialistsCount: number, warnings: string[] }>,
 *   warnings: string[],
 * }}
 *
 * @throws {Error} pt-BR error message when any cell's manifest is malformed
 *   or the chief persona is missing — caller (init) aborts the run with
 *   exit 1 to avoid leaving a half-registered state.
 */
function registerSkillsForCells(targetRoot) {
  // Anchor the helper-loading at INSTALL_ROOT (where the framework code
  // actually lives — either the dev tree or
  // `node_modules/@DanYuzo/kaizen-dvir/`). The shared helper reads cell
  // manifests from `targetRoot` (read-only) and writes skills under
  // `targetRoot/.claude/commands/`.
  const result = _registerCellsLib.registerSkillsForCells(targetRoot, {
    frameworkRoot: INSTALL_ROOT,
  });
  return {
    perCell: result.perCell.map(function (entry) {
      return {
        name: entry.name,
        entryWritten: entry.entryWritten,
        specialistsCount: entry.specialistsCount,
        warnings: entry.warnings,
      };
    }),
    warnings: result.warnings,
  };
}

function init(args) {
  const targetRoot = process.cwd();
  ensureDirs(targetRoot);

  const plan = plannedWrites();
  const { conflicts, identical, missing, userPreserved } = diffScan(targetRoot, plan);

  if (conflicts.length > 0) {
    process.stderr.write(formatNotCleanError(conflicts));
    return 1;
  }

  for (const item of missing) {
    const abs = path.join(targetRoot, item.targetRel);
    writeFileAtomic(abs, item.canonical);
  }
  // userPreserved: target has expert content — DO NOT touch.

  // v1.7.3: copy the entire dvir/ runtime tree into the target project so the
  // shipped `.claude/hooks/*.js` shims can resolve `dvir/hooks/hook-runner.js`,
  // `cie.js`, `log-writer.js`, etc. locally. Without this, `npx kaizen-dvir
  // init` left the target with broken hooks because the npx flow does not
  // populate `node_modules/kaizen-dvir/` in the user's project.
  let dvirCopyTotals = { copied: 0, identical: 0, preserved: 0 };
  for (const [srcRel, dstRel] of RECURSIVE_COPY_DIRS) {
    const c = copyDirRecursive(srcRel, dstRel, targetRoot);
    dvirCopyTotals.copied += c.copied;
    dvirCopyTotals.identical += c.identical;
    dvirCopyTotals.preserved += c.preserved;
  }

  // Yotzer auto-install after the L1/L2 skeleton lands (FR-002, AC-100).
  let yotzerResult = { copied: 0, skipped: 0, warning: null };
  try {
    yotzerResult = installYotzer(targetRoot);
  } catch (err) {
    process.stderr.write(
      'erro ao instalar Yotzer: ' + (err.message || 'desconhecido') + '\n'
    );
    return 1;
  }

  // Register Claude Code slash skills for every bundled cell (Story M8.3).
  // Runs AFTER `installYotzer()` so the cell scaffold is on disk, and
  // BEFORE the post-init summary so the summary can name the registered
  // skills. Errors abort with exit 1 — no half-registered state.
  let skillsResult = { perCell: [], warnings: [] };
  try {
    skillsResult = registerSkillsForCells(targetRoot);
  } catch (err) {
    const reason = (err && err.message) || 'desconhecido';
    process.stderr.write(
      'erro ao registrar skills das celulas: ' + reason + '\n' +
      'Init abortado para preservar estado consistente. ' +
      'Corrija o manifesto da celula e rode \'kaizen init\' novamente.\n'
    );
    return 1;
  }

  const total = plan.length;
  const created = missing.length;
  const skipped = identical.length;
  const preservedUser = userPreserved.length;

  const warningBlock = yotzerResult.warning
    ? '\n' + yotzerResult.warning + '\n'
    : '';

  // Per-cell skill summary lines (pt-BR; NFR-102).
  const skillsLines = skillsResult.perCell.map(function (entry) {
    // entryWritten is always true on success (helper returns true even when
    // content was already up-to-date). `specialistsCount` is the total
    // number of `.md` files written under `<cell>/` and includes the chief
    // sub-skill (so /<prefix>:<chief-id> works for direct re-activation).
    return '  Skills: ' + entry.name +
      ' (1 entry + ' + entry.specialistsCount + ' specialists)';
  });
  const skillsBlock = skillsLines.length > 0
    ? skillsLines.join('\n') + '\n'
    : '';

  // Surface non-fatal skill warnings in pt-BR (NFR-101).
  const skillWarningsBlock = skillsResult.warnings.length > 0
    ? '\nAvisos durante registro de skills:\n' +
      skillsResult.warnings.map((w) => '  - ' + w).join('\n') + '\n'
    : '';

  const userPreservedBlock = preservedUser > 0
    ? '  Conteúdo do expert preservado: ' + preservedUser + ' arquivo(s)\n'
    : '';

  const summary =
    '✔ kaizen init concluído.\n' +
    '  Criados: ' + created + ' arquivo(s)\n' +
    '  Já existentes (idênticos — preservados): ' + skipped + ' arquivo(s)\n' +
    userPreservedBlock +
    '  Total no esqueleto: ' + total + ' arquivo(s)\n' +
    '  Runtime dvir/: ' + dvirCopyTotals.copied + ' arquivo(s) copiados; ' +
    dvirCopyTotals.identical + ' idêntico(s); ' +
    dvirCopyTotals.preserved + ' fork(s) do expert preservado(s).\n' +
    '  Yotzer: ' + yotzerResult.copied + ' arquivo(s) copiados; ' +
    yotzerResult.skipped + ' conjunto(s) preservados.\n' +
    skillsBlock +
    warningBlock +
    skillWarningsBlock +
    '\n' +
    'Próximos passos:\n' +
    '  - Leia os Commandments: .kaizen-dvir/commandments.md\n' +
    '  - Revise .claude/CLAUDE.md (ponte com o Claude Code, atualizada para v1.5)\n' +
    '  - Explore .claude/rules/ — 6 arquivos de referência do framework ' +
    '(boundary, cells, yotzer, doctor, language-policy, commit-conventions)\n' +
    '  - Customize a área expert do .claude/CLAUDE.md (bloco KAIZEN:EXPERT, L3)\n' +
    '  - Preencha refs/ikigai/ com sua identidade e entrega\n' +
    '  - Ative o Yotzer com /Kaizen:Yotzer\n' +
    '  - Rode \'kaizen doctor\' para diagnosticar o projeto\n';
  process.stdout.write(summary);
  return 0;
}

if (require.main === module) {
  const exitCode = init(process.argv.slice(2));
  process.exit(exitCode);
}

module.exports = init;
module.exports.init = init;
module.exports.COPY_MANIFEST = COPY_MANIFEST;
module.exports.RECURSIVE_COPY_DIRS = RECURSIVE_COPY_DIRS;
module.exports.copyDirRecursive = copyDirRecursive;
module.exports.DIRS_TO_CREATE = DIRS_TO_CREATE;
module.exports.GITKEEP_TARGETS = GITKEEP_TARGETS;
module.exports.INLINE_TEMPLATES = INLINE_TEMPLATES;
module.exports.plannedWrites = plannedWrites;
module.exports.installYotzer = installYotzer;
module.exports.parseVersionFromManifest = parseVersionFromManifest;
module.exports.compareSemver = compareSemver;
module.exports.walkSourceTree = walkSourceTree;
module.exports.YOTZER_SOURCE_REL = YOTZER_SOURCE_REL;
module.exports.YOTZER_TARGET_REL = YOTZER_TARGET_REL;
module.exports.RULE_SEED_NAMES = RULE_SEED_NAMES;
module.exports.enumerateBundledCells = enumerateBundledCells;
module.exports.registerSkillsForCells = registerSkillsForCells;
// NOTE: ETLMAKER_KBS_SOURCE_REL / YOTZER_KBS_TARGET_REL exports removed —
// the symbols were never declared in this module and threw ReferenceError on
// every load (blocked all `kaizen init` invocations regardless of channel).
// Surfaced and resolved in scope by M6.6 channel smoke tests (FR-052).

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M8.4: refactored init to delegate cell-skill
//   registration to the shared helper at bin/lib/register-cells.js so init
//   and update share a single source of truth (Constitution Art. VII —
//   REUSE > ADAPT > CREATE; D-v1.5-05 — generic per-cell registration).
//   Inlined `enumerateBundledCells` + `registerSkillsForCells` reduced to
//   thin re-export wrappers that preserve the M8.3 public surface. Behavior
//   unchanged: same warnings/error semantics, same per-cell summary format.
//   The shared helper additionally returns `atualizadas`/`preservadas`
//   counts (consumed by update; init drops them in the wrapper).
// 2026-04-25 — @dev (Dex) — M8.3: wired init to call registerCellSkills()
//   from .kaizen-dvir/dvir/cell-registry.js (M8.2) for every bundled cell at
//   .kaizen-dvir/celulas/{*}/ after installYotzer() returns. Added
//   `.claude/commands` and `.claude/commands/Kaizen` to DIRS_TO_CREATE so the
//   namespace folder exists before registration. New `enumerateBundledCells`
//   walks `celulas/` and filters subdirectories that contain `celula.yaml` —
//   generic per D-v1.5-05 so future first-party cells auto-register without
//   code changes here. New `registerSkillsForCells` invokes the helper per
//   cell, aggregates `warnings[]` and per-cell counts. Errors thrown by the
//   helper (malformed manifest, missing chief persona) are caught and
//   converted into a pt-BR stderr message + exit 1; init never leaves a
//   half-registered state. Post-init summary block (pt-BR) gains one line
//   per cell ("Skills: <name> (1 entry + N specialists)") and an optional
//   "Avisos durante registro de skills" block when the helper returned
//   non-empty `warnings[]`. No new external dependencies (CON-003), CommonJS
//   preserved (CON-002). Existing M4.1 installYotzer() body, COPY_MANIFEST,
//   GITKEEP_TARGETS, INLINE_TEMPLATES, and CLAUDE_MD_SCAFFOLD untouched.
// 2026-04-25 — @dev (Dex) — M7.3: wired init to write .claude/CLAUDE.md +
//   .claude/rules/. Replaced the 17-line v1.4 CLAUDE_MD_SCAFFOLD constant
//   with a require of bin/lib/claude-md-scaffold.js (M7.2 — single source of
//   truth shared with the M6.5 migration). Added '.claude/rules' to
//   DIRS_TO_CREATE and six rule seed entries to INLINE_TEMPLATES. Rule
//   bodies are read from .kaizen-dvir/instructions/templates/rules/{name}.md
//   under INSTALL_ROOT at module-load time (single source of truth, smaller
//   bin/ footprint). Init summary block updated in pt-BR to mention the new
//   .claude/rules/ directory and the v1.5 CLAUDE.md. Existing diffScan
//   idempotency path automatically covers the new INLINE_TEMPLATES entries.
//   No new dependencies (CON-003), CommonJS preserved (CON-002).
