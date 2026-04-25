'use strict';

/**
 * memory-writer.js — Append-only write API for per-cell MEMORY.md.
 *
 * Public contract:
 *   - appendPattern(celulaName, pattern, confidence)
 *   - appendException(celulaName, context, handling)
 *   - appendCrossRef(celulaName, ikigaiFile, whenToConsult)
 *   - appendChangeLog(celulaName, author, change)
 *   - flagForPromotion(pattern, celulaName)
 *
 * Allow-list (D-v1.1-09, CON-005):
 *   Writes are restricted to `.kaizen-dvir/celulas/{celula-name}/MEMORY.md`.
 *   This is the single documented runtime exception over L2. Any other path
 *   is rejected with a pt-BR error citing the exception.
 *
 * Append-only (FR-024, NFR-012, AC-207):
 *   No method overwrites or rewrites prior content. New rows are appended
 *   to the matching section. The section header itself is created on first
 *   write if missing. Prior bytes never mutate.
 *
 * Concurrency (NFR-012, KZ-M3-R2, R-008):
 *   Uses `fs.promises.appendFile` which is atomic per call on POSIX.
 *   On Windows, the OS may return EBUSY/EPERM when a sibling holds the
 *   handle. We retry with bounded attempts and short backoff. After
 *   exhaustion the call fails with a pt-BR error so the sub-agent can
 *   surface the conflict instead of dropping the entry.
 *
 * EBUSY retry policy (default):
 *   - max attempts: 5
 *   - base backoff: 20ms
 *   - exponential: 20, 40, 80, 160, 320ms
 *   - total ceiling: ~620ms before giving up
 *
 * Promotion candidates (FR-025):
 *   `flagForPromotion` writes a YAML-by-convention line to
 *   `.kaizen/logs/promotion-candidates.yaml`. Each line is a single
 *   flow-style mapping serialized via JSON.stringify (YAML 1.2 accepts
 *   JSON as a strict subset). Format documented inline below so M3.5
 *   `pattern-promoter.js` can parse the same line shape.
 *
 *   Line format example:
 *     {"timestamp":"2026-04-24T10:00:00.000Z","celula":"yotzer","pattern":"hook curto converte mais","status":"candidate"}
 *
 * Errors (Language Policy, D-v1.4-06):
 *   Every error message surfaced to the expert is in pt-BR and short,
 *   per `diretrizes-escrita.md`. Internal API names remain EN.
 *
 * Constraints honored:
 *   - CON-002: CommonJS, ES2022, `require` / `module.exports`.
 *   - CON-003: stdlib only — `node:fs`, `node:path`.
 *   - CON-004: `.kaizen/` is gitignored; promotion file is runtime-only.
 *   - CON-005: L2 exception enforced at every entry point.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

// Section headings used by the template (memory-tmpl.md). Stored as constants
// so the writer agrees with the template by construction.
const SECTION_PADROES = '## Padrões Validados';
const SECTION_EXCECOES = '## Exceções Conhecidas';
const SECTION_REFS = '## Referências Cruzadas';
const SECTION_CHANGELOG = '## Change Log';

const ALL_SECTIONS = Object.freeze([
  SECTION_PADROES,
  SECTION_EXCECOES,
  SECTION_REFS,
  SECTION_CHANGELOG,
]);

const VALID_CONFIDENCE = Object.freeze(['low', 'medium', 'high']);

// EBUSY retry budget — tuned for Windows file-lock contention.
const RETRY_MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 20;

// Resolve project root from this module's location.
//   .kaizen-dvir/dvir/memory/memory-writer.js → up 3 to project root.
function _projectRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function _celulasRoot() {
  if (process.env.KAIZEN_CELULAS_DIR) {
    return process.env.KAIZEN_CELULAS_DIR;
  }
  return path.join(_projectRoot(), '.kaizen-dvir', 'celulas');
}

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) {
    return process.env.KAIZEN_LOGS_DIR;
  }
  return path.join(_projectRoot(), '.kaizen', 'logs');
}

function _memoryPath(celulaName) {
  return path.join(_celulasRoot(), celulaName, 'MEMORY.md');
}

function _validateCelulaName(celulaName) {
  if (typeof celulaName !== 'string' || celulaName.length === 0) {
    throw new Error(
      'nome da célula obrigatório. informe um nome não vazio.'
    );
  }
  // Reject any path-like component to defeat directory traversal. This is
  // the first guard for the L2 runtime allow-list (D-v1.1-09) — surface
  // the exception in the error so the caller knows why.
  if (celulaName.includes('/') || celulaName.includes('\\') || celulaName.includes('..')) {
    throw new Error(
      'escrita rejeitada: nome de célula inválido (D-v1.1-09). ' +
        'alvo permitido: .kaizen-dvir/celulas/{nome}/MEMORY.md. ' +
        'use apenas o nome simples da célula, sem barras nem `..`.'
    );
  }
}

function _validateTargetPath(absTarget) {
  // Compute the canonical allow-listed prefix and target leaf.
  const allowedRoot = _celulasRoot();
  const normalized = path.normalize(absTarget);
  const normalizedRoot = path.normalize(allowedRoot);
  const isUnderRoot = normalized.startsWith(normalizedRoot + path.sep);
  const endsWithMemory = path.basename(normalized) === 'MEMORY.md';
  if (!isUnderRoot || !endsWithMemory) {
    throw new Error(
      'escrita rejeitada: path fora da exceção L2 runtime (D-v1.1-09). ' +
        'alvo permitido: .kaizen-dvir/celulas/{nome}/MEMORY.md.'
    );
  }
}

function _ensureScaffold(absPath) {
  // If the MEMORY.md does not exist yet, write the section skeleton so
  // append targets always have a header to land under. The skeleton itself
  // is small and deterministic; created once, never rewritten.
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  if (!fs.existsSync(absPath)) {
    const scaffold =
      '# Memory\n' +
      '\n' +
      SECTION_PADROES + '\n' +
      '\n' +
      SECTION_EXCECOES + '\n' +
      '\n' +
      SECTION_REFS + '\n' +
      '\n' +
      SECTION_CHANGELOG + '\n';
    fs.writeFileSync(absPath, scaffold, { encoding: 'utf8' });
  } else {
    // File exists — verify required sections; append any that are missing.
    // This is still append-only: we never rewrite prior bytes.
    const current = fs.readFileSync(absPath, 'utf8');
    const trailer = [];
    for (const section of ALL_SECTIONS) {
      if (!current.includes(section)) {
        trailer.push('');
        trailer.push(section);
      }
    }
    if (trailer.length > 0) {
      fs.appendFileSync(absPath, trailer.join('\n') + '\n', { encoding: 'utf8' });
    }
  }
}

function _today() {
  // ISO date — YYYY-MM-DD — UTC for determinism.
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Atomic-append with bounded retry on EBUSY/EPERM. POSIX makes appendFile
 * atomic per call; Windows can transiently fail under concurrent writers.
 * We retry with exponential backoff so two sub-agents never lose entries.
 */
async function _appendWithRetry(absPath, line) {
  let attempt = 0;
  let lastErr = null;
  while (attempt < RETRY_MAX_ATTEMPTS) {
    try {
      await fsp.appendFile(absPath, line, { encoding: 'utf8' });
      return;
    } catch (err) {
      const code = err && err.code;
      const retriable = code === 'EBUSY' || code === 'EPERM' || code === 'EAGAIN';
      if (!retriable) {
        throw err;
      }
      lastErr = err;
      const delay = RETRY_BASE_MS * Math.pow(2, attempt);
      attempt++;
      await _sleep(delay);
    }
  }
  throw new Error(
    'escrita bloqueada após ' + RETRY_MAX_ATTEMPTS +
      ' tentativas. arquivo travado por outro processo. ' +
      'tente de novo em instantes. detalhe: ' +
      (lastErr && lastErr.message ? lastErr.message : 'desconhecido')
  );
}

/**
 * Append a row to a named section. Section is created on first call if
 * the scaffold did not include it. Prior content is never modified.
 *
 * Strategy: append the row at the very end of the file under the named
 * section header. To keep ordering simple and avoid in-place edits, we
 * append a one-line block of the form:
 *
 *   <SECTION_HEADER_MARK>
 *   - row
 *
 * The header is included only on first append for that section in the
 * file's lifetime, otherwise we just append the row line. We detect
 * "first append" by reading the current content and looking for a row
 * line under the header.
 *
 * Append-only invariant: this function ONLY appends to the end of the
 * file. It never rewrites any byte before the new tail.
 */
async function _appendUnderSection(absPath, sectionHeader, rowText) {
  _ensureScaffold(absPath);
  const line = '- ' + rowText + '\n';
  // We cannot insert under each section header without rewriting the file,
  // so the contract is: appended rows live at the tail of the file under a
  // re-emitted section header. To keep parsers happy we emit the header
  // only when the previous tail block was a different section.
  const current = fs.readFileSync(absPath, 'utf8');
  const lastHeader = _lastSectionHeader(current);
  let block;
  if (lastHeader === sectionHeader) {
    block = line;
  } else {
    // Ensure a blank line separation before the new header.
    const needsLeadingNewline = current.endsWith('\n') ? '' : '\n';
    block = needsLeadingNewline + '\n' + sectionHeader + '\n' + line;
  }
  await _appendWithRetry(absPath, block);
}

function _lastSectionHeader(content) {
  // Walk lines bottom-up; first H2 we hit is the active section.
  const lines = content.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (ALL_SECTIONS.includes(l)) {
      return l;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Append a validated pattern row to the cell's MEMORY.md.
 * @returns {Promise<{path:string, section:string}>}
 */
async function appendPattern(celulaName, pattern, confidence) {
  _validateCelulaName(celulaName);
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('padrão obrigatório. informe um texto não vazio.');
  }
  if (!VALID_CONFIDENCE.includes(confidence)) {
    throw new Error(
      'confiança inválida. use um destes valores: ' +
        VALID_CONFIDENCE.join(', ') + '.'
    );
  }
  const target = _memoryPath(celulaName);
  _validateTargetPath(target);
  const row = _today() + ' — ' + pattern + ' — confiança: ' + confidence;
  await _appendUnderSection(target, SECTION_PADROES, row);
  return { path: target, section: SECTION_PADROES };
}

/**
 * Append an exception row to the cell's MEMORY.md.
 */
async function appendException(celulaName, context, handling) {
  _validateCelulaName(celulaName);
  if (typeof context !== 'string' || context.trim() === '') {
    throw new Error('contexto obrigatório. informe um texto não vazio.');
  }
  if (typeof handling !== 'string' || handling.trim() === '') {
    throw new Error('tratamento obrigatório. informe um texto não vazio.');
  }
  const target = _memoryPath(celulaName);
  _validateTargetPath(target);
  const row = _today() + ' — ' + context + ' — ' + handling;
  await _appendUnderSection(target, SECTION_EXCECOES, row);
  return { path: target, section: SECTION_EXCECOES };
}

/**
 * Append a cross-reference row pointing at an Ikigai dimension.
 */
async function appendCrossRef(celulaName, ikigaiFile, whenToConsult) {
  _validateCelulaName(celulaName);
  if (typeof ikigaiFile !== 'string' || ikigaiFile.trim() === '') {
    throw new Error('arquivo do Ikigai obrigatório. informe um caminho.');
  }
  if (typeof whenToConsult !== 'string' || whenToConsult.trim() === '') {
    throw new Error('momento de consulta obrigatório. descreva quando ler.');
  }
  const target = _memoryPath(celulaName);
  _validateTargetPath(target);
  const row = ikigaiFile + ' — ' + whenToConsult;
  await _appendUnderSection(target, SECTION_REFS, row);
  return { path: target, section: SECTION_REFS };
}

/**
 * Append a change-log row. Always append-only — historical lines never mutate.
 */
async function appendChangeLog(celulaName, author, change) {
  _validateCelulaName(celulaName);
  if (typeof author !== 'string' || author.trim() === '') {
    throw new Error('autor obrigatório. informe quem fez a mudança.');
  }
  if (typeof change !== 'string' || change.trim() === '') {
    throw new Error('descrição da mudança obrigatória.');
  }
  const target = _memoryPath(celulaName);
  _validateTargetPath(target);
  const row = _today() + ' — ' + author + ' — ' + change;
  await _appendUnderSection(target, SECTION_CHANGELOG, row);
  return { path: target, section: SECTION_CHANGELOG };
}

/**
 * Flag a pattern as a promotion candidate. Writes a YAML-by-convention
 * line to `.kaizen/logs/promotion-candidates.yaml`. Promotion itself
 * requires expert approval via M3.5 `kaizen doctor --promotion approve`.
 *
 * Line format (JSON object — valid YAML 1.2 flow-style mapping):
 *   {"timestamp": ISO8601, "celula": string, "pattern": string, "status": "candidate"}
 */
async function flagForPromotion(pattern, celulaName) {
  if (typeof pattern !== 'string' || pattern.trim() === '') {
    throw new Error('padrão obrigatório para sinalizar promoção.');
  }
  _validateCelulaName(celulaName);
  const dir = _logsRoot();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'promotion-candidates.yaml');
  const entry = {
    timestamp: new Date().toISOString(),
    celula: celulaName,
    pattern: pattern,
    status: 'candidate',
  };
  const line = JSON.stringify(entry) + '\n';
  await _appendWithRetry(file, line);
  return { path: file, entry: entry };
}

module.exports = {
  appendPattern: appendPattern,
  appendException: appendException,
  appendCrossRef: appendCrossRef,
  appendChangeLog: appendChangeLog,
  flagForPromotion: flagForPromotion,
  // Exposed for test introspection only — not part of the stable API.
  _internal: {
    SECTION_PADROES: SECTION_PADROES,
    SECTION_EXCECOES: SECTION_EXCECOES,
    SECTION_REFS: SECTION_REFS,
    SECTION_CHANGELOG: SECTION_CHANGELOG,
    VALID_CONFIDENCE: VALID_CONFIDENCE,
    RETRY_MAX_ATTEMPTS: RETRY_MAX_ATTEMPTS,
  },
};
