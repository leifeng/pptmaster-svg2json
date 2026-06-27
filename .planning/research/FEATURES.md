# Feature Research: SVG Transform Fixes

**Domain:** SVG to PowerPoint JSON converter library
**Subsequent Milestone:** v1.1 transform-fixes
**Researched:** 2026-06-27
**Confidence:** HIGH

## Executive Summary

This research covers two specific fixes for the svg-to-pptel library: (1) implementing proper `rotate(deg, cx, cy)` transform with center point, and (2) improving text y-coordinate baseline-to-top conversion. Both issues have table-stakes severity and have been previously documented in PITFALLS.md. This document provides deeper technical specifications for implementation.

## SVG Rotate Transform

### How SVG Rotation Works

**SVG `rotate(deg)` without center:**
- Rotates around the SVG coordinate system origin (0, 0)
- All points are transformed by: `x' = x * cos(theta) - y * sin(theta)`, `y' = x * sin(theta) + y * cos(theta)`
- This means elements near (0,0) rotate almost in place, while elements far from origin sweep in large arcs

**SVG `rotate(deg, cx, cy)` with center point:**
- Rotates around the specified point (cx, cy)
- The three-step math:
  1. Translate: subtract center to make it the origin: `(x - cx, y - cy)`
  2. Rotate: apply 2D rotation matrix
  3. Translate back: add center to result
- Formula: `x' = cx + (x - cx) * cos(theta) - (y - cy) * sin(theta)`
          `y' = cy + (x - cx) * sin(theta) + (y - cy) * cos(theta)`
- Where theta = deg * (PI / 180)

**Current Code Status:**
- Parser (`coordinate-mapper.ts` lines 52-57): Correctly extracts `rotateDeg`, `rotateCX`, `rotateCY`
- Transformer (`transform-to-pptel.ts`): Never uses rotation values; all elements output `rotate: 0`
- The parsed rotation center is simply discarded

### Feature Landscape: Rotate Transform

| Feature | Why Expected | Complexity | Current Status |
|---------|--------------|------------|----------------|
| `rotate(deg)` without center | Basic SVG transform | LOW | Not implemented (rotation ignored entirely) |
| `rotate(deg, cx, cy)` with center | Diagrams use pivot-based rotation | MEDIUM | Parsed but not applied |
| Multiple rotate() in transform | Some SVGs chain rotations | MEDIUM | Regex only captures first rotate |
| Nested transform inheritance | Groups with transforms | MEDIUM | Transforms not accumulated through hierarchy |

### Table Stakes: Rotate Fix

| Feature | Implementation Detail |
|---------|----------------------|
| `rotate(deg)` around origin | Apply rotation matrix to element coordinates before other transforms |
| `rotate(deg, cx, cy)` around center | Use translate-rotate-translate formula; `rotateCX/rotateCY` are in SVG coordinate space (before viewBox scaling) |

**Key Implementation Notes:**
- Rotation center (cx, cy) is in SVG coordinate space, not affected by the element's own transform
- The rotation angle is in degrees (not radians)
- After rotation, element bounding box may change (rotated rectangles need larger bounding boxes)
- PowerPoint `rotate` property rotates around the element's top-left corner, not its center

### Differentiators: Rotate Fix

| Feature | Value Proposition | Complexity | When to Use |
|---------|-------------------|------------|-------------|
| Multiple `rotate()` in chain | Some SVG editors emit `rotate(45) rotate(30)` | MEDIUM | Regex needs to find all rotate(), apply in order |
| Nested transform accumulation | `<g transform="rotate(15)"><rect transform="rotate(10)" /></g>` | HIGH | Walk parent chain, multiply transform matrices |

### Anti-Features: Rotate

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| `skewX()` / `skewY()` | PPTElement schema does not support skew | Mark as special, warn user |
| 3D rotation | PowerPoint does not support 3D rotation | Not applicable |

---

## SVG Text Y Coordinate: Baseline to Top

### How SVG Text Y Works

**SVG `<text y="N">` defines the baseline:**
- The `y` attribute positions the text's baseline
- Baseline = the line where letters "sit" (bottom of capital letters, not descenders)
- For text "Hello" at y=100: the bottom of 'H', 'e', 'l', 'l', 'o' sits on y=100
- Descenders (y, g, p, q) extend below the baseline

**Anatomy of font metrics:**
```
        <-- ascent (top of em box to baseline)
   +----+
   | H  |  <-- capital height
   +----+
   |    |
   | He |  <-- x-height
   | llo|
   +----+
   | y  |  <-- descender (below baseline)
  baseline
```

**Font size and baseline offset:**
- `font-size` defines the em-box height (the "cap height" approximation)
- Baseline-to-top offset varies by font:
  - Typical Latin fonts: 0.7 to 0.85 * fontSize
  - Many fonts use approximately 0.75 (750 units per 1000 em unit in TrueType)
  - CSS `1em` = font-size; baseline typically at 0.25em from bottom of em-box
  - Therefore: baseline-to-top = fontSize * 0.75

**Current Code (transform-to-pptel.ts line 494-496):**
```typescript
// SVG text y is baseline, convert to top edge for JSON with scaling
// Formula: jsonTop = (svgY + fontSize * 0.75) * scale
const textTop = (coords.top + fontSize * 0.75) * scaleY
```

### Feature Landscape: Text Baseline

| Feature | Why Expected | Complexity | Current Status |
|---------|--------------|------------|----------------|
| Text y as baseline coordinate | SVG spec defines it this way | LOW | Correctly identified, uses 0.75 approximation |
| Baseline-to-top offset | PowerPoint JSON expects top-left corner | LOW | 0.75 multiplier applied |
| Dynamic offset per font | Different fonts have different metrics | HIGH | Not supported; requires font metric library |

### Table Stakes: Text Baseline Fix

| Feature | Implementation Detail |
|---------|----------------------|
| `text y` as baseline | Parser correctly gets `y` attribute; this is SVG spec behavior |
| Baseline-to-top conversion | Add `fontSize * 0.75` to baseline y to get top edge |
| Scale-aware calculation | `textTop = (svgBaselineY + fontSize * 0.75) * scaleY` |

**Key Implementation Notes:**
- `fontSize` should use the parsed SVG `font-size` attribute (default 16)
- The multiplier 0.75 is a font-agnostic approximation
- This works reasonably well for Latin fonts; CJK fonts may differ significantly
- The offset is applied BEFORE viewBox-to-canvas scaling

### Differentiators: Text Baseline

| Feature | Value Proposition | Complexity | When to Use |
|---------|-------------------|------------|-------------|
| Configurable multiplier | Users with known fonts can tune | LOW | Add `textBaselineMultiplier` option (default 0.75) |
| Empirical font measurement | Use canvas or offscreen measurement | MEDIUM | For non-Latin scripts or precision needs |
| Per-font baseline table | Accurate metrics for common fonts | HIGH | Load known baseline data for Arial, Helvetica, Times, etc. |

### Anti-Features: Text Baseline

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| Dynamic font loading | Cannot guarantee fonts are available | Use fixed multipliers or table |
| Full OpenType metric parsing | Massive complexity for rarely-needed accuracy | Accept approximation for MVP |

---

## Feature Dependencies

```
Rotate Transform Fix
    └──requires──> Rotation math (2D transformation matrix)
                      └──requires──> Angle conversion (deg → radians)
                                         └──requires──> cos/sin functions (built-in)

Text Baseline Fix
    └──requires──> fontSize extraction
                      └──requires──> SVG font-size attribute parsing
                                         └──requires──> Default font-size (16)
                      
Combined: Both need coordinate-mapper.ts modification
    └──requires──> parseTransform() already correct
    └──requires──> mapCoordinates() needs update
```

---

## MVP Definition: v1.1 Transform Fixes

### Launch With

| Feature | Acceptance Criteria |
|---------|---------------------|
| `rotate(deg)` without center | Element rotates around SVG origin (0,0); output has correct `rotate` property |
| `rotate(deg, cx, cy)` with center | Element rotates around (cx, cy) point; output positioned correctly |
| Text baseline to top | `textTop = svgBaselineY + fontSize * 0.75`; text renders at correct vertical position |

### Defer

| Feature | Reason |
|---------|--------|
| Multiple rotate() in chain | Rare; complexity not justified |
| Nested transform accumulation | Rare; complexity not justified |
| Per-font baseline table | Complexity without demonstrated need |

---

## Technical Implementation Reference

### Rotate Math (for implementation)

```typescript
function rotatePoint(x: number, y: number, deg: number, cx: number, cy: number): [number, number] {
  const rad = deg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = x - cx
  const dy = y - cy
  return [
    cx + dx * cos - dy * sin,
    cy + dx * sin + dy * cos
  ]
}
```

### PowerPoint Rotation Caveat

- PowerPoint's `rotate` property rotates around the element's top-left corner
- SVG's `rotate(deg, cx, cy)` rotates around the specified center
- Converting SVG rotation with non-zero center to PowerPoint requires:
  1. Calculate rotated bounding box corners
  2. Compute new top-left position
  3. Set PowerPoint `rotate` = deg
  4. Set `left/top` = new position

### Text Baseline Math (for implementation)

```typescript
// SVG: text element with y="baselineY" and font-size="N"
// Target: top-left corner of text bounding box

const baselineToTop = fontSize * 0.75  // approximation
const topY = baselineY + baselineToTop  // still in SVG coordinate space
```

---

## Sources

- [SVG 1.1 Specification: Transform Attribute](https://www.w3.org/TR/SVG11/coords.html#TransformAttribute) - rotation around center point formula
- [SVG 1.1 Specification: Text Element](https://www.w3.org/TR/SVG11/text.html) - baseline positioning
- [MDN: SVG Transform](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform) - practical rotation examples
- [MDN: SVG Text Element](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/text) - y attribute documentation
- Code analysis: `src/mapper/coordinate-mapper.ts` (parseTransform lines 52-57, mapCoordinates lines 113-217)
- Code analysis: `src/transformer/transform-to-pptel.ts` (text case lines 480-515, rotate handling lines 255-542)

---
*Feature research for: SVG to PowerPoint JSON converter v1.1 transform-fixes*
*Researched: 2026-06-27*
