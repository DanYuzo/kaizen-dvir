'use strict';

/**
 * ikigai-reader.js — Read-only API for the 4 Ikigai dimensions.
 *
 * Public contract:
 *   - readDimension(dimension) — accepts only `o-que-faco`, `quem-sou`,
 *     `para-quem`, `como-faco`. Returns the parsed structure
 *     `{ dimension, path, title, sections: { [name]: body } }`.
 *
 * Read-only by design (FR-027 prerequisite):
 *   This module exposes NO write method. The full `module.exports`
 *   surface is `{ readDimension, VALID_DIMENSIONS }`. Cells that need
 *   to mutate the Ikigai must route the change through the Playback
 *   Gate (M3.4), which then calls a separate `ikigai-writer.js`.
 *
 * Section parsing:
 *   Heading-split on H2 markers (`## ...`). Plain-text body retained
 *   verbatim between headers. No external markdown library.
 *
 * Constraints:
 *   - CON-002: CommonJS, ES2022.
 *   - CON-003: stdlib only — `node:fs`, `node:path`.
 */

const fs = require('node:fs');
const path = require('node:path');

const VALID_DIMENSIONS = Object.freeze([
  'o-que-faco',
  'quem-sou',
  'para-quem',
  'como-faco',
]);

function _projectRoot() {
  return path.resolve(__dirname, '..', '..', '..');
}

function _ikigaiRoot() {
  if (process.env.KAIZEN_IKIGAI_DIR) {
    return process.env.KAIZEN_IKIGAI_DIR;
  }
  return path.join(_projectRoot(), 'refs', 'ikigai');
}

function _dimensionPath(dimension) {
  return path.join(_ikigaiRoot(), dimension + '.md');
}

/**
 * Parse a markdown buffer into title + section map.
 * Title is the first H1 line; body lines until the first H2 are discarded
 * to keep the section map flat. Each H2 becomes a section key whose value
 * is the joined body until the next H2 or EOF.
 */
function _parseSections(text) {
  const lines = text.split(/\r?\n/);
  let title = null;
  const sections = {};
  let currentSection = null;
  let currentBody = [];

  function flush() {
    if (currentSection !== null) {
      sections[currentSection] = currentBody.join('\n').trim();
    }
  }

  for (const line of lines) {
    if (title === null && /^#\s+/.test(line)) {
      title = line.replace(/^#\s+/, '').trim();
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      currentSection = line.replace(/^##\s+/, '').trim();
      currentBody = [];
      continue;
    }
    if (currentSection !== null) {
      currentBody.push(line);
    }
  }
  flush();
  return { title: title, sections: sections };
}

/**
 * Read a single Ikigai dimension and return its parsed structure.
 * @param {'o-que-faco'|'quem-sou'|'para-quem'|'como-faco'} dimension
 * @returns {{ dimension: string, path: string, title: string|null, sections: Object<string,string> }}
 * @throws {Error} when the dimension name is invalid or the file is missing.
 */
function readDimension(dimension) {
  if (!VALID_DIMENSIONS.includes(dimension)) {
    throw new Error(
      'dimensão inválida: "' + String(dimension) + '". ' +
        'use uma destas: ' + VALID_DIMENSIONS.join(', ') + '.'
    );
  }
  const target = _dimensionPath(dimension);
  if (!fs.existsSync(target)) {
    throw new Error(
      'documento do Ikigai não encontrado em ' + target + '. ' +
        'rode `kaizen init` ou crie o arquivo manualmente.'
    );
  }
  const raw = fs.readFileSync(target, 'utf8');
  const parsed = _parseSections(raw);
  return {
    dimension: dimension,
    path: target,
    title: parsed.title,
    sections: parsed.sections,
  };
}

module.exports = {
  readDimension: readDimension,
  VALID_DIMENSIONS: VALID_DIMENSIONS,
};
