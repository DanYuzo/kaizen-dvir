'use strict';

// AC 5: `frameworkProtection: false` triggers a visible pt-BR alert in the
// `--memory` section AND in default doctor output (R-009 mitigation).
//
// We exercise the memory-reporter's explicit `frameworkProtection` opt
// (the same channel `bin/kaizen.js` uses internally after reading
// dvir-config.yaml). This isolates the test from the real config file.

const { test } = require('node:test');
const assert = require('node:assert');
const {
  mkSandbox,
  rmSandbox,
  seedAllIkigai,
  freshDoctorReporter,
} = require('./_helpers');

test('--memory renders R-009 alert when frameworkProtection is false (AC 5)', () => {
  const sb = mkSandbox('alert-mem');
  try {
    seedAllIkigai(sb);
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: false });
    assert.match(out, /Memória:/);
    assert.match(
      out,
      /Aviso: frameworkProtection desligado/,
      'R-009 alert should appear inside --memory'
    );
    assert.match(out, /L1 e L2 sem proteção/);
    assert.match(out, /Reative em dvir-config\.yaml/);
  } finally {
    rmSandbox(sb);
  }
});

test('--memory does NOT render alert when frameworkProtection is true (AC 5)', () => {
  const sb = mkSandbox('alert-off');
  try {
    seedAllIkigai(sb);
    const reporter = freshDoctorReporter('memory-reporter.js');
    const out = reporter.render({ frameworkProtection: true });
    assert.ok(
      !/frameworkProtection desligado/.test(out),
      'alert must not appear when toggle on'
    );
  } finally {
    rmSandbox(sb);
  }
});

test('messages.ALERT_FRAMEWORK_PROTECTION matches AC 5 normative wording', () => {
  const messages = require('../../../.kaizen-dvir/dvir/doctor/messages.js');
  assert.strictEqual(
    messages.ALERT_FRAMEWORK_PROTECTION,
    'Aviso: frameworkProtection desligado. L1 e L2 sem proteção. Reative em dvir-config.yaml.',
    'alert wording is normative — see story Dev Notes line 225'
  );
});
