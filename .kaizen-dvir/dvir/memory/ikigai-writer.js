'use strict';

/**
 * ikigai-writer.js — Gated write API for the 4 Ikigai dimensions.
 *
 * FR-027 — Cells write to Ikigai ONLY after Playback Gate approves.
 * Pairs with the read-only `ikigai-reader.js` from M3.1.
 *
 * Public contract:
 *
 *   write(dimension, change, rationale, opts?) -> {
 *     verdict: 'PASS' | 'ADJUST' | 'HALT' | 'AUTO_PASS',
 *     applied: boolean,
 *     path?: string,
 *     reason?: string,
 *   }
 *
 *   - dimension ∈ { 'o-que-faco', 'quem-sou', 'para-quem', 'como-faco' }
 *   - change: text describing what to add. Appended under a new H2
 *     (`## {timestamp} — {summary}`).
 *   - rationale: pt-BR sentence explaining WHY. Embedded in the narrative
 *     and in the appended Change Log entry (FR-023).
 *
 * Gate flow (FR-027 enforcement):
 *   1. Build a pt-BR narrative summarizing the proposed change.
 *   2. Call playback-gate.present() with the narrative.
 *   3. Apply the write ONLY when verdict ∈ { PASS, AUTO_PASS }.
 *   4. ADJUST → caller is responsible for collecting changes and
 *      re-invoking write(); we never write on ADJUST.
 *   5. HALT → no write; reason is returned to the caller.
 *
 * Append-only contract (FR-023, AC-207):
 *   The change content is appended at the END of the dimension document.
 *   The Change Log row is appended under the existing `## Change Log`
 *   section (created if missing).
 *
 * Allow-list:
 *   Writes restricted to refs/ikigai/{dimension}.md. Override the root via
 *   KAIZEN_IKIGAI_DIR (mirrors ikigai-reader.js).
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

const PLAYBACK_GATE = require('../gates/playback-gate.js');

const VALID_DIMENSIONS = Object.freeze([
  'o-que-faco',
  'quem-sou',
  'para-quem',
  'como-faco',
]);

const CHANGE_LOG_HEADER = '## Change Log';

function _ikigaiRoot() {
  if (process.env.KAIZEN_IKIGAI_DIR) return process.env.KAIZEN_IKIGAI_DIR;
  return path.join(PROJECT_ROOT, 'refs', 'ikigai');
}

function _dimensionPath(dimension) {
  return path.join(_ikigaiRoot(), dimension + '.md');
}

function _today() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _ensureChangeLogSection(absPath) {
  if (!fs.existsSync(absPath)) return;
  const current = fs.readFileSync(absPath, 'utf8');
  if (current.includes(CHANGE_LOG_HEADER)) return;
  const trailer =
    (current.endsWith('\n') ? '' : '\n') + '\n' + CHANGE_LOG_HEADER + '\n';
  fs.appendFileSync(absPath, trailer, { encoding: 'utf8' });
}

function _summarizeChange(change) {
  if (typeof change !== 'string') return 'mudanca';
  const trimmed = change.trim().split(/\r?\n/u)[0];
  return trimmed.length > 60 ? trimmed.slice(0, 60) + '...' : trimmed;
}

function _buildNarrative(dimension, change, rationale) {
  const summary = _summarizeChange(change);
  return (
    'a celula propoe alterar a dimensao do Ikigai "' +
    dimension +
    '". resumo: ' +
    summary +
    '. motivo: ' +
    (typeof rationale === 'string' && rationale.length > 0
      ? rationale
      : 'sem motivo informado') +
    '.'
  );
}

/**
 * Apply the write to disk. Append-only — section header for the new
 * change goes at the end of the file; Change Log row goes at the end too.
 */
function _applyWrite(absPath, change, rationale, author) {
  const stamp = _today();
  const summary = _summarizeChange(change);
  const sectionHeader = '\n## ' + stamp + ' — ' + summary + '\n\n';
  const body = (typeof change === 'string' ? change : '') + '\n';

  // Ensure target exists; create with minimal scaffold if missing.
  if (!fs.existsSync(absPath)) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, '# Ikigai\n\n' + CHANGE_LOG_HEADER + '\n', {
      encoding: 'utf8',
    });
  }

  const current = fs.readFileSync(absPath, 'utf8');
  const needsLeadingNewline = current.endsWith('\n') ? '' : '\n';
  fs.appendFileSync(absPath, needsLeadingNewline + sectionHeader + body, {
    encoding: 'utf8',
  });

  // Change Log row.
  _ensureChangeLogSection(absPath);
  const logRow =
    '\n- ' +
    stamp +
    ' — ' +
    (author || 'ikigai-writer') +
    ' — ' +
    (rationale || 'sem motivo') +
    '\n';
  fs.appendFileSync(absPath, logRow, { encoding: 'utf8' });
}

/**
 * Public entry — see file header for full contract.
 *
 * @param {string} dimension
 * @param {string} change
 * @param {string} rationale
 * @param {object} [opts] { author?, mode?, qualityVerdict?, prompt?,
 *                          reasonCollector?, cellManifest?, phase? }
 * @returns {{ verdict: string, applied: boolean, path?: string, reason?: string }}
 */
function write(dimension, change, rationale, opts) {
  if (!VALID_DIMENSIONS.includes(dimension)) {
    const err = new Error(
      'dimensao invalida: "' + String(dimension) + '". use: ' +
        VALID_DIMENSIONS.join(', ') + '.'
    );
    err.code = 'IKIGAI_DIMENSION_INVALID';
    throw err;
  }
  if (typeof change !== 'string' || change.trim() === '') {
    const err = new Error('mudanca obrigatoria. informe um texto nao vazio.');
    err.code = 'IKIGAI_CHANGE_EMPTY';
    throw err;
  }

  const options = opts || {};
  const target = _dimensionPath(dimension);
  const narrative = _buildNarrative(dimension, change, rationale);

  const summary = {
    id: 'ikigai:' + dimension,
    type: 'ikigai-mutation',
    intent: _summarizeChange(change),
    fields: { dimension: dimension, rationale: rationale || '' },
  };

  const verdict = PLAYBACK_GATE.present(summary, narrative, {
    mode: options.mode,
    phase: options.phase,
    cellManifest: options.cellManifest,
    qualityVerdict: options.qualityVerdict,
    prompt: options.prompt,
    reasonCollector: options.reasonCollector,
    gateId: 'playback-gate.ikigai',
  });

  if (verdict.verdict === 'PASS' || verdict.verdict === 'AUTO_PASS') {
    _applyWrite(target, change, rationale, options.author);
    return {
      verdict: verdict.verdict,
      applied: true,
      path: target,
    };
  }

  return {
    verdict: verdict.verdict,
    applied: false,
    reason: verdict.reason || null,
  };
}

module.exports = {
  write: write,
  VALID_DIMENSIONS: VALID_DIMENSIONS,
};
