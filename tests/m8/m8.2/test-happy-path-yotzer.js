'use strict';

/**
 * test-happy-path-yotzer.js — registerCellSkills on the Yotzer fixture
 * writes 1 entry skill + 9 specialist skills with correct content.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const H = require('./_helpers.js');

test('registerCellSkills writes entry + 9 specialist skills for Yotzer', () => {
  const cellRoot = H.cloneYotzerCell();
  const claudeDir = H.makeTempDir('claude');
  try {
    const { registerCellSkills } = H.loadRegistry();
    const result = registerCellSkills(cellRoot, claudeDir);

    assert.strictEqual(result.entryWritten, true, 'entry skill must be written');
    assert.deepStrictEqual(
      [...result.specialistsWritten].sort(),
      [
        'archaeologist',
        'chief',
        'contract-builder',
        'prioritizer',
        'progressive-systemizer',
        'publisher',
        'risk-mapper',
        'stress-tester',
        'task-granulator',
      ],
      'specialistsWritten must contain all 9 Yotzer agents (chief included)'
    );
    assert.strictEqual(result.specialistsWritten[0], 'chief',
      'chief must be the first specialist (entry agent ordering)');
    assert.strictEqual(result.warnings.length, 0,
      'no warnings expected on a clean Yotzer fixture; got: ' + JSON.stringify(result.warnings));

    // Entry skill at .claude/commands/Kaizen/Yotzer.md
    const entryPath = path.join(claudeDir, 'Kaizen', 'Yotzer.md');
    assert.ok(H.fileExists(entryPath), 'entry skill file must exist at Kaizen/Yotzer.md');

    const entryBody = H.readFileUtf8(entryPath);
    assert.ok(/^---\ndescription: ".+"\n---/m.test(entryBody),
      'entry frontmatter must have description');
    assert.ok(!/disable-model-invocation/.test(entryBody),
      'entry must NOT set disable-model-invocation (D.3)');
    assert.ok(!/^allowed-tools:/m.test(entryBody),
      'entry must omit allowed-tools (D.3 default)');
    assert.ok(/Esta skill ativa a celula \*\*yotzer\*\*/.test(entryBody),
      'entry body identifies the Yotzer cell in pt-BR');
    assert.ok(
      /Para invocacao programatica via terminal, use `kaizen Kaizen:Yotzer publish\|resume\|validate <work-id>` — distinto desta skill interativa\./.test(
        entryBody
      ),
      'entry body must contain the slash-vs-shell distinction phrase verbatim (D-v1.5-06)'
    );
    // Persona path is relative POSIX under cellRoot (M8.7 hotfix of M6.7 §6.1
    // backlog item — was absolute before, broke channel-hash byte equality).
    assert.ok(/Persona do chief: `agents\/chief\.md`/.test(entryBody),
      'entry body must reference the chief persona file (relative POSIX)');

    // 9 specialist files under .claude/commands/Kaizen/Yotzer/
    const specialistsDir = path.join(claudeDir, 'Kaizen', 'Yotzer');
    const files = H.listDirFiles(specialistsDir);
    assert.deepStrictEqual(
      files,
      [
        'archaeologist.md',
        'chief.md',
        'contract-builder.md',
        'prioritizer.md',
        'progressive-systemizer.md',
        'publisher.md',
        'risk-mapper.md',
        'stress-tester.md',
        'task-granulator.md',
      ],
      'specialists folder must contain exactly 9 .md files'
    );

    // Spot-check chief specialist content.
    const chiefBody = H.readFileUtf8(path.join(specialistsDir, 'chief.md'));
    assert.ok(/Reativa o \*\*chief\*\* \(chief\)/.test(chiefBody),
      'chief sub-skill must mark itself as the re-activation entry');
    assert.ok(/Persona: `agents\/chief\.md`/.test(chiefBody),
      'chief sub-skill must reference the chief persona (relative POSIX)');

    // Spot-check a regular specialist.
    const archBody = H.readFileUtf8(path.join(specialistsDir, 'archaeologist.md'));
    assert.ok(/Ativa o especialista \*\*archaeologist\*\*/.test(archBody),
      'archaeologist body must identify itself');
    assert.ok(/Persona: `agents\/archaeologist\.md`/.test(archBody),
      'archaeologist body must reference its persona file (relative POSIX)');
  } finally {
    H.rmRf(cellRoot);
    H.rmRf(claudeDir);
  }
});
