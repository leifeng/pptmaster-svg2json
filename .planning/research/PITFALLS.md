# Pitfalls Research

**Domain:** SVG-to-PowerPoint JSON conversion library (coordinate transformation focus)
**Researched:** 2026-06-26
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Rotation Center Ignored

**What goes wrong:**
Elements with `rotate(deg, cx, cy)` transform render at wrong positions. The rotation center point (cx, cy) is silently dropped. An element at (100, 100) with `rotate(45, 150, 150)` rotates around (150, 150) but the code behaves as if it rotates around (0, 0).

**Why it happens:**
`parseTransform()` in `coordinate-mapper.ts` correctly extracts `rotateCX` and `rotateCY` from the SVG transform attribute, but `mapCoordinates()` never uses them. The transform pipeline applies `translateX/Y` and `scaleX/Y` but completely ignores `rotateCX/rotateCY`. The math for rotating around an arbitrary center requires: (1) translate point so center becomes origin, (2) rotate, (3) translate back. Current code has no rotation math at all.

**How to avoid:**
Implement proper rotate-around-center math in `mapCoordinates()`:
```
// For rotate(deg, cx, cy):
// 1. Translate: subtract (cx, cy) from point
// 2. Rotate: apply 2D rotation matrix
// 3. Translate back: add (cx, cy)
x' = cx + (x - cx) * cos(theta) - (y - cy) * sin(theta)
y' = cy + (x - cx) * sin(theta) + (y - cy) * cos(theta)
```

**Warning signs:**
- Elements with `rotate(N, cx, cy)` in SVG appear offset from expected positions
- Rotated text labels point in wrong direction
- Shapes that should pivot around a visual center instead pivot around SVG origin

**Phase to address:**
Active work item: Correct rotate transform with rotation center

---

### Pitfall 2: Text Baseline-to-Top Conversion Uses Fixed 0.75 Multiplier

**What goes wrong:**
SVG `<text y="30">` places the text baseline at y=30. The code converts this to top-edge by adding `fontSize * 0.75`. This is an empirical approximation that breaks for non-Latin fonts, unusual font metrics, or bold/italic variants. Different fonts have different baseline-to-top ratios (typically 0.7 to 0.85).

**Why it happens:**
SVG spec defines `y` as the baseline position. PowerPoint JSON expects top-left corner of the text bounding box. The correct conversion requires actual font metric data (ascent + descent), but the library has no font metric library and the PPTElement schema does not include baseline information. A single multiplier is used as a workaround.

**How to avoid:**
- Accept the approximation for MVP but log a warning when font metrics may be wrong
- Consider adding an optional `textBaselineOffset` override in the conversion options
- For CJK or mixed-script text, the 0.75 multiplier is especially unreliable

**Warning signs:**
- Text appears vertically misaligned by a few pixels to several points
- Different fonts of same size produce different vertical offsets
- Text near the top of an SVG appears cut off in PowerPoint output

**Phase to address:**
Active work item: Correct text y coordinate (baseline to top)

---

### Pitfall 3: Ellipse Transform Applies Translation Incorrectly

**What goes wrong:**
In `coordinate-mapper.ts` lines 152-160, ellipse coordinate extraction applies translation without scaling:
```typescript
case 'ellipse': {
  const cx = extractNumber(attrs.cx, 0) + tx   // <-- BUG: no scale applied
  const cy = extractNumber(attrs.cy, 0) + ty   // <-- BUG: no scale applied
  const rx = extractNumber(attrs.rx, 0) * sx
  const ry = extractNumber(attrs.ry, 0) * sy
```
While `rx` and `ry` (radii) are scaled, the center coordinates `cx` and `cy` are only translated, not scaled. This means if the SVG has a `scale(2)` transform, the ellipse center will be wrong.

**Why it happens:**
Copy-paste inconsistency. Compare with `circle` case (line 142-143) which correctly applies both:
```typescript
const cx = extractNumber(attrs.cx, 0) * sx + tx
const cy = extractNumber(attrs.cy, 0) * sy + ty
```

**How to avoid:**
Apply both scale and translation to center coordinates, matching the circle case pattern.

**Warning signs:**
- Ellipses in scaled SVGs render with wrong center position
- Ellipse that should be centered on a point appears offset from that point

**Phase to address:**
Active work item: Verified canvas scaling

---

### Pitfall 4: Matrix Transform Parsed but Not Applied

**What goes wrong:**
`parseTransform()` detects `matrix(...)` and sets `result.special = true` and `result.raw = transform`. However, `mapCoordinates()` never checks for `special` or `raw` and silently skips the matrix transform. Elements with matrix transforms render without any transformation applied.

**Why it happens:**
Matrix transforms encode arbitrary affine transformations (rotation, scale, skew, translation combined) as a 6-value array. Implementing full matrix math is complex and matrix is rarely used in manually-authored SVG. The "mark as special, do not apply" approach is a pragmatic deferral but creates silent failures.

**How to avoid:**
- Either implement matrix decomposition (preferred) or throw an error/warning when matrix is encountered
- Add a test that fails if matrix-transformed SVG passes through without warning

**Warning signs:**
- No error or warning when matrix transform is encountered
- Elements with `transform="matrix(...)"` appear untransformed in output

**Phase to address:**
Phase 2: Full transform pipeline completion

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hard-code target canvas 1000x562.5 | Simpler API, no configuration | Cannot handle different slide sizes | MVP only; never for a general-purpose library |
| 0.75 text baseline multiplier | Avoids font metric dependency | Wrong vertical alignment for many fonts | MVP only; must add font metric support before production |
| Matrix transform marked special, not applied | Avoids complex math | Silent failures on valid SVG | Never; must either implement or throw error |
| Path bounding box only from M/L/H/V commands | Simple parser | Complex paths (C, S, Q, T, A) report wrong bounds | MVP only; need full path data parser |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SVG with `xlink:href` on images | Only checking `href`, missing `xlink:href` | Check both: `attrs['xlink:href'] || attrs.href` |
| SVG with `viewBox` different from width/height | Treating width/height as source of truth | Always use viewBox for coordinate mapping; width/height only for intrinsic size |
| Nested groups with transforms | Applying child transforms without parent's accumulated transform | Walk hierarchy and accumulate transforms down the tree |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Recursive element walk without memoization | Deep SVG (>100 elements) causes stack overflow | Convert recursive walk to iterative with explicit stack | SVGs with >100 nested elements |
| Path bounding box recomputed on every reference | Same path used multiple times gets bbox recalculated | Cache path bounding box results by `d` string hash | SVGs with repeated identical paths |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unvalidated SVG input passed to XML parser | XXE injection if parser is not configured safely | Use `fast-xml-parser` with `isArray: true` and disable external entities |
| Base64 image data in `href` not sanitized | Malformed image data crashes downstream PowerPoint | Validate base64 image headers before passing through |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No warning when transform cannot be fully represented | User sees wrong output with no explanation | Log warnings for unsupported transforms (matrix, skew) |
| Silent failure for unrecognized elements | User draws complex SVG, output is missing shapes | At minimum log unrecognized element types at verbose level |

---

## "Looks Done But Isn't" Checklist

- [ ] **Transforms:** Code parses `rotate(deg, cx, cy)` correctly but never applies the rotation center -- verify with a rotated-rectangle test case
- [ ] **Text baseline:** Uses 0.75 multiplier but this is font-dependent -- verify with different font-size values and non-Latin text
- [ ] **Ellipse:** Scale is applied to radii but not center -- verify with a scaled ellipse
- [ ] **Matrix:** Detected and marked special but not applied -- verify matrix-transformed elements either error or warn
- [ ] **Image href:** Only one variant is tested -- verify both `href` and `xlink:href` work

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rotation center ignored | MEDIUM | Implement rotate-around-center math; add integration test with known rotated SVG |
| Text baseline wrong | LOW | Adjust multiplier; better: add font metric table or user-configurable offset |
| Ellipse scale bug | LOW | Fix 2 lines; add test case with scaled ellipse |
| Matrix not applied | MEDIUM | Implement 6-value matrix decomposition, or add clear error/warning |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rotation center ignored | Phase 1: Transform pipeline | Test SVG with `rotate(30, 100, 100)` renders around (100,100) not (0,0) |
| Text baseline approximation | Phase 1: Text element handling | Compare output y with expected top-edge for known baseline values |
| Ellipse transform bug | Phase 1: Canvas scaling verification | Test ellipse inside a scaled group |
| Matrix transform silent fail | Phase 2: Full transform support | Add test that passes matrix SVG and either succeeds or warns clearly |
| Path bbox incomplete | Phase 2: Path data handling | Test SVG with bezier curves (C, S, Q, T, A commands) |

---

## Sources

- SVG 1.1 Specification: Transform attribute https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
- SVG 1.1 Specification: Text element https://www.w3.org/TR/SVG11/text.html
- fast-xml-parser documentation for safe XML parsing
- Code analysis of `src/coordinate-mapper.ts` (lines 52-57 for rotation parse, lines 152-160 for ellipse bug)
- Code analysis of `src/transformer/transform-to-pptel.ts` (lines 496 for text baseline conversion)
- Reference implementation from user for `applyTransform(x, y, transform)` - handles translate-rotate-scale chain but not rotation center

---
*Pitfalls research for: svg-to-pptel coordinate transformation library*
*Researched: 2026-06-26*