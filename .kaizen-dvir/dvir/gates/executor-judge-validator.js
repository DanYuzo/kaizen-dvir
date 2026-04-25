'use strict';

/**
 * executor-judge-validator.js — Executor-≠-Judge invariant (FR-019, AC-206).
 *
 * Public contract:
 *   validateSeparation(executorRef, judgeRef)
 *     -> { valid: boolean, reason: string|null }
 *
 * Rules (PRD §07 Separação de Papéis):
 *   1. When `executorRef` and `judgeRef` resolve to the same sub-agent the
 *      invariant is violated and the call MUST be rejected.
 *   2. Single-sub-agent cells satisfy the invariant by delegating judgment
 *      to (a) an automated checklist, declared as
 *      `{ type: 'checklist', id: '<checklist-id>' }`, or (b) the literal
 *      string `'expert'`. In both cases the validator PASSES even when the
 *      executor reference matches the cell's only sub-agent.
 *
 * Reference resolution:
 *   References may be plain strings (sub-agent ids) or objects with `type`
 *   and `id` properties. The validator compares normalised ids — string
 *   `'sub-agent-x'` matches `{ type: 'sub-agent', id: 'sub-agent-x' }`.
 *
 * pt-BR rejection messages cite AC-206 / FR-019 so downstream gate verdict
 * logs render the expected text for the expert.
 *
 * CON-002 CommonJS / ES2022. CON-003 stdlib only.
 */

function _normalise(ref) {
  if (typeof ref === 'string') {
    return { type: 'sub-agent', id: ref };
  }
  if (ref && typeof ref === 'object') {
    const type = typeof ref.type === 'string' ? ref.type : 'sub-agent';
    const id = typeof ref.id === 'string' ? ref.id : null;
    return { type: type, id: id };
  }
  return { type: 'unknown', id: null };
}

/**
 * Verify that an executor and a judge are distinct.
 *
 * @param {string|object} executorRef
 * @param {string|object} judgeRef
 * @returns {{valid: boolean, reason: string|null}}
 */
function validateSeparation(executorRef, judgeRef) {
  if (executorRef === undefined || executorRef === null) {
    return {
      valid: false,
      reason:
        'executor ausente. AC-206 exige referencia de executor explicita.',
    };
  }
  if (judgeRef === undefined || judgeRef === null) {
    return {
      valid: false,
      reason:
        'judge ausente. AC-206 exige referencia de judge explicita.',
    };
  }

  const judge = _normalise(judgeRef);

  // Exception path for single-sub-agent cells.
  if (judge.type === 'checklist') {
    if (!judge.id) {
      return {
        valid: false,
        reason:
          'judge do tipo checklist exige id declarado. AC-206 / FR-019.',
      };
    }
    return { valid: true, reason: null };
  }
  if (judge.type === 'sub-agent' && judge.id === 'expert') {
    return { valid: true, reason: null };
  }
  // Also accept a literal string 'expert' explicitly.
  if (typeof judgeRef === 'string' && judgeRef === 'expert') {
    return { valid: true, reason: null };
  }

  const executor = _normalise(executorRef);

  if (executor.type === judge.type && executor.id === judge.id) {
    return {
      valid: false,
      reason:
        'executor e judge sao a mesma referencia (' +
        executor.id +
        '). AC-206 / FR-019: executor nao pode julgar o proprio output.',
    };
  }

  return { valid: true, reason: null };
}

module.exports = {
  validateSeparation: validateSeparation,
};
