---
phase: 16-template-element-marking
plan: 02
subsystem: convert
tags: [svg, pptel, slide, content-bounds, slot, dfs]

# Dependency graph
requires:
  - phase: 16-template-element-marking
    plan: 01
    provides: isTemplate + templateType on PPTBaseElement (consumed by 16-03 E2E for reverse assertion)
provides:
  - Slide.contentBounds?: { x, y, width, height } optional field
  - findContentBounds() DFS helper in src/index.ts
  - convertOne() integration: writes contentBounds only when defined (TPL-CB-03 omission)
  - 5 TPL-CB tests covering exact-value, first-wins, missing/malformed omission
affects: [phase-16-03, verify-phase-goal]

# Actuals (#2632)
actuals:
  tokens: 800
  tasks: 1
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - DFS stack-based AST scan (avoids deep recursion risk)
    - typeof + length + Number.isNaN triple-guard for malformed bounds parsing

key-files:
  created: []
  modified:
  - src/slides.ts
  - src/index.ts
  - __tests__/template-marking.test.ts

key-decisions:
  - "Decision: findContentBounds() placed in src/index.ts not as separate module - per D-TPL-04 convertOne owns AST access, single-call-site scope"
  - "Decision: First-match-wins DFS order preserves document order - matches TPL-CB-02 semantics"
  - "Decision: Strict /\s+/ split + Number.isNaN - rejects "98abc" prefix-parse leaks from parseFloat"

patterns-established:
  - "Pattern: AST scan via shift+push stack (no recursion) - flat memory profile for deep templates"
  - "Pattern: optional field omission via explicit `if (x !== undefined)` guard instead of conditional spread - keeps TPL-CB-03 JSON field absence literal"

requirements-completed: [TPL-CB-01, TPL-CB-02, TPL-CB-03]

coverage:
  - id: D1
    description: "Slide.contentBounds exact-value extraction"
    requirement: TPL-CB-01
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-CB-01 contentBounds extraction from data-pptx-bounds"
        status: pass
    human_judgment: false
  - id: D2
    description: "First match wins (depth-first), subsequent slots ignored"
    requirement: TPL-CB-02
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-CB-02 only the first content-object-slot-template wins"
        status: pass
    human_judgment: false
  - id: D3
    description: "Field omission when slot missing/malformed/insufficient tokens"
    requirement: TPL-CB-03
    verification:
      - kind: unit
        ref: "__tests__/template-marking.test.ts#TPL-CB-03 contentBounds field is omitted when slot is missing/malformed"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-10-16
status: complete
---

# Phase 16: template-element-marking -- Plan 02 Summary

**Slide.contentBounds optional field extracted from data-pptx-bounds on first content-object-slot-template; field omitted when missing/malformed per TPL-CB-03.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-10-16
- **Completed:** 2026-10-16
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- Slide.contentBounds?: { x, y, width, height } optional field with JSDoc
- findContentBounds() DFS helper scans AST stack-based (avoids recursion overhead)
- convertOne() assembles contentBounds via explicit `if (x !== undefined)` guard (literal JSON field omission)
- 5 TPL-CB tests pass: exact-value parse (98/180/1084/404), first-wins (10/10/100/100 vs 20/20/200/200), slot missing -> undefined + JSON field absence, 3-token -> undefined, "abc" non-numeric -> undefined
- transformToPPTElement() signature untouched (D-TPL-04)

## Task Commits

1. **Task 1: 端到端 contentBounds tracer** - `603af6b` (feat)

## Files Created/Modified

- `src/slides.ts` - Slide.contentBounds?: { x, y, width, height }
- `src/index.ts` - findContentBounds() helper + convertOne() integration
- `__tests__/template-marking.test.ts` - +5 TPL-CB tests (12 total)

## Decisions Made

- **Decision: DFS stack-based scan** - Stack + shift/push avoids deep recursion; flat memory profile for templates with 100+ nested groups.
- **Decision: /\s+/ strict split** - Matches TPL-DEC-04 "纸面 PPTist 协议";combined with Number() + Number.isNaN triple-guard to reject "98abc" prefix-parse leakage.
- **Decision: Explicit `if (contentBounds !== undefined)`** - TPL-CB-03 字面"字段直接省略";conditional spread would work but explicit guard maps 1:1 to the requirement.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

16-03 can proceed: E2E test on 20 fixture SVGs covering templateType counts (cover >=5 / toc >=4 / ending >=4), 04_content exact contentBounds {98, 180, 1084, 404}, reverse assertion across all 20 slides, slot-less slides have no contentBounds field.

---

*Phase: 16-template-element-marking*
*Completed: 2026-10-16*
