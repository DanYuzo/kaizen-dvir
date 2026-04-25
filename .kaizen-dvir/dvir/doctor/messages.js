'use strict';

/**
 * messages.js — Centralized pt-BR strings for `kaizen doctor`.
 *
 * Owned by M3.5. Single source of truth for every user-facing string the
 * doctor renders. Keeping the strings here prevents drift between the
 * default-output banner and the per-section repeat (e.g. the
 * frameworkProtection alert appears in default output AND inside the
 * `--memory` section — same wording from the same constant).
 *
 * Style follows `diretrizes-escrita.md`:
 *   - short sentences
 *   - present tense
 *   - active voice
 *   - no adverbs
 *
 * Identifiers (cell names, paths, timestamps, gate ids) stay literal —
 * never translated. CON-002 CommonJS / ES2022. CON-003 stdlib only.
 */

// Section headers (default output and per-flag headers).
const HEADER_TITLE = 'KaiZen doctor';
const HEADER_HOOKS = 'Hooks carregados:';
const HEADER_GATES = 'Gates (últimos 100 veredictos):';
const HEADER_MEMORY = 'Memória:';
const HEADER_CELLS = 'Células instaladas:';
const HEADER_PROMOTION = 'Candidatos de promoção:';

// Memory sub-headers.
const SUBHEADER_IKIGAI = '  Ikigai:';
const SUBHEADER_MEMORY_PER_CELL = '  MEMORY.md por célula:';
const SUBHEADER_HANDOFFS = '  Handoffs:';
const SUBHEADER_WAIVERS = '  Waivers:';

// Status tokens.
const STATUS_PRESENT = 'presente';
const STATUS_ABSENT = 'ausente';
const STATUS_EMPTY = 'vazio';
const STATUS_OK = 'ok';
const STATUS_FAIL = 'falha';
const STATUS_ACTIVE = 'ativa';
const STATUS_BOOTABLE = 'bootável';
const STATUS_ERROR = 'erro';

// Verdict tokens (gates) — pt-BR rendering of EN machine verdicts.
const VERDICT_LABELS = Object.freeze({
  PASS: 'aprovado',
  CONCERNS: 'atenções',
  FAIL: 'rejeitado',
  WAIVED: 'waiver',
  ADJUST: 'ajustar',
  HALT: 'rejeitado',
  AUTO_PASS: 'aprovado',
});

// frameworkProtection alert (R-009).
const ALERT_FRAMEWORK_PROTECTION =
  'Aviso: frameworkProtection desligado. L1 e L2 sem proteção. Reative em dvir-config.yaml.';

// OQ-006 heuristic notice — surfaces the open question when a log dir
// exceeds the heuristic ceiling. The expert decides retention in M4.
const OQ006_THRESHOLD = 10000;
function oq006Notice(dirRel, count) {
  return (
    'Aviso: .kaizen/logs/' +
    dirRel +
    ' contém ' +
    count +
    ' entradas. Política de retenção pendente (OQ-006).'
  );
}

// Gate type labels (for --gates aggregator).
const GATE_TYPES = Object.freeze({
  quality: 'quality',
  playback: 'playback',
  schema: 'schema',
  authority: 'authority',
  reuse: 'reuse',
});

// Promotion prompt (AC 9). Normative wording — do not edit without amending
// the AC. The expert sees this verbatim before any commandments append.
const PROMPT_COMMANDMENTS_DOUBLE_CONFIRM =
  'Promover padrão para Commandments. Confirma alteração lex-level? [sim/não]';

// Empty-list fallbacks.
const EMPTY_VERDICTS = '  nenhum veredicto registrado.';
const EMPTY_CELLS = '  nenhuma célula instalada.';
const EMPTY_PROMOTIONS = '  0';
const EMPTY_HANDOFFS = '  0';
const EMPTY_WAIVERS = '  0';
const EMPTY_MEMORIES = '  nenhuma MEMORY.md registrada.';

module.exports = {
  HEADER_TITLE: HEADER_TITLE,
  HEADER_HOOKS: HEADER_HOOKS,
  HEADER_GATES: HEADER_GATES,
  HEADER_MEMORY: HEADER_MEMORY,
  HEADER_CELLS: HEADER_CELLS,
  HEADER_PROMOTION: HEADER_PROMOTION,
  SUBHEADER_IKIGAI: SUBHEADER_IKIGAI,
  SUBHEADER_MEMORY_PER_CELL: SUBHEADER_MEMORY_PER_CELL,
  SUBHEADER_HANDOFFS: SUBHEADER_HANDOFFS,
  SUBHEADER_WAIVERS: SUBHEADER_WAIVERS,
  STATUS_PRESENT: STATUS_PRESENT,
  STATUS_ABSENT: STATUS_ABSENT,
  STATUS_EMPTY: STATUS_EMPTY,
  STATUS_OK: STATUS_OK,
  STATUS_FAIL: STATUS_FAIL,
  STATUS_ACTIVE: STATUS_ACTIVE,
  STATUS_BOOTABLE: STATUS_BOOTABLE,
  STATUS_ERROR: STATUS_ERROR,
  VERDICT_LABELS: VERDICT_LABELS,
  ALERT_FRAMEWORK_PROTECTION: ALERT_FRAMEWORK_PROTECTION,
  OQ006_THRESHOLD: OQ006_THRESHOLD,
  oq006Notice: oq006Notice,
  GATE_TYPES: GATE_TYPES,
  PROMPT_COMMANDMENTS_DOUBLE_CONFIRM: PROMPT_COMMANDMENTS_DOUBLE_CONFIRM,
  EMPTY_VERDICTS: EMPTY_VERDICTS,
  EMPTY_CELLS: EMPTY_CELLS,
  EMPTY_PROMOTIONS: EMPTY_PROMOTIONS,
  EMPTY_HANDOFFS: EMPTY_HANDOFFS,
  EMPTY_WAIVERS: EMPTY_WAIVERS,
  EMPTY_MEMORIES: EMPTY_MEMORIES,
};
