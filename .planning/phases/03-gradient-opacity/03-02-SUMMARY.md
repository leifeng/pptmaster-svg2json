---
phase: "03-gradient-opacity"
plan: "02"
subsystem: transform
tags: [opacity, stroke-opacity, fill-opacity, rgba, pptel]

requires:
  - phase: "03-gradient-opacity"
    provides: gradient defs parsed with stop-opacity as rgba() via D-16

provides:
  - OPAC-01: fill-opacity < 1 maps to rgba() color string in shape/text fill
  - OPAC-02: stroke-opacity maps to outline.opacity field on shape/line elements
  - OPAC-03: element opacity maps to PPTElement.opacity (undefined when absent)
  - PPTElementOutline.opacity field added to schema

affects: [03-03, 04-transform]

tech-stack:
  added: []
  patterns:
    - "D-18: fill-opacity → rgba() via colorToRgba()"
    - "D-19: stroke-opacity → outline.opacity numeric field"
    - "D-20: element opacity → PPTElement.opacity (undefined not 1)"

key-files:
  created:
    - __tests__/opacity.test.ts
  modified:
    - src/slides.ts (PPTElementOutline.opacity field)
    - src/transformer/transform-to-pptel.ts (stroke-opacity + element opacity)

key-decisions:
  - "D-18: SVG fill-opacity < 1 encoded as rgba() color string (consistent with D-08 text fill-opacity)"
  - "D-19: SVG stroke-opacity maps to PPTElementOutline.opacity field"
  - "D-20: SVG element opacity maps to PPTElement.opacity (set to undefined when absent)"

patterns-established:
  - "fill-opacity < 1 uses colorToRgba() which handles hex/rgb/named colors"
  - "stroke-opacity only set when stroke attribute is present"

requirements-completed: [OPAC-01, OPAC-02, OPAC-03]

coverage:
  - id: D1
    description: "fill-opacity < 1 maps to rgba() color string"
    requirement: OPAC-01
    verification:
      - kind: unit
        ref: "__tests__/opacity.test.ts - OPAC-01 fill-opacity"
        status: pass
    human_judgment: false
  - id: D2
    description: "stroke-opacity maps to outline.opacity"
    requirement: OPAC-02
    verification:
      - kind: unit
        ref: "__tests__/opacity.test.ts - OPAC-02 stroke-opacity"
        status: pass
    human_judgment: false
  - id: D3
    description: "element opacity maps to PPTElement.opacity (undefined when absent)"
    requirement: OPAC-03
    verification:
      - kind: unit
        ref: "__tests__/opacity.test.ts - OPAC-03 element opacity"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-06-29
status: complete
---

# Phase 03 Plan 02: Opacity Mapping Summary

**Opacity mappings implemented: fill-opacity rgba() encoding, stroke-opacity outline.opacity, element opacity PPTElement.opacity**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-06-29T04:27:00Z
- **Completed:** 2026-06-29T04:30:00Z
- **Tasks:** 4
- **Files modified:** 3

## Accomplishments
- Added opacity field to PPTElementOutline interface (D-19)
- fill-opacity < 1 → rgba() color string (D-18) - already partially implemented
- stroke-opacity → outline.opacity on all shape elements (D-19)
- element opacity → PPTElement.opacity, undefined when absent (D-20)

## Task Commits

Each task was committed atomically:

1. **Task W0-1: Create opacity.test.ts** - `98df1af` (test)
2. **Task W1-1: Add opacity to PPTElementOutline** - `494d53e` (feat)
3. **Task W1-3: Implement stroke-opacity → outline.opacity** - `1ca4ad0` (feat) [combined with W1-4]
4. **Task W1-4: Implement element opacity → undefined** - `1ca4ad0` (feat) [combined with W1-3]

## Files Created/Modified

- `__tests__/opacity.test.ts` - 25 tests for OPAC-01~03
- `src/slides.ts` - Added opacity?: number to PPTElementOutline
- `src/transformer/transform-to-pptel.ts` - stroke-opacity + element opacity in all shape cases

## Decisions Made

- D-18: fill-opacity < 1 encoded as rgba() via colorToRgba() - consistent with D-08
- D-19: stroke-opacity → outline.opacity numeric field (not rgba string)
- D-20: element opacity → PPTElement.opacity (undefined when absent, not 1)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 85 tests pass.

## Next Phase Readiness

- Opacity mappings complete for all shape types
- Ready for phase 03-03 or next transform phase

---
*Phase: 03-gradient-opacity*
*Completed: 2026-06-29*
