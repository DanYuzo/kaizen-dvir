'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');
const GITIGNORE = path.join(ROOT, '.gitignore');

test('.gitignore exists and lists .kaizen/ (CON-004)', () => {
  assert.ok(fs.existsSync(GITIGNORE), '.gitignore must exist at repo root');
  const content = fs.readFileSync(GITIGNORE, 'utf8');
  assert.match(content, /^\.kaizen\/?\s*$/m, '.kaizen/ must be gitignored per CON-004');
  assert.match(content, /^node_modules\/?\s*$/m, 'node_modules/ must be ignored');
});
