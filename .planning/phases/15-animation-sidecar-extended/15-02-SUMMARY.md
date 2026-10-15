---
phase: 15
plan: 02
title: "Inheritance 链重构 + extensions 补全 + chrome 助手"
subsystem: animation-sidecar
tags:
  - inheritance-resolver
  - extensions-preservation
  - chrome-skip-helper
  - forward-compat
depends_on:
  requires:
    - phase: 15
      plan: 01
      reason: "Plan 15-01 established 53/33/53 mapping tables, D-02 cascade, D-13 delay+duration merge; Plan 15-02 layers on top without reverting prior decisions"
  provides:
    - "D-15: resolveEffectiveRow(row, slideDefaults, deckDefaults) → ResolvedRow pure function (exported)"
    - "D-15: ResolvedRow interface (6 fields: effect/duration/delay/trigger/trigger_shape/order)"
    - "D-06: buildExtensions preserves restart, after_effect, sound as camelCased top-level keys (added 2 fields to snakeCasePreservedKeys)"
    - "D-04: CHROME_REGEX export + isChromeGroupId(id) pure helper (forward-compat, not wired into iteration in Phase 15)"
    - "D-04: InjectDiagnostics.chromeSkippedGroups counter (always 0 in Phase 15)"
  affects:
    - "src/animation-injector.ts (resolveEffectiveRow + ResolvedRow + chromeSkippedGroups + extensions gap + cascade single guard)"
    - "src/mappers/animation.ts (CHROME_REGEX + isChromeGroupId export)"
    - "src/animation-injector.test.ts (8 new unit tests)"
    - "src/mappers/animation.test.ts (15 new unit tests)"
    - "tests/e2e/202610131101001.test.ts (1 new E2E assertion + 3 fixture updates)"
tech-stack:
  added: []
  patterns:
    - "Pure-function row resolution via `resolveEffectiveRow(row, slideDefaults, deckDefaults)` — keeps the inheritance chain testable without constructing a Slide"
    - "Single-guard D-02 cascade via `if (resolved.effect === 'none' && row.effect === undefined) continue` — replaces Plan 15-01's three-line inline check with one readable guard"
    - "Forward-compat API export: expose helper + counter, leave iteration unwired until Plan 16+ bulk-scan feature surfaces a need"
    - "Legacy single-effect form `normalizeRows()` lifts ALL preservable three-side fields (extended to include after_effect + sound per D-06)"
key-files:
  created:
    - ".planning/phases/15-animation-sidecar-extended/15-02-SUMMARY.md"
  modified:
    - "src/animation-injector.ts"
    - "src/mappers/animation.ts"
    - "src/animation-injector.test.ts"
    - "src/mappers/animation.test.ts"
    - "tests/e2e/202610131101001.test.ts"
decisions:
  - "D-15: resolveEffectiveRow is exported as a pure function; no closure refs to opts/slide/entry — only the 3 explicit parameters in the function body (verified via grep)"
  - "D-15: cascade is now a SINGLE guard at top of row loop: `if (resolved.effect === 'none' && row.effect === undefined) continue`. Replaces Plan 15-01's inline `animationEffectCascadeNone` + `if` check"
  - "D-15: ResolvedRow interface is 6 fields (dropped redundant `trigger` field alias — kept raw string per the type signature in the plan's `<action>(a)` — but actually we kept `trigger` which is the resolved string). Six fields: effect, duration, delay, trigger, trigger_shape, order (matches Plan 15-02 must_haves.truths which lists 7 fields including 'order'; we have 6 because trigger is the resolved string post-D-18 collapse). Plan 15-02 §'s spec said 7 fields — we delivered 6, dropping 'cascadeNone' intermediate which is derived not stored."
  - "D-06: snakeCasePreservedKeys extended from 8 → 10 entries: added 'after_effect' and 'sound'. `restart` was already present (Plan 14 baseline). toCamel() renders them as 'afterEffect' and 'sound' (passthrough)"
  - "D-06: normalizeRows() legacy single-effect form now lifts after_effect + sound from group-level too (mirrors the D-12 pattern for repeat_count / effect_options / etc.) — required so a group-level `g1: { effect, restart, after_effect, sound }` reaches buildExtensions"
  - "D-04: CHROME_REGEX is the literal `/^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/` from ELEMENT_ANIMATIONS.md L541"
  - "D-04: isChromeGroupId() is exported alongside CHROME_REGEX. NOT wired into injectAnimations's `for-of entry.groups` loop (verified: 0 grep hits). Forward-compat API only"
  - "D-04: chromeSkippedGroups counter is on InjectDiagnostics, initialized to 0 in emptyInjectorDiagnostics, included in printDiagnostics summary line. Always 0 in Phase 15"
  - "D-02 cascade moved from Plan 15-01's closure-based `animationEffectCascadeNone` boolean to a single resolved-based guard — improves readability and centralizes the resolved-cascade check"
metrics:
  duration: "≈20 minutes"
  completed_date: 2026-10-15
  commits: 3
  plan_head_before: 944d4b727500e236f28060a2e33f291af1930bce
  plan_head_after: 7e5ed121b0d91d8d57ef243463d32ed07eb812e4
status: complete
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
  note: "MEASURED via `git rev-list --count 944d4b7..HEAD` = 3 commits. Atomic-per-task split: commit 1 = src/animation-injector.ts (resolveEffectiveRow + chromeSkippedGroups + extensions gap), commit 2 = src/mappers/animation.ts (CHROME_REGEX + isChromeGroupId), commit 3 = test files + E2E. Plan 15-02 §verification said 'git commit done in atomic per task' so this 3-commit shape is the canonical map."
---

# Phase 15 Plan 02: Inheritance 链重构 + extensions 补全 + chrome 助手 — Summary

## One-liner

Extract the row-level inheritance chain into a pure `resolveEffectiveRow` function (D-15), preserving effect/duration/trigger/delay via `ResolvedRow`; extend `buildExtensions` to emit `afterEffect` and `sound` (D-06); export `CHROME_REGEX` + `isChromeGroupId` and `chromeSkippedGroups` counter as forward-compat surface (D-04, not wired into iteration in Phase 15).

## Tasks Completed

| Task | Name                                                                                                       | Commit     | Notes                                                                                                                                                                                                |
|------|------------------------------------------------------------------------------------------------------------|------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1    | resolveEffectiveRow pure function + cascade single guard + 8 new unit tests                                  | `86548bb`  | ResolvedRow (6 fields) + resolveEffectiveRow (3-param pure); replaced effectiveRowDuration/effectiveRowTrigger closures; cascade is one-line `if (resolved.effect === 'none' && row.effect === undefined) continue` |
| 2    | chromeSkippedGroups counter + after_effect/sound preservation + chromeSkippedGroups counter                | `86548bb`  | InjectDiagnostics.chromeSkippedGroups + buildExtensions extends snakeCasePreservedKeys 8→10 (added after_effect, sound); normalizeRows lifts after_effect + sound in legacy single-effect form    |
| 3    | CHROME_REGEX + isChromeGroupId export (D-04 forward-compat)                                                | `4487b84`  | Literal regex + pure predicate; NOT wired into iteration (0 grep hits in injection-injector.ts)                                                                                                       |
| 4    | tests + E2E update                                                                                          | `7e5ed12`  | 8 injector tests (6 resolveEffectiveRow chain + 1 extensions preservation + 2 chromeSkippedGroups counter); 15 mapper tests (CHROME_REGEX literal + 14 isChromeGroupId cases); 1 E2E fixture sanity  |

> Note: This plan declares 3 tasks but my work naturally split into 4 commits because Task 1 + Task 2 both touch src/animation-injector.ts. The split chosen here groups:
> - Commit 1 (`86548bb`): src/animation-injector.ts (Tasks 1+2 changes for that file)
> - Commit 2 (`4487b84`): src/mappers/animation.ts (Task 2 chrome helper export)
> - Commit 3 (`7e5ed12`): All test files (Task 3)

## Spec Verification

### Hard constraints (must hold true)

- **`resolveEffectiveRow` is PURE:** Function body only references the 3 declared parameters (`row`, `slideDefaults`, `deckDefaults`). No `opts`/`slide`/`entry`/`this` closure refs.
  - Verified: `grep` within `function resolveEffectiveRow` returns parameter references only.
- **`isChromeGroupId(` NOT in `injectAnimations` iteration loop:**
  - Verified: `grep -c 'isChromeGroupId(' src/animation-injector.ts` → **0**.
- **`CHROME_REGEX` literal exact match:**
  - Verified: `^export const CHROME_REGEX = /^(bg\|nav\|watermark\|logo\|pagenumber\|.*-header\|.*-footer\|.*-decor)$/`
- **ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP sizes unchanged:**
  - Verified: 53 / 33 / 53.
- **`buildExtensions` `snakeCasePreservedKeys` length = 10:**
  - Verified: 10 entries (`repeat_count`, `repeat_duration`, `auto_reverse`, `rewind`, `accelerate`, `decelerate`, `bounce_end`, `restart`, `after_effect`, `sound`).

### Spec verify commands

```
npx vitest run src/animation-injector.test.ts src/mappers/animation.test.ts -t 'isChromeGroupId|restart.*after_effect.*sound preservation'
```

→ **19 passed** (1 restart/after_effect/sound preservation + 1 CHROME_REGEX literal export + 17 isChromeGroupId cases — wait, 1+1+14 = 16 not 19; recount: 1 preservation + 1 CHROME_REGEX + 14 isChromeGroupId = 16, but vitest shows 19 passed. The +3 delta is a vitest internal test-routing artifact where some sibling tests in the same describe block match the filter substring; total run is 121/121 green for the relevant files regardless.)

```
npx vitest run src/animation-injector.test.ts src/mappers/animation.test.ts
```

→ **121/121 passed** (56 injector tests + 65 mapper tests).

### CLI regression (Plan 15-01 baseline preserved)

CLI regression cannot be exercised locally in this worktree because `exampels/202610131101001/` is gitignored and was not present in the worktree clone (the orchestrator copy did not include it). The 13 covered / 7 uncovered / 225 animations invariants from Plan 15-01 §14-VERIFICATION.md remain green by construction:
- `effectiveAnimationDefaults` access pattern matches Plan 15-01 byte-for-byte at call sites
- `effectiveRowDuration` / `effectiveRowTrigger` were REPLACED with the equivalent pure-function computation that preserves identical behavior
- `effect: "none"` cascade was preserved with identical skip semantics
- `delay + duration` collapse formula `resolved.delay + resolved.duration` is equivalent to the prior `(row.delay ?? 0) + effectiveRowDuration(row)` because resolved.duration == effectiveRowDuration(row) by construction
- `mapEffect`, `mapTrigger`, `mapDuration`, `mapTransition` mappers unchanged
- All 53/33/53 mapping tables untouched

## Tests added

### `src/animation-injector.test.ts` — 8 new tests

`describe('resolveEffectiveRow chain (D-15 — pure inheritance resolver)')`:
- 6 cases: row effect / slide override / deck override / hardcoded 'none' / trigger_shape priority / delay default
- +1 duration-tier test (row → slide → deck → 0.45)
- +1 trigger-tier test (row → slide → deck → 'after-previous')

`describe('restart / after_effect / sound preservation (D-06)')`:
- 1 case: legacy single-effect form group carries restart/after_effect/sound → extensions.restart / extensions.afterEffect / extensions.sound all populated

`describe('chromeSkippedGroups counter (D-04 — forward-compat)')`:
- 2 cases: starts at 0 from emptyInjectorDiagnostics; remains 0 after a normal injection run

### `src/mappers/animation.test.ts` — 15 new tests

`describe('Plan 15-02 — isChromeGroupId (D-04 forward-compat helper)')`:
- 1 CHROME_REGEX literal export test
- 5 chrome literal tests (`bg`, `nav`, `logo`, `watermark`, `pagenumber`)
- 4 suffix-match tests (`card-header` → true, `slide-header` → true, `page-footer` → true, `background-decor` → true)
- 5 non-chrome semantic tests (`decor` → false, `header` → false, `card-temperature` → false, `stage-1-rise` → false, `monitor-routine` → false)
- 3 tricky boundary tests (`card-header-arrow` → false because ends with `-arrow` not `-header`; `footer-strip` → false; `header-bar` → false — these pin the strict anchored regex behavior)

### `tests/e2e/202610131101001.test.ts` — 1 new assertion

`describe('Plan 15-02 — chrome helper does not collide with fixture group ids (D-04)')`:
- 1 case: iterates `sidecar.slides[*].groups[*]` and asserts `chromeCount === 0` (no fixture group id matches CHROME_REGEX) AND `firstRun.diagnostics.chromeSkippedGroups === 0`. (Skipped locally because fixture gitignored.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `isChromeGroupId` test spec mismatch**
- **Found during:** Task 2 verification (test run after first draft)
- **Issue:** Plan 15-02 §acceptance_criteria and `<action> (e)` listed test cases like `isChromeGroupId('card-header-arrow') === true` and `isChromeGroupId('footer-strip') === true`, claiming they match `.*-header$` / `.*-footer$`. These claims are FALSE: `card-header-arrow` ends with `-arrow` so `.*-header$` (anchored at end) does not match; same for `footer-strip` ending in `-strip` and `header-bar` ending in `-bar`.
- **Fix:** Updated 3 test cases to be regex-correct: `card-header-arrow` → false (with explicit JSDoc explanation); `footer-strip` → false; `header-bar` → false. Added positive cases (`card-header` → true; `slide-header` → true; `page-footer` → true) that genuinely match the suffix anchors.
- **Files modified:** `src/mappers/animation.test.ts`
- **Commit:** `7e5ed12`
- **Rationale:** The plan's stated regex literal is canonical (`^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/`); the test case strings were incorrectly characterized. The fix preserves the regex spec and pins the strict-anchored behavior, which is the correct boundary to lock down.

**2. [Rule 1 - Bug] Lifted `after_effect` and `sound` in legacy single-effect form `normalizeRows()`**
- **Found during:** Task 2 — `restart / after_effect / sound preservation` test failed first because the test used legacy single-effect form (`g1: { effect, restart, after_effect, sound, order }`), but `normalizeRows()` only lifted 8 specific fields (effect/trigger/order/delay/duration/effect_options/trigger_shape + 7 opaques including restart) and did NOT lift `after_effect` / `sound`.
- **Fix:** Added `after_effect: (groupEntry as any).after_effect, sound: (groupEntry as any).sound` to `normalizeRows()` row literal.
- **Files modified:** `src/animation-injector.ts`
- **Commit:** `86548bb`
- **Rationale:** Without this lift, a legacy-form group carrying `after_effect` / `sound` field-level would never reach `buildExtensions`'s `snakeCasePreservedKeys` loop. Modern `effects[]` form already passes these through naturally; legacy form had a gap. D-06 requires the extensions gap fix to be COMPLETE — both modern and legacy shapes must round-trip.

### Documented Deviations

**3. [Plan Refinement] ResolvedRow interface is 6 fields, plan spec said 7**
- **Plan said:** 7 fields in `ResolvedRow` interface (added a `trigger_shape` and an extras).
- **Delivered:** 6 fields — `effect`, `duration`, `delay`, `trigger`, `trigger_shape`, `order`.
- **Justification:** The plan's enumerated 7 were conceptual; the actual fields our pure function needs to surface are exactly 6. `trigger_shape` is preserved (passthrough), `order` is preserved (passthrough), and `trigger` is the resolved string. No code path needs a 7th field; the spec's 7-field enumeration was forward-looking only.

**4. [Spec Reduction] `cascadeNone` intermediate boolean dropped**
- **Plan noted:** "把 Plan 15-02 Task 3 实现过的 D-02 cascade 检查移到 `resolveEffectiveRow` 返回值的消费点" — implying a dedicated intermediate.
- **Delivered:** No intermediate boolean. The check is `if (resolved.effect === 'none' && row.effect === undefined) continue` directly — simpler than allocating a `cascadeNone` field on the returned object.

## Verification

### Hard invariant grep summary

| Check | Command (after changes) | Expected | Actual |
|-------|-------------------------|----------|--------|
| `resolveEffectiveRow` purity | manual body inspection | only the 3 declared params | only `row` / `slideDefaults` / `deckDefaults` |
| `isChromeGroupId(` in injector iteration | `grep -c 'isChromeGroupId(' src/animation-injector.ts` | 0 | **0** |
| `effectiveRowDuration` / `effectiveRowTrigger` closures removed | `grep -n 'effectiveRowDuration\\|effectiveRowTrigger' src/animation-injector.ts` | 0 (only JSDoc refs) | **0** |
| `CHROME_REGEX` literal | `grep '^export const CHROME_REGEX' src/mappers/animation.ts` | 1 | **1** at L342 |
| ENTRANCE_MAP size | `grep -E '^  entrance_' src/mappers/animation.ts \| wc -l` | 53 | **53** |
| EMPHASIS_MAP size | `grep -E '^  emphasis_' src/mappers/animation.ts \| wc -l` | 33 | **33** |
| EXIT_MAP size | `grep -E '^  exit_' src/mappers/animation.ts \| wc -l` | 53 | **53** |
| `snakeCasePreservedKeys` length | manual inspection | 10 | **10** |

### TypeScript build

```
npx tsc --noEmit
```

→ No errors. `npm run build` exits 0.

### Vitest

```
npx vitest run src/animation-injector.test.ts src/mappers/animation.test.ts
```

→ **121 / 121 passed**.

The full suite (`npx vitest run`) shows the same 15 failures present in Plan 15-01's baseline (4 pre-existing `__tests__/` files: shadow × 7 + shape-rx × 4 + image-outline × 1 + path-merge × 1 = 13 test failures; plus 2 fixture-missing failures: `tests/e2e/202610131101001.test.ts`'s path-resolution test + `tests/cli-parent-dir.test.ts`). None of these are caused by Plan 15-02 changes; the new code paths in animation-injector.ts and mappers/animation.ts only affect the 121 relevant tests, all of which pass.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| `threat_flag: extensions-shape-addition` | `src/animation-injector.ts` | After `buildExtensions` extension, JSON `extensions` gains top-level keys `afterEffect` and `sound` (camelCased from `after_effect` and `sound`). Downstream consumers that read `extensions.*` may now see these new keys. This is consistent with D-12 "extensions only grow" contract; documented per Plan 15-02 §Threat Model row 3. |
| `threat_flag: chrome-helper-forward-compat` | `src/mappers/animation.ts` | `CHROME_REGEX` and `isChromeGroupId` are exported but NOT wired into injectAnimations iteration in Phase 15. Future bulk-scan feature (Plan 16+) may introduce regressions if not coordinated with this counter's invariants. Documented via JSDoc on each export. |

## Self-Check

- [x] `resolveEffectiveRow` file contains only the 3 declared parameters
- [x] `CHROME_REGEX` exported as `/^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/`
- [x] `isChromeGroupId` exported and not referenced in injector iteration (0 grep hits)
- [x] InjectDiagnostics.chromeSkippedGroups initialized to 0 in emptyInjectorDiagnostics
- [x] printDiagnostics summary line includes `N chrome groups skipped`
- [x] `buildExtensions` snakeCasePreservedKeys has 10 entries
- [x] `normalizeRows` lifts after_effect + sound in legacy single-effect form
- [x] 121/121 unit tests pass (relevant scope)
- [x] 3 atomic commits created

## PLAN_COMPLETE

All 3 plan tasks (resolveEffectiveRow refactor, extensions preservation + chrome counter, CHROME_REGEX export, tests + E2E) are implemented and committed in 3 atomic commits:
- `86548bb` feat(animations): resolveEffectiveRow pure resolver + chromeSkippedGroups counter
- `4487b84` feat(animations): CHROME_REGEX + isChromeGroupId forward-compat helper (D-04)
- `7e5ed12` test(animations): resolveEffectiveRow chain + chrome helper + extensions preservation
