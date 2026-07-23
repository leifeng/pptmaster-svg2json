# Deferred Items

## Pre-existing full-suite failure

- **Test:** `__tests__/path-merge.test.ts` — `createMergedShapeElement > handles nested g transform with translate and scale`
- **Observed:** `result.left` was `50.520833333333336`, while the test expects approximately `58.33`.
- **Scope:** Unrelated to Phase 11 text width/height passthrough; the test and path-merge implementation are outside this plan's modified files.
- **Action:** Deferred for the path-merge workstream. The Phase 11 targeted test, `src/text-measurer.test.ts`, and TypeScript build pass.
