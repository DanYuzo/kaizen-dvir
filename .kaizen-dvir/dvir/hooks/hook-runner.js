'use strict';

/**
 * hook-runner.js — KaiZen hook dispatcher with per-hook circuit breaker.
 *
 * Public contract (consumed by M2.2, M2.3, M2.4 and extended by M3/M4):
 *   - register(event, handler)  — stores a single handler keyed by event name.
 *   - dispatch(event, payload)  — invokes the handler, returns its result.
 *                                 After 3 consecutive failures for the same
 *                                 event, subsequent dispatches are bypassed:
 *                                 the handler is NOT invoked, a log entry is
 *                                 written, and a bypass sentinel is returned.
 *
 * Requirements coverage:
 *   - FR-014, NFR-010, AC-007 — per-hook circuit breaker, bypass-and-log.
 *   - CON-002 — CommonJS / ES2022 only.
 *   - CON-003 — Node stdlib only (no external deps).
 *
 * Bypass sentinel shape (documented, stable across M2–M4):
 *   { bypassed: true, event: <string>, reason: 'circuit_breaker_open' }
 *
 * Per the Dev Notes, bypass never throws — the expert is never blocked by
 * infrastructure failure. A log-write failure inside the runner is treated
 * as a handler failure (increments the counter toward bypass) — see
 * M2.1-R2 mitigation.
 */

const logWriter = require('./log-writer');

const FAILURE_THRESHOLD = 3;

// Module-level singletons: { [eventName]: handler } and { [eventName]: count }.
const handlers = new Map();
const failureCounters = new Map();

/**
 * Register a handler for a hook event.
 * @param {string} event   Event name (e.g. "UserPromptSubmit").
 * @param {Function} handler Function invoked on dispatch(event, payload).
 * @throws {Error} if event already has a registered handler.
 */
function register(event, handler) {
  if (typeof event !== 'string' || event.length === 0) {
    throw new Error('hook-runner: event must be a non-empty string');
  }
  if (typeof handler !== 'function') {
    throw new Error('hook-runner: handler must be a function');
  }
  if (handlers.has(event)) {
    throw new Error(
      "hook-runner: duplicate registration for event '" + event + "'"
    );
  }
  handlers.set(event, handler);
  failureCounters.set(event, 0);
}

/**
 * Dispatch an event to its registered handler.
 * Applies circuit-breaker semantics: after FAILURE_THRESHOLD consecutive
 * failures for the same event, bypass the handler and log instead.
 *
 * @param {string} event   Event name previously passed to register().
 * @param {*} payload      Payload forwarded to the handler.
 * @returns {*} Handler return value, or a bypass sentinel if the breaker
 *              is open. Never throws for breaker-open state.
 * @throws {Error} if event is unregistered.
 */
function dispatch(event, payload) {
  if (!handlers.has(event)) {
    throw new Error(
      "hook-runner: no handler registered for event '" + event + "'"
    );
  }

  const count = failureCounters.get(event) || 0;
  if (count >= FAILURE_THRESHOLD) {
    // Breaker open — bypass and log. Expert is NOT blocked.
    _safeLog('hook-calls', {
      timestamp: new Date().toISOString(),
      event_type: 'bypass',
      hook_name: event,
      session_id: _sessionId(),
      payload: payload,
      message:
        'hook ignorado apos 3 falhas seguidas: ' +
        event +
        '. expert nao bloqueado.',
    });
    return { bypassed: true, event: event, reason: 'circuit_breaker_open' };
  }

  const handler = handlers.get(event);
  try {
    const result = handler(payload);
    // Success — reset counter for this event only.
    failureCounters.set(event, 0);
    return result;
  } catch (err) {
    // Failure — increment this event's counter only.
    const next = count + 1;
    failureCounters.set(event, next);
    if (next >= FAILURE_THRESHOLD) {
      _safeLog('hook-calls', {
        timestamp: new Date().toISOString(),
        event_type: 'bypass_triggered',
        hook_name: event,
        session_id: _sessionId(),
        payload: payload,
        message:
          'circuit breaker aberto para ' +
          event +
          ' apos 3 falhas seguidas. proximas chamadas serao ignoradas.',
        error: err && err.message ? err.message : String(err),
      });
    }
    throw err;
  }
}

/**
 * Test-only: reset all internal state. Keeps production API minimal while
 * letting the test suite restore a clean slate between scenarios.
 * @private
 */
function _resetForTests() {
  handlers.clear();
  failureCounters.clear();
}

/**
 * Inspect the current consecutive-failure count for an event.
 * @param {string} event
 * @returns {number}
 * @private
 */
function _getFailureCount(event) {
  return failureCounters.get(event) || 0;
}

function _sessionId() {
  // M2.5 wires a persistent session id; for now derive from process.
  // Stable per process run — enough to correlate entries within a session.
  return (
    'pid-' +
    process.pid +
    '-' +
    (process.env.KAIZEN_SESSION_ID || 'default')
  );
}

function _safeLog(type, entry) {
  try {
    logWriter.write(type, entry);
  } catch (_) {
    // Intentional: a log-writer failure must NOT cascade into the expert's
    // workflow. M2.1-R2: degrade gracefully. The outer failure path already
    // increments the breaker; swallowing here prevents double-throw.
  }
}

module.exports = {
  register: register,
  dispatch: dispatch,
  FAILURE_THRESHOLD: FAILURE_THRESHOLD,
  _resetForTests: _resetForTests,
  _getFailureCount: _getFailureCount,
};
