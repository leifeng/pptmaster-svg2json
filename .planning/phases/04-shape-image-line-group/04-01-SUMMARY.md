---
phase: "04-shape-image-line-group"
plan: "01"
subsystem: "shape-line"
tags: ["SHPE-01", "LINE-01", "rounded-rect", "stroke-width"]
dependency_graph:
  requires: []
  provides:
    - "SHPE-01: rounded rect corners via arc commands"
    - "LINE-01: stroke-width to PPTLineElement.width mapping"
  affects:
    - "src/shapes/shape-to-path.ts"
    - "src/transformer/transform-to-pptel.ts"
tech_stack:
  added:
    - "roundedRectToPath() function with SVG arc command generation"
  patterns:
    - "Arc command format: A rx,ry x-axis-rotation large-arc-flag,sweep-flag x y"
    - "sweep-flag=1 for clockwise arcs"
    - "ry defaults to rx when not explicitly provided"
    - "rx/ry clamped to min(width,height)/2"
key_files:
  created:
    - "__tests__/shape-rx.test.ts"
    - "__tests__/line-width.test.ts"
  modified:
    - "src/shapes/shape-to-path.ts"
    - "src/transformer/transform-to-pptel.ts"
decisions:
  - id: "D-21"
    desc: "rx/ry → SVG arc commands. sweep-flag=1 (clockwise). rx=0 or ry=0 → sharp corners. Clamp to min(w,h)/2."
  - id: "D-24"
    desc: "SVG stroke-width → PPTLineElement.width. Default to 1 when absent or 0."
metrics:
  duration: "~5 minutes"
  completed: "2026-06-29"
  tasks_completed: 5
  tests_added: 11
  tests_total: 96
status: "complete"
---

# Phase 04 Plan 01: SHPE-01 (rounded rect) and LINE-01 (stroke-width) Summary

## Objective

Implement SHPE-01 (rounded rect corners) and LINE-01 (stroke-width to width mapping) as independent field mappings for Phase 4.

## Tasks Completed

| Task | Name | Status | Commit |
|------|------|--------|--------|
| W0-1 | Create shape-rx.test.ts (SHPE-01) | Done | 1b0742f |
| W0-2 | Create line-width.test.ts (LINE-01) | Done | 13d5ce1 |
| W0-3 | Implement roundedRectToPath function | Done | 9b9f688 |
| W0-4 | Implement rx/ry handling in rect case | Done | 9b9f688 |
| W0-5 | Implement stroke-width to width in line case | Done | 3362d3b |

## Decisions Made

**D-21:** `rx`/`ry` → SVG arc commands in path. sweep-flag = 1 (clockwise). When rx=0 or ry=0 → degenerate to sharp corners (no arc). When rx/ry exceed half-width/half-height → clamp to min(width, height)/2.

**D-24:** SVG `stroke-width` → PPTLineElement.width. Default to 1 when absent or 0.

## Implementation Details

### roundedRectToPath(w, h, rx, ry)

Generates rounded rectangle SVG path using arc commands at each corner:
```
M r,0 L w-r,0 A r,r 0 0,1 w,r L w,h-r A r,r 0 0,1 w-r,h L r,h A r,r 0 0,1 0,h-r L 0,r A r,r 0 0,1 r,0 Z
```

- **Sharp corners (rx=0 or ry=0):** Returns `L w,0 L w,h L 0,h L 0,0 Z`
- **Clamping:** `r = Math.min(rx, ry, min(w,h)/2)`

### rx/ry handling in rect case

```typescript
const rx = Number(element.attrs.rx) || 0
const ry = element.attrs.ry !== undefined ? Number(element.attrs.ry) || 0 : rx
// ry falls back to rx when not explicitly provided (including '0' means explicit sharp corners)
const effectiveRy = element.attrs.ry !== undefined ? ry : rx
const path = (rx > 0 || effectiveRy > 0)
  ? roundedRectToPath(rectWidth, rectHeight, rx, effectiveRy)
  : rectToPath(0, 0, rectWidth, rectHeight)
```

### stroke-width to width mapping in line case

```typescript
const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
result.width = strokeWidth || 1  // D-24: default to 1 when absent or 0
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ry='0' fallback to rx instead of treating as explicit 0**
- **Found during:** Task W0-4 verification
- **Issue:** `Number(element.attrs.ry) || rx || 0` treated ry='0' as falsy and fell back to rx
- **Fix:** Changed to `element.attrs.ry !== undefined ? Number(element.attrs.ry) || 0 : rx` to distinguish "ry not provided" from "ry explicitly 0"
- **Files modified:** src/transformer/transform-to-pptel.ts
- **Commit:** 9b9f688

**2. [Rule 1 - Bug] Fixed test regex patterns for SVG arc command format**
- **Found during:** Task W0-1 verification
- **Issue:** Tests used `/A 10 10/` (space-separated) but SVG arc uses `/A 10,10/` (comma-separated)
- **Fix:** Updated test regex patterns to use comma format: `/A 10,10/`, `/A 40,40/`, `/A 15,15/`, `/A \d+,\d+ 0 0,1/`
- **Files modified:** __tests__/shape-rx.test.ts
- **Commit:** 9b9f688

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| __tests__/shape-rx.test.ts | 7 | All passing |
| __tests__/line-width.test.ts | 4 | All passing |
| Full suite | 96 | All passing |

## Commits

- `1b0742f` - test(04-01): add failing tests for SHPE-01 rounded rect corners
- `13d5ce1` - test(04-01): add failing tests for LINE-01 stroke-width mapping
- `9b9f688` - feat(04-01): implement roundedRectToPath and rx/ry handling
- `3362d3b` - feat(04-01): map stroke-width to PPTLineElement.width per D-24

## Self-Check: PASSED

- [x] __tests__/shape-rx.test.ts exists with 7 passing tests
- [x] __tests__/line-width.test.ts exists with 4 passing tests
- [x] roundedRectToPath function implemented in src/shapes/shape-to-path.ts
- [x] rx/ry handling wired in rect case (transform-to-pptel.ts)
- [x] stroke-width to width mapping wired in line case (transform-to-pptel.ts)
- [x] All 96 tests pass
- [x] All commits verified in git log
