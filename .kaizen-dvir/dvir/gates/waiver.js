'use strict';

/**
 * waiver.js — Quality-Gate waiver system (FR-013, AC-203, NFR-022).
 *
 * Public contract (FROZEN — consumed by M3.5 `kaizen doctor --memory`):
 *   recordWaiver({ gateId, artifactId, reason, approvedBy, scope, date? })
 *     -> { recorded: true, path: <abs>, waiver: <object> }
 *     | { recorded: false, error: <pt-BR string> }
 *
 *   validateWaiver(waiver)
 *     -> { valid: boolean, reason: string|null }
 *
 *   requestWaiver({ gateId, artifactId, violationSummary, downstreamImpact, scope })
 *     -> { promptText: <pt-BR string> }
 *
 * Required fields recorded under .kaizen/logs/waivers/{timestamp}.yaml
 * (frozen schema for M3.5 consumption):
 *   gate_id, artifact_id, reason, approved_by, date, scope
 *
 * NON-NEGOTIABLE hard-lock (PRD §07): waivers targeting Commandment I
 * (CLI First) or Commandment II (Authority Boundaries) are rejected
 * regardless of `approved_by`. Future NON-NEGOTIABLE Commandments inherit
 * the same hard-lock by extending `NON_NEGOTIABLE_COMMANDMENTS`.
 *
 * YAML serialisation is hand-rolled over the fixed waiver schema (CON-003 —
 * zero external deps). Strings are double-quoted with backslash-escaping;
 * the schema has no nested mappings, no sequences, no special floats.
 *
 * CON-002 CommonJS / ES2022.
 */

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_APPROVED_BY = 'expert';
const NON_NEGOTIABLE_COMMANDMENTS = Object.freeze(['I', 'II']);

function _logsRoot() {
  if (process.env.KAIZEN_LOGS_DIR) {
    return process.env.KAIZEN_LOGS_DIR;
  }
  // up 4: gates -> dvir -> .kaizen-dvir -> <projectRoot>
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  return path.join(projectRoot, '.kaizen', 'logs');
}

function _waiversDir() {
  return path.join(_logsRoot(), 'waivers');
}

function _safeFilename(date) {
  // Filesystem-safe ISO timestamp. `:` and `.` are removed for cross-platform
  // compatibility (Windows rejects `:` in filenames).
  return date.replace(/[:.]/g, '-');
}

function _escapeForDoubleQuoted(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Detect whether the targeted gate references a NON-NEGOTIABLE Commandment.
 * Heuristic: gateId or scope contains the substring "commandment-{I|II}" or
 * "commandment_{i|ii}" (case-insensitive). Any match triggers the hard-lock.
 */
function _targetsNonNegotiable(gateId, scope) {
  const haystack = (
    String(gateId || '') +
    ' ' +
    String(scope || '')
  ).toLowerCase();
  for (const c of NON_NEGOTIABLE_COMMANDMENTS) {
    const tag = c.toLowerCase();
    // Match "commandment i", "commandment-i", "commandment_i" boundaries.
    const re = new RegExp(
      'commandment[\\s\\-_]+' + tag + '(?![ivx])',
      'i'
    );
    if (re.test(haystack)) {
      return c;
    }
  }
  return null;
}

/**
 * Serialise a flat waiver object to YAML 1.2 with double-quoted strings.
 * The schema is fixed (6 keys, all strings) so this is sufficient.
 *
 * @param {object} w
 * @returns {string}
 */
function _serialiseYaml(w) {
  const order = [
    'gate_id',
    'artifact_id',
    'reason',
    'approved_by',
    'date',
    'scope',
  ];
  const lines = [];
  for (const key of order) {
    const v = w[key];
    if (v === undefined || v === null) continue;
    lines.push(key + ': "' + _escapeForDoubleQuoted(v) + '"');
  }
  return lines.join('\n') + '\n';
}

/**
 * Build the pt-BR prompt text the expert sees before approving a waiver.
 * Returns the text only; orchestration of stdin/stdout belongs to the CLI.
 *
 * @param {object} ctx
 * @returns {{promptText: string}}
 */
function requestWaiver(ctx) {
  const gateId = ctx && ctx.gateId ? ctx.gateId : '(gate desconhecido)';
  const artifactId = ctx && ctx.artifactId ? ctx.artifactId : '(artefato desconhecido)';
  const violationSummary =
    ctx && ctx.violationSummary
      ? ctx.violationSummary
      : '(violacao nao descrita)';
  const downstreamImpact =
    ctx && ctx.downstreamImpact
      ? ctx.downstreamImpact
      : '(impacto downstream nao descrito)';
  const scope = ctx && ctx.scope ? ctx.scope : '(escopo nao declarado)';

  const blocked = _targetsNonNegotiable(gateId, scope);
  const lines = [
    'waiver solicitado.',
    'gate: ' + gateId,
    'artefato: ' + artifactId,
    'violacao: ' + violationSummary,
    'impacto downstream: ' + downstreamImpact,
    'escopo: ' + scope,
  ];
  if (blocked) {
    lines.push(
      'aviso: commandment ' +
        blocked +
        ' e NON-NEGOTIABLE e nao aceita exceção.'
    );
  } else {
    lines.push('aprove com approved_by: expert para registrar.');
  }
  return { promptText: lines.join('\n') };
}

/**
 * Validate a waiver object against the FR-013 contract.
 *
 * @param {object} waiver
 * @returns {{valid: boolean, reason: string|null}}
 */
function validateWaiver(waiver) {
  if (!waiver || typeof waiver !== 'object') {
    return {
      valid: false,
      reason: 'waiver invalido. esperado objeto com 6 campos obrigatorios.',
    };
  }
  // Required fields per AC 8.
  const required = [
    'gate_id',
    'artifact_id',
    'reason',
    'approved_by',
    'date',
    'scope',
  ];
  for (const f of required) {
    if (
      waiver[f] === undefined ||
      waiver[f] === null ||
      String(waiver[f]).trim() === ''
    ) {
      return {
        valid: false,
        reason:
          'waiver invalido. campo obrigatorio ausente: ' +
          f +
          '. AC-203 / FR-013.',
      };
    }
  }
  // Literal approved_by check.
  if (waiver.approved_by !== REQUIRED_APPROVED_BY) {
    return {
      valid: false,
      reason:
        'waiver invalido. campo approved_by: expert e obrigatorio.',
    };
  }
  // NON-NEGOTIABLE hard-lock — applies regardless of approved_by.
  const blocked = _targetsNonNegotiable(waiver.gate_id, waiver.scope);
  if (blocked) {
    return {
      valid: false,
      reason:
        'waiver rejeitado. commandment ' +
        blocked +
        ' e NON-NEGOTIABLE e nao aceita exceção.',
    };
  }
  return { valid: true, reason: null };
}

/**
 * Persist an approved waiver to .kaizen/logs/waivers/{timestamp}.yaml.
 * Validation happens first; rejected waivers are NOT written.
 *
 * @param {object} input { gateId, artifactId, reason, approvedBy, scope, date? }
 * @returns {{recorded: boolean, path: string|null, waiver: object|null, error: string|null}}
 */
function recordWaiver(input) {
  const date = (input && input.date) || new Date().toISOString();
  const waiver = {
    gate_id: input && input.gateId,
    artifact_id: input && input.artifactId,
    reason: input && input.reason,
    approved_by: input && input.approvedBy,
    date: date,
    scope: input && input.scope,
  };
  const verdict = validateWaiver(waiver);
  if (!verdict.valid) {
    return {
      recorded: false,
      path: null,
      waiver: null,
      error: verdict.reason,
    };
  }

  const dir = _waiversDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = _safeFilename(date) + '.yaml';
  const file = path.join(dir, filename);
  fs.writeFileSync(file, _serialiseYaml(waiver), 'utf8');

  return { recorded: true, path: file, waiver: waiver, error: null };
}

module.exports = {
  requestWaiver: requestWaiver,
  recordWaiver: recordWaiver,
  validateWaiver: validateWaiver,
  REQUIRED_APPROVED_BY: REQUIRED_APPROVED_BY,
  NON_NEGOTIABLE_COMMANDMENTS: NON_NEGOTIABLE_COMMANDMENTS,
};
