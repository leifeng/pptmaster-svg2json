---
phase: "06"
plan: "02"
subsystem: text-measurement
tags:
  - phase-06
  - resvg-js
  - text-measurement
  - cleanup
dependency_graph:
  requires:
    - "06-01: resvg-js text measurement integration"
  provides:
    - transform-to-pptel.ts: cleaned-up-text-fallback
  affects:
    - src/transformer/transform-to-pptel.ts
tech_stack:
  added: []
  patterns:
    - inline-fallback-heuristic
key_files:
  modified:
    - src/transformer/transform-to-pptel.ts
decisions:
  - id: D-35
    description: Measurement failure falls back to heuristic (updated inline implementation)
metrics:
  duration_minutes: ~5
  completed_date: "2026-07-01"
  tasks_completed: 1
  files_modified: 1
  tests_passed: 151
status: complete
---

# Phase 06 Plan 02 Summary: Remove Deprecated Heuristic Functions

## Objective

Remove the deprecated `calcTextWidthYaHei()` function and `BASELINE_OFFSET_RATIO` constant from `transform-to-pptel.ts`, replacing the fallback path with a clean inline implementation.

## Completed Tasks

### Task 1: Remove calcTextWidthYaHei and BASELINE_OFFSET_RATIO, update fallback

**Commit:** f12f932

- Removed `BASELINE_OFFSET_RATIO` constant (was line 9: `const BASELINE_OFFSET_RATIO = 0.8`)
- Removed `calcTextWidthYaHei()` function (was lines 15-54, a 40-line character-classification-based width calculator)
- Updated fallback path to use inline heuristic:
  - `width = fontSize * content.length * 0.6` (rough character-width estimate)
  - `height = scaledFontSize`
  - `textTop = transformed.top * scaleY` (no baseline adjustment)
- Documented as "MEAS-06 fallback: heuristic estimate when resvg-js measurement fails"
- All 151 tests pass without regression

## Implementation Details

### Before (Deprecated)
```typescript
const BASELINE_OFFSET_RATIO = 0.8

function calcTextWidthYaHei(text: string, fontSize: number, letterSpacing: number = 0): number {
  // 40 lines of character classification logic
  // Chinese chars: fontSize, Latin: 0.55-0.65 fontSize, etc.
}

} catch {
  textWidth = calcTextWidthYaHei(content, scaledFontSize, letterSpacing)
  textHeight = scaledFontSize + Math.round(scaledFontSize * 0.14)
  textTop = (transformed.top + fontSize * BASELINE_OFFSET_RATIO) * scaleY
}
```

### After (Clean)
```typescript
} catch {
  // D-35: MEAS-06 fallback: heuristic estimate when resvg-js measurement fails
  textWidth = fontSize * content.length * 0.6
  textHeight = scaledFontSize
  textTop = transformed.top * scaleY
}
```

## Deviation from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new security-relevant surface introduced. The deprecated functions were code dead ends with no external exposure.

## Verification

- `npm test` — 151 tests passed
- `grep -c 'calcTextWidthYaHei' src/transformer/transform-to-pptel.ts` — 0 occurrences
- `grep -c 'BASELINE_OFFSET_RATIO' src/transformer/transform-to-pptel.ts` — 0 occurrences
