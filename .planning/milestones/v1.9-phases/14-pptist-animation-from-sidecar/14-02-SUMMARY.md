---
phase: 14-pptist-animation-from-sidecar
plan: 02
subsystem: animation-injection
tags: [mapper, sidecar-bridge, pptist, animations, d-11-23, camelcase, defaults, stderr-diagnostics]

# Dependency graph
requires:
  - "Plan 14-01: convertDir() shell + sidecar types + idRegistry + PPTAnimation.extensions"
provides:
  - "src/mappers/animation.ts — 4 mapping tables + 5 mapping functions (D-14~19)"
  - "src/animation-injector.ts — injectAnimations() sidecar bridge (D-11~13, D-15, D-18, D-20~22, Pitfall 5)"
  - "src/index.ts convertDir() wired to read sidecar + per-slide injectAnimations (D-22 strict observable)"
  - "src/mappers/animation.test.ts — 40 whitelist + mapping tests"
  - "src/animation-injector.test.ts — 25 bridge tests including D-22 reverse-assertion"
affects:
  - "Plan 14-03 (defaults propagation per-row + printDiagnostics stderr summary)"

# Actuals (#2632) — measured against plan start
actuals:
  tokens: 14286   # git diff chars 57146 / 4
  tasks: 4        # Plan had 4 tasks; Task 2 + Task 4 integrated into a single commit (overlapping scope per plan iteration-2 addendum)
  commits: 3      # MEASURED: git rev-list --count dd4cc9d..HEAD

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function mapper module (no I/O, no async) — mirrors coordinate-mapper.ts shape"
    - "toCamel() helper for top-level D-13 camelCase convention"
    - "EFFECT_NONE_SENTINEL '__skip__' — explicit Pitfall 5 escape hatch"
    - "effectiveTransitionEffect() three-tier resolver (entry → defaults → undefined) gates D-22 strictness"
    - "legacy/modern sidecar normalization in normalizeRows() — legacy lifts all preserved-opaque fields too"
    - "ConvertDirOptions.animationsPath — resolved via defaults.animation* chain (Plan 03 seam)"
    - "Type alias `InjectorDiagnostics = InjectDiagnostics` preserves Wave 1 public API surface"

key-files:
  created:
    - src/mappers/animation.ts
    - src/mappers/animation.test.ts
    - src/animation-injector.ts
    - src/animation-injector.test.ts
  modified:
    - src/index.ts

key-decisions:
  - "D-14 prefix-based type inference: entrance_/path_ → in, emphasis_ → attention, exit_ → out, default → in"
  - "D-15 EFFECT_FALLBACK: { in: fadeIn, attention: pulse, out: fadeOut } — original key written to extensions.originalEffect"
  - "D-16 ENTRANCE_MAP (33), EMPHASIS_MAP (12), EXIT_MAP (13) — pragmatic >=30-entry coverage of instance data + canonical keys"
  - "D-17 TRANSITION_MAP (44) — 48→12 with random passthrough and fade as universal fallback"
  - "D-18 mapTrigger: explicit trigger wins → same-order → strict-ascending → auto (default)"
  - "D-19 mapDuration: Math.round(seconds * 1000) clamped [100, 5000] ms"
  - "D-20 pptAnimationId = nanoid(10) (re-used via utils/id-generator.ts from Wave 1)"
  - "D-21 effectiveTransitionEffect: entry.transition.effect ?? sidecar.defaults.transition.effect — three-tier resolver"
  - "D-22 strict guard at top of injectAnimations() — defaults never leak to absent entries"
  - "D-23 printDiagnostics writes to process.stderr (node:fs.WritableStream) only with picocolors coloring"
  - "trigger_shape non-undefined collapses trigger to 'click' (D-18 extension for shape-targeted triggers)"
  - "EFFECT_NONE_SENTINEL '__skip__' honored by row-iteration loop — Pitfall 5 escape hatch for 'none' rows"

patterns-established:
  - "Effective transition effect helper lives inside animation-injector.ts (close to where D-22 guard sits) — better cohesion than passing the resolver through convertDir()"
  - "Sidecar read is wrapped in try/catch + stderr-warn + sidecar=undefined — never crashes the run (ANIM-CLI-02 violation would be much louder)"
  - "Plan 03 marker comment in convertDir() labels the next integration point (defaults per-row + printDiagnostics stderr summary)"

requirements-completed:
  - ANIM-MAP-01
  - ANIM-MAP-02
  - ANIM-MAP-03
  - ANIM-MAP-04
  - ANIM-MAP-05
  - ANIM-MAP-06
  - ANIM-TRANS-01
  - ANIM-TRANS-02
  - ANIM-TRANS-03
  - ANIM-TURN-01

# Coverage metadata (#1602)
coverage:
  - id: D1
    description: "Pure-function mapper module builds the four mapping tables per D-14~19"
    verification:
      - kind: unit
        ref: "src/mappers/animation.test.ts — 40 tests covering 4 map × whitelist + 5 mapping functions"
        status: pass
      - kind: unit
        ref: "whitelist invariant — every ENTRANCE_MAP/EMPHASIS_MAP/EXIT_MAP value lives in the 84-entry PPTist white-list"
        status: pass
      - kind: unit
        ref: "TRANSITION_MAP values all belong to the 12 TurningMode enum"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sidecar bridge — legacy single-effect + modern effects[] both produce PPTAnimation[] with camelCased extensions"
    verification:
      - kind: unit
        ref: "src/animation-injector.test.ts > legacy single-effect form > translates entrance_fade with explicit duration"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > modern array form (ANIM-MAP-05) > emits one PPTAnimation per row in effects[]"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > camelCases top-level snake_case keys (D-13)"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > preserves effect_options nested data verbatim under camelCased top-level key"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-22 strict guard — slides without sidecar entry return unchanged with animations=undefined and turningMode=undefined"
    verification:
      - kind: unit
        ref: "src/animation-injector.test.ts > sidecar=undefined → returns slide unchanged with animations=undefined"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > defaults present but no entry → defaults do NOT leak (D-22)"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > D-22 negative: defaults.transition does NOT leak to absent entries"
        status: pass
    human_judgment: false
  - id: D4
    description: "D-21 defaults propagation for slide-level turningMode via effectiveTransitionEffect()"
    verification:
      - kind: unit
        ref: "src/animation-injector.test.ts > defaults.transition.effect='fade' applies when entry.transition absent (D-21)"
        status: pass
      - kind: unit
        ref: "src/animation-injector.test.ts > per-entry wins over defaults: entry.transition='push' overrides defaults.transition='fade'"
        status: pass
    human_judgment: false
  - id: D5
    description: "Pitfall 5 — effect='none' rows are skipped via EFFECT_NONE_SENTINEL '__skip__'"
    verification:
      - kind: unit
        ref: "src/animation-injector.test.ts > Pitfall 5: effect='none' skip path > does NOT emit a PPTAnimation when effect === 'none'"
        status: pass
      - kind: unit
        ref: "src/mappers/animation.test.ts > 'none' returns __skip__ sentinel"
        status: pass
    human_judgment: false
  - id: D6
    description: "E2E smoke (exampels/202610131101001) — 13 sidecar slides gain animations + 7 absent slides stay undefined (D-22 observable in JSON)"
    verification:
      - kind: automated_ui
        ref: "node dist/src/cli.js <parentDir> → 20 .svg.json files generated; side-effect sidecar E2E validation: withAnim=13 withoutAnim=7 badEffect=0 badElId=0 badTurning=0"
        status: pass
    human_judgment: false
  - id: D7
    description: "Missing-sidecar CLI path (ANIM-CLI-02) — convertDir produces identical-shape outputs but no animations on any slide"
    verification:
      - kind: automated_ui
        ref: "node dist/src/cli.js <no-sidecar-dir> → 2 .svg.json files generated; slide.animations === undefined for both 01_cover and 03_overview"
        status: pass
    human_judgment: false

# Metrics
duration: 18min
completed: 2026-10-15
plan_head_before: dd4cc9db52ed87225ebd03e0adaa181a2e6e482d
plan_head_after: 676f160
status: complete
---

# Phase 14 Plan 02: Mapping + Sidecar Bridge Summary

**Pure-function mapper tables + sidecar → slide bridge + convertDir() wiring (D-11~23) — animations live for the first time.**

## Performance

- **Duration:** ~18 min (started after Wave 1 merged; ended 2026-10-15T03:11:22Z)
- **Tasks:** 4 (Plan mandated 4; Tasks 2 + 4 integrated into a single `animation-injector.ts` commit because Task 4's `effectiveTransitionEffect()` resolver sits at the bottom of the same function — splitting would have introduced inter-file coupling for ~10 lines of code)
- **Files modified:** 5 created (4 src + 1 doc) + 1 modified (src/index.ts)
- **Commits:** 3 (`a2a9934` mapper + `8971b6b` injector/tests + `676f160` index.ts wiring)

## Accomplishments

- **`src/mappers/animation.ts`** ships the four PPTist-bound mapping tables. `ENTRANCE_MAP` covers 33 entrance keys from the three-side instance data + canonical keys; `EMPHASIS_MAP` covers 12 attention keys; `EXIT_MAP` covers 13 symmetric exit keys; `TRANSITION_MAP` covers 44 of the 48 documented three-side transition keys (4 fall through to `fade` per D-17). Every value passes the runtime whitelist check against the 84-entry PPTist effect list and the 12 TurningMode enum.
- **`mapEffect()`** uses `EFFECT_FALLBACK` per type when the key is unmapped (D-15), and returns the `__skip__` sentinel when the row carries `effect: 'none'` (Pitfall 5).
- **`mapTrigger()`** honors D-18's six-branch chain: explicit `on-click` / `with-previous` / `after-previous` win over the implicit `previousOrder === currentOrder → 'meantime'` and `currentOrder > previousOrder → 'auto'` order semantics. Unknown triggers default to `'auto'`.
- **`mapDuration()`** clamps to `[100, 5000]` ms via `Math.min(5000, Math.max(100, Math.round(seconds * 1000)))` and falls back to `0.45s` (the instance default) when undefined.
- **`mapTransition()`** is the D-17 universal-fallback surface — unknown keys map to `'fade'`, `random` is preserved verbatim for PPTist's runtime expansion.
- **`src/animation-injector.ts`** consumes the mapper tables and assembles `PPTAnimation[]` per slide. It walks the sidecar entry, normalizes both the legacy single-`effect` form and the modern `effects[]` array form (ANIM-MAP-05), resolves `elId` to the FIRST matching `slide.elements[].groupId` (with first-match-wins and `elIdNotFoundWarnings` for misses), and writes an `extensions` provenance record per the D-11/12/13 contract.
- **D-22 strict guard** at the top of `injectAnimations()` early-returns the slide unchanged when `opts.sidecar?.slides?.[opts.slideId]` is undefined — observable: `slide.animations` and `slide.turningMode` stay undefined. Defaults never leak to absent entries (covered by a reverse-assertion test).
- **`effectiveTransitionEffect()`** (Task 4 / D-21) implements the three-tier resolver `entry.transition.effect ?? sidecar.defaults.transition.effect ?? undefined` AFTER the D-22 guard, so the resolver only runs for slides that have an entry.
- **`printDiagnostics()`** writes the per-slide count summary to `process.stderr` (or any provided `NodeJS.WritableStream`) using picocolors for cyan summary lines and yellow warning blocks. Never writes to stdout / console.log (D-23).
- **`src/index.ts` convertDir()** now reads the optional sidecar via `existsSync(sidecarPath) + JSON.parse(try/catch)`, accumulating a per-loop `emptyInjectorDiagnostics()` instance that `injectAnimations` updates in-place. The result is then serialized into the existing `<svg>.svg.json` envelope.
- **65 vitest tests** ship (40 mapper + 25 injector). Whitelist invariant, six trigger branches, four `mapDuration` clamp bounds, both sidecar formats, both elId resolution paths, the missing-entry path (D-22), the `effect = 'none'` skip path (Pitfall 5), and the extensions-omit-when-empty contract are all covered.
- **E2E smoke on `exampels/202610131101001`** confirms 20 `.svg.json` files with 13 slides gaining `animations[]` (valid PPTist-whitelisted effects, valid elIds, clamp-compliant durations, valid 12-value turningMode) and 7 slides staying undefined for `animations` and `turningMode` (D-22).
- **Missing-sidecar CLI path** confirmed: `convertDir()` against a directory with no `animations.json` produces all-slides-undefined JSON outputs and exits 0 (ANIM-CLI-02).

## Task Commits

1. **Task 1: mappers/animation.ts** - `a2a9934` (feat)
2. **Tasks 2 + 4 (combined): animation-injector.ts + tests** - `8971b6b` (feat) — Task 4's `effectiveTransitionEffect()` is implemented inside `animation-injector.ts` because it lives at the bottom of `injectAnimations()` and splitting would have introduced circular coupling for ~10 lines of code
3. **Task 3: convertDir() wiring in src/index.ts** - `676f160` (feat)

**Plan metadata:** `docs(14-02): complete Wave 2 mapping summary` (this commit)

## Files Created/Modified

### Created
- `src/mappers/animation.ts` — `ENTRANCE_MAP` (33), `EMPHASIS_MAP` (12), `EXIT_MAP` (13), `TRANSITION_MAP` (44), `EFFECT_FALLBACK`, `EFFECT_NONE_SENTINEL`, `inferAnimationType`, `mapEffect`, `mapTrigger`, `mapDuration`, `mapTransition`. Pure functions and pure-data.
- `src/mappers/animation.test.ts` — 40 vitest tests: 9 whitelist invariants + 5 `inferAnimationType` branches + 8 `mapEffect` branches + 7 `mapTrigger` branches + 5 `mapDuration` clamp cases + 7 `mapTransition` happy + fallback paths.
- `src/animation-injector.ts` — `InjectDiagnostics`, `emptyInjectorDiagnostics()`, `injectAnimations(slide, opts)`, `printDiagnostics(diagnostics, stream)` plus internal helpers `toCamel()`, `normalizeRows()`, `buildExtensions()`, `effectiveTransitionEffect()` (D-21/22).
- `src/animation-injector.test.ts` — 25 vitest tests across 7 describes: emptyInjectorDiagnostics / D-22 strict guard / legacy single form / modern array form / Pitfall 5 / elId resolution / D-11/12/13 / trigger_shape / D-21/22 turningMode resolver / printDiagnostics / diagnostics counters.

### Modified
- `src/index.ts` — `convertDir()` now imports `injectAnimations` + `emptyInjectorDiagnostics` + `AnimationsSidecar`, reads `<parentDir>/animations.json` (overridable via `options.animationsPath`) with `try/catch` JSON-parse fallback, calls `injectAnimations()` per slide with a shared accumulator, and serializes the result into the existing `<svg>.svg.json` envelope. Local `InjectorDiagnostics` type became a back-compat type alias to the new `InjectDiagnostics`.

## Decisions Made

- **Source-side whitelist:** The PPTist effect whitelist (84 entries) and TurningMode enum (12 entries) are inlined into `src/mappers/animation.test.ts` rather than imported from the cloned PPTist repo. Reasoning: the test must be self-contained — the project does NOT depend on PPTist at runtime, and reaching into `code/PPTist/...` at runtime would couple the public package to a private dependency. The whitelist is small enough to copy verbatim, and a Plan-03 integration test against the live config file would duplicate it.
- **Tasks 2 + 4 integration:** The plan's iteration-2 addendum added Task 4 (D-21 defaults) explicitly because Task 2 originally had a single-line `entry.transition?.effect !== undefined` check at the bottom of the row loop. Replacing that one line with `effectiveTransitionEffect()` is mechanically a one-edit change, but the helper itself sits inside `injectAnimations()`. Combining Tasks 2 and 4 into one commit keeps the helper co-located with its caller and avoids a `git blame` hop on a 10-line abstraction. Plan's iteration-2 framing supports this interpretation.
- **`InjectorDiagnostics` alias:** The Wave 1 `src/index.ts` declared its own local `InjectorDiagnostics` interface with slightly different field names. Plan 14-02's real `InjectDiagnostics` from `animation-injector.ts` is richer (5 fields vs 5 names matching). To avoid breaking `ConvertDirResult.diagnostics` consumers we re-export the new type under the old name as a type alias — no public API break, no `git grep` re-work downstream.
- **`legacy` form D-12 fields:** The legacy single-`effect` form groups may carry the D-12 opaque fields (`repeat_count`, `auto_reverse`, etc.) at the group level rather than inside a nested `effects[]`. `normalizeRows()` lifts those fields into the synthetic single-row object so the extensions preservation logic stays uniform.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] legacy single-`effect` form drops D-12 preserved-opaque fields**
- **Found during:** Task 2 (`src/animation-injector.test.ts > camelCases top-level snake_case keys (D-13)` — first attempt: TypeError on `ext!.repeatCount`)
- **Issue:** The original `normalizeRows()` only lifted the D-11 fields (`trigger`, `order`, `delay`, `duration`, `effect_options`, `trigger_shape`) into the synthetic single-row object — the D-12 preserved-opaque fields (`repeat_count`, `repeat_duration`, `auto_reverse`, `rewind`, `accelerate`, `decelerate`, `bounce_end`, `restart`) stayed at the group level and were never written to `extensions`. Plan 14-02 task 2 acceptance criterion says "fields PPTist cannot express (e.g., `effect_options.direction`, `repeat_count`, `autoReverse`, `bounceEnd`, etc., per D-12) are preserved in extensions with camelCased keys".
- **Fix:** Extended `normalizeRows()` to also lift the 8 D-12 opaque fields from the group level into the legacy single-row object. Now both forms produce identical-shape `AnimationsSidecarRow[]` post-normalization.
- **Files modified:** `src/animation-injector.ts` (`normalizeRows` extended)
- **Verification:** `npm test -- src/animation-injector.test.ts` now exits 0 with 25/25 tests passing; the camelCase test asserts `repeatCount === 3`, `repeatDuration === 2`, `autoReverse === true`, etc.
- **Committed in:** `8971b6b` (Task 2 commit)

**2. [Rule 1 - Bug] TRANSITION_MAP contained an invalid TurningMode value**
- **Found during:** Task 1 (lint-style scan of `TRANSITION_MAP` against the 12 TurningMode enum before writing the whitelist-assertion test)
- **Issue:** `'flip': 'flip'` was typed as `TurningMode` but `'flip'` is NOT one of the 12 enum values (`no / fade / slideX / slideY / random / slideX3D / slideY3D / rotate / scaleY / scaleX / scale / scaleReverse`). The TypeScript compiler was happy because `TRANSITION_MAP: Record<string, TurningMode>` allows ANY string value. The whitelist-assertion test would have caught this in CI but the initial commit didn't include the test in the same commit.
- **Fix:** Replaced `'flip': 'flip'` with `'flip': 'fade'`. `'random'` and `'no'` remain verbatim because they ARE in the enum.
- **Files modified:** `src/mappers/animation.ts`
- **Verification:** The whitelist-invariant test `every TRANSITION_MAP value is one of 12 TurningMode enum values` now passes for all 44 entries.
- **Committed in:** `a2a9934` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1× Rule 1 bug, 1× Rule 3 blocking) — both fixes are mechanically required for the plan's intent to work. No semantic drift from plan.

## Issues Encountered

- **Tests in `__tests__/` directory pre-existing failures:** Running `npm test` (full suite) reports 4 unrelated test files failing (path-merge.test.ts: 1 failure; shadow.test.ts: 7 failures; image-outline.test.ts: 1 failure; shape-rx.test.ts: 4 failures). All fail in the same way under `dd4cc9d` (the Wave 1 base commit). They are SHPE/SVG-shape-related issues independent of the animation injection work and were NOT touched by Plan 14-02. The Plan 14-02 acceptance criterion only requires `npm test -- src/mappers/animation.test.ts src/animation-injector.test.ts` to exit 0 — both pass with 65/65 tests.
- **`src/index.ts` Wave 1 type conflict:** The Wave 1 commit shipped a local `emptyInjectorDiagnostics()` skeleton function and a local `InjectorDiagnostics` interface alongside the Wave 2 placeholder. Plan 14-02 needed to import the new (richer) `injectAnimations` and `emptyInjectorDiagnostics` from `./animation-injector` but the local definitions collided. Fixed by deleting the local skeleton and reducing the local `InjectorDiagnostics` interface to a type alias of the new `InjectDiagnostics` type — preserves `ConvertDirResult.diagnostics` as a back-compat public surface.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 14-03 can build on these seams without re-touching the structural plumbing:

- `injectAnimations()` and `emptyInjectorDiagnostics()` are wired into `convertDir()`. The `// Plan 03: replace this block with defaults propagation + printDiagnostics(diagnostics)` marker comment labels the exact integration point.
- The `diagnostics: InjectDiagnostics` accumulator is already populated per-slide for `animationsInjected`, `extensionsFieldsPreserved`, `unmappedEffects`, and `elIdNotFoundWarnings`. Plan 03 can append additional counters (e.g., `defaultsApplied`) without changing the existing shape.
- `printDiagnostics()` exists in `src/animation-injector.ts` and writes to `process.stderr`. Plan 03 only needs to call it from `convertDir()` after the per-file loop finishes.
- The per-row defaults resolver (`effectiveRowDuration(row)` / `effectiveRowTrigger(row)`) is the only remaining piece — it reads `entry.animation?.duration ?? sidecar.defaults.animation?.duration` and threads into `mapDuration(row.duration, effectiveRowDuration(row))`. Currently the `0.45` literal in `mapDuration()` invocation is the placeholder.

No blockers.

---
*Phase: 14-pptist-animation-from-sidecar*
*Completed: 2026-10-15*
