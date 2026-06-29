# Phase 5: v1.1 Transform 遗留修复 - Research

**Researched:** 2026-06-29
**Domain:** SVG transform bug fixes — ellipse rotation center, ellipse cx/cy scaling, text baseline ratio
**Confidence:** HIGH

## Summary

Phase 5 addresses three residual transform issues from v1.1:

1. **REQ-TF-01:** Ellipse center point (cx/cy) must be rotated when `rotate(deg, cx, cy)` is specified — currently only the bounding box is rotated, but the center point itself is not transformed.

2. **REQ-TF-02:** Ellipse radii (rx/ry) and center coordinates (cx/cy) must be scaled proportionally with the SVG-to-canvas scale factors — currently raw SVG coordinates are used without scaling.

3. **REQ-TF-03:** Text baseline offset ratio must change from hardcoded `0.75` to a module-level constant `BASELINE_OFFSET_RATIO = 0.8`.

**Primary recommendation:** All three fixes are localized to `transform-to-pptel.ts` ellipse and text cases. No new dependencies required.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-26: Ellipse cx/cy must be individually rotated using `applyRotateWithCenter(cx, cy, rotateDeg, rotateCX, rotateCY)`
- D-27: Transformed ellipse center derived from bounding box: `transformedCx = transformed.left + (originalCx - svgOrgX) * scaleX`
- D-28: `BASELINE_OFFSET_RATIO = 0.8` — defined as module-level constant, formula: `textTop = (transformed.top + fontSize * BASELINE_OFFSET_RATIO) * scaleY`

### Claude's Discretion
- Implementation order and exact code structure within each fix

### Deferred Ideas (OUT OF SCOPE)
- None — all issues are within Phase 5 scope

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-TF-01 | Apply SVG `rotate(deg, cx, cy)` with correct rotation center | `applyRotateWithCenter` already exists; ellipse case at line 439-470 needs to call it for cx/cy |
| REQ-TF-02 | Fix ellipse center scaling — cx/cy and rx/ry must be scaled | scaleX/scaleY already computed at line 298-299; need to apply to ellipse attributes |
| REQ-TF-03 | Fix text baseline offset — use configurable `BASELINE_OFFSET_RATIO = 0.8` | Module-level constant needed; replace hardcoded 0.75 at line 713 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ellipse rotation center | API / Backend | — | `transform-to-pptel.ts:ellipse case` applies `applyRotateWithCenter` to cx/cy |
| Ellipse proportional scaling | API / Backend | — | scaleX/scaleY computed at transformElement entry, applied to ellipse rx/ry/cx/cy |
| Text baseline ratio constant | API / Backend | — | Module-level constant in `transform-to-pptel.ts`, used at text case |

---

## Standard Stack

This is a bug-fix phase with no new library dependencies. The standard stack is the existing codebase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|--------|---------|--------------|
| TypeScript | existing | Language | Project default |
| uuid | existing | Element ID generation | Already in use |

### No New Dependencies Required

---

## Architecture Patterns

### Ellipse Transform Flow (REQ-TF-01, REQ-TF-02)

**Current broken flow:**
```
ellipse attrs (cx, cy, rx, ry)
       ↓
applyTransform(bounding box) → rotated bounding box
       ↓
ellipseToPath(raw cx, raw cy, raw rx, raw ry) ← BUG: cx/cy/rx/ry not transformed
```

**Correct flow:**
```
ellipse attrs (cx, cy, rx, ry)
       ↓
scale cx/cy/rx/ry by scaleX/scaleY
       ↓
if rotate-with-center: applyRotateWithCenter(cx, cy, ...)
       ↓
ellipseToPath(transformed cx, transformed cy, scaled rx, scaled ry)
```

### Key Code Locations

**transform-to-pptel.ts:439-496 (ellipse case)**
- Line 298-299: `scaleX`, `scaleY` computed from viewBox
- Line 440: `applyTransform(left, top, width, height, transform)` rotates bounding box
- Line 442-445: Raw `cx`, `cy`, `rx`, `ry` read from attrs (NOT scaled)
- Line 446: `ellipseToPath(cx, cy, rx, ry)` uses unscaled values

**apply-transform.ts:13-31 (applyRotateWithCenter)**
- Already correctly implemented
- Rotates point (x, y) around center (cx, cy) by deg degrees

**transform-to-pptel.ts:713 (text case)**
```typescript
const textTop = (transformed.top + fontSize * 0.75) * scaleY  // ← 0.75 should be 0.8
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rotation around center | Custom formula | `applyRotateWithCenter` | Already correctly implemented in apply-transform.ts |
| Ellipse path generation | Custom arc math | `ellipseToPath` | Already handles the SVG arc commands correctly |

---

## Common Pitfalls

### Pitfall 1: Ellipse cx/cy vs bounding box left/top confusion
**What goes wrong:** When transforming ellipse cx/cy, developers might use `transformed.left` and `transformed.top` directly instead of deriving from the original cx/cy value.

**Why it happens:** The bounding box is correctly rotated via `applyTransform`, but cx/cy (the geometric center) is a separate property that needs its own transformation.

**How to avoid:** Per D-27, compute transformed center as: `transformedCx = transformed.left + (originalCx - svgOrgX) * scaleX`. The key insight is that `transformed.left` represents the rotated position of the original `left` point, and we need to offset from there by the same proportional distance that cx is from left in the original space.

**Warning signs:** Ellipse appears offset from its expected position after transform.

### Pitfall 2: Text baseline vs top edge confusion
**What goes wrong:** SVG text y coordinate is at the baseline; many systems expect top-edge positioning.

**Why it happens:** SVG uses baseline model; PowerPoint/HTML uses top-edge model.

**How to avoid:** Use `BASELINE_OFFSET_RATIO = 0.8` (not 0.75) to convert: `top = y - fontSize * 0.8`.

### Pitfall 3: rx/ry sign handling
**What goes wrong:** Negative scale values might cause rx/ry to become negative.

**Why it happens:** `Math.abs(scaleX)` should be used for rx/ry (radius is always positive).

**How to avoid:** When scaling rx/ry, use `Math.abs(scaleX)` and `Math.abs(scaleY)` — confirmed by D-26: "rx/ry（半径）不参与旋转变换，只做比例缩放：`rx *= |scaleX|`"

---

## Code Examples

### Fix for Ellipse cx/cy Rotation (REQ-TF-01)

**Current (broken) code at transform-to-pptel.ts:439-446:**
```typescript
case 'ellipse': {
  const transformed = applyTransform(left, top, width, height, transform)
  const { rotate, flipH, flipV } = transformed
  const cx = Number(element.attrs.cx) || 0
  const cy = Number(element.attrs.cy) || 0
  const rx = Number(element.attrs.rx) || 0
  const ry = Number(element.attrs.ry) || 0
  const path = ellipseToPath(cx, cy, rx, ry)
```

**Fix approach:**
```typescript
case 'ellipse': {
  const transformed = applyTransform(left, top, width, height, transform)
  const { rotate, flipH, flipV } = transformed
  // Scale cx/cy/rx/ry from SVG to canvas coordinates
  const svgOrgX = viewBox[0]
  const svgOrgY = viewBox[1]
  const scaledCx = (Number(element.attrs.cx) || 0) * scaleX
  const scaledCy = (Number(element.attrs.cy) || 0) * scaleY
  const scaledRx = Math.abs(Number(element.attrs.rx) || 0) * Math.abs(scaleX)
  const scaledRy = Math.abs(Number(element.attrs.ry) || 0) * Math.abs(scaleY)
  // Apply rotation center if specified (D-26)
  let finalCx = scaledCx
  let finalCy = scaledCy
  if (transform.rotateCX !== undefined && transform.rotateCY !== undefined) {
    const rotated = applyRotateWithCenter(scaledCx, scaledCy, transform.rotateDeg!, transform.rotateCX * scaleX, transform.rotateCY * scaleY)
    finalCx = rotated.x
    finalCy = rotated.y
  }
  const path = ellipseToPath(finalCx, finalCy, scaledRx, scaledRy)
```

### Fix for Text Baseline Ratio (REQ-TF-03)

**Current (broken) code at transform-to-pptel.ts:713:**
```typescript
const textTop = (transformed.top + fontSize * 0.75) * scaleY
```

**Fix approach:**
Add module-level constant near the top of `transform-to-pptel.ts`:
```typescript
// D-28: SVG text baseline offset ratio (ascent ≈ font_size * 0.8)
const BASELINE_OFFSET_RATIO = 0.8
```

Then update line 713:
```typescript
const textTop = (transformed.top + fontSize * BASELINE_OFFSET_RATIO) * scaleY
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ellipse cx/cy used raw SVG values | Ellipse cx/cy scaled and rotated | Phase 5 | Ellipse positions correct after transform |
| Text baseline ratio 0.75 | Text baseline ratio 0.8 | Phase 5 | Text vertical positioning more accurate |

**No deprecated approaches** — this is a bug-fix phase addressing known incorrect behavior.

---

## Assumptions Log

> All claims verified from source code analysis — no assumptions required for this bug-fix phase.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `applyRotateWithCenter` correctly implements rotation | apply-transform.ts:13-31 | None — already unit tested |
| A2 | `ellipseToPath` generates valid ellipse path | shape-to-path.ts:38-41 | None — already in production use |

---

## Open Questions

1. **Should ellipse rx/ry also flip when scale is negative?**
   - What we know: D-26 says rx/ry "不参与旋转变换，只做比例缩放". Negative scale should set flipH/flipV flags, not negate rx/ry.
   - What's unclear: Whether the PPTShapeElement.flipH/flipV mechanism handles ellipse rendering correctly.
   - Recommendation: Scale rx/ry with `Math.abs()` and let flip flags handle orientation.

---

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies — pure code bug-fix phase)

---

## Security Domain

> This is a bug-fix phase with no new external dependencies or security-relevant changes. The three fixes are:
> - Correctness of rotation math (already using existing `applyRotateWithCenter`)
> - Correctness of coordinate scaling (existing scaleX/scaleY)
> - Correctness of a constant value (0.75 → 0.8)
>
> No security implications identified.

**Applicable ASVS Categories:** None — no security controls affected by these bug fixes.

---

## Sources

### Primary (HIGH confidence)
- `src/transformer/apply-transform.ts:13-31` — `applyRotateWithCenter` implementation (verified by reading)
- `src/transformer/transform-to-pptel.ts:439-496` — ellipse case (verified by reading)
- `src/transformer/transform-to-pptel.ts:695-784` — text case (verified by reading)
- `src/shapes/shape-to-path.ts:38-41` — `ellipseToPath` (verified by reading)
- `.planning/phases/05-v1-1-transform/05-CONTEXT.md` — D-26, D-27, D-28 decisions (verified by reading)

### Secondary (MEDIUM confidence)
- `__tests__/apply-transform.test.ts` — confirms `applyRotateWithCenter` behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, existing code patterns
- Architecture: HIGH — clear fix locations in known files
- Pitfalls: HIGH — well-documented from prior phase context

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (30 days — bug fixes are stable)
