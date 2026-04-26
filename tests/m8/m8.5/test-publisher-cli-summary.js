'use strict';

/**
 * test-publisher-cli-summary.js — M8.5 AC: the pt-BR summary printed by
 * `runYotzerPublish` (`bin/kaizen.js`) MUST include the new
 * "Skill registrada: /<slashPrefix> (1 entry + N specialists)" line
 * after a successful publish whose materialized cell carries persona
 * files. Confirms the user-facing surface stays in pt-BR per
 * Language Policy D-v1.4-06 / NFR-102.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./_helpers.js');

const KAIZEN_BIN = path.join(H.ROOT, 'bin', 'kaizen.js');

function freshKaizenBin() {
  delete require.cache[require.resolve(KAIZEN_BIN)];
  return require(KAIZEN_BIN);
}

function clearEnv() {
  delete process.env.KAIZEN_TARGET_DIR;
  delete process.env.KAIZEN_STATE_DIR;
  delete process.env.KAIZEN_LOGS_DIR;
  delete process.env.KAIZEN_HANDOFFS_DIR;
  delete process.env.KAIZEN_CELULAS_DIR;
  delete process.env.KAIZEN_YOTZER_WORK_DIR;
  delete process.env.KAIZEN_PUBLISH_CONFIRM;
  delete process.env.KAIZEN_CLAUDE_COMMANDS_DIR;
}

test('runYotzerPublish prints "Skill registrada" line in pt-BR after registration', () => {
  const work = H.makeTempDir('work');
  const celulas = H.makeTempDir('celulas-cli');
  const claudeDir = H.makeTempDir('claude-cli');
  process.env.KAIZEN_YOTZER_WORK_DIR = work;
  process.env.KAIZEN_CELULAS_DIR = celulas;
  process.env.KAIZEN_CLAUDE_COMMANDS_DIR = claudeDir;
  // Capture stdout via override.
  const origWrite = process.stdout.write.bind(process.stdout);
  let captured = '';
  process.stdout.write = (chunk) => {
    captured += chunk;
    return true;
  };
  try {
    const workId = 'wrk-cli-summary';
    const workIdDir = path.join(work, workId);
    fs.mkdirSync(workIdDir, { recursive: true });
    fs.writeFileSync(
      path.join(workIdDir, 'f9-state.json'),
      JSON.stringify({ verdict: 'PASS' }),
      'utf8'
    );
    const spec = H.buildSpec({
      name: 'celula-cli-1',
      slashPrefix: 'Kaizen:CelulaCli1',
    });
    fs.writeFileSync(
      path.join(workIdDir, 'spec.json'),
      JSON.stringify(spec),
      'utf8'
    );

    const bin = freshKaizenBin();
    const code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'publish must succeed; output=\n' + captured);

    // pt-BR confirmation block.
    assert.ok(
      /celula celula-cli-1 publicada/u.test(captured),
      'must print celula publication summary'
    );
    assert.ok(
      /Skill registrada: \/Kaizen:CelulaCli1 \(1 entry \+ 2 specialists\)/u.test(
        captured
      ),
      'must print "Skill registrada: /Kaizen:CelulaCli1 (1 entry + 2 specialists)" pt-BR line; got:\n' +
        captured
    );

    // Skill files actually exist under the env-overridden claudeDir.
    assert.ok(
      H.fileExists(path.join(claudeDir, 'Kaizen', 'CelulaCli1.md')),
      'entry skill must exist under claude commands dir'
    );
    assert.ok(
      H.fileExists(path.join(claudeDir, 'Kaizen', 'CelulaCli1', 'chief.md')),
      'chief sub-skill must exist'
    );
    assert.ok(
      H.fileExists(
        path.join(claudeDir, 'Kaizen', 'CelulaCli1', 'archaeologist.md')
      ),
      'archaeologist sub-skill must exist'
    );
  } finally {
    process.stdout.write = origWrite;
    clearEnv();
    H.rmRf(work);
    H.rmRf(celulas);
    H.rmRf(claudeDir);
  }
});

test('runYotzerPublish surfaces cell-registry warnings under "Aviso:" prefix', () => {
  const work = H.makeTempDir('work-warn');
  const celulas = H.makeTempDir('celulas-warn');
  const claudeDir = H.makeTempDir('claude-warn');
  process.env.KAIZEN_YOTZER_WORK_DIR = work;
  process.env.KAIZEN_CELULAS_DIR = celulas;
  process.env.KAIZEN_CLAUDE_COMMANDS_DIR = claudeDir;
  const origWrite = process.stdout.write.bind(process.stdout);
  let captured = '';
  process.stdout.write = (chunk) => {
    captured += chunk;
    return true;
  };
  try {
    const workId = 'wrk-warn';
    const workIdDir = path.join(work, workId);
    fs.mkdirSync(workIdDir, { recursive: true });
    fs.writeFileSync(
      path.join(workIdDir, 'f9-state.json'),
      JSON.stringify({ verdict: 'PASS' }),
      'utf8'
    );
    // Spec declares 3 agents in tier_2 but only seeds personas for 2 —
    // cell-registry emits a soft warning for the missing one.
    const spec = H.buildSpec({
      name: 'celula-warn-1',
      slashPrefix: 'Kaizen:CelulaWarn1',
      tiers: {
        tier_1: { role: 'coordinator', chief: true, agents: ['chief'] },
        tier_2: {
          role: 'specialist',
          agents: ['archaeologist', 'missing-specialist'],
        },
      },
    });
    fs.writeFileSync(
      path.join(workIdDir, 'spec.json'),
      JSON.stringify(spec),
      'utf8'
    );

    const bin = freshKaizenBin();
    const code = bin.runYotzerPublish([workId]);
    assert.strictEqual(code, 0, 'publish must succeed despite soft warning');
    assert.ok(
      /Aviso:.*Persona do especialista ausente/u.test(captured),
      'must surface the missing-persona warning under "Aviso:" prefix in pt-BR; got:\n' +
        captured
    );
  } finally {
    process.stdout.write = origWrite;
    clearEnv();
    H.rmRf(work);
    H.rmRf(celulas);
    H.rmRf(claudeDir);
  }
});
