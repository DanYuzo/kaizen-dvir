'use strict';

// AC 6 (M4.5) — publisher.configureCli asserts /Kaizen:{NomeDaCelula}
// + *comandos. AC-109A.

const { test } = require('node:test');
const assert = require('node:assert');
const helpers = require('./_helpers');

test('publisher.configureCli accepts a valid manifest (AC 6, AC-109A)', () => {
  const publisher = helpers.freshPublisher();
  const manifest = helpers.buildValidManifest();
  const result = publisher.configureCli('/tmp/celula-teste', manifest);
  assert.ok(Array.isArray(result.commands));
  assert.ok(result.commands.length >= 1);
  assert.strictEqual(result.commands[0].name, '*start');
});

test('publisher.configureCli throws when slashPrefix missing (AC 6)', () => {
  const publisher = helpers.freshPublisher();
  const manifest = helpers.buildValidManifest({ slashPrefix: '' });
  delete manifest.slashPrefix;
  assert.throws(() => publisher.configureCli('/tmp/celula-teste', manifest), {
    code: 'CLI_SLASH_PREFIX_MISSING',
  });
});

test('publisher.configureCli throws when commands list empty (AC 6)', () => {
  const publisher = helpers.freshPublisher();
  const manifest = helpers.buildValidManifest({ commands: [] });
  assert.throws(() => publisher.configureCli('/tmp/celula-teste', manifest), {
    code: 'CLI_COMMANDS_MISSING',
  });
});

test('publisher.configureCli rejects command name without "*" prefix (AC 6)', () => {
  const publisher = helpers.freshPublisher();
  const manifest = helpers.buildValidManifest({
    commands: [{ name: 'start', description: 'sem prefixo', triggers: 'tasks/start.md', agent: 'chief' }],
  });
  assert.throws(() => publisher.configureCli('/tmp/celula-teste', manifest), {
    code: 'CLI_COMMAND_PREFIX_INVALID',
  });
});

test('publisher.configureCli error messages are pt-BR (AC 6, FR-121)', () => {
  const publisher = helpers.freshPublisher();
  const manifest = helpers.buildValidManifest({ commands: [] });
  try {
    publisher.configureCli('/tmp/celula-teste', manifest);
    assert.fail('expected throw');
  } catch (e) {
    assert.ok(/publisher bloqueou publicacao/u.test(e.message));
    assert.ok(/comando/u.test(e.message));
  }
});
