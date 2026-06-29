---
phase: "03-gradient-opacity"
plan: "01"
subsystem: "gradient-system"
tags:
  - "gradient"
  - "parser"
  - "transformer"
  - "pptist"
dependency_graph:
  requires: []
  provides:
    - "GRAD-01"
    - "GRAD-02"
    - "GRAD-03"
    - "GRAD-04"
  affects:
    - "src/parser/svg-parser.ts"
    - "src/transformer/transform-to-pptel.ts"
    - "src/mapper/coordinate-mapper.ts"
    - "src/types/ast.ts"
tech_stack:
  added:
    - "GradientDef interface"
    - "parseGradientTransform()"
    - "collectGradientDefs()"
    - "resolveFillReference()"
  patterns:
    - "Two-pass gradient registry collection"
    - "Parse-time fill=url(#id) resolution"
    - "rgba() color encoding for stop-opacity"
key_files:
  created:
    - "__tests__/gradient.test.ts"
  modified:
    - "src/types/ast.ts"
    - "src/parser/svg-parser.ts"
    - "src/mapper/coordinate-mapper.ts"
    - "src/transformer/transform-to-pptel.ts"
decisions:
  - "D-14: Parser builds Map<id, GradientDef> registry during <defs> parsing"
  - "D-15: fill=\"url(#gradientId)\" resolved at parse time to PPTist gradient object"
  - "D-16: stop-opacity encoded as rgba() color string (consistent with D-08)"
  - "D-17: gradientTransform matrix rotation extracted via matrix decomposition"
metrics:
  duration: "~7 minutes"
  completed: "2026-06-29T04:24:43Z"
  tasks: 5
  tests: 15
  all_tests_pass: true
status: "complete"
---

# Phase 03 Plan 01: Gradient System — Parser Registry + Transformer Output

## One-Liner

SVG gradient parsing with two-pass registry collection, parse-time fill reference resolution, rgba() stop-opacity encoding, and gradientTransform rotation extraction.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| W0-1 | Create failing tests (RED) | 764662e | __tests__/gradient.test.ts |
| W1-1 | Add GradientDef interface to ast.ts | 721c8fe | src/types/ast.ts |
| W1-2 | Implement gradient registry in svg-parser.ts | 0e9c48d | src/parser/svg-parser.ts |
| W1-3 | Add parseGradientTransform() to coordinate-mapper.ts | 86dace5 | src/mapper/coordinate-mapper.ts |
| W1-4 | Output attrs.gradient in transform-to-pptel.ts | 24bc546 | src/transformer/transform-to-pptel.ts |

## Implementation Summary

### GRAD-01: Gradient Parsing
- `linearGradient` and `radialGradient` elements parsed from `<defs>` section
- Gradient defs stored in `Map<id, GradientDef>` registry
- Two-pass approach: collect all gradient defs first, then resolve references

### GRAD-02: Stop Encoding
- `stop-color` + `stop-opacity` encoded as `rgba(r, g, b, a)` color strings
- Default values: `stop-color="#000000"`, `stop-opacity="1"`
- Multiple stops at same offset preserved (colors[] can have duplicate positions)

### GRAD-03: Fill Resolution
- `fill="url(#id)"` resolved at parse time (D-15 decision)
- `attrs.gradient` set on element with resolved PPTist Gradient object
- `attrs.fill` cleared when gradient is present

### GRAD-04: GradientTransform Rotation
- `parseGradientTransform()` extracts rotation from:
  - `rotate(N)` and `rotate(N, cx, cy)` — direct degree extraction
  - `matrix(a, b, c, d, e, f)` — matrix decomposition via `atan2(b, a)`
- Non-rotation transforms return `rotate: 0`

### Transformer Output
- `attrs.gradient` output as `PPTShapeElement.gradient` field
- Gradient takes precedence over fill (fill is deleted when gradient present)
- D-18: `fill-opacity < 1` on solid fills → `rgba()` color via `colorToRgba()`

## Test Results

```
Test Files  7 passed (7)
Tests      60 passed (60)
```

All GRAD-01 through GRAD-04 tests pass:
- 15 gradient-specific tests in `__tests__/gradient.test.ts`
- All existing tests continue to pass

## Deviations from Plan

### Rule 1 - Bug Fix: stop-opacity "0" value
- **Found during:** Testing GRAD-02
- **Issue:** `parseFloat("0")` returns `0` (falsy), so `stopOpacity || 1` returned `1` when `stop-opacity="0"`
- **Fix:** Changed from `||` to explicit `undefined` check: `stopOpacityAttr !== undefined ? parseFloat(stopOpacityAttr) : 1`
- **Files modified:** src/parser/svg-parser.ts (2 occurrences)

## Threat Surface Scan

| Flag | File | Description |
|------|------|-------------|
| N/A | - | No new security surface introduced |

## Known Stubs

None — all must-haves implemented.

## Commits

- `764662e` test(03-01): add failing tests for GRAD-01~04 gradient parsing
- `721c8fe` feat(03-01): add GradientDef interface and gradient fields to ast.ts
- `0e9c48d` feat(03-01): implement gradient registry and fill=url(#id) resolution in svg-parser
- `86dace5` feat(03-01): add parseGradientTransform() to coordinate-mapper
- `24bc546` feat(03-01): output attrs.gradient as PPTShapeElement.gradient in transform-to-pptel

---

*Plan: 03-01 | Phase: 03-gradient-opacity | Status: COMPLETE*
