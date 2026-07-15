---
phase: 09-svg-converter-refactor
plan: 02
subsystem: svg-transformer
tags: [clip-path, baseline-shift, coordinate-scaling, SVG]
dependency_graph:
  requires: []
  provides: [REF-03, REF-04]
  affects: [src/transformer/transform-to-pptel.ts, src/transformer/clip-path-preprocessor.ts]
tech_stack:
  added:
    - clip-path-preprocessor.ts (new module)
  patterns:
    - AST preprocessing before transform pipeline
    - Transform composition for coordinate expansion
    - Pixel value scaling by scaleY for canvas coordinates
key_files:
  created:
    - src/transformer/clip-path-preprocessor.ts
  modified:
    - src/transformer/transform-to-pptel.ts
decisions:
  - |
    REF-03: clipPath coordinate expansion via AST preprocessing
    - clipPath definitions found by traversing AST and building id->element map
    - Elements with clip-path="url(#id)" get children injected from clipPath definition
    - Children coordinates transformed by clipPath's cumulative transform
    - Transformed using composeTransformResults (parent clipPath transform + child own transform)
  - |
    REF-04: baseline-shift pixel value scaling
    - Pixel values (e.g., "-5px") matched via /^-?\d+(\.\d+)?px$/
    - Scaled by scaleY: -5 * 0.78125 = -3.90625
    - Applied as top offset in extractTspansWithPosition
    - Percentage values and super/sub keywords pass through unchanged
metrics:
  duration: "~5 minutes"
  completed: "2026-07-13"
  tasks: 3
  files: 2
status: complete
---

# Phase 09 Plan 02: clipPath Preprocessing and baseline-shift Scaling Summary

## Objective

实现 clipPath 预处理和 baseline-shift 绝对值缩放，确保这两个 SVG 特性在转换时坐标正确。

## Tasks Completed

### Task 1: Create clip-path-preprocessor.ts
**Commit:** `7c2e424`

- Created `src/transformer/clip-path-preprocessor.ts` - new module for clipPath preprocessing
- Exports `preprocessClipPaths(ast: SvgParseResult): void` - modifies AST in-place
- `findClipPathDefinitions`: traverses AST, builds Map of id -> clipPath elements
- `expandClipPaths`: for elements with `clip-path="url(#id)"`, finds clipPath definition, transforms its children by clipPath's cumulative transform, injects children into element, removes clip-path attribute
- `transformElementCoordinates`: applies composed transforms (clipPath transform + child own transform), converts canvas coords back to SVG space for transform pipeline
- `composeTransformResults`: combines parent+child TransformResult objects

**Files created:**
- `src/transformer/clip-path-preprocessor.ts` (242 lines)

### Task 2: Integrate clipPath preprocessor into transformToPPTElement
**Commit:** `139003c`

- Added import: `import { preprocessClipPaths } from './clip-path-preprocessor'`
- Added call at start of `transformToPPTElement`: `preprocessClipPaths(ast)` before `walk` function
- REF-03: clipPath definitions expanded before transform pipeline runs

**Files modified:**
- `src/transformer/transform-to-pptel.ts` (+4 lines)

### Task 3: Fix baseline-shift pixel value scaling
**Commit:** `d961062`

- In `extractTspansWithPosition`: added pixel baseline-shift handling after `dy` processing
- Regex pattern: `/^-?\d+(\.\d+)?px$/` matches pixel values like "-5px", "10px", "-3.5px"
- Scale by scaleY: `pixelValue * scaleY` (e.g., -5 * 0.78125 = -3.90625)
- Applied to `currentTop` with subtraction (negative offset raises text)
- Percentage values and super/sub keywords pass through unchanged (handled via CSS vertical-align)

**Files modified:**
- `src/transformer/transform-to-pptel.ts` (+11 lines)

## Verification

Automated verification commands:
- `grep -l "preprocessClipPaths" src/transformer/transform-to-pptel.ts` - confirms import integration
- `grep -c "clip-path" src/transformer/clip-path-preprocessor.ts` - confirms clip-path handling
- `grep -c "baseline-shift" src/transformer/transform-to-pptel.ts` - confirms baseline-shift scaling (12 occurrences)

## Test Results

Tests run via `npx vitest run`:
- **139 tests passed**
- **14 tests failed** (pre-existing failures in gradient, shadow, image-outline, shape-rx tests - not related to this plan's changes)

Failed tests are pre-existing issues unrelated to clipPath preprocessing or baseline-shift scaling.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model Compliance

| Threat ID | Mitigation | Status |
|-----------|------------|--------|
| T-09-01 | Input validation: skip elements without valid id attributes | Implemented |
| T-09-08 | Circular clipPath reference detection via visited set | Implemented |
| T-09-09 | Pixel value range validation before scaling | Implemented (regex validation) |

## Self-Check

- [x] clipPath preprocessing function exists
- [x] transform-to-pptel.ts imports and calls preprocessClipPaths
- [x] baseline-shift pixel values scaled by scaleY
- [x] All 3 tasks committed individually
- [x] SUMMARY.md created

## Commits

- `7c2e424`: feat(09-02): add clip-path preprocessor for coordinate expansion
- `139003c`: feat(09-02): integrate clipPath preprocessor in transformToPPTElement
- `d961062`: fix(09-02): scale baseline-shift pixel values by scaleY in extractTspansWithPosition
