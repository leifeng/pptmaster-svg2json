---
phase: 11-text-width-height-passthrough
reviewed: 2026-07-23T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - __tests__/text-width-height-passthrough.test.ts
  - src/transformer/transform-to-pptel.ts
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-07-23
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 11 introduces a "passthrough" fast path for SVG `<text>` elements that declare both `width` and `height` attributes, skipping the resvg-js measurement step. The implementation is narrowly scoped and follows the phase CONTEXT.md contract (both attrs valid + positive → passthrough, else → measurement).

The implementation itself is internally consistent with the documented design and no critical security or data-loss regressions were found in the diff. However, one warning-level correctness concern remains around vertical positioning (`textTop` heuristic vs. measured ascent), and several smaller quality gaps (test coverage breadth, multiline behavior) are noted below.

The test file is small but functional — it correctly verifies that `measureTextElement` is or is not called based on input conditions. Test coverage is narrow in places where it matters most (position assertions, zero-value edge cases).

---

## Critical Issues

_None._

---

## Warnings

### WR-01: Passthrough `textTop` uses heuristic ascent ratio instead of measured ascent — vertical position may differ from the measurement branch

**File:** `src/transformer/transform-to-pptel.ts:1522-1526`
**Issue:** In the new passthrough branch:

```typescript
if (usePassthrough) {
  textWidth = parsedTextWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN
  textHeight = parsedTextHeight * scaleY
  // 没有 measured.y，使用 FALLBACK_ASCENT_RATIO 与 catch 块保持一致
  textTop = transformed.top - fontSize * FALLBACK_ASCENT_RATIO * scaleY
}
```

The ascent component (`fontSize * FALLBACK_ASCENT_RATIO`) is a fixed heuristic (0.764). The measurement branch (line 1552-1553) instead uses `fontSize - measured.y` (the actual rendered baseline offset from the target font). Although `FALLBACK_ASCENT_RATIO` is documented as approximating 思源's actual ascent ratio, real font metrics are not perfectly linear and vary with font-size, font-weight, and font-style. An SVG `<text font-size="12" font-weight="800">` plus explicit `width`/`height` will use the same 0.764 ratio as `font-size="40" font-weight="normal"`, whereas the measurement branch (had measurement run) would have produced a font-specific value.

This means two visually identical SVG `<text>` elements — one with explicit `width`/`height`, one without — can render at slightly different `top` values in the same slide. The 11-CONTEXT.md doc frames the heuristic as "保持视觉一致" (maintain visual consistency), but consistency is only guaranteed when `measured.y === fontSize * (1 - FALLBACK_ASCENT_RATIO)`, which is not always the case for 思源 at every weight/size combination.

**Fix:** Either:
1. Accept the small visual delta and add a Vitest assertion that pins the heuristic value so any future change is intentional:

```typescript
// In __tests__/text-width-height-passthrough.test.ts
expect(result?.top).toBeCloseTo(/* expected value */, 0)
```

2. Or, when feasible, lazily probe resvg-js for the ascent only (without re-measuring width), keeping performance savings while gaining ascent accuracy. This is the deeper fix that resolves the inconsistency at the cost of some implementation complexity.

The minimum acceptable remediation is (1) — pin the heuristic value in tests so any future "visual regression" caused by this code path is caught early.

---

## Info

### IN-01: Multiline text + passthrough discards `textHeight` even when SVG declares both dimensions

**File:** `src/transformer/transform-to-pptel.ts:1653-1675`
**Issue:** In the multiline branch (after `if (isMultiline)`), each emitted `PPTTextElement` uses:

```typescript
width: textWidth,
height: tspan.fontSize * 1.2,
```

`textWidth` flows through from the passthrough path correctly, but `textHeight` (which the passthrough path newly computes) is **never referenced** in the multiline branch — each tspan renders with `fontSize * 1.2` instead. The result: for multiline `<text width="X" height="Y">`, the SVG's `height` attribute is silently ignored even though both dimensions were detected as valid.

This is a pre-existing limitation (not introduced by Phase 11), but Phase 11 now makes the omission more visible because users supplying `width`/`height` may reasonably expect both attributes to flow through. Worth documenting in the phase notes so consumers know the height attribute is currently no-op for multiline text.

**Fix:** Add a comment in `transform-to-pptel.ts` near the multiline map call (around line 1666) explicitly stating "textHeight from passthrough is intentionally discarded here; multiline uses per-tspan fontSize * 1.2". Alternatively, if the team intends to honor SVG `height` on multiline text, propagate `textHeight` into the per-tspan elements (e.g., split total height across tspans by font-size ratio).

### IN-02: Tests do not assert `textTop` / `textLeft` for the passthrough case

**File:** `__tests__/text-width-height-passthrough.test.ts:28-42`
**Issue:** The passthrough test only verifies `result.type`, `result.width`, `result.height`, and `result.fixedHeight`. It does **not** verify `result.top` or `result.left`. The passthrough path's most novel behavior — computing `textTop` via heuristic ascent — is therefore unobserved by the test suite. If WR-01's fix is ever reattempted or the heuristic constant changes (e.g., `FALLBACK_ASCENT_RATIO` is tuned), the test would pass silently.

**Fix:** Add explicit position assertions:

```typescript
expect(result?.top).toBeCloseTo(/* transformed.top - fontSize * FALLBACK_ASCENT_RATIO * scaleY */, 1)
expect(result?.left).toBe(/* expected from applyTransform + text-anchor handling */)
```

### IN-03: Tests do not cover zero-value boundaries (`width: '0'` or `height: '0'`)

**File:** `__tests__/text-width-height-passthrough.test.ts:44-59`
**Issue:** The `it.each` matrix covers `only width`, `only height`, `negative width`, and `non-numeric width`. It does **not** exercise `width: '0'` / `height: '0'`. The implementation handles these correctly (`parseFloat('0') = 0`, `0 > 0` is false → fall back to measurement), but the boundary is asserted nowhere. A future regression that treats `0` as positive would slip through.

**Fix:** Extend the `it.each` matrix with a `'zero width'` / `'zero height'` case asserting fallback behavior. Optional — non-blocking.

### IN-04: Mock is not restored after the file's tests run (multi-suite pollution risk)

**File:** `__tests__/text-width-height-passthrough.test.ts:6-26`
**Issue:** `vi.mock('../src/text-measurer', ...)` is hoisted at module load. `beforeEach` resets the mock, but there is no `afterAll(() => vi.restoreAllMocks())` or `vi.unmock(...)`. If another test file in the future imports from this file (or vice-versa) and Vitest runs suites in the same worker without isolation, the module-level mock could leak. In current Vitest behavior, each test file gets a fresh module graph by default, so this is currently safe — but the omission could become a footgun if test isolation changes.

**Fix (optional):** Add an explicit cleanup hook at the bottom of the file for defensive hygiene:

```typescript
afterAll(() => {
  vi.clearAllMocks()
})
```

---

_Reviewed: 2026-07-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
