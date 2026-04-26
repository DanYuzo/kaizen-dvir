#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TESTS_ROOT = __dirname;

function discoverTestFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...discoverTestFiles(full));
    } else if (entry.isFile() && /^test-.*\.js$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const files = discoverTestFiles(TESTS_ROOT).sort();
  if (files.length === 0) {
    process.stdout.write('No test files discovered under tests/.\n');
    return 0;
  }
  const args = ['--test', ...files];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  return result.status ?? 1;
}

if (require.main === module) {
  process.exit(main());
}
