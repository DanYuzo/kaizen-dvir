'use strict';

/*
 * v1.4-to-v1.5.js — KaiZen migration v1.4 -> v1.5 (Story M6.5)
 *
 * Public contract (machine doc — see .kaizen-dvir/dvir/update/migrations.js
 * header for the full migration API spec):
 *
 *   module.exports = {
 *     from: "1.4.0",
 *     to: "1.5.0",
 *     description: "...",
 *     forward: async ({ projectRoot, manifest, log }) => { ... },
 *   };
 *
 * What this migration does
 * ------------------------
 * Two structural transformations required to bring a v1.4 install into the
 * v1.5 baseline expected by the `kaizen update` engine:
 *
 *   1. Manifest schema backfill. v1.5 introduces a `layer` annotation
 *      (`L1` | `L2` | `L3` | `L4-readonly`) on each manifest entry, used
 *      by the layered update policy (M6.2). This step iterates the local
 *      manifest, infers the layer from the path, and writes the field
 *      when missing. Idempotent: entries that already have a `layer` are
 *      left untouched.
 *
 *   2. Legacy `.claude/CLAUDE.md` migration. v1.4 ships a 17-line scaffold
 *      with no delimiters. v1.5's delimiter-aware merge (M6 / M7) requires
 *      the four-marker structure:
 *        <!-- KAIZEN:FRAMEWORK:START --> ... <!-- KAIZEN:FRAMEWORK:END -->
 *        <!-- KAIZEN:EXPERT:START -->    ... <!-- KAIZEN:EXPERT:END -->
 *      This step wraps the existing v1.4 content verbatim inside the
 *      EXPERT block (preserving every byte of expert customization) and
 *      prepends a placeholder FRAMEWORK block. M7.2 ships the actual
 *      framework section content; the next `kaizen update` after M7.2
 *      replaces only the FRAMEWORK block, leaving the EXPERT block
 *      byte-identical.
 *      Idempotent: detects existing `KAIZEN:FRAMEWORK:START` and skips.
 *
 * Both steps log via the helper passed in by the loader. Event names are
 * structured English (machine readable for the update log file). Messages
 * are pt-BR (terminal — Language Policy, Commandment IV).
 *
 * Stdlib only (CON-003).
 */

const fs = require('node:fs');
const path = require('node:path');

// -- Layer inference rules ------------------------------------------------
//
// Order matters. The first matching prefix wins. `L4-readonly` is the
// catch-all for everything not under a known framework root. These rules
// must stay aligned with the canonical manifest builder
// (`bin/build-canonical-manifest.js`); divergence would produce a manifest
// that disagrees with the v1.5 update policy.
const LAYER_RULES = [
  // L1 — framework dvir core (never modify)
  { prefix: 'bin/', layer: 'L1' },
  { prefix: '.kaizen-dvir/dvir/', layer: 'L1' },
  { prefix: '.kaizen-dvir/commandments.md', layer: 'L1' },
  { prefix: '.kaizen-dvir/dvir-config.yaml', layer: 'L1' },
  { prefix: '.kaizen-dvir/manifest.json', layer: 'L1' },
  // L2 — framework templates and célula scaffolding (extend-only)
  { prefix: '.kaizen-dvir/instructions/', layer: 'L2' },
  { prefix: '.kaizen-dvir/celulas/', layer: 'L2' },
  { prefix: '.kaizen-dvir/infra/', layer: 'L2' },
  { prefix: '.kaizen-dvir/refs/', layer: 'L2' },
  // L3 — project config (mutable, 3-way merged)
  { prefix: '.claude/', layer: 'L3' },
  { prefix: '.gitignore', layer: 'L3' },
];

function inferLayer(relativePath) {
  for (const rule of LAYER_RULES) {
    if (relativePath === rule.prefix || relativePath.startsWith(rule.prefix)) {
      return rule.layer;
    }
  }
  return 'L4-readonly';
}

// -- Step 1: manifest schema backfill -------------------------------------

/**
 * Iterate the manifest entries and assign the `layer` annotation when it
 * is missing. Returns the count of entries that were updated. Mutates
 * `manifest.files[*]` in place; the caller persists the manifest after
 * the migration completes.
 */
function backfillManifestLayers(manifest, log) {
  if (!manifest || typeof manifest !== 'object') {
    log('manifest_skip', 'manifest indisponivel; backfill de layer ignorado.');
    return 0;
  }
  const files = manifest.files;
  if (!files || typeof files !== 'object') {
    log(
      'manifest_skip',
      'manifest sem campo "files"; backfill de layer ignorado.'
    );
    return 0;
  }
  let updated = 0;
  for (const relPath of Object.keys(files)) {
    const entry = files[relPath];
    if (!entry || typeof entry !== 'object') continue;
    if (typeof entry.layer === 'string' && entry.layer.length > 0) continue;
    entry.layer = inferLayer(relPath);
    updated++;
  }
  if (updated > 0) {
    log(
      'manifest_layer_backfilled',
      'Manifest: ' + updated + ' entrada(s) anotada(s) com o campo "layer".'
    );
  } else {
    log(
      'manifest_layer_already_current',
      'Manifest: campo "layer" ja presente em todas as entradas; nada a fazer.'
    );
  }
  return updated;
}

// -- Step 2: legacy .claude/CLAUDE.md migration ---------------------------

const FRAMEWORK_START = '<!-- KAIZEN:FRAMEWORK:START -->';
const FRAMEWORK_END = '<!-- KAIZEN:FRAMEWORK:END -->';
const EXPERT_START = '<!-- KAIZEN:EXPERT:START -->';
const EXPERT_END = '<!-- KAIZEN:EXPERT:END -->';

// Placeholder body for the FRAMEWORK block. M7.2 ships the byte-exact
// `KAIZEN_FRAMEWORK_SECTION_CONTENT` and the post-M7.2 `kaizen update`
// replaces this placeholder via the delimiter-aware merge (M7.4). The
// placeholder body itself is pt-BR — the expert may read it before the
// post-M7 update lands and needs to understand that the section is
// reserved for the framework.
const FRAMEWORK_PLACEHOLDER_BODY = [
  '<!--',
  '  Espaco reservado: o conteudo desta secao e gerado pelo framework.',
  '  Apos a proxima execucao de kaizen update, sera substituido pelo',
  '  bloco oficial da versao corrente. Edits feitos aqui nao sobrevivem.',
  '  Para customizar, use a area do expert no fim deste arquivo.',
  '-->',
].join('\n');

/**
 * Build the v1.5-shaped CLAUDE.md from the legacy v1.4 body. Pure function
 * — easy to unit-test and re-use.
 *
 * Layout:
 *   <FRAMEWORK_START>
 *   <placeholder body>
 *   <FRAMEWORK_END>
 *
 *   <EXPERT_START>
 *   <legacy body verbatim>
 *   <EXPERT_END>
 *
 * The two delimiter blocks are separated by a single blank line so the
 * resulting Markdown is readable; M7.2's scaffold uses the same layout,
 * making the post-M7 delimiter-aware merge a clean replace inside the
 * FRAMEWORK block.
 */
function buildMigratedClaudeMd(legacyBody) {
  const safeLegacy = typeof legacyBody === 'string' ? legacyBody : '';
  return [
    FRAMEWORK_START,
    FRAMEWORK_PLACEHOLDER_BODY,
    FRAMEWORK_END,
    '',
    EXPERT_START,
    safeLegacy,
    EXPERT_END,
    '',
  ].join('\n');
}

/**
 * Migrate `.claude/CLAUDE.md` from the v1.4 17-line scaffold to the v1.5
 * delimiter structure. Returns:
 *   - 'created'   : file was absent; created with empty expert block.
 *   - 'migrated'  : file existed without delimiters; wrapped in the new
 *                   structure preserving the original content.
 *   - 'skipped'   : file already contains `KAIZEN:FRAMEWORK:START`;
 *                   no change made (idempotent guard).
 *
 * Accepts the same `log` helper as the rest of the migration so terminal
 * messages are pt-BR.
 */
function migrateClaudeMd(projectRoot, log) {
  const target = path.join(projectRoot, '.claude', 'CLAUDE.md');

  // Defensive — make sure parent directory exists; on a healthy v1.4
  // install it does, but a partially scaffolded project might not.
  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (!fs.existsSync(target)) {
    const fresh = buildMigratedClaudeMd('');
    fs.writeFileSync(target, fresh, 'utf8');
    log(
      'claude_md_created',
      '.claude/CLAUDE.md ausente — criado com a estrutura de delimitadores v1.5.'
    );
    return 'created';
  }

  const current = fs.readFileSync(target, 'utf8');

  // Idempotent guard — any presence of the FRAMEWORK_START marker means a
  // previous migration (or the M7.3 wiring) already produced the v1.5
  // structure. Do not rewrite.
  if (current.indexOf(FRAMEWORK_START) !== -1) {
    log(
      'claude_md_already_migrated',
      '.claude/CLAUDE.md ja contem os delimitadores KAIZEN — migracao ignorada.'
    );
    return 'skipped';
  }

  const migrated = buildMigratedClaudeMd(current);
  fs.writeFileSync(target, migrated, 'utf8');
  log(
    'claude_md_migrated',
    '.claude/CLAUDE.md migrado para a estrutura v1.5 (conteudo v1.4 preservado dentro do bloco EXPERT).'
  );
  return 'migrated';
}

// -- Public migration export ---------------------------------------------

async function forward(opts) {
  opts = opts || {};
  const projectRoot = opts.projectRoot || process.cwd();
  const manifest = opts.manifest || null;
  const log =
    typeof opts.log === 'function' ? opts.log : function noopLog() {};

  log(
    'migration_start',
    'Migracao v1.4 -> v1.5 iniciada. Operacoes idempotentes — seguro repetir.'
  );

  const layersUpdated = backfillManifestLayers(manifest, log);
  const claudeMdResult = migrateClaudeMd(projectRoot, log);

  log(
    'migration_complete',
    'Migracao v1.4 -> v1.5 concluida. ' +
      'Manifest atualizado: ' + layersUpdated + ' entrada(s); ' +
      'CLAUDE.md: ' + claudeMdResult + '.'
  );

  return {
    layersUpdated: layersUpdated,
    claudeMdResult: claudeMdResult,
  };
}

module.exports = {
  from: '1.4.0',
  to: '1.5.0',
  description:
    'Backfill manifest layer annotations and wrap the legacy .claude/CLAUDE.md scaffold in v1.5 delimiter structure.',
  forward: forward,
  // Internal helpers exposed for tests (not part of the migration API
  // contract — callers MUST use only `forward`).
  __internals: {
    inferLayer: inferLayer,
    backfillManifestLayers: backfillManifestLayers,
    migrateClaudeMd: migrateClaudeMd,
    buildMigratedClaudeMd: buildMigratedClaudeMd,
    FRAMEWORK_START: FRAMEWORK_START,
    FRAMEWORK_END: FRAMEWORK_END,
    EXPERT_START: EXPERT_START,
    EXPERT_END: EXPERT_END,
    FRAMEWORK_PLACEHOLDER_BODY: FRAMEWORK_PLACEHOLDER_BODY,
    LAYER_RULES: LAYER_RULES,
  },
};

// --- Change Log -----------------------------------------------------------
// 2026-04-25 — @dev (Dex) — M6.5: initial v1.4 -> v1.5 migration script.
//   Implements (a) manifest layer backfill via path-prefix rules and
//   (b) legacy .claude/CLAUDE.md wrap into KAIZEN:FRAMEWORK / KAIZEN:EXPERT
//   delimiter blocks (placeholder FRAMEWORK body to be replaced by M7.2 on
//   the next post-M7 update). Both steps idempotent. Stdlib only (CON-003).
//   Coordination with M7.2: either ordering safe — both honor the
//   KAIZEN:FRAMEWORK:START presence guard.
