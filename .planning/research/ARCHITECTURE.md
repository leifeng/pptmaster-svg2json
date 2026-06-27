# Architecture Research: Transform Integration

**Project:** svg-to-pptel (v1.1 transform-fixes)
**Researched:** 2026-06-27
**Confidence:** HIGH

## Executive Summary

Two isolated fixes are required: (1) `rotate(deg, cx, cy)` center-point math, and (2) text baseline-to-top conversion. The existing pipeline has a clean separation: `mapCoordinates()` produces geometry with transforms partially applied; `transformElement()` produces PPTElement JSON. The rotate-around-center math belongs in a new `applyTransform()` function called from `mapCoordinates()`, while text baseline correction should remain in `transformElement()` where it currently lives.

## Current Pipeline (Problematic)

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree (raw transform strings in attrs.transform)
    ↓
[coordinate-mapper.ts]
    ├── parseTransform() → TransformResult { rotateDeg, rotateCX, rotateCY, ... }
    └── mapCoordinates() → CoordinateMapping { left, top, width, height }
        ├── translate/scale applied correctly
        ├── rotateDeg IGNORED (no rotation math)
        └── rotateCX/rotateCY IGNORED (never used)
    ↓
[transform-to-pptel.ts]
    ├── transformElement() calls mapCoordinates() + canvas scaling
    └── text case: baseline offset = fontSize * 0.75 (approximation)
    ↓
JSON Output
```

## Integration Analysis

### Question 1: Where to integrate rotate(deg, cx, cy)?

**Recommended: `mapCoordinates()` via a new `applyTransform()` helper in `transforms/apply-transform.ts`**

**Reasoning:**

1. **Transform is a coordinate operation.** The entire purpose of `mapCoordinates()` is to map element geometry through transforms. Rotation is a coordinate transform and belongs alongside translate/scale, not in the element converter.

2. **The user reference implementation already defines the right seam.** The `applyTransform(x, y, transform)` function signature accepts an `(x, y)` point and a `transform` string, returning a transformed point. This is a pure mathematical function that should live in `transforms/apply-transform.ts`.

3. **Current code already parses rotation correctly.** `parseTransform()` in `coordinate-mapper.ts` already extracts `rotateDeg`, `rotateCX`, `rotateCY`. The gap is that the parsed values are never applied.

4. **Keeping rotate in the mapper preserves the converter's responsibility.** `transformElement()` should only handle element-type concerns (path generation, style extraction, text formatting), not coordinate math.

**What to change:**

```
coordinate-mapper.ts
    ├── parseTransform() — keep (already works correctly)
    └── mapCoordinates() — call applyTransform(x, y, transform) instead of manual tx/sx math

NEW: src/transformer/transforms/apply-transform.ts
    └── applyTransform(x, y, transform): { x, y }
        ├── parse translate/scale/rotate from transform string
        ├── apply in SVG order: translate → rotate-with-center → scale
        └── return transformed { x, y }
```

**The rotate-around-center math (SVG 1.1 spec):**

```typescript
// For rotate(deg, cx, cy):
// 1. Translate point so center becomes origin: (x - cx, y - cy)
// 2. Apply 2D rotation matrix
// 3. Translate back: (x' + cx, y' + cy)

x' = cx + (x - cx) * cos(theta) - (y - cy) * sin(theta)
y' = cy + (x - cx) * sin(theta) + (y - cy) * cos(theta)
```

**Note on reference implementation:** The `applyTransform` in `idea.md` does NOT handle rotation center — it rotates around origin. The reference implementation handles the translate→rotate→scale chain but is incomplete for `rotate(deg, cx, cy)`. The rotate-around-center math above must be added.

### Question 2: Where to handle text baseline correction?

**Recommended: Keep in `transformElement()` (transform-to-pptel.ts) — no change**

**Reasoning:**

1. **Baseline correction is not a coordinate transform.** It is a semantic conversion from SVG baseline coordinates to PowerPoint top-edge coordinates. This is specific to text elements and belongs with text handling, not in the generic coordinate mapping layer.

2. **Current location is already correct.** The text case in `transformElement()` (line 496) does `textTop = (coords.top + fontSize * 0.75) * scaleY`. This is the right place.

3. **The 0.75 approximation is acceptable for MVP.** As documented in PITFALLS.md, this is font-dependent (typically 0.65-0.85). The fix is to make this configurable or add a warning, not to move the code.

4. **Phase 2 will add proper font metrics.** When `utils/font-metrics.ts` is added, the text handler will be updated there.

**What to change:**

```
transform-to-pptel.ts (text case)
    └── Replace hardcoded 0.75 with configurable baselineOffset
        ├── Option: accept baselineOffset from caller (cleanest API)
        ├── Option: use a lookup table for common fonts
        └── Keep 0.75 as default with a comment documenting the approximation
```

## Recommended File Changes

### Phase 1 (Transform Fixes Only)

**1. Create `src/transformer/transforms/apply-transform.ts`**

Pure function: takes `(x, y, transformString)` or `(x, y, TransformResult)`, returns transformed `{ x, y }`.

Handles:
- `translate(dx, dy)` or `translate(dx)` — default dy=0
- `scale(sx, sy)` or `scale(s)` — default sy=sx
- `rotate(deg, cx, cy)` or `rotate(deg)` — center defaults to origin if not specified
- Transform composition order: translate → rotate-with-center → scale

Does NOT handle (deferred to Phase 2):
- `matrix(...)` — decompose or throw warning
- Multiple rotate with different centers in same transform string

**2. Update `src/mapper/coordinate-mapper.ts`**

- `parseTransform()` — keep as-is (works correctly)
- `mapCoordinates()` — replace inline tx/sx math with calls to `applyTransform()`

Changes to `mapCoordinates()`:
```typescript
// BEFORE (problematic for rotate):
left = extractNumber(attrs.x, 0) * sx + tx
top = extractNumber(attrs.y, 0) * sy + ty

// AFTER:
const rawLeft = extractNumber(attrs.x, 0)
const rawTop = extractNumber(attrs.y, 0)
const transformed = applyTransform(rawLeft, rawTop, transform)
left = transformed.x
top = transformed.y
```

**3. Update `src/transformer/transform-to-pptel.ts` (text case only)**

```typescript
// BEFORE:
const textTop = (coords.top + fontSize * 0.75) * scaleY

// AFTER:
// Option A: Keep 0.75 with better documentation
const textTop = (coords.top + fontSize * BASELINE_OFFSET) * scaleY
// where BASELINE_OFFSET = 0.75 with comment explaining font dependency

// Option B: Make configurable via options parameter (preferred for API)
```

**4. Fix ellipse scaling bug in `src/mapper/coordinate-mapper.ts` (line 152-154)**

```typescript
// BEFORE (bug: cx/cy not scaled):
const cx = extractNumber(attrs.cx, 0) + tx
const cy = extractNumber(attrs.cy, 0) + ty

// AFTER (matches circle case):
const cx = extractNumber(attrs.cx, 0) * sx + tx
const cy = extractNumber(attrs.cy, 0) * sy + ty
```

## Phase Implications

| Phase | Changes | Complexity |
|-------|---------|------------|
| Phase 1 | Create `apply-transform.ts`, update `mapCoordinates()`, fix ellipse bug, make baseline configurable | Medium |
| Phase 2 | Implement `matrix()` decomposition, add `font-metrics.ts`, complete path command support | High |

## Data Flow After Fix

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree
    ↓
[coordinate-mapper.ts]
    ├── parseTransform() → TransformResult
    └── mapCoordinates()
        └── applyTransform(x, y, TransformResult) → [newX, newY]
            └── rotate-around-center math applied correctly
    ↓
[transform-to-pptel.ts]
    ├── transformElement() — receives correctly-transformed coords
    └── text: configurable baseline offset (default 0.75)
    ↓
JSON Output
```

## Anti-Patterns to Avoid

1. **Do NOT add rotation math directly in `transformElement()`** — transform is a coordinate concern, not an element-type concern.

2. **Do NOT create a separate `applyRotate()` function** — rotate must be composed with translate/scale in correct SVG order. Isolated rotate would give wrong results for `transform="translate(10,10) rotate(45)"`.

3. **Do NOT change text baseline location** — keeping it in the text case of `transformElement()` is correct. Moving it to `mapCoordinates()` would be wrong because text baseline conversion is not a geometric transform.

4. **Do NOT apply transform twice** — some element types (rect, circle, ellipse) generate paths using original attrs. Ensure the transform is applied once in `mapCoordinates()` and paths are generated from transformed values, not original attrs.

## Sources

- [SVG 1.1 Transform Specification](https://www.w3.org/TR/SVG11/coords.html#TransformAttribute) — rotate(deg, cx, cy) semantics
- [SVG 1.1 Text Element](https://www.w3.org/TR/SVG11/text.html) — y attribute is baseline
- [Reference implementation](file://E:/git/svg2json/.planning/idea.md) — applyTransform pattern (incomplete for rotation center)
- Code analysis of `src/coordinate-mapper.ts` — current transform handling
- Code analysis of `src/transformer/transform-to-pptel.ts` — text baseline handling

---
*Architecture research for: svg-to-pptel v1.1 transform-fixes*
*Researched: 2026-06-27*
