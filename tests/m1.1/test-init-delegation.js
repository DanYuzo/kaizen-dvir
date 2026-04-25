'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.join(__dirname, '..', '..', 'bin', 'kaizen.js');

// Note: M1.1 shipped a pt-BR placeholder for 'kaizen init'. M1.5 replaced the
// skeleton with the full implementation. This test now verifies the router
// still delegates to kaizen-init.js and exits 0 from a clean temp dir, which
// exercises the same contract (args → init module → exit code) without
// mutating the source tree.

test('kaizen init delegates to kaizen-init.js and succeeds in a clean temp dir', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kaizen-m1-1-'));
  try {
    const result = spawnSync(process.execPath, [CLI, 'init'], {
      cwd: tmp,
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 0, 'init should exit 0 in a clean dir');
    assert.match(result.stdout, /kaizen init concluído/, 'pt-BR success marker');
    assert.ok(
      fs.existsSync(path.join(tmp, '.kaizen-dvir', 'commandments.md')),
      'commandments.md materialized'
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
