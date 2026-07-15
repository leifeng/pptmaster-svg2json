---
phase: "06"
plan: "01"
subsystem: text-measurement
tags:
  - phase-06
  - resvg-js
  - text-measurement
  - async-propagation
dependency_graph:
  requires: []
  provides:
    - text-measurer.ts:measureTextBBox
    - text-measurer.ts:buildMeasurementSvg
    - text-measurer.ts:measureTextElement
    - transformElement:async-text-case
  affects:
    - src/transformer/transform-to-pptel.ts
    - src/index.ts
    - __tests__/text-*.test.ts
tech_stack:
  added:
    - "@resvg/resvg-js@2.6.2"
  patterns:
    - lazy-singleton-wasm-init
    - async-await-propagation
    - fallback-heuristic
key_files:
  created:
    - src/text-measurer.ts
    - src/text-measurer.test.ts
  modified:
    - src/transformer/transform-to-pptel.ts
    - src/index.ts
    - vitest.config.ts
    - __tests__/text-fields.test.ts
    - __tests__/text-anchor.test.ts
    - __tests__/text-style-marks.test.ts
    - __tests__/group-id.test.ts
    - __tests__/shadow.test.ts
    - __tests__/opacity.test.ts
    - __tests__/gradient.test.ts
    - __tests__/image-outline.test.ts
    - __tests__/shape-rx.test.ts
    - __tests__/line-width.test.ts
    - __tests__/transform-element.test.ts
    - src/scripts/round-trip-test.ts
decisions:
  - id: D-35
    description: Measurement failure falls back to calcTextWidthYaHei() heuristic
  - id: D-36
    description: Tspan children flattened with newline before measurement
  - id: D-37
    description: Fixed 1280x720 viewBox for measurement SVG
metrics:
  duration_minutes: ~15
  completed_date: "2026-07-01"
  tasks_completed: 2
  files_created: 2
  files_modified: 14
  tests_passed: 151
status: complete
---

# Phase 06 Plan 01 Summary: resvg-js Text Measurement Integration

## Objective

Install @resvg/resvg-js, create the text-measurer module with measureTextBBox(), integrate it into transformElement() text case, propagate async through walk() and transformToPPTElement(), and add fallback to heuristic on measurement failure.

## Completed Tasks

### Task 1: Install @resvg/resvg-js and create text-measurer module with tests

**Commit:** eeb6bbf

- Installed `@resvg/resvg-js@2.6.2` as project dependency
- Created `src/text-measurer.ts` with:
  - `buildMeasurementSvg()` - builds measurement SVG with fixed 1280x720 viewBox, XML-escaped content, proper font attributes
  - `measureTextBBox()` - async function using resvg-js `getBBox()` for bounding box computation
  - `measureTextElement()` - high-level API combining build + measure, re-throws errors for fallback handling
  - `TextMeasurementInput` interface for type-safe input
- Created `src/text-measurer.test.ts` with 24 tests covering all key behaviors
- Updated `vitest.config.ts` to include `src/**/*.test.ts`

### Task 2: Integrate measureTextBBox into transformElement text case, propagate async

**Commit:** 9928c1c

- Changed `transformElement()` to `async function transformElement()` returning `Promise<PPTElement | null>`
- In text case:
  - Uses `measureTextElement()` for width/height measurement
  - Falls back to `calcTextWidthYaHei()` on measurement failure (D-35)
  - Uses measured bbox y-value for baseline-to-top conversion
- Changed `walk()` to `async function walk()` awaiting `transformElement()`
- Changed `transformToPPTElement()` to `async function transformToPPTElement()` awaiting `walk()`
- Updated `src/index.ts` to await `transformToPPTElement()`
- Updated all 12 test files to use async/await for `transformElement` calls
- Updated `src/scripts/round-trip-test.ts` to async

## Key Implementation Details

### text-measurer.ts API

```typescript
interface TextMeasurementInput {
  content: string
  fontFamily: string
  fontSize: number
  fontWeight?: string
  fontStyle?: string
  letterSpacing?: number
  fill?: string
}

function buildMeasurementSvg(opts: TextMeasurementInput): string
async function measureTextBBox(svgString: string): Promise<{ width: number; height: number }>
async function measureTextElement(input: TextMeasurementInput): Promise<{ width: number; height: number }>
```

### Multi-line Text Handling (D-36)

The `buildMeasurementSvg` function splits content by `\n` and creates `<tspan>` elements with `dy="1em"` for proper multi-line rendering in resvg-js.

### Fallback Behavior (D-35)

On any measurement failure (WASM error, empty bbox, etc.), the text case falls back to:
- Width: `calcTextWidthYaHei(content, scaledFontSize, letterSpacing)`
- Height: `scaledFontSize + Math.round(scaledFontSize * 0.14)`

## Test Results

All 151 tests pass:
- `text-measurer.test.ts`: 24 tests (buildMeasurementSvg, measureTextBBox, measureTextElement)
- `text-fields.test.ts`: 10 tests
- `text-anchor.test.ts`: 4 tests
- `text-style-marks.test.ts`: 11 tests
- All other test files: 102 tests

## API Changes

| Before | After |
|--------|-------|
| `transformElement(...)` returns `PPTElement \| null` | `async function transformElement(...)` returns `Promise<PPTElement \| null>` |
| `transformToPPTElement(...)` returns `PPTElement[]` | `async function transformToPPTElement(...)` returns `Promise<PPTElement[]>` |
| `convert()` calls `transformToPPTElement()` synchronously | `convert()` awaits `transformToPPTElement()` |

## Deviations from Plan

**1. [Rule 1 - Bug Fix] Fixed resvg-js API mismatch**
- **Found during:** Task 1 implementation
- **Issue:** Research document said `boundingBoxes()` method exists on rendered image, but actual API is `getBBox()` on Resvg instance
- **Fix:** Changed `measureTextBBox` to use `resvg.getBBox()` instead of `img.boundingBoxes()`
- **Files modified:** `src/text-measurer.ts`
- **Commit:** eeb6bbf

**2. [Rule 2 - Missing Critical Functionality] Multi-line text handling**
- **Found during:** Task 1 testing
- **Issue:** SVG `\n` in text content does not create actual line breaks; resvg-js treats it as whitespace
- **Fix:** Modified `buildMeasurementSvg` to split content by `\n` and create `<tspan>` elements with `dy="1em"` for proper multi-line rendering
- **Files modified:** `src/text-measurer.ts`
- **Commit:** eeb6bbf

## Known Stubs

None - all functionality is fully implemented.

## Threat Surface Scan

No new security-relevant surface introduced. The text-measurer module XML-escapes content before insertion into SVG per the threat model (T-06-01).
