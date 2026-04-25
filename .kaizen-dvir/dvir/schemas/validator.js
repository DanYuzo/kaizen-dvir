'use strict';

/**
 * validator.js — Minimal JSON-Schema (Draft 7) subset validator.
 *
 * Scope (what this implements — strictly what celula-schema.json and
 * handoff-schema.json need):
 *   - type: "object" | "array" | "string"
 *   - required: [<field>...]
 *   - additionalProperties: false
 *   - properties: { <name>: <subschema> }
 *   - items: <subschema>
 *   - minLength (string)
 *   - minProperties (object)
 *   - maxItems (array) — added in M3.2 for handoff list caps (decisions <= 5,
 *     files_modified <= 10, blockers <= 3)
 *
 * Explicitly OUT of scope (punted; documented for @architect/@qa gate):
 *   - $ref, allOf/oneOf/anyOf/not
 *   - pattern, format, enum, const
 *   - number/integer constraints (minimum, multipleOf, etc.)
 *   - dependencies, patternProperties, propertyNames, if/then/else
 *   - additionalProperties as a schema (only boolean false supported)
 *
 * Rationale: CON-003 forbids external deps. celula-schema.json uses only the
 * features above; a 150-line validator is easier to audit than pulling ajv.
 * If/when M3 needs richer features, this file grows additively.
 *
 * Error messages: pt-BR (user-facing, Language Policy D-v1.4-06). Keys,
 * types, and internal messages stay EN per machine-instruction policy.
 *
 * Norway Problem defense: strict type checks reject any value whose JS type
 * does not match the declared schema type. If upstream parsing coerces
 * `no` -> false or `1.0` -> number, the validator sees a boolean/number
 * where a string is expected and emits a pt-BR type error naming the field.
 * (CON-002 CommonJS / ES2022; CON-003 stdlib only.)
 */

const PT_BR_TYPES = Object.freeze({
  string: 'texto',
  number: 'numero',
  boolean: 'booleano',
  object: 'objeto',
  array: 'lista',
  null: 'nulo',
  undefined: 'ausente',
});

function _typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function _ptType(jsType) {
  return PT_BR_TYPES[jsType] || jsType;
}

function _pathString(segments) {
  if (segments.length === 0) return '(raiz)';
  return segments
    .map((s) => (typeof s === 'number' ? '[' + s + ']' : s))
    .join('.');
}

/**
 * Validate `data` against `schema`. Pure function — no I/O, no mutation.
 * @param {object} schema Draft-7 subset schema (see header for supported keys).
 * @param {*} data Value to validate.
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
function validate(schema, data) {
  const errors = [];
  _walk(schema, data, [], errors);
  return { valid: errors.length === 0, errors: errors };
}

function _walk(schema, data, pathSegs, errors) {
  if (!schema || typeof schema !== 'object') return;

  // Type check first — everything else is meaningful only when type matches.
  if (typeof schema.type === 'string') {
    const actual = _typeOf(data);
    const expected = schema.type;
    const typeMatches =
      (expected === 'array' && actual === 'array') ||
      (expected === 'object' &&
        actual === 'object' &&
        data !== null &&
        !Array.isArray(data)) ||
      (expected === 'string' && actual === 'string') ||
      (expected === 'number' && actual === 'number') ||
      (expected === 'boolean' && actual === 'boolean');

    if (!typeMatches) {
      errors.push({
        path: _pathString(pathSegs),
        message:
          "Tipo invalido para '" +
          _pathString(pathSegs) +
          "': esperado " +
          _ptType(expected) +
          ', recebido ' +
          _ptType(actual) +
          '.',
      });
      // Do not recurse on type mismatch — would cascade useless errors.
      return;
    }
  }

  // Object-specific checks.
  if (schema.type === 'object') {
    // required
    if (Array.isArray(schema.required)) {
      for (const req of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(data, req)) {
          errors.push({
            path: _pathString(pathSegs.concat(req)),
            message:
              "Campo obrigatorio ausente: '" +
              req +
              "' em " +
              _pathString(pathSegs) +
              '.',
          });
        }
      }
    }

    // minProperties
    if (typeof schema.minProperties === 'number') {
      const keys = Object.keys(data);
      if (keys.length < schema.minProperties) {
        errors.push({
          path: _pathString(pathSegs),
          message:
            "Objeto '" +
            _pathString(pathSegs) +
            "' precisa de ao menos " +
            schema.minProperties +
            ' propriedade(s); recebido ' +
            keys.length +
            '.',
        });
      }
    }

    // additionalProperties: false
    if (schema.additionalProperties === false) {
      const allowed = schema.properties
        ? Object.keys(schema.properties)
        : [];
      for (const key of Object.keys(data)) {
        if (!allowed.includes(key)) {
          errors.push({
            path: _pathString(pathSegs.concat(key)),
            message:
              "Campo nao reconhecido: '" +
              key +
              "' em " +
              _pathString(pathSegs) +
              '. Remova ou confira a grafia.',
          });
        }
      }
    }

    // Recurse into properties.
    if (schema.properties && typeof schema.properties === 'object') {
      for (const key of Object.keys(schema.properties)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          _walk(schema.properties[key], data[key], pathSegs.concat(key), errors);
        }
      }
    }
  }

  // Array-specific checks.
  if (schema.type === 'array') {
    if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) {
      errors.push({
        path: _pathString(pathSegs),
        message:
          "Lista '" +
          _pathString(pathSegs) +
          "' tem " +
          data.length +
          ' item(ns); maximo permitido ' +
          schema.maxItems +
          '.',
      });
    }
    if (schema.items && typeof schema.items === 'object') {
      for (let i = 0; i < data.length; i++) {
        _walk(schema.items, data[i], pathSegs.concat(i), errors);
      }
    }
  }

  // String-specific checks.
  if (schema.type === 'string' && typeof schema.minLength === 'number') {
    if (data.length < schema.minLength) {
      errors.push({
        path: _pathString(pathSegs),
        message:
          "Campo '" +
          _pathString(pathSegs) +
          "' tem tamanho " +
          data.length +
          '; minimo exigido ' +
          schema.minLength +
          '.',
      });
    }
  }
}

module.exports = { validate: validate };
