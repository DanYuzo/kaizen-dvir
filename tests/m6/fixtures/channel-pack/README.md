# Channel Pack Fixture — M6.6

This directory exists as a stable target for the **two channel smoke tests**:

- `tests/m6/test-channel-npx-github.js` (FR-052 — fallback channel)
- `tests/m6/test-channel-github-packages.js` (D-v1.5-09 — primary channel)

## How the fixture is produced

Both tests invoke `npm pack --pack-destination <tmpdir>` against the project root
to materialize the canonical tarball (`kaizen-dvir-<version>.tgz`). They then:

1. Extract the tarball into a temp directory using a stdlib-only tar reader
   (`zlib.gunzipSync` + POSIX 512-byte block parser — see
   `tests/m6/_helpers-channels.js`). No external `tar` library is required.
2. Run `bin/kaizen-init.js` from the extracted package against a fresh empty
   target directory.
3. Hash the resulting project tree (excluding `.kaizen-dvir/manifest.json`
   timestamp fields) and compare across channels.

## Why a fixture directory at all?

The directory is intentionally empty (apart from this README) — every test
materializes its own fresh tarball under `os.tmpdir()`. The fixture path is
referenced by the tests as a stable anchor and by future regeneration tooling
(e.g., a refresh script that updates `expected-package-contents.txt` from
M6.1's CI guard, KZ-M6-R5).

## Regenerating after a `files`-whitelist change

If `package.json` `files` is modified, run from the project root:

```
npm pack --dry-run --json
```

…and update `tests/m6/expected-package-contents.txt` to match. The M6.1
`test-pack-contents.js` test will fail the build until the baseline is
updated, by design (KZ-M6-R5 mitigation).

## Offline-safe contract

These tests MUST NOT touch the network. They use only:

- `npm pack` (local — does not contact a registry)
- `node:zlib`, `node:fs`, `node:path`, `node:crypto`, `node:child_process`
- `bin/kaizen-init.js` from the extracted tarball

If any new test in this directory introduces a network dependency, it is a
violation of the M6.6 offline-safe contract and must be rejected at quality
gate.
