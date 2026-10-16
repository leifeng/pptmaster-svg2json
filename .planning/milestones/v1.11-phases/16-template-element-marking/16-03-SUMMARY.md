---
phase: 16-template-element-marking
plan: 03
subsystem: e2e
tags: [e2e, fixture, green-art-teaching, template, content-bounds, regression]

# Dependency graph
requires:
  - phase: 16-template-element-marking
    plan: 01
    provides: PPTBaseElement.templateType field + isTemplate calc
  - phase: 16-template-element-marking
    plan: 02
    provides: Slide.contentBounds field + findContentBounds() helper
provides:
  - 9 it() E2E suite on 20 green-art-teaching fixture slides
  - Release gate: TPL-E2E-01 counts, exact contentBounds, reverse assertion, field omission
affects: [verify-phase-goal]

# Actuals (#2632)
actuals:
  tokens: 600
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - convertDir + per-slide it() loop sharing beforeAll container
    - hasFixture guard for skip-when-missing (mirrors 202610131101001 pattern)

key-files:
  created:
  - tests/e2e/green-art-teaching-template-marking.test.ts
  modified: []

key-decisions:
  - "Decision: Used >= lower-bound for counts (not ===) - allows future fixture growth without E2E churn"
  - "Decision: Object.keys(slide) check for TPL-CB-03 omission - stricter than `slide.contentBounds === undefined`, covers JSON field absence"
  - "Decision: 4 explicit not.toBe() values for TPL-E2E-02 - guards null, true, '1', 2 specifically"

patterns-established:
  - "Pattern: reverse-assertion across full data set with explicit anti-values (null/true/string/2)"

requirements-completed: [TPL-E2E-01, TPL-E2E-02]

coverage:
  - id: D1
    description: "TPL-E2E-01 cover count: 01_cover.svg has >= 5 template-marked elements"
    requirement: TPL-E2E-01
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#01_cover.svg has >= 5 template-marked elements"
        status: pass
    human_judgment: false
  - id: D2
    description: "TPL-E2E-01 toc count: 02_toc.svg has >= 4 template-marked elements"
    requirement: TPL-E2E-01
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#02_toc.svg has >= 4 template-marked elements"
        status: pass
    human_judgment: false
  - id: D3
    description: "TPL-E2E-01 04_content exact contentBounds {98, 180, 1084, 404}"
    requirement: TPL-E2E-01
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#04_content.svg has contentBounds === { x: 98, y: 180, width: 1084, height: 404 }"
        status: pass
    human_judgment: false
  - id: D4
    description: "TPL-E2E-01 04_content slot exception: slot subtree does not carry templateType"
    requirement: TPL-E2E-01
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#04_content.svg slot element itself does not carry templateType"
        status: pass
    human_judgment: false
  - id: D5
    description: "TPL-E2E-01 ending count: 20_ending.svg has >= 4 template-marked elements"
    requirement: TPL-E2E-01
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#20_ending.svg has >= 4 template-marked elements"
        status: pass
    human_judgment: false
  - id: D6
    description: "TPL-E2E-02 reverse assertion across 20 slides (no null/true/string/2)"
    requirement: TPL-E2E-02
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#every templateType across all 20 slides is exactly 1 or undefined"
        status: pass
    human_judgment: false
  - id: D7
    description: "TPL-CB-03 reverse assertion: 01_cover/02_toc/03_chapter/20_ending omit contentBounds field"
    requirement: TPL-CB-03
    verification:
      - kind: e2e
        ref: "tests/e2e/green-art-teaching-template-marking.test.ts#every slide without content-object-slot-template omits contentBounds field"
        status: pass
    human_judgment: false

# Metrics
duration: 3min
completed: 2026-10-16
status: complete
---

# Phase 16: template-element-marking -- Plan 03 Summary

**E2E suite of 9 tests pins templateType + contentBounds behavior on 20 green-art-teaching fixture slides as v1.11 release gate.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-10-16
- **Completed:** 2026-10-16
- **Tasks:** 1
- **Files modified:** 1 (created 1)

## Accomplishments

- 9 it() across 1 describe block; beforeAll runs convertDir once and shares result across assertions
- 01_cover >= 5 / 02_toc >= 4 / 20_ending >= 4 template-marked element counts (lower-bound, allows fixture growth)
- 04_content exact contentBounds {98, 180, 1084, 404} via toEqual deep match
- 04_content slot subtree exception: no element with templateType=1 AND id/groupId matching content-object-slot-template
- TPL-E2E-02 reverse assertion across all 20 slides: templateType in {1, undefined} + explicit not.toBe(null/true/'1'/2) for 4 anti-values
- TPL-CB-03 reverse assertion via Object.keys(slide) check (stricter than slide.contentBounds === undefined)
- hasFixture guard for skip-when-missing (mirrors 202610131101001 E2E pattern)

## Task Commits

1. **Task 1: E2E fixture-based test** - `e6ecaf0` (feat)

## Files Created/Modified

- `tests/e2e/green-art-teaching-template-marking.test.ts` - 9 tests on 20 green-art-teaching fixture slides

## Decisions Made

- **Decision: >= lower-bound for counts** - 01_cover actually has 6 elements but plan asks >= 5; allows future fixture growth (e.g. adding hero-master-stars-template) without breaking E2E.
- **Decision: Object.keys(slide) over `slide.contentBounds === undefined`** - Direct JSON field absence check; protects against future JSON.stringify behavior changes that might emit `"contentBounds": null`.
- **Decision: 4 explicit anti-values** - Guards against silent regressions where templateType widens to number (e.g. `2`), becomes nullable (e.g. `null`), becomes boolean (e.g. `true`), or stringified (e.g. `'1'`).

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

Phase 16 fully executed. Ready for verify-phase-goal:
- 12-unit template-marking.test.ts (TPL-MARK/NONREN + TPL-CB)
- 9-E2E green-art-teaching-template-marking.test.ts (TPL-E2E-01/02 + TPL-CB-03 reverse)
- 116 animation tests + 19 existing unit tests unaffected (no regressions introduced)

---

*Phase: 16-template-element-marking*
*Completed: 2026-10-16*
