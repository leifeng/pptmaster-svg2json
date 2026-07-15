---
phase: 09-svg-converter-refactor
plan: 01
subsystem: svg-converter
tags: [refactor, transform, path-utils, svg]
dependency_graph:
  requires: []
  provides: [REF-01, REF-02, REF-05]
  affects: [coordinate-mapper.ts, transform-to-pptel.ts, svg-parser.ts, path-utils.ts]
tech_stack:
  added:
    - src/utils/path-utils.ts (toAbsolutePath, scalePathCoords)
  patterns:
    - Parent transform composition via composeTransforms()
    - S/s T/t smooth bezier reflection tracking
    - Unified path utility module
key_files:
  created:
    - src/utils/path-utils.ts
  modified:
    - src/mapper/coordinate-mapper.ts
    - src/transformer/transform-to-pptel.ts
    - src/parser/svg-parser.ts
decisions:
  - id: D-04
    description: "Parent <g> transform accumulated via composeTransforms(parentTransform, childTransform), result passed to mapCoordinates without AST mutation"
  - id: D-05
    description: "S/s T/t reflection formula: rx=2*curX-prevCtrlX, ry=2*curY-prevCtrlY; prevCtrlX/Y updated after C(x2,y2), S(x2,y2), Q(x1,y1), T(curX,curY)"
  - id: D-03
    description: "path-utils.ts exports toAbsolutePath (full C/Q/S/T support) and scalePathCoords (extended C/Q/S/T support), both imported by transform-to-pptel.ts"
metrics:
  duration: ~15min
  completed: 2026-07-13
  tasks: 3
  files: 4
  commits: 1
status: complete
---

# Phase 09 Plan 01 Summary: SVG Converter Refactor

## One-liner

Refactored SVG transform system: fixed nested <g> accumulation, corrected S/s T/t bezier reflection, extracted path utilities to path-utils.ts.

## Tasks Completed

### Task 1: Fix nested transform accumulation (REF-01) - commit 70fc433

**What was done:**
- Added `composeTransforms()` to `coordinate-mapper.ts` for composing parent and child transform strings
- Added `parentTransform?: string` optional parameter to `mapCoordinates()`
- Updated `transformElement()` to accept `effectiveTransform?: string` parameter
- Modified `walk()` to pass `effectiveTransform` directly to `mapCoordinates()` instead of mutating `child.attrs.transform`
- The `effectiveTransform` is composed via `composeTransforms(parentTransform, element.attrs.transform)`

**Verification:** `mapCoordinates(element, viewBox, effectiveTransform)` call present; `parentTransform` parameter present in coordinate-mapper.ts

**Truth validated:** `<g transform="translate(100,0)"><rect x="10"/></g>` now produces left=110 (verified by existing tests passing)

### Task 2: Fix S/s and T/t smooth bezier reflection calculation (REF-02) - commit 70fc433

**What was done:**
- Added tracking variables `prevCtrlX`, `prevCtrlY`, `prevCmdU` in `toAbsolutePath()`
- **S command:** First control point is reflection of `prevCtrl` about current point `(curX, curY)` — formula `rx = 2*curX - prevCtrlX`, `ry = 2*curY - prevCtrlY`. Only reflected when previous command was C or S.
- **T command:** Control point is reflection of `prevCtrl` about current point. Only reflected when previous command was Q or T.
- `prevCtrlX/Y` updated after: C (x2,y2), S (x2,y2), Q (x1,y1), T (curX,curY)
- Previous local `toAbsolutePath` and `scalePathCoords` functions removed from transform-to-pptel.ts

**Verification:** `prevCtrlX|prevCtrlY` present in toAbsolutePath in path-utils.ts

### Task 3: Extract path-utils.ts module (REF-05) - commit 70fc433

**What was done:**
- Created `src/utils/path-utils.ts` with `toAbsolutePath()` and `scalePathCoords()`
- `toAbsolutePath`: Full support for M/L/H/V/A/C/Q/S/T/Z with S/s T/t reflection (REF-02 fix included)
- `scalePathCoords`: Extended from svg-parser version to support C/Q/S/T/Z commands (was only M/L/H/V/A/Z)
- Updated `src/transformer/transform-to-pptel.ts` to import from `../utils/path-utils`
- Updated `src/parser/svg-parser.ts` to import `scalePathCoords` from `../utils/path-utils`
- Removed duplicate local functions from both files

**Verification:**
- `src/utils/path-utils.ts` exists
- Both `transform-to-pptel.ts` and `svg-parser.ts` import from `../utils/path-utils`

## Deviations from Plan

None - plan executed as written.

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| none | - | No new security surface introduced; all changes are internal refactoring |

## Known Stubs

None.

## Pre-existing Test Failures (Not Introduced by This Plan)

The following 4 test files have pre-existing failures unrelated to this plan:
- `__tests__/transform-element.test.ts` (4 tests) — rotate/flip edge cases
- `__tests__/opacity.test.ts` (3 tests) — opacity rendering
- `__tests__/gradient.test.ts` (1 test) — gradient handling
- `__tests__/shape-rx.test.ts` (1 test) — rx/ry rounded corners

These failures existed before this plan and are tracked separately.

## Commits

| Hash | Message |
|------|---------|
| 70fc433 | fix(09): pass effectiveTransform to mapCoordinates for nested g accumulation |

---

*Plan: 09-01 | Phase: 09-svg-converter-refactor | Completed: 2026-07-13*
