'use strict';

/**
 * promotion-reporter.js — `kaizen doctor --promotion` (no sub-command)
 * (M3.5, AC 7, FR-025).
 *
 * Lists current promotion candidates from
 * `.kaizen/logs/promotion-candidates.yaml`. Each row carries the candidate
 * id, source cell, date, and a pattern excerpt (truncated for readability).
 *
 * Read-only — never mutates the candidates file. Approval / rejection
 * flow lives in `pattern-promoter.js` and is wired by `bin/kaizen.js`.
 *
 * pt-BR labels. Identifiers (cell name, ids) literal.
 */

const path = require('node:path');

const messages = require('./messages.js');
const promoter = require('../memory/pattern-promoter.js');

const EXCERPT_LIMIT = 80;

function _truncate(s) {
  if (typeof s !== 'string') return '';
  if (s.length <= EXCERPT_LIMIT) return s;
  return s.slice(0, EXCERPT_LIMIT) + '...';
}

/**
 * Render the `--promotion` candidate list. Returns a string ending with `\n`.
 *
 * @returns {string}
 */
function render() {
  const candidates = promoter.listCandidates();
  const lines = [];
  if (candidates.length === 0) {
    lines.push(messages.HEADER_PROMOTION + ' 0');
    lines.push('');
    return lines.join('\n') + '\n';
  }
  lines.push(messages.HEADER_PROMOTION + ' ' + candidates.length);
  for (const c of candidates) {
    lines.push(
      '  ' + c.id + '  ' + (c.source_cell || '-') + '  ' + (c.date || '-')
    );
    lines.push('    padrão: ' + _truncate(c.pattern));
  }
  lines.push('');
  return lines.join('\n') + '\n';
}

module.exports = {
  render: render,
  EXCERPT_LIMIT: EXCERPT_LIMIT,
};
