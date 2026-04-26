#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const INSTALL_ROOT = path.resolve(__dirname, '..');

// Files copied verbatim from the canonical installation into the target.
// Tuple: [source-relative-to-INSTALL_ROOT, target-relative-to-process.cwd()]
const COPY_MANIFEST = [
  ['.kaizen-dvir/commandments.md', '.kaizen-dvir/commandments.md'],
  ['.kaizen-dvir/dvir-config.yaml', '.kaizen-dvir/dvir-config.yaml'],
  ['.kaizen-dvir/dvir/config-loader.js', '.kaizen-dvir/dvir/config-loader.js'],
  ['.kaizen-dvir/dvir/boundary-toggle.js', '.kaizen-dvir/dvir/boundary-toggle.js'],
  ['.claude/settings.json', '.claude/settings.json'],
  ['.claude/README.md', '.claude/README.md'],
  ['package.json', 'package.json'],
  ['bin/kaizen.js', 'bin/kaizen.js'],
  ['bin/kaizen-init.js', 'bin/kaizen-init.js'],
  ['.gitignore', '.gitignore'],
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
const CLAUDE_MD_SCAFFOLD =
  '# CLAUDE.md — Projeto KaiZen\n' +
  '\n' +
  'Este projeto usa o framework **KaiZen v1.4**.\n' +
  '\n' +
  '## Leis do framework\n' +
  '\n' +
  'Leia e respeite os 7 Commandments antes de qualquer mudança:\n' +
  '`.kaizen-dvir/commandments.md`\n' +
  '\n' +
  '## Comandos de entrada\n' +
  '\n' +
  '- `kaizen doctor` — diagnostica o projeto (disponível em M2/M3)\n' +
  '- `/Kaizen:Yotzer` — célula de orientação (disponível após M4)\n' +
  '\n' +
  '## Espaço do expert (customização)\n' +
  '\n' +
  '<!-- Edite livremente abaixo — esta área é L3 (mutável). -->\n';

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

const INLINE_TEMPLATES = Object.assign({}, IKIGAI_SCAFFOLDS, {
  '.claude/CLAUDE.md': CLAUDE_MD_SCAFFOLD,
});

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

function diffScan(targetRoot, plan) {
  const conflicts = [];
  const identical = [];
  const missing = [];
  for (const item of plan) {
    const abs = path.join(targetRoot, item.targetRel);
    if (!fs.existsSync(abs)) {
      missing.push(item);
      continue;
    }
    const current = fs.readFileSync(abs);
    if (Buffer.compare(current, item.canonical) === 0) {
      identical.push(item);
    } else {
      conflicts.push(item);
    }
  }
  return { conflicts, identical, missing };
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

function init(args) {
  const targetRoot = process.cwd();
  ensureDirs(targetRoot);

  const plan = plannedWrites();
  const { conflicts, identical, missing } = diffScan(targetRoot, plan);

  if (conflicts.length > 0) {
    process.stderr.write(formatNotCleanError(conflicts));
    return 1;
  }

  for (const item of missing) {
    const abs = path.join(targetRoot, item.targetRel);
    writeFileAtomic(abs, item.canonical);
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

  const total = plan.length;
  const created = missing.length;
  const skipped = identical.length;

  const warningBlock = yotzerResult.warning
    ? '\n' + yotzerResult.warning + '\n'
    : '';

  const summary =
    '✔ kaizen init concluído.\n' +
    '  Criados: ' + created + ' arquivo(s)\n' +
    '  Já existentes (idênticos — preservados): ' + skipped + ' arquivo(s)\n' +
    '  Total no esqueleto: ' + total + ' arquivo(s)\n' +
    '  Yotzer: ' + yotzerResult.copied + ' arquivo(s) copiados; ' +
    yotzerResult.skipped + ' conjunto(s) preservados.\n' +
    warningBlock +
    '\n' +
    'Próximos passos:\n' +
    '  - Leia os Commandments: .kaizen-dvir/commandments.md\n' +
    '  - Customize seu espaço em .claude/CLAUDE.md (área L3, mutável)\n' +
    '  - Preencha refs/ikigai/ com sua identidade e entrega\n' +
    '  - Ative o Yotzer com /Kaizen:Yotzer\n' +
    '  - Rode \'kaizen doctor\' (disponível em M2/M3)\n';
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
// NOTE: ETLMAKER_KBS_SOURCE_REL / YOTZER_KBS_TARGET_REL exports removed —
// the symbols were never declared in this module and threw ReferenceError on
// every load (blocked all `kaizen init` invocations regardless of channel).
// Surfaced and resolved in scope by M6.6 channel smoke tests (FR-052).
