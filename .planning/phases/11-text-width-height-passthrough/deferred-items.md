# Deferred Items

## Pre-existing full-suite failures

The orchestrator ran the same clean-worktree sequence on both revisions:

1. `npm run build`
2. `npm test`

| Revision | Passed | Failed | Failed files |
|----------|--------|--------|--------------|
| Parent baseline `6047c64` | 193 | 15 | 5 |
| Phase 11 merged HEAD | 198 | 15 | 5 |

The 15 stable failures were identical on both revisions:

- `__tests__/gradient.test.ts`: 2
- `__tests__/image-outline.test.ts`: 1
- `__tests__/path-merge.test.ts`: 1
- `__tests__/shadow.test.ts`: 7
- `__tests__/shape-rx.test.ts`: 4

The path-merge failure remains:

- **Test:** `createMergedShapeElement > handles nested g transform with translate and scale`
- **Observed:** `result.left` was `50.520833333333336`, while the test expects approximately `58.33`.

An independent verifier run also observed one `__tests__/text-anchor.test.ts` failure. Re-running the same verifier check against parent baseline `6047c64` reproduced that failure unchanged, so it is also pre-existing and appears sensitive to run order or environment.

- **Scope:** All failures are outside the Phase 11 text width/height passthrough diff.
- **Regression conclusion:** Phase 11 introduced 0 full-suite failures; its 5 new tests all pass.
- **Action:** Deferred to the owning workstreams. Phase 11 does not modify those implementations or expectations.
