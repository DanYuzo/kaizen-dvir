'use strict';

/**
 * schema-gate.js — KaiZen M3.4 Schema Gate.
 *
 * FR-020 (validates YAML directly against JSON Schema), NFR-003 (under
 * 500ms per well-formed manifest), D-v1.1-06.
 *
 * Public contract:
 *
 *   validate(artifactPath, schemaPath, opts?) -> {
 *     verdict: 'PASS' | 'FAIL',
 *     errors: Array<{ path: string, message: string }>,
 *     durationMs: number,
 *   }
 *
 *   validateObject(artifact, schemaPath, opts?) -> same shape
 *     (used when caller already has the parsed object — e.g.
 *     handoff-engine that emits its own YAML.)
 *
 * Same call surface accepts ANY JSON Schema path:
 *   - celula-schema.json (M2.5)
 *   - handoff-schema.json (M3.2)
 *   - future contract-schema.json (M4 Yotzer)
 *
 * R5 mitigation hook (KZ-M3-R5 — applied per PO Should-Fix #2):
 *   When the artifact is a cell manifest declaring any tier-1 (chief or
 *   coordinator) agent, the gate enforces `critical_invariants:` as a
 *   required, non-empty list. Detected by:
 *     - artifact has top-level `tiers` object, AND
 *     - any tier value contains `chief: true` OR `coordinator: true` OR
 *       the tier name itself is 'chief' or 'coordinator'.
 *   Violation appends a critical pt-BR issue. The full schema-side
 *   enforcement lands with M3.5 doctor; this hook ensures the runtime
 *   gate already catches the misconfiguration today.
 *
 * YAML 1.2 strict parsing (R-015 parity with M3.2):
 *   Reuses the celula.yaml parsing approach from M2.4 PreToolUse for
 *   simple flat manifests, plus a more general parser for nested
 *   structures. Refuses implicit typing (`yes`, `no`, `on`, `off`).
 *
 * CON-002 CommonJS / ES2022. CON-003 Node stdlib only.
 * Language Policy D-v1.4-06 — pt-BR for surfaced errors.
 */

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const VALIDATOR = require('../schemas/validator.js');

function _logWriter() {
  return require(path.resolve(
    PROJECT_ROOT,
    '.kaizen-dvir',
    'dvir',
    'hooks',
    'log-writer.js'
  ));
}

function _sessionId() {
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

const VERDICTS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

// -- YAML 1.2 strict-mode reader -----------------------------------------------
// Hand-rolled parser tuned for KaiZen manifest shapes (cell manifests +
// handoff envelopes). Refuses implicit YAML 1.1 booleans (R-015).

const _IMPLICIT_BOOL_RE = /^(yes|no|on|off|true|false)$/iu;
const _NUMERIC_RE = /^-?(?:\d+(?:\.\d+)?)$/u;

function _classifyScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'block-marker', value: null };
  if (trimmed === 'null' || trimmed === '~') return { kind: 'null', value: null };
  if (trimmed === '[]') return { kind: 'inline-empty', value: [] };
  if (trimmed === '{}') return { kind: 'inline-empty', value: {} };

  // Inline list `[a, b]` — narrow support for nested tier objects.
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner.length === 0) return { kind: 'inline-empty', value: [] };
    const parts = inner.split(',').map((p) => p.trim());
    const out = [];
    for (const p of parts) {
      const cls = _classifyScalar(p);
      if (cls.kind === 'ambiguous') return cls;
      // All non-ambiguous classifications expose `cls.value` directly
      // (string, null, [], {}); no per-kind unwrapping needed.
      out.push(cls.value);
    }
    return { kind: 'inline-list', value: out };
  }

  if (trimmed.startsWith('"')) {
    if (!trimmed.endsWith('"') || trimmed.length < 2) {
      return { kind: 'ambiguous', value: trimmed, reason: 'aspas mal-formadas' };
    }
    return {
      kind: 'string',
      value: trimmed
        .slice(1, -1)
        .replace(/\\n/gu, '\n')
        .replace(/\\"/gu, '"')
        .replace(/\\\\/gu, '\\'),
    };
  }
  if (trimmed.startsWith("'")) {
    if (!trimmed.endsWith("'") || trimmed.length < 2) {
      return { kind: 'ambiguous', value: trimmed, reason: 'aspas mal-formadas' };
    }
    return {
      kind: 'string',
      value: trimmed.slice(1, -1).replace(/''/gu, "'"),
    };
  }
  if (trimmed === 'true') return { kind: 'boolean', value: true };
  if (trimmed === 'false') return { kind: 'boolean', value: false };
  if (_IMPLICIT_BOOL_RE.test(trimmed)) {
    return {
      kind: 'ambiguous',
      value: trimmed,
      reason: 'valor sem aspas pode ser booleano implicito',
    };
  }
  if (_NUMERIC_RE.test(trimmed)) {
    return { kind: 'number', value: Number(trimmed) };
  }
  return { kind: 'string', value: trimmed };
}

function _measureIndent(line) {
  let i = 0;
  while (i < line.length && line[i] === ' ') i++;
  return i;
}

function _stripComment(line) {
  // Strip `#` to EOL only when not inside quotes. Tiny manifest scope —
  // enough for our well-formed inputs.
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '#' && !inDouble && !inSingle) {
      return line.slice(0, i).replace(/\s+$/u, '');
    }
  }
  return line.replace(/\s+$/u, '');
}

function _parseYaml(yamlText) {
  const lines = String(yamlText).split(/\r?\n/u).map(_stripComment);
  const ctx = { lines: lines, idx: 0 };
  const result = _parseBlock(ctx, 0);
  return result === null ? {} : result;
}

function _parseBlock(ctx, expectedIndent) {
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) return null;
    if (indent > expectedIndent) {
      throw new Error(
        'manifesto invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (stripped.startsWith('- ') || stripped === '-') {
      return _parseSequence(ctx, expectedIndent);
    }
    return _parseMapping(ctx, expectedIndent);
  }
  return null;
}

function _parseMapping(ctx, expectedIndent) {
  const map = {};
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) return map;
    if (indent > expectedIndent) {
      throw new Error(
        'manifesto invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (stripped.startsWith('- ')) {
      throw new Error(
        'manifesto invalido. lista encontrada onde mapeamento era esperado na linha ' +
          (ctx.idx + 1) +
          '.'
      );
    }
    const colonAt = stripped.indexOf(':');
    if (colonAt === -1) {
      throw new Error(
        "manifesto invalido. linha sem ':' na posicao " + (ctx.idx + 1) + '.'
      );
    }
    const key = stripped.slice(0, colonAt).trim();
    const valuePart = stripped.slice(colonAt + 1);
    ctx.idx++;
    const cls = _classifyScalar(valuePart);
    if (cls.kind === 'ambiguous') {
      throw new Error(
        'manifesto recusado. valor ambiguo no campo ' + key + ': use aspas.'
      );
    }
    if (cls.kind === 'block-marker') {
      const child = _parseBlock(ctx, expectedIndent + 2);
      map[key] = child === null ? {} : child;
    } else {
      map[key] = cls.value;
    }
  }
  return map;
}

function _parseSequence(ctx, expectedIndent) {
  const list = [];
  while (ctx.idx < ctx.lines.length) {
    const line = ctx.lines[ctx.idx];
    if (line.trim().length === 0) {
      ctx.idx++;
      continue;
    }
    const indent = _measureIndent(line);
    if (indent < expectedIndent) return list;
    if (indent > expectedIndent) {
      throw new Error(
        'manifesto invalido. indentacao inesperada na linha ' + (ctx.idx + 1) + '.'
      );
    }
    const stripped = line.slice(indent);
    if (!stripped.startsWith('- ') && stripped !== '-') return list;
    const after = stripped === '-' ? '' : stripped.slice(2);

    // Inline mapping after the dash: `- key: value` opens a nested map.
    const colonInline = after.indexOf(':');
    if (colonInline !== -1 && !after.startsWith('"') && !after.startsWith("'")) {
      const key = after.slice(0, colonInline).trim();
      const rest = after.slice(colonInline + 1);
      const cls = _classifyScalar(rest);
      ctx.idx++;
      const item = {};
      if (cls.kind === 'ambiguous') {
        throw new Error(
          'manifesto recusado. valor ambiguo em item de lista: use aspas.'
        );
      }
      if (cls.kind === 'block-marker') {
        const child = _parseBlock(ctx, expectedIndent + 2);
        item[key] = child === null ? {} : child;
      } else {
        item[key] = cls.value;
      }
      // Continue picking up sibling keys at indent === expectedIndent + 2.
      while (ctx.idx < ctx.lines.length) {
        const next = ctx.lines[ctx.idx];
        if (next.trim().length === 0) {
          ctx.idx++;
          continue;
        }
        const nIndent = _measureIndent(next);
        if (nIndent !== expectedIndent + 2) break;
        const nStripped = next.slice(nIndent);
        if (nStripped.startsWith('- ')) break;
        const nColon = nStripped.indexOf(':');
        if (nColon === -1) break;
        const nKey = nStripped.slice(0, nColon).trim();
        const nRest = nStripped.slice(nColon + 1);
        ctx.idx++;
        const nCls = _classifyScalar(nRest);
        if (nCls.kind === 'ambiguous') {
          throw new Error(
            'manifesto recusado. valor ambiguo no campo ' + nKey + ': use aspas.'
          );
        }
        if (nCls.kind === 'block-marker') {
          const child = _parseBlock(ctx, expectedIndent + 4);
          item[nKey] = child === null ? {} : child;
        } else {
          item[nKey] = nCls.value;
        }
      }
      list.push(item);
      continue;
    }

    ctx.idx++;
    const cls = _classifyScalar(after);
    if (cls.kind === 'ambiguous') {
      throw new Error(
        'manifesto recusado. valor ambiguo em item de lista: use aspas.'
      );
    }
    if (cls.kind === 'block-marker') {
      const child = _parseBlock(ctx, expectedIndent + 2);
      list.push(child === null ? {} : child);
    } else {
      list.push(cls.value);
    }
  }
  return list;
}

// -- R5 hook: critical_invariants required for tier-1 cells -------------------

function _isTier1Manifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return false;
  if (!manifest.tiers || typeof manifest.tiers !== 'object') return false;
  for (const tierName of Object.keys(manifest.tiers)) {
    if (tierName === 'chief' || tierName === 'coordinator') return true;
    const tier = manifest.tiers[tierName];
    if (tier && typeof tier === 'object') {
      if (tier.chief === true || tier.coordinator === true) return true;
      if (tier.tier === 1 || tier.tier === '1') return true;
    }
  }
  return false;
}

function _checkCriticalInvariantsForTier1(manifest, errors) {
  if (!_isTier1Manifest(manifest)) return;
  const ci = manifest.critical_invariants;
  if (!Array.isArray(ci) || ci.length === 0) {
    errors.push({
      path: 'critical_invariants',
      message:
        'campo critical_invariants obrigatorio para celulas tier-1 ' +
        '(chief/coordinator). KZ-M3-R5 — declare ao menos uma fase critica.',
    });
  }
}

// -- log -----------------------------------------------------------------------

function _logVerdict(entry) {
  try {
    _logWriter().write('gate-verdicts', entry);
  } catch (_) {
    // Defensive.
  }
}

// -- public API ----------------------------------------------------------------

function _loadSchema(schemaPath) {
  if (typeof schemaPath !== 'string' || schemaPath.length === 0) {
    const err = new Error('schema-gate: schemaPath obrigatorio.');
    err.code = 'SCHEMA_PATH_MISSING';
    throw err;
  }
  let raw;
  try {
    raw = fs.readFileSync(schemaPath, 'utf8');
  } catch (err) {
    const e = new Error(
      'schema-gate: schema nao encontrado em ' + schemaPath + '.'
    );
    e.code = 'SCHEMA_NOT_FOUND';
    e.cause = err;
    throw e;
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    const e = new Error(
      'schema-gate: schema invalido em ' + schemaPath + '.'
    );
    e.code = 'SCHEMA_INVALID';
    e.cause = err;
    throw e;
  }
}

function _now() {
  return process.hrtime.bigint();
}

function _msSince(start) {
  return Number((process.hrtime.bigint() - start) / 1000000n);
}

/**
 * Validate an artifact file (YAML) against a JSON schema. No intermediate
 * YAML→JSON conversion file — the parser produces a JS object straight
 * from YAML and the validator runs on it.
 *
 * @param {string} artifactPath path to YAML file
 * @param {string} schemaPath   path to JSON Schema file
 * @param {object} [opts] { gateId?, isCellManifest? }
 * @returns {{ verdict: 'PASS'|'FAIL', errors: Array, durationMs: number }}
 */
function validate(artifactPath, schemaPath, opts) {
  const options = opts || {};
  const gateId = options.gateId || 'schema-gate';
  const start = _now();

  if (typeof artifactPath !== 'string' || artifactPath.length === 0) {
    const err = new Error('schema-gate: artifactPath obrigatorio.');
    err.code = 'ARTIFACT_PATH_MISSING';
    throw err;
  }

  let yamlText;
  try {
    yamlText = fs.readFileSync(artifactPath, 'utf8');
  } catch (err) {
    const result = {
      verdict: VERDICTS.FAIL,
      errors: [
        {
          path: '(arquivo)',
          message:
            'artefato nao encontrado em ' + artifactPath + '. ' +
            (err.message || 'erro de leitura.'),
        },
      ],
      durationMs: _msSince(start),
    };
    _logVerdict({
      timestamp: new Date().toISOString(),
      event_type: 'gate',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactPath,
      verdict: 'FAIL',
      durationMs: result.durationMs,
    });
    return result;
  }

  let parsed;
  try {
    parsed = _parseYaml(yamlText);
  } catch (err) {
    const result = {
      verdict: VERDICTS.FAIL,
      errors: [{ path: '(yaml)', message: err.message || 'falha ao parsear yaml.' }],
      durationMs: _msSince(start),
    };
    _logVerdict({
      timestamp: new Date().toISOString(),
      event_type: 'gate',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactPath,
      verdict: 'FAIL',
      durationMs: result.durationMs,
    });
    return result;
  }

  return _validateParsed(parsed, schemaPath, artifactPath, options, start);
}

/**
 * Validate an already-parsed object against a JSON schema. Useful when
 * the caller (e.g. handoff-engine) emits its own YAML and wants to skip
 * a re-parse. The R5 cell-manifest hook still fires when
 * `opts.isCellManifest === true`.
 */
function validateObject(artifact, schemaPath, opts) {
  const options = opts || {};
  const start = _now();
  const artifactId = (artifact && (artifact.id || artifact.path)) || '<artifact>';
  return _validateParsed(artifact, schemaPath, artifactId, options, start);
}

function _validateParsed(parsed, schemaPath, artifactId, options, start) {
  const gateId = options.gateId || 'schema-gate';

  let schema;
  try {
    schema = _loadSchema(schemaPath);
  } catch (err) {
    const result = {
      verdict: VERDICTS.FAIL,
      errors: [{ path: '(schema)', message: err.message }],
      durationMs: _msSince(start),
    };
    _logVerdict({
      timestamp: new Date().toISOString(),
      event_type: 'gate',
      hook_name: gateId,
      session_id: _sessionId(),
      gate_id: gateId,
      artifact_id: artifactId,
      verdict: 'FAIL',
      durationMs: result.durationMs,
    });
    return result;
  }

  const validation = VALIDATOR.validate(schema, parsed);
  const errors = validation.valid ? [] : validation.errors.slice();

  // R5 mitigation hook — runs on cell manifests (auto-detected via
  // `tiers` presence, or explicitly via opts.isCellManifest).
  if (options.isCellManifest === true || (parsed && parsed.tiers)) {
    _checkCriticalInvariantsForTier1(parsed, errors);
  }

  const verdict = errors.length === 0 ? VERDICTS.PASS : VERDICTS.FAIL;
  const durationMs = _msSince(start);

  const result = { verdict: verdict, errors: errors, durationMs: durationMs };

  _logVerdict({
    timestamp: new Date().toISOString(),
    event_type: 'gate',
    hook_name: gateId,
    session_id: _sessionId(),
    gate_id: gateId,
    artifact_id: artifactId,
    verdict: verdict,
    durationMs: durationMs,
    error_count: errors.length,
  });

  return result;
}

module.exports = {
  validate: validate,
  validateObject: validateObject,
  VERDICTS: VERDICTS,
  // Exposed for tests and downstream gates that need YAML parsing.
  _parseYaml: _parseYaml,
  _isTier1Manifest: _isTier1Manifest,
};
