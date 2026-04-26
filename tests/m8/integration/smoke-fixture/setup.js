'use strict';

/**
 * tests/m8/integration/smoke-fixture/setup.js — programmatic smoke fixture
 * setup for the M8 manual smoke test.
 *
 * Purpose
 * -------
 * Materialize a clean sandbox project on disk that the @qa engineer (or the
 * expert running the smoke test) opens in Claude Code to validate the live
 * `/Kaizen:Yotzer` activation. The script is the deterministic, scripted
 * counterpart to `tests/m8/MANUAL-SMOKE-TEST.md` — it replaces the manual
 * `mkdir /tmp/teste-yotzer && cd /tmp/teste-yotzer && kaizen init` steps
 * with a single repeatable invocation:
 *
 *     node tests/m8/integration/smoke-fixture/setup.js
 *
 * Output
 * ------
 * On success, prints the absolute path of the materialized fixture directory
 * to stdout. The expert opens that directory in Claude Code and follows the
 * procedure documented in:
 *   - tests/m8/MANUAL-SMOKE-TEST.md       (pt-BR, expert-facing)
 *   - tests/m8/integration/smoke-procedure.md  (pt-BR, @qa procedure with
 *     verdict-recording fields)
 *
 * Exit code 0 on success, non-zero with stderr explanation on failure.
 *
 * Constraints
 * -----------
 * - Stdlib only (CON-003).
 * - CommonJS, ES2022 (CON-002).
 * - No mutation of the framework working tree — fixture lives in os.tmpdir().
 *
 * Story: M8.7 — M8 integration gate
 * Refs:  AC-025 (Gate criterion 2), D-v1.5-06.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SOURCE_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI = path.join(SOURCE_ROOT, 'bin', 'kaizen.js');

function main() {
  // Stable label so consecutive invocations return easy-to-clean paths.
  const fixtureDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'kaizen-m8.7-smoke-')
  );

  const result = spawnSync(process.execPath, [CLI, 'init'], {
    cwd: fixtureDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    process.stderr.write(
      'FALHA: kaizen init falhou com status ' +
        result.status +
        '\nstderr=' +
        result.stderr +
        '\nstdout=' +
        result.stdout +
        '\n'
    );
    process.exit(result.status || 1);
  }

  // Verify the structural prerequisites Claude Code needs to surface the
  // skill — if these are missing, the manual smoke test would fail for a
  // reason unrelated to runtime activation.
  const entryPath = path.join(
    fixtureDir, '.claude', 'commands', 'Kaizen', 'Yotzer.md'
  );
  if (!fs.existsSync(entryPath)) {
    process.stderr.write(
      'FALHA: skill de entrada ausente apos init em ' + entryPath + '\n'
    );
    process.exit(1);
  }

  const specialistsDir = path.join(
    fixtureDir, '.claude', 'commands', 'Kaizen', 'Yotzer'
  );
  const specialistFiles = fs
    .readdirSync(specialistsDir)
    .filter((f) => f.endsWith('.md'));
  if (specialistFiles.length !== 9) {
    process.stderr.write(
      'FALHA: esperava 9 sub-skills em ' +
        specialistsDir +
        '; encontrou ' +
        specialistFiles.length +
        '\n'
    );
    process.exit(1);
  }

  // Print a friendly pt-BR summary plus the fixture path.
  process.stdout.write(
    [
      '',
      'Fixture do smoke test M8.7 materializada com sucesso.',
      '',
      'Caminho da fixture: ' + fixtureDir,
      '',
      'Proximos passos:',
      '  1. Abra o Claude Code apontando para a fixture acima.',
      '  2. Siga o procedimento documentado em:',
      '       tests/m8/MANUAL-SMOKE-TEST.md (instrucoes para o expert)',
      '       tests/m8/integration/smoke-procedure.md (verdict do @qa)',
      '  3. Apos o teste, registre o veredito no arquivo de procedimento',
      '     e remova a fixture com:',
      '       rm -rf "' + fixtureDir + '"',
      '',
    ].join('\n')
  );
}

if (require.main === module) {
  main();
}

module.exports = { main };
