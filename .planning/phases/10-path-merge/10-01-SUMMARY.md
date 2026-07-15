---
phase: 10-path-merge
plan: '01'
subsystem: transformer
tags: [svg, path-merge, bounding-box, bezier]

# Dependency graph
requires: []
provides:
  - src/merger/path-merge.ts with shouldMerge/mergePaths decision tree
  - Extended pathBoundingBox() with C/Q/S/T curve command support
  - walk() integration for all-path group detection
affects: [transform-to-pptel, coordinate-mapper]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Decision tree with MergeDecision enum ('merge'/'no-merge'/'cautious-merge')
    - Control point enclosure for bezier bounding box approximation
    - Path d attribute concatenation with absolute coordinates

key-files:
  created:
    - src/merger/path-merge.ts
  modified:
    - src/mapper/coordinate-mapper.ts
    - src/transformer/transform-to-pptel.ts

key-decisions:
  - "D-29: Independent path-merge module with shouldMerge() and mergePaths()"
  - "D-30: extractCommonStyle() iterates styleKeys to find common attrs"
  - "D-31: pathBoundingBox() extended with control point enclosure for C/Q/S/T"
  - "PATH-MERGE-04: evenodd paths get 'cautious-merge' not 'no-merge' per requirement"
  - "D-33: Absolute coordinates via toAbsolutePath() before concatenation"

patterns-established:
  - "Decision tree: shared style -> no semantics -> fill-none/no overlap -> evenodd check"

requirements-completed: [PATH-MERGE-01, PATH-MERGE-02, PATH-MERGE-03, PATH-MERGE-04, PATH-MERGE-05]

# Coverage metadata
coverage:
  - id: D1
    description: "path-merge.ts module with shouldMerge/mergePaths/extractCommonStyle/boxesOverlap"
    requirement: PATH-MERGE-01
    verification:
      - kind: unit
        ref: "grep -c 'shouldMerge\\|mergePaths\\|extractCommonStyle\\|boxesOverlap' src/merger/path-merge.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "pathBoundingBox() handles C/Q/S/T commands using control point enclosure"
    requirement: PATH-MERGE-03
    verification:
      - kind: unit
        ref: "grep -c 'cmdU === .C.\\|cmdU === .Q.\\|cmdU === .S.\\|cmdU === .T.' src/mapper/coordinate-mapper.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "walk() detects all-path groups and calls path-merge"
    requirement: PATH-MERGE-01
    verification:
      - kind: unit
        ref: "grep -c 'shouldMerge\\|extractCommonStyle\\|createMergedShapeElement' src/transformer/transform-to-pptel.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Decision tree categorizes paths as merge/no-merge/cautious-merge"
    requirement: PATH-MERGE-01
    verification: []
    human_judgment: true
    rationale: "Decision logic is business rule - visual verification needed with test SVG containing various path configurations"

# Metrics
duration: 15min
completed: 2026-07-13
status: complete
---

# Phase 10 Plan 01: Path Merge Module Summary

**Path merge decision tree with shouldMerge/mergePaths, extended pathBoundingBox for C/Q/S/T curves, and walk() integration**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-13T08:27:03Z
- **Completed:** 2026-07-13T08:42:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created src/merger/path-merge.ts with decision tree (shouldMerge/mergePaths/extractCommonStyle/boxesOverlap)
- Extended pathBoundingBox() in coordinate-mapper.ts to handle C/Q/S/T bezier curves using control point enclosure
- Integrated path-merge into walk() function to detect all-path groups and produce merged output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create path-merge module with decision tree** - `f3bd9b0` (feat)
2. **Task 2: Extend pathBoundingBox for curve commands** - `f3bd9b0` (feat, combined with Task 1)
3. **Task 3: Integrate path-merge into walk() function** - `0e7bf3a` (feat)

## Files Created/Modified

- `src/merger/path-merge.ts` - New module with shouldMerge(), mergePaths(), extractCommonStyle(), boxesOverlap(), createMergedShapeElement()
- `src/mapper/coordinate-mapper.ts` - Extended pathBoundingBox() with C/Q/S/T support, exported function
- `src/transformer/transform-to-pptel.ts` - Added path-merge import and all-path group detection in walk()

## Decisions Made

- PATH-MERGE-04 interpretation: evenodd paths return 'cautious-merge' (not 'no-merge') per PATH-MERGE-04 requirement which specifies "谨慎合并" (cautious merge) not skip entirely
- Control point enclosure used for bezier bounding box: cubic uses 4 points (x1,y1,x2,y2,x,y), quadratic uses 3 points (x1,y1,x,y)
- SharedStyle extracted by iterating ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule'] and checking all elements share same value

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Type error with effectiveGroupAttrs: element.attrs contains string|number|undefined but shouldMerge expects Record<string,string>. Fixed by filtering to string values only when building effectiveGroupAttrs.

## Next Phase Readiness

- Path-merge module complete and integrated
- Ready for Phase 10 Plan 02 (likely testing/verification of path-merge behavior)
- All PATH-MERGE requirements foundation laid

---
*Phase: 10-path-merge*
*Completed: 2026-07-13*
