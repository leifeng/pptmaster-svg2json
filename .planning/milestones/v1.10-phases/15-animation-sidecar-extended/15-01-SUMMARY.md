---
phase: 15
plan: 01
title: "映射扩展 + effect:none 级联 + delay+duration 合并"
subsystem: animation-sidecar
tags:
  - mapper-expansion
  - effect-none-cascade
  - delay-duration-merge
  - diagnostic-counters
depends_on:
  requires:
    - phase: 14
      reason: "Phase 14 N→N coverage fix at commit e7ad695 — Phase 15 layers on top of injectAnimations() iteration without rewriting the loop"
  provides:
    - "ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP cover all 139 three-side keys from ELEMENT_ANIMATIONS.md §4.6"
    - "D-02 cascade: defaults.animation.effect === 'none' suppresses animations unless row override"
    - "D-03 transition.effect === 'none' → turningMode === 'no'"
    - "D-13 delay + duration collapse into single ms duration (clamped [100, 5000])"
    - "D-14 original delay preserved in extensions.originalDelay + delayAccumulatedSeconds counter"
  affects:
    - "src/mappers/animation.ts (mapping tables + mapEffect counters param)"
    - "src/animation-injector.ts (D-02/D-13/D-14 logic + new diagnostics fields)"
    - "src/animation-types.ts (AnimationsSidecarSlide.animation.effect field)"
    - "tests/e2e/202610131101001.test.ts (regression guards for new behaviors)"
tech-stack:
  added: []
  patterns:
    - "Optional counters param on mapEffect() for observability without changing existing call sites"
    - "Slide-level cascade via entry.animation.effect / sidecar.defaults.animation.effect resolved at top of row loop"
    - "delay + duration arithmetic collapse then mapDuration() clamp"
key-files:
  created:
    - ".planning/phases/15-animation-sidecar-extended/15-tracer-baseline.json"
    - ".planning/phases/15-animation-sidecar-extended/15-01-tracer.log"
  modified:
    - "src/mappers/animation.ts"
    - "src/mappers/animation.test.ts"
    - "src/animation-injector.ts"
    - "src/animation-injector.test.ts"
    - "src/animation-types.ts"
    - "tests/e2e/202610131101001.test.ts"
decisions:
  - "D-09: ENTRANCE_MAP expanded 33 → 53 entries (added entrance_flash_once from §4.6 line 269 not in RESEARCH.md draft)"
  - "D-10: EMPHASIS_MAP expanded 12 → 33 entries (covers all §4.6 lines 317-349 verbatim)"
  - "D-11: EXIT_MAP expanded 13 → 53 entries (added exit_flash_once from §4.6 line 433 not in RESEARCH.md draft)"
  - "D-12: mapEffect accepts counters?: { unmappedEffectCount: number }; increment when fallback fires; original key still written to extensions.originalEffect"
  - "D-02: Slide-level cascade check at top of row loop — when effectiveAnimationDefaults.effect === 'none' and row.effect undefined, skip row; allow row override"
  - "D-03: transition.effect === 'none' → turningMode === 'no' via inline ternary in injectAnimations (preserves auto_advance / sound semantics)"
  - "D-13: row duration calc = (row.delay ?? 0) + effectiveRowDuration(row); mapDuration(totalSeconds) preserves clamp"
  - "D-14: extensions.originalDelay (via existing buildExtensions path) + new diagnostics.delayAccumulatedSeconds counter"
metrics:
  duration: "≈14 minutes (build + 4 npm test invocations + 5 file edits + SUMMARY.md + frontmatter alignment × 4)"
  completed_date: 2026-10-15
  commits: 7
  plan_head_before: 77ead70b2bf3afe97d09ff77c189a0bd0a3540be
  plan_head_after: 1fb6874
status: complete
actuals:
  tokens: 7000
  tasks: 3
  commits: 7
  note: "Measured via `git rev-list --count 77ead70b..HEAD` = 7 commits. Of these: 2 feat commits (Task 2 mapper expansion, Task 3 injector logic) + 5 SUMMARY.md metadata commits (initial + 4 frontmatter corrections for accurate self-reported counts). The 'recursive commit' pattern is acceptable here because frontmatter self-correction is post-SUMMARY and only mutates state without changing scope of work."
---

# Phase 15 Plan 01: 映射扩展 + effect:none 级联 + delay+duration 合并 — Summary

## One-liner

Extend ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP to 53/33/53 = 139 full coverage of ELEMENT_ANIMATIONS.md §4.6; add D-02 slide-level `effect: "none"` cascade, D-03 `transition.effect: "none" → turningMode: "no"`, D-13 `delay + duration` merge into single clamped ms duration; surface `unmappedEffectCount` + `delayAccumulatedSeconds` diagnostics.

## Tasks Completed

| Task | Name | Commit | Notes |
|------|------|--------|-------|
| 1 | Tracer: E2E baseline | (no commit — observation only) | 13 covered / 7 uncovered / 203 animations; baseline written to `15-tracer-baseline.json` + `15-01-tracer.log` |
| 2 | 扩展 3 个映射表 + mapper 单元测试 + 增量 counter | `42ef91f` | ENTRANCE_MAP 33→53, EMPHASIS_MAP 12→33, EXIT_MAP 13→53; mapEffect counters param; 7 new mapper tests (count + §4.6 coverage) |
| 3 | D-02 cascade + D-03 transition 'none' → 'no' + D-13 delay+duration 合并 + injector 单元测试 | `ba8fcb3` | InjectDiagnostics.unmappedEffectCount + delayAccumulatedSeconds; row-level cascade; inline ternary for transition; delay+duration collapse; 8 new injector tests + 4 new E2E assertions |

⚡ Auto-approved checkpoint D-13-delay-duration-collapse: collapsed `delay + duration` into single ms duration per documented trade-off (PPTist has no independent delay field).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added `entrance_flash_once` and `exit_flash_once` to mapping tables**
- **Found during:** Task 2 — mapper tests failing on count assertions
- **Issue:** ELEMENT_ANIMATIONS.md §4.6 lists `entrance_flash_once` (line 269) and `exit_flash_once` (line 433), but the source table in `15-RESEARCH.md` §"Mapping Tables" omitted these two keys. The spec count is 53/33/53, so these are required for `=== 53/53` assertions to pass.
- **Fix:** Added both with PPTist fallback values — `entrance_flash_once: 'fadeIn'` and `exit_flash_once: 'fadeOut'` (PPTist has no flash-once; closest semantic is fade).
- **Files modified:** `src/mappers/animation.ts`
- **Commit:** `42ef91f`

**2. [Rule 1 - Test] Updated `known emphasis_ key returns mapped value with fallback=false` test**
- **Found during:** Task 2 — mapper tests failing on the Phase 14 existing assertion
- **Issue:** The old mapper had `emphasis_pulse: 'pulse'` (12-entry map), but `emphasis_pulse` is NOT in ELEMENT_ANIMATIONS.md §4.6 lines 317-349. The 33-entry EMPHASIS_MAP strictly follows §4.6, so `emphasis_pulse` correctly maps to `fallback: true` (and falls through to `EFFECT_FALLBACK.attention === 'pulse'`).
- **Fix:** Changed the test to use `emphasis_shimmer` (which IS in §4.6 line 317, maps to `wobble`, `fallback: false`). Added a NEW test (`unmapped emphasis key (emphasis_pulse — NOT in §4.6) falls back to pulse`) that asserts the unmapped-fallback behavior with `counters.unmappedEffectCount === 1`.
- **Files modified:** `src/mappers/animation.test.ts`
- **Commit:** `42ef91f`

**3. [Rule 1 - Bug] Type extension for `AnimationsSidecarSlide.animation.effect`**
- **Found during:** Task 3 — TypeScript compile error on `effectiveAnimationDefaults?.effect`
- **Issue:** The D-02 cascade needs to read `effectiveAnimationDefaults.effect`, but `AnimationsSidecarSlide['animation']` and `AnimationsSidecar['defaults']['animation']` only declared `trigger` and `duration` fields.
- **Fix:** Added optional `effect?: string` field to both type members. No runtime change — types are forward-compat.
- **Files modified:** `src/animation-types.ts`
- **Commit:** `42ef91f`

### Out-of-scope items

- 13 pre-existing test failures in `__tests__/shadow.test.ts`, `__tests__/path-merge.test.ts`, `__tests__/shape-rx.test.ts`, `__tests__/image-outline.test.ts` — NOT touched by Phase 15 changes. Logged to `deferred-items.md` consideration, but these are unrelated path-merge / shadow / shape-rx rendering bugs outside this plan's scope.

### Plan count vs observed count

- PLAN.md mentioned "225 animations" as Phase 14 baseline. Actual fixture output (after re-build) is **203 animations**. The PLAN.md number was stale (possibly from an earlier fixture revision). All 13 covered slides + 7 uncovered slides match the planned distribution. The 203 baseline is now captured in `15-tracer-baseline.json`.

## Test Results

```
Test Files  3 passed (3)
     Tests 137 passed (137)
  Duration  6.74s
```

| Suite | Tests | Status |
|-------|-------|--------|
| `src/mappers/animation.test.ts` | 47 | ✓ (40 existing + 7 new — count assertions + §4.6 coverage + unmapped-counter) |
| `src/animation-injector.test.ts` | 45 | ✓ (37 existing + 8 new — D-02 × 2, D-03 × 2, D-13 × 4) |
| `tests/e2e/202610131101001.test.ts` | 45 | ✓ (41 existing + 4 new — D-13 clamp regression guard, delayAccumulatedSeconds, originalDelay absence, unmappedEffectCount) |

Pre-existing failures in `__tests__/{shadow,path-merge,shape-rx,image-outline}.test.ts` are unrelated to Phase 15 changes (rendering/path-merge code paths not touched by this plan).

## CLI Regression Check

`node ./dist/src/cli.js exampels/202610131101001` exit code: **0**

Stderr diagnostic line:

```
[animations] injected into 13 slide(s), 203 PPTAnimation entries (203 PPTElement × row tuples),
406 fields preserved in extensions, 0 effects fell back to defaults,
0 effects unmapped (fallback), 0.00s total delay
```

- 13 covered slides ✓
- 203 animations (Phase 14 baseline) ✓
- 7 uncovered slides: `slide.animations === undefined && slide.turningMode === undefined` ✓ (D-22)
- 0 unmapped effects ✓
- 0.00s total delay ✓ (no fixture row sets `delay`)
- All `effect` ∈ 92-entry PPTist whitelist ✓
- All `duration` ∈ [100, 5000] ms ✓

## Files Modified

| File | LOC Δ | Description |
|------|------:|-------------|
| `src/mappers/animation.ts` | +238 / -66 | ENTRANCE_MAP 33→53, EMPHASIS_MAP 12→33, EXIT_MAP 13→53; `mapEffect` counters param |
| `src/mappers/animation.test.ts` | +120 / -7 | Exact count assertions (=== 53/33/53); §4.6 cross-coverage tests (6 new); unmapped-counter test |
| `src/animation-injector.ts` | +68 / -5 | D-02 cascade, D-03 transition 'none' → 'no', D-13 delay+duration merge; new counters; printDiagnostics extension |
| `src/animation-injector.test.ts` | +184 / -1 | D-02 × 2 + D-03 × 2 + D-13 × 4 cases; updated literal assertions for new counters |
| `src/animation-types.ts` | +6 / -0 | `effect?: string` on `AnimationsSidecarSlide.animation` + `defaults.animation` |
| `tests/e2e/202610131101001.test.ts` | +29 / -0 | 4 new regression assertions |
| `.planning/phases/15-animation-sidecar-extended/15-tracer-baseline.json` | new | Per-slide animations length + invariants flag |
| `.planning/phases/15-animation-sidecar-extended/15-01-tracer.log` | new | One-line commit-style tracer anchor |

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| (none) | — | No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. Pure data table expansion + arithmetic + enum mapping (TRANSITION_MAP path). `turningMode: 'no'` is documented in `TurningMode` enum (slides.ts). |

## Self-Check: PASSED

- All 137 modified-scope tests pass ✓
- Build exits 0 ✓
- CLI exit 0; 13 covered / 7 uncovered baseline preserved ✓
- 2 commits on `worktree-agent-a44837fa1e14e188e` ✓
- All 5 modified source files committed ✓
- tracer baseline + log files written ✓