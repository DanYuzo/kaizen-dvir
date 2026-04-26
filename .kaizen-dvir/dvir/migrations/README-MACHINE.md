# Migration Scripts — Author Guide (machine doc, EN)

This file is **machine documentation** for engineers authoring future migration
scripts. It is intentionally English. Anything that lands on the expert's
terminal — log messages, abort text, success summaries — MUST be pt-BR per
Commandment IV / D-v1.4-06.

## Naming convention

One script per minor-version transition:

```
.kaizen-dvir/dvir/migrations/v{from}-to-v{to}.js
```

Where `{from}` and `{to}` are the **short minor** form (`MAJOR.MINOR`) of the
versions. Example: `v1.4-to-v1.5.js`. The loader
(`.kaizen-dvir/dvir/update/migrations.js`) constructs the path from the minor
strings; do not deviate.

KaiZen is N-1 only (CON-010). The loader and the `kaizen update` engine refuse
multi-step jumps. There is therefore exactly one script per consecutive minor
pair, never a chain script that handles `v1.3 -> v1.5`.

## Required export shape

```js
module.exports = {
  from: "1.4.0",                    // full SemVer string
  to: "1.5.0",
  description: "one-line EN summary",
  forward: async ({ projectRoot, manifest, log }) => {
    // idempotent operations
  },
  // reverse: async (...) => {}      // optional — CON-009 ("when feasible")
};
```

The loader calls `require(path)` and rejects modules whose `forward` is missing
or not a function.

## Argument shape

`forward` receives an object with three fields:

| Field         | Type     | Notes                                                                                  |
|---------------|----------|----------------------------------------------------------------------------------------|
| `projectRoot` | string   | Absolute path to the expert's project root.                                            |
| `manifest`    | object   | Mutable parsed local manifest. The caller (M6.2) persists it after `forward` returns.  |
| `log`         | function | `function(eventName, message)`. `eventName` is structured EN; `message` is pt-BR.      |

`log` is guaranteed safe to call any number of times. It never throws; it never
blocks. Treat it as a write-and-forget channel.

## Idempotency requirement

Every operation **must** be idempotent. The standard pattern:

1. Read the current state.
2. Compare it against the target state.
3. Skip the write if equivalent.

Examples:

- For Markdown structural edits — search for a sentinel marker (e.g. a
  delimiter HTML comment) before writing.
- For manifest schema changes — check whether the new field already exists on
  each entry before assigning.
- For directory creation — `fs.mkdirSync(dir, { recursive: true })` is already
  idempotent.

Never rely on external orchestration for safety. The script is invoked from
`kaizen update`, but it must also be safe to re-run from a debugging session.

## Logging

Two channels:

- **Terminal (pt-BR).** The `message` argument to `log(...)`. Visible to the
  expert in real time. Follow `diretrizes-escrita.md` for tone. Be concrete:
  state what changed, what was preserved, why.
- **Update log file (EN, structured).** The `eventName` argument. Lives in
  `.kaizen/logs/updates/{ISO-timestamp}.log`. Used by `kaizen doctor` and
  post-mortem tooling. Use snake_case event names (`manifest_layer_backfilled`,
  `claude_md_migrated`) so future tooling can grep deterministically.

Both fields go through the same `log` call — the caller (M6.2) decides which
channel each field flows to.

## Filesystem usage (CON-003 — stdlib only)

You may use:

- `fs` from `node:fs`
- `path` from `node:path`
- `crypto` from `node:crypto` (already used framework-wide for hashing)

You may **not** add npm dependencies. Anything beyond Node.js stdlib requires
explicit @architect approval and a Commandment IV waiver.

For path resolution inside the expert's project, prefer
`path.join(projectRoot, '.claude/CLAUDE.md')` over the bare relative form.
This keeps the script robust when invoked from a different cwd.

## When to implement `reverse`

CON-009 says reverse migrations are required "when feasible". The default
escape hatch in v1.5 is `kaizen rollback` — restoring the pre-update snapshot
is faster and lower-risk than running a reverse migration in most cases. Ship
`reverse` only when:

1. The forward operation is genuinely irreversible without it (e.g., it
   discards information that the snapshot does not hold), AND
2. The expert benefit of in-place reversal exceeds the cost of authoring +
   maintaining the reverse path.

When `reverse` is shipped, it MUST also be idempotent and stdlib-only.

## Testing checklist

Every migration script ships with at minimum:

- [ ] A round-trip test: apply, verify state, snapshot exists.
- [ ] An idempotency test: apply twice, assert byte-identical state.
- [ ] A pre-existing-state test: apply against an already-migrated fixture,
      assert no mutation.
- [ ] If the migration touches structured files (Markdown with delimiters,
      JSON manifests), a golden-file diff against a committed fixture.

Tests live under `tests/m6/test-{descriptive-name}.js` and follow the
node:test + assert/strict pattern used elsewhere in the test suite.

## N-1 enforcement

The N-1 gate runs in `migrations.js` before snapshot creation. Migration
scripts themselves do **not** validate version pairs — that is upstream. A
migration script is loaded only when the loader has already confirmed the
(from, to) pair matches the script's filename.

## Cross-milestone coordination

When a migration depends on a content artifact owned by another milestone
(e.g., M6.5's CLAUDE.md migration depends on M7.2's framework section
content), use the **placeholder pattern**: the earlier milestone writes a
sentinel that the later milestone replaces idempotently. Both sides honor a
shared marker (the `KAIZEN:FRAMEWORK:START` HTML comment, in the M6.5/M7.2
case) so the integration order is irrelevant.

Document the coordination explicitly in the migration's file header.
