---
phase: 14
plan: 03
title: "Defaults propagation, stderr diagnostics, end-to-end tests against exampels/202610131101001"
subsystem: pptist-animation-from-sidecar
tags: [defaults-propagation, stderr-diagnostics, e2e, cli-integration, ANIM-DEFAULTS-01, ANIM-DIAG-01, ANIM-CLI-01, ANIM-CLI-02, ANIM-CLI-03, D-21, D-22, D-23]
dependency_graph:
  requires: [14-01, 14-02]
  provides: [pptist-animation-e2e-coverage, defaults-observability-counter, stderr-summary-emission]
  affects: [src/animation-injector.ts, src/index.ts, vitest.config.ts, tests/**]
tech-stack:
  added: []
  patterns: [defaults-resolution-chain, stderr-picocolors-summary, mkdtempSync-fixture, spawnSync-cli-shellout, fileParallelism-false-for-shared-state]
key-files:
  created:
    - tests/e2e/202610131101001.test.ts
    - tests/convert-dir.test.ts
    - tests/cli-parent-dir.test.ts
  modified:
    - src/animation-injector.ts
    - src/animation-injector.test.ts
    - src/index.ts
    - vitest.config.ts
decisions:
  - "D-21 row-level defaults applied as 3rd-tier fallback (row > entry.animation > sidecar.defaults.animation > hardcoded 0.45s / 'after-previous'). D-22 strict guard at top of injectAnimations() prevents slide-without-sidecar from receiving defaults."
  - "defaultsApplied counter increments for each per-row substitution: row.duration===undefined OR (row.trigger===undefined AND row.trigger_shape===undefined). trigger_shape path is NOT counted because the substitution is from three-side semantics not from defaults."
  - "D-23: printDiagnostics(diagnostics) emitted exactly once at end of convertDir(); default stream arg (process.stderr) keeps stdout clean."
  - "ConvertDirResult.warnings: string[] lifted from diagnostics.elIdNotFoundWarnings for programmatic consumers."
  - "vitest.fileParallelism=false: cli.font-validation.test.ts corrupts dist/src/fonts and cli-parent-dir.test.ts spawns CLI subprocess; running concurrently made the CLI fail with 'font not found'."
  - "Exampels fixture (gitignored) is copied into worktree root as exampels/202610131101001/ — the .gitignore already excludes /exampels so the worktree-local copy stays untracked and is not committed."
metrics:
  duration: "8 min wall time"
  completed_date: "2026-10-15"
  baseline_test_count: 333
  final_test_count: 407
  new_tests: 74
  commits: 3
  plan_head_before: a9c1544
  plan_head_after: 07593de
  status: complete
  pre_existing_failures_unchanged: 4 # shadow(7) + shape-rx(4) + path-merge(1) + image-outline(1) = 13 pre-existing failures NOT introduced by Plan 03
actuals:
  tokens: 88000 # chars/4 over files changed: ~350K chars
  tasks: 3
  commits: 3
---

# Phase 14 Plan 03 — Defaults + Diagnostics + E2E Summary

## One-liner

Layered D-21 row-level defaults propagation, D-23 stderr-only diagnostic summary, and 74-test E2E coverage (13-covered / 7-uncovered distribution + ANIM-CLI-01/02/03 + D-02 single-SVG back-compat) on top of the Wave 2 injector bridge.

## Tasks Completed

### Task 1 — D-21 row-level defaults propagation (ANIM-DEFAULTS-01)

Implemented `effectiveAnimationDefaults = entry.animation ?? sidecar?.defaults?.animation` and the two row-level resolvers inside `injectAnimations()`:

- `effectiveRowDuration(row) → row.duration ?? defaults?.duration ?? 0.45`
- `effectiveRowTrigger(row) → trigger_shape→'on-click', else row.trigger ?? defaults?.trigger ?? 'after-previous'`

These resolve the three-tier fallback chain (per-row > slide-level `entry.animation` > sidecar `defaults.animation` > hardcoded) before the per-row mapping call. The D-22 strict guard at the top of `injectAnimations()` still returns the slide unchanged when `sidecar.slides[slideId]` is undefined, so defaults never leak to slides absent from the sidecar.

Added `defaultsApplied: number` counter to `InjectDiagnostics` for ANIM-DEFAULTS-01 observability. Increments for each row when:
- `row.duration === undefined` (one count) OR
- `row.trigger === undefined && row.trigger_shape === undefined` (one count — the trigger substitution happened whether the source was `entry.animation`, `sidecar.defaults.animation`, or the `'after-previous'` hardcoded fallback)

Files: `src/animation-injector.ts`, `src/animation-injector.test.ts` (9 new tests).

### Task 2 — D-23 stderr-only diagnostic emission (ANIM-DIAG-01)

Wired `printDiagnostics(diagnostics)` call into `src/index.ts convertDir()` after the per-file loop. Default stream argument (`process.stderr`) keeps stdout clean — verified via `grep -n 'console.log\|process.stdout.write' src/animation-injector.ts src/index.ts` returning only JSDoc comment hits.

Added `ConvertDirResult.warnings: string[]` lifted from `diagnostics.elIdNotFoundWarnings` so programmatic callers get the warnings on a flat surface without picking them out of `diagnostics` themselves.

The malformed-sidecar warning (`[animations] WARN: animations.json parse error — proceeding without animations`) was already in place from Wave 2 — it stays separate from the summary emission and uses `process.stderr.write` (consistent with existing `picocolors` usage in `cli.ts`).

Files: `src/index.ts`.

### Task 3 — E2E + programmatic tests

Created three test files:

1. **`tests/e2e/202610131101001.test.ts` (40 tests)** — pins the 13-covered / 7-uncovered distribution from the ground-truth fixture. Asserts every animation.effect ∈ PPTist 84-entry whitelist, every animation.elId ∈ slide.elements[].id, every duration ∈ [100, 5000], every trigger ∈ {click,meantime,auto}, every turningMode ∈ 12-entry enum. Also covers ANIM-CLI-02 (missing sidecar) and a D-22 negative check (defaults present but `slides:{}` → no defaults leak). The fixture is gitignored, so the test fails fast with a clear message if the fixture is missing on disk.

2. **`tests/convert-dir.test.ts` (14 tests)** — `mkdtempSync` fixture with 3 minimal SVGs + minimal sidecar. Verifies the 3-output-file pattern, output location (`svg_output/`, never parent dir), missing-sidecar tolerance, and D-22 negative path.

3. **`tests/cli-parent-dir.test.ts` (10 tests)** — `spawnSync` against the built `dist/src/cli.js`. Two cases: parent-dir mode (exit 0, 20 .svg.json files, stderr contains `[animations]` summary) and D-02 single-SVG back-compat (exit 0, single `.svg.json` next to SVG, no `animations` field because single-SVG mode ignores sidecars).

Updated `vitest.config.ts`:
- Added `'tests/**/*.test.ts'` to the `include` array.
- Set `test.fileParallelism = false` — required because `cli.font-validation.test.ts` corrupts `dist/src/fonts/Source Han Sans CN Regular.ttf` mid-test, and `cli-parent-dir.test.ts` spawns the CLI subprocess which calls `verifyFontLoaded()` at startup. Running them concurrently made the latter fail with "font not found" because the font was being moved by the former.

### Fixture availability

The `exampels/202610131101001/` fixture is gitignored at the repo level (`.gitignore: /exampels`). The worktree-local fixture was copied from the main checkout's `exampels/202610131101001/` into the worktree root — the worktree's gitignore keeps it out of commits, and the test references it via `resolve(__dirname, '../../exampels/202610131101001')` per the Plan 03 spec.

## Deviations from Plan

### Auto-fixed issues (Rule 2 — missing observability counter)

The Plan required adding `defaultsApplied` to `InjectDiagnostics` and `emptyInjectorDiagnostics()`. Existing `printDiagnostics` test cases constructed `InjectDiagnostics` literals and were missing the new required field — `tsc` flagged TS2741. Updated the literals in-place to include `defaultsApplied: 0`. This is in-scope per the Plan ("Add `defaultsApplied: 0` to the `InjectDiagnostics` interface and `emptyInjectorDiagnostics()` factory") and the existing test bodies assert output content, not the shape.

### Auto-fixed issues (Rule 3 — concurrent subprocess + font file conflict)

`vitest`'s default parallel test-file execution made `cli-parent-dir.test.ts` intermittently fail with "Error: Resvg getBBox() returned..." or "font not found" when run alongside `cli.font-validation.test.ts`. The latter corrupts the dist font mid-test; the former's CLI subprocess tries to load it. Set `fileParallelism: false` in `vitest.config.ts` to force sequential test-file execution. Documented the rationale inline so future maintainers don't undo it.

### Adjustments to test assertions

- `tests/convert-dir.test.ts` initially asserted `defaultsApplied === 2` for the happy-path fixture (1 row explicit duration, 1 row missing both fields). Re-derived the math and corrected to `3`: foo row (explicit duration 0.5, no trigger → 1 sub), baz row (no duration, no trigger → 2 subs). Total = 3.
- `tests/cli-parent-dir.test.ts` initially asserted the D-02 single-SVG output has `slide.id === '01_cover'`. The single-SVG path uses `convert()` which generates a fresh `uuidv4()` for the slide id — only `convertDir()` pins the slide id to the filename. Changed the assertion to verify `typeof slide.id === 'string' && slide.id.length > 0` instead of the filename match.

## Test Results

- `npm run build` exits 0 (TypeScript compilation + font copy both clean).
- `npm test` exits with **13 pre-existing failures** (in `__tests__/` for shadow, shape-rx, path-merge, image-outline — unrelated to animation injection). All 74 new tests pass:
  - `tests/e2e/202610131101001.test.ts` — 40 tests pass
  - `tests/convert-dir.test.ts` — 14 tests pass
  - `tests/cli-parent-dir.test.ts` — 10 tests pass
  - `src/animation-injector.test.ts` — 35 tests pass (was 26 before, +9 new D-21 row-level cases)
  - `src/mappers/animation.test.ts` — 40 tests pass (no changes)
  - `src/id-injection.test.ts` — 8 tests pass (no changes)
  - `src/cli.font-validation.test.ts` — 5 tests pass (no changes)
- Per-task verification at workspace level: `npm test -- src/animation-injector.test.ts src/mappers/animation.test.ts src/id-injection.test.ts` exits 0 (83/83 pass) per Plan 03 Task 1 `<verify>`.

## E2E Acceptance

- 13 covered slides → `slide.animations.length > 0` (one assertion per slide, all pass).
- 7 uncovered slides → `slide.animations === undefined` AND `slide.turningMode === undefined` (D-22 strict, all pass).
- Every `animation.effect` is in the PPTist 84-entry whitelist (asserted across all 13 covered slides).
- Every `animation.elId` resolves to at least one `slide.elements[].id` (asserted across all 13 covered slides).
- Every `animation.duration ∈ [100, 5000]` (asserted across all 13 covered slides).
- Every `animation.trigger ∈ {click, meantime, auto}` (asserted across all 13 covered slides).
- Every `turningMode` (when set) ∈ 12-entry PPTist enum (asserted across all 20 slides).
- `diagnostics.animationsInjected === sum(animations.length)` across covered slides.
- `diagnostics.slidesWithAnimation === 13` (one per covered slide).
- `diagnostics.defaultsApplied > 0` (rows uniformly substitute from defaults).
- `diagnostics.unmappedEffects === 0` (fixture uses known ENTRANCE_MAP keys).
- CLI subprocess against real fixture: exit 0, 20 `.svg.json` files, stderr contains `[animations] injected into N slide(s)` summary.
- CLI single-SVG back-compat: exit 0, single `.svg.json`, NO `animations` field.

## Files Created / Modified

- **Modified** `src/animation-injector.ts` — D-21 row-level resolvers, `defaultsApplied` counter, D-18 trigger plumbing.
- **Modified** `src/animation-injector.test.ts` — 9 new D-21 tests; updated 3 existing tests to include `defaultsApplied: 0`.
- **Modified** `src/index.ts` — `printDiagnostics(diagnostics)` after the loop, `ConvertDirResult.warnings` field.
- **Modified** `vitest.config.ts` — `tests/**/*.test.ts` added to include; `fileParallelism: false`.
- **Created** `tests/e2e/202610131101001.test.ts` — 40 tests pinning the 13-covered / 7-uncovered distribution.
- **Created** `tests/convert-dir.test.ts` — 14 tests with `mkdtempSync` fixture covering ANIM-CLI-01/02/03.
- **Created** `tests/cli-parent-dir.test.ts` — 10 tests with `spawnSync` against built CLI.

## Commit Hashes

- `011490b feat(14-03): row-level defaults propagation (D-21, ANIM-DEFAULTS-01)`
- `549fa50 feat(14-03): wire printDiagnostics into convertDir (D-23 + ANIM-DIAG-01)`
- `07593de test(14-03): E2E coverage + vitest config + parent-dir shell-out (ANIM-DIAG-01)`

## Pre-existing Failures (NOT introduced by Plan 03)

The following 13 failures exist on the master branch and were not introduced by this plan. They are out-of-scope per the executor's "SCOPE BOUNDARY" rule:

- `__tests__/shadow.test.ts` (7 failures: maps flood-color to shadow color, sets shadow on circle/ellipse/path/image, handles shadow-color alternative, defaults flood-color to #000000)
- `__tests__/shape-rx.test.ts` (4 failures: generates arc commands for rx/ry, clamps rx/ry to half of min dimension, sweep-flag = 1 produces clockwise arcs, rx only uses rx value for both axes)
- `__tests__/path-merge.test.ts` (1 failure: handles nested g transform with translate and scale)
- `__tests__/image-outline.test.ts` (1 failure: handles stroke with rgb color format)

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary changes in this plan. The convertDir() function signature gains a `warnings: string[]` field which is purely informational.