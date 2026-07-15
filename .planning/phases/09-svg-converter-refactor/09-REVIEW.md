---
phase: 09-svg-converter-refactor
reviewed: 2026-07-13T12:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/mapper/coordinate-mapper.ts
  - src/transformer/transform-to-pptel.ts
  - src/parser/svg-parser.ts
  - src/transformer/clip-path-preprocessor.ts
  - src/utils/path-utils.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: partially_fixed
---

# Phase 09: Code Review Report

**Reviewed:** 2026-07-13
**Depth:** standard
**Files Reviewed:** 5
**Status:** partially_fixed (CR-01 and CR-02 fixed in commit 35a83e0; warnings remain)

## Summary

Reviewed 5 source files changed during phase 09 (svg-converter-refactor). Found 2 critical bugs that cause incorrect behavior, 4 warnings for potential issues, and 2 info items for code quality. The critical bugs include an ellipse positioning error due to missing scale factor and debug logging left in production code.

## Critical Issues

### CR-01: ellipse element does not scale cx/cy before translation

**File:** `src/mapper/coordinate-mapper.ts:241-242`
**Issue:** The `ellipse` case in `mapCoordinates` does not scale cx/cy by the transform's scale factors before adding translation, while the `circle` case correctly does this. This causes ellipse elements to be positioned incorrectly when there is scaling from transforms.

**Fix:**
```typescript
// Current (buggy):
case 'ellipse': {
  const cx = extractNumber(attrs.cx, 0) + tx
  const cy = extractNumber(attrs.cy, 0) + ty
  const rx = extractNumber(attrs.rx, 0) * Math.abs(sx)
  const ry = extractNumber(attrs.ry, 0) * Math.abs(sy)
  ...

// Should be:
case 'ellipse': {
  const cx = extractNumber(attrs.cx, 0) * Math.abs(sx) + tx
  const cy = extractNumber(attrs.cy, 0) * Math.abs(sy) + ty
  const rx = extractNumber(attrs.rx, 0) * Math.abs(sx)
  const ry = extractNumber(attrs.ry, 0) * Math.abs(sy)
  ...
```

### CR-02: Debug console.log left in production code

**File:** `src/transformer/transform-to-pptel.ts:826`
**Issue:** A `console.log` statement for debugging icon shapes was left in production code. This should be removed before shipping.

**Fix:**
```typescript
// Remove this line:
console.log(`[icon-shape] id=${id} path="${iconResult.path.substring(0, 40)}${iconResult.path.length > 40 ? '...' : ''}" left=${iconResult.left.toFixed(2)} top=${iconResult.top.toFixed(2)} size=${iconResult.width.toFixed(2)}x${iconResult.height.toFixed(2)}`)
```

## Warnings

### WR-01: pathBoundingBox does not handle bezier curves

**File:** `src/mapper/coordinate-mapper.ts:122-189`
**Issue:** The `pathBoundingBox` function only processes M/L/H/V/A/Z commands. Paths containing C (cubic bezier), Q (quadratic bezier), S (smooth cubic), or T (smooth quadratic) commands will have incorrect bounding boxes because curve control points are not considered.

**Fix:** Extend `pathBoundingBox` to compute bezier curve extents using proper bezier mathematics, or document that paths with curves may have incorrect bounding boxes.

### WR-02: clip-path attribute removed but no guard against re-expansion

**File:** `src/transformer/clip-path-preprocessor.ts:210-213`
**Issue:** The clip-path attribute is removed after expansion, but if the same AST is processed multiple times (e.g., shared AST across multiple transforms), clipPath children would be duplicated.

**Fix:** Add a marker attribute (e.g., `__clipPathExpanded`) to elements after expansion to prevent re-expansion.

### WR-03: Regex in adjustPathToViewBox does not properly parse SVG path syntax

**File:** `src/parser/svg-parser.ts:950-962`
**Issue:** The regex `/([MLHV])\s*([-\d.]+)/gi` only captures one number after M/L/H/V commands, but SVG paths have coordinate pairs (x,y). For `M 10 20`, it would only capture `10` and ignore `20`. The function returns `d` unchanged for M/L cases, making the adjustment ineffective.

**Fix:** Update the regex to capture coordinate pairs or use a proper SVG path parser.

### WR-04: S command in scalePathCoords applies uniform scaling to reflected control point

**File:** `src/utils/path-utils.ts:296`
**Issue:** For S (smooth cubic bezier), the first control point is a reflection of the previous control point about the current point. After reflection, both x and y are scaled by scaleX and scaleY respectively. However, H only scales x and V only scales y - the S command should arguably only apply scaleX to the reflected x and scaleY to the reflected y. This is consistent with how `toAbsolutePath` handles it, so it may be intentional.

## Info

### IN-01: Duplicate composeTransforms function

**File:** `src/transformer/transform-to-pptel.ts:1309-1319` vs `src/mapper/coordinate-mapper.ts:7-13`
**Issue:** The same `composeTransforms` function is defined in both files. The one in transform-to-pptel.ts is a local copy that shadows the imported one from coordinate-mapper.ts.

**Fix:** Remove the local definition in transform-to-pptel.ts and import `composeTransforms` from coordinate-mapper.ts on line 3.

### IN-02: Unused variable in splitTextByTspans fallback branch

**File:** `src/parser/svg-parser.ts:514-516`
**Issue:** When tspan text cannot be found in the remaining text, it's added with just the tspan element, but `remainingText` is not updated in this branch.

**Fix:** Either update `remainingText` or document that this is intentional fallback behavior.

---

_Reviewed: 2026-07-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
