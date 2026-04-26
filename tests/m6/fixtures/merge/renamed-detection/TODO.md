# Fixture: renamed-detection — DEFERRED for v1.5

**Status:** OUT OF SCOPE for v1.5 (per Story M6.3 Scope OUT and Epic KZ-M6 Scope OUT).

## What this fixture would test (when implemented)

A 3-way merge scenario where the framework renames a file across versions:

- `base.txt` lives at `path/A`
- `theirs.txt` lives at `path/B` with the same (or evolved) content
- `ours.txt` lives at `path/A` and the expert may have edited it

A semantic rename detector would correlate `path/A` in base/ours with `path/B` in theirs and merge the expert's edits into the renamed location.

## Interim behavior for v1.5

Renames are treated as **delete + add** by the consuming layer (M6.2 / `kaizen update`):

- The old path is processed as `theirs == ''` (deleted by theirs).
- The new path is processed as `base == ''` (added by theirs; trivial case B for any expert content at the new path, or just a new-file write if absent).

If the expert had local edits on the old path, those edits surface as a conflict on the old path (per the `deleted-by-theirs` fixture) — the expert is then prompted to manually copy the changes to the new location.

This is acceptable for v1.5 because cross-version renames in L3 are expected to be rare and the conflict path keeps the expert's work intact.

## Decision

Deferred to a future minor (v1.6+) if the rename frequency in the changelog warrants the complexity. Tracked as a non-blocking enhancement; the current v1.5 contract remains stable.

## References

- Story M6.3 Scope OUT — "Renamed-file detection — deferred"
- Epic KZ-M6 Risk KZ-M6-R1 mitigation — "renamed-file detection explicitly out of scope"
