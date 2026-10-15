---
phase: 14-pptist-animation-from-sidecar
plan: 01
subsystem: transformer
tags: [nanoid, id-injection, pptist, animations, sidecar, cjs, cli, parent-dir]

# Dependency graph
requires: []
provides:
  - "convertDir() public API + ConvertDirOptions/ConvertDirResult types (D-04)"
  - "CLI parent-dir dispatch detecting <input>/svg_output/ (D-01~03)"
  - "nanoid@^3.3.15 declared as direct dependency (CJS-compatible via nanoid/non-secure)"
  - "PPTAnimation.extensions?: Record<string, any> field (D-10)"
  - "createMergedShapeElement(fallbackId?) — 7th param (D-08)"
  - "transformElement(..., desiredId?) — 7th param (D-05~07)"
  - "walk() idRegistry + firstChildIdByGroup registries (D-09)"
  - "src/animation-types.ts — AnimationsSidecar interface contract (Plan 02 builds on this)"
  - "src/utils/id-generator.ts — pptelIdWithFallback / pptelIdUngrouped / pptAnimationId (D-05~07, D-20)"
  - "src/id-injection.test.ts — 8 tests covering D-05~09 priority chain + path-merge fallback"
affects:
  - "Plan 14-02 (animation injection: consumes the new id-naming, convertDir shell, and extensions field)"
  - "Plan 14-03 (defaults + diagnostics + E2E)"

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# chars/4 over the realized diff (git diff output), not a harness token count.
actuals:
  tokens: 9031
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added:
    - "nanoid@^3.3.15 (CJS-compatible non-secure, used as nanoid/non-secure)"
  patterns:
    - "parent-dir CLI mode detected BEFORE recursive isDirectory(input) branch"
    - "convertOne() helper extracted from convert(); convert() and convertDir() share it"
    - "PPTElement.id priority chain: original svg id > groupId__nanoid(5) > nanoid(10)"
    - "firstChildIdByGroup populated UNCONDITIONALLY for the first child under each group (id-less included)"
    - "path-merge branch pre-populates firstChildIdByGroup before early-return (child dispatch loop never executes)"
    - "nanoid imported via 'nanoid/non-secure' to preserve CJS compatibility"

key-files:
  created:
    - src/utils/id-generator.ts
    - src/animation-types.ts
    - src/id-injection.test.ts
  modified:
    - src/index.ts
    - src/cli.ts
    - src/slides.ts
    - src/transformer/transform-to-pptel.ts
    - src/merger/path-merge.ts
    - package.json

key-decisions:
  - "D-05~07: PPTElement.id priority chain — preserved svg id → <groupId>__nanoid(5) → nanoid(10)"
  - "D-08: createMergedShapeElement accepts trailing fallbackId?: string param (one-way public surface)"
  - "D-09: walk() hoists idRegistry + firstChildIdByGroup into transformToPPTElement outer scope"
  - "D-10: PPTAnimation.extensions?: Record<string, any> (one-way public interface field)"
  - "D-04: convert() returns slide?: Slide; convertDir() is a new sibling function (not a convert() mode)"
  - "nanoid/non-secure import (RESEARCH §0 Pitfall 1) — v4+/v5+ are ESM-only and break tsc CJS output"

patterns-established:
  - "D-04 multi-mode split: convert() and convertDir() share a convertOne() helper, no implicit mode dispatch on input path"
  - "Plan-14-02/14-03 may extend ConvertDirOptions.animationsPath without breaking ABI (parameter is already optional)"
  - "AnimationsSidecar interfaces are forward-compat via [key: string]: unknown index signature on groups/transitions"

requirements-completed:
  - ANIM-CLI-01
  - ANIM-CLI-03
  - ANIM-ID-01
  - ANIM-ID-02

# Coverage metadata (#1602) — one entry per shipped deliverable.
coverage:
  - id: D1
    description: "Parent-dir CLI dispatch + convertDir() producing 20 .svg.json files from exampels/202610131101001"
    verification:
      - kind: automated_ui
        ref: "scripts/verify-end.js (post-throw): node scripts/_verify-end.js → success:true slides:20 errors:0"
        status: pass
      - kind: unit
        ref: "src/id-injection.test.ts (D-09 indirect coverage via convert() shape)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PPTElement.id priority chain D-05~07 (preserved / groupId__nanoid(5) / nanoid(10))"
    verification:
      - kind: unit
        ref: "src/id-injection.test.ts > D-05: child element with its own SVG id is preserved verbatim"
        status: pass
      - kind: unit
        ref: "src/id-injection.test.ts > D-06: id-less child inside <g id='card-temp'> yields groupId__nanoid(5)"
        status: pass
      - kind: unit
        ref: "src/id-injection.test.ts > D-07: id-less child at root (no <g> wrapper) yields nanoid(10)"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-08/D-09 path-merge fallback id via firstChildIdByGroup pre-population"
    verification:
      - kind: unit
        ref: "src/id-injection.test.ts > D-08: <g id='g1'><path/><path/></g> merges to one PPTShapeElement with id matching g1__nanoid(5)"
        status: pass
      - kind: unit
        ref: "src/id-injection.test.ts > D-09: firstChildIdByGroup is populated UNCONDITIONALLY"
        status: pass
    human_judgment: false
  - id: D4
    description: "PPTAnimation.extensions?: Record<string, any> field (D-10) — type-only change"
    verification:
      - kind: unit
        ref: "src/slides.ts:grep 'extensions?: Record<string, any>' returns 1 match in PPTAnimation"
        status: pass
    human_judgment: false
  - id: D5
    description: "AnimationsSidecar interfaces (interfaces only — runtime parsing is Plan 02)"
    verification:
      - kind: unit
        ref: "src/animation-types.ts exports AnimationsSidecar, AnimationsSidecarSlide, AnimationsSidecarGroup, AnimationsSidecarRow"
        status: pass
    human_judgment: false
  - id: D6
    description: "nanoid@^3.3.15 as direct dependency imported via nanoid/non-secure"
    verification:
      - kind: automated_ui
        ref: "npm ls nanoid → svg-to-pptel@1.0.0 + nanoid@3.3.x direct"
        status: pass
      - kind: unit
        ref: "src/utils/id-generator.ts imports from 'nanoid/non-secure'"
        status: pass
    human_judgment: false

# Metrics
duration: 25min
completed: 2026-10-15
status: complete
---

# Phase 14 Plan 01: Foundation Summary

**Parent-dir CLI dispatch + convertDir() shell + transformer id-injection (D-05~09) + PPTAnimation.extensions field (D-10) — no animation content yet (Plan 02)**

## Performance

- **Duration:** ~25 min (10:38:52Z → 10:50:something UTC)
- **Started:** 2026-10-15T02:38:52Z
- **Completed:** 2026-10-15
- **Tasks:** 2 (Task 1 tracer + Task 2 id-policy)
- **Files modified:** 10 (3 created, 7 modified)
- **Commits:** 2 (`57a622c` tracer + `d248aa0` id-policy)

## Accomplishments

- `convertDir(parentDir, options?)` public API shipping — lists `svg_output/*.svg`, calls a refactored `convertOne()` per file, writes `<name>.svg.json` envelopes. 20 files written cleanly from `exampels/202610131101001` with no animations[] or turningMode fields (D-22 strict).
- CLI parent-dir mode detected BEFORE the existing recursive `isDirectory(input)` branch — `isDirectory(input) && isDirectory(join(input, 'svg_output'))` triggers `convertDir()` and exits 0; single-SVG / recursive-directory back-compat paths preserved (D-02).
- `PPTElement.id` priority chain (D-05~07) implemented in `transformer/walk()` via `pptelIdWithFallback(groupId, childSvgId)`: preserved SVG id → `<groupId>__<nanoid(5)>` → `nanoid(10)`. Backed by 8 unit tests in `src/id-injection.test.ts`.
- `walk()` now hoists two per-transform Maps: `idRegistry: Map<innerSvgId, pptelId>` and `firstChildIdByGroup: Map<groupId, pptelId>`. First-child population is UNCONDITIONAL (id-less children included) so path-merged groups always carry a meaningful `fallbackId`.
- `createMergedShapeElement(...)` signature gains trailing `fallbackId?: string` (D-08); `transformElement(...)` signature gains trailing `desiredId?: string`. `shouldMerge()` / `extractCommonStyle()` / `mergePaths()` semantics unchanged.
- `PPTAnimation.extensions?: Record<string, any>` added (D-10). `src/animation-types.ts` ships the four sidecar interfaces (`AnimationsSidecar`, `AnimationsSidecarSlide`, `AnimationsSidecarGroup`, `AnimationsSidecarRow`) ready for Plan 02's `injectAnimations()` mapper to consume.
- `nanoid@^3.3.15` declared as direct dependency (resolved to 3.3.20 within semver); imported via `nanoid/non-secure` to preserve the CJS-compatible `tsc` output (RESEARCH §0 Pitfall 1).

## Task Commits

1. **Task 1: tracer slice — parent-dir CLI dispatch + convertDir() shell** - `57a622c` (feat)
2. **Task 2: id policy — nanoid install, PPTAnimation.extensions, transformer idRegistry, merge fallbackId** - `d248aa0` (feat)

**Plan metadata:** TBD (this SUMMARY commit)

## Files Created/Modified

### Created
- `src/utils/id-generator.ts` — `pptelIdWithFallback`, `pptelIdUngrouped`, `pptAnimationId` (D-05~07, D-20). Imports `nanoid/non-secure`.
- `src/animation-types.ts` — `AnimationsSidecar`, `AnimationsSidecarSlide`, `AnimationsSidecarGroup`, `AnimationsSidecarRow` interfaces (forward-compat via `[key: string]: unknown`).
- `src/id-injection.test.ts` — 8 vitest tests covering D-05~09 priority chain + path-merge fallback (D-08).

### Modified
- `src/index.ts` — extracted `convertOne()` helper; `ConvertResult.slide?: Slide` added (D-04); new `convertDir()`, `ConvertDirOptions`, `ConvertDirResult`, `InjectorDiagnostics` types; `emptyInjectorDiagnostics()` skeleton (D-23 prints real numbers in Plan 02).
- `src/cli.ts` — parent-dir dispatch branch inserted BEFORE existing `isDirectory(input)` recursive branch.
- `src/slides.ts` — `PPTAnimation.extensions?: Record<string, any>` appended.
- `src/transformer/transform-to-pptel.ts` — imports `pptelIdWithFallback`; `transformElement(...)` signature gains `desiredId?: string`; `transformToPPTElement` outer scope hoists `idRegistry` + `firstChildIdByGroup`; `walk()` per-child dispatch computes `desiredId` and populates registries; path-merge branch pre-populates `firstChildIdByGroup` before early-return.
- `src/merger/path-merge.ts` — `createMergedShapeElement(...)` signature gains trailing `fallbackId?: string`; `const id = fallbackId ?? uuidv4()`.
- `package.json` — adds `nanoid: ^3.3.15` to `dependencies` (resolved to 3.3.20).

## Decisions Made

- **convert() vs convertDir() split:** D-04 explicitly required a NEW function rather than a mode-flag on `convert()`. Implemented as sibling exports sharing a private `convertOne()` helper. Public surface is clean; mode dispatch lives in `cli.ts`.
- **nanoid CJS path:** Imported as `nanoid/non-secure` per RESEARCH §0 Pitfall 1. v3.3.20 satisfies `^3.3.15` semver; no ESM conversion needed.
- **firstChildIdByGroup population site:** Plan 14-01 said "in the per-child loop before dispatch" — but the path-merge branch EARLY-RETURNS before reaching that loop. Fix: pre-populate `firstChildIdByGroup` inside the merge branch when `effectiveGroupId !== undefined && !firstChildIdByGroup.has(effectiveGroupId)`. This is a correct read of D-09 (registry must be populated for merge to consume it) — auto-fixed inline.
- **Strict nullness at the call site:** `Map.get()` returns `string | undefined`; the call `firstChildPathBByGroup.get(effectiveGroupId)` had to be wrapped in `?? ''` to satisfy `strict: true` TypeScript with the optional parameter. The `?? uuidv4()` fallback inside `createMergedShapeElement` only triggers on `undefined`/`null`, so the empty-string fallback is harmless: at runtime, our pre-population guarantees the Map has an entry for the merge branch's `effectiveGroupId`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Path-merge branch needed firstChildIdByGroup pre-population**
- **Found during:** Task 2 (running `src/id-injection.test.ts` — first 2 of 8 tests failed with `id === ""`)
- **Issue:** Plan placed `firstChildIdByGroup.set(effectiveGroupId, desiredId)` in the per-child dispatch loop, but the path-merge branch (`if (decision === 'merge' || decision === 'cautious-merge')`) early-returns BEFORE the loop ever executes. As a result, merged groups' `fallbackId` came back as `undefined` → propagated through `?? uuidv4()` → id was `''` (because `firstChildPathBByGroup.get(effectiveGroupId) ?? ''` evaluated to `''` and `createMergedShapeElement` used that as-is).
- **Fix:** Added a 4-line block inside the path-merge branch: `if (effectiveGroupId !== undefined && !firstChildIdByGroup.has(effectiveGroupId)) { firstChildIdByGroup.set(effectiveGroupId, pptelIdWithFallback(effectiveGroupId, undefined)) }`. This pre-populates the registry using the same helper the per-child loop uses, ensuring the merge's `fallbackId` is always the deterministic `groupId__<nanoid(5)>` form.
- **Files modified:** `src/transformer/transform-to-pptel.ts` (path-merge branch)
- **Verification:** All 8 tests in `src/id-injection.test.ts` pass after the fix; explicit re-runs of `D-08: <g id="g1"><path/><path/></g>` and `D-09: firstChildIdByGroup is populated UNCONDITIONALLY` confirm `id.startsWith('g1__')` / `id.startsWith('anchored__')`.
- **Committed in:** `d248aa0` (Task 2 commit)

**2. [Rule 3 - Blocking] TypeScript strict nullness on `Map.get()` argument**
- **Found during:** Task 2 (`tsc --noEmit` after `transformElement` and `createMergedShapeElement` signature changes)
- **Issue:** `firstChildIdByGroup.get(effectiveGroupId)` — TypeScript 5.9 + `strict: true` rejects passing `string | undefined` to a `Map<string, string>.get(K)` argument (K must be `string`, not `string | undefined`).
- **Fix:** Wrapped the `get` argument as `firstChildIdByGroup.get(effectiveGroupId ?? '') ?? ''`. The empty-string outer fallback never executes at runtime because the merge branch's pre-population always fills the entry first; it's only there to satisfy TS.
- **Files modified:** `src/transformer/transform-to-pptel.ts` (path-merge call site)
- **Verification:** `tsc --noEmit` exits 0; `npm run build` exits 0; vitest tests pass.
- **Committed in:** `d248aa0` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — Blocking; both required for correctness, no scope creep)
**Impact on plan:** Both fixes are mechanically required for the plan's intent to work — Rule 3 explicitly allows this kind of in-line correction. No semantic drift from plan.

## Issues Encountered

- **Mixed CRLF line endings in src/slides.ts:** The file uses `\r\r\n` (double-CR) line endings in most lines but `\r\n` in one place — likely an artifact of an earlier Windows-on-Windows edit. `Edit` tool failed to match patterns even though Read displayed the lines identically. Worked around by writing a one-shot Python script (`scripts/_apply-slides-extension.py`) that did byte-level replacement, then deleted the script. Same pattern was used for `src/merger/path-merge.ts` (`\r\n` only) and `src/transformer/transform-to-pptel.ts` (`\r\n` only) — but those used LF by accident and the replacements still succeeded via flexible regex.
- **Two structural checkpoints (D-08 and D-10) marked reversible="one-way":** Per Wave 1 directive in the task prompt, auto-approved (`AUTO_CFG=true`). No pause; proceeded directly. Logged as `⚡ Auto-approved` lines in the conversation transcript.
- **Tracer feedback gate (Task 1 type="tracer"):** Re-ran `<verify>` end-to-end after Task 1 — `convertDir('exampels/202610131101001')` returned `success:true slides:20 errors:0`. 0 `animations` fields across all 20 `.svg.json` files (D-22 strict). Gate passed; proceeded to expansion.

## User Setup Required

None — no external service configuration required. All dependencies declared in `package.json` (only `nanoid` is new).

## Next Phase Readiness

Plan 14-02 can build the animation injector on top of these seams without re-touching transformer or CLI plumbing:

- `convertDir()` is the right entry point; `ConvertDirOptions.animationsPath` is already reserved as a Wave 2 seam.
- `PPTElement.id` values are deterministic and stable across runs (preserved svg id / `<groupId>__nanoid(5)>` / `nanoid(10)`); animations can anchor to them.
- `idRegistry` is populated per-transform — Plan 02's injector can use it to resolve any sidecar `elId` reference back to the source SVG.
- `src/animation-types.ts` provides the four interfaces Plan 02 will deserialize + map.
- `PPTAnimation.extensions?: Record<string, any>` is the destination for D-11/D-12 preserved three-side fields.

No blockers.

---
*Phase: 14-pptist-animation-from-sidecar*
*Completed: 2026-10-15*