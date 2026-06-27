# Pitfalls Research

**Domain:** SVG-to-PowerPoint JSON conversion library (coordinate transformation focus)
**Researched:** 2026-06-27
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Rotation Center Ignored

**What goes wrong:**
Elements with `rotate(deg, cx, cy)` transform render at wrong positions. The rotation center point (cx, cy) is silently dropped. An element at (100, 100) with `rotate(45, 150, 150)` rotates around (150, 150) but the code behaves as if it rotates around (0, 0).

**Why it happens:**
`parseTransform()` in `coordinate-mapper.ts` correctly extracts `rotateCX` and `rotateCY` from the SVG transform attribute (lines 51-57), but `mapCoordinates()` never uses them. The transform pipeline applies `translateX/Y` and `scaleX/Y` but completely ignores `rotateCX/rotateCY`. The math for rotating around an arbitrary center requires: (1) translate point so center becomes origin, (2) rotate, (3) translate back. Current code has no rotation math at all.

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

## v1.1 Transform-Fixes Milestone: Specific Pitfalls When Fixing

This section documents the specific mistakes to avoid when implementing the rotate transform center and text baseline corrections.

---

### Fix Pitfall R1: Wrong Transform Order When Adding Rotation Center

**What goes wrong:**
When adding rotation center support, developer applies the center offset incorrectly relative to translation and scale.

**The mistake:**
```typescript
// WRONG: Applying translate then rotate around origin
const x2 = (x * sx + tx) * cos - (y * sy + ty) * sin
const y2 = (x * sx + tx) * sin + (y * sy + ty) * cos
```
This rotates around (0,0) after translation, not around the specified center.

**The correct approach:**
```typescript
// RIGHT: Translate to center, rotate, translate back, THEN apply scale
const theta = rotateDeg * Math.PI / 180
const cos = Math.cos(theta)
const sin = Math.sin(theta)

// Step 1: Translate point so center becomes origin
const dx = x - rotateCX
const dy = y - rotateCY

// Step 2: Rotate around origin
const rx = dx * cos - dy * sin
const ry = dx * sin + dy * cos

// Step 3: Translate back
const rx2 = rx + rotateCX
const ry2 = ry + rotateCY

// Step 4: Apply scale and translation
const finalX = rx2 * sx + tx
const finalY = ry2 * sy + ty
```

**Why this is subtle:**
SVG transform order is `translate -> rotate -> scale` conceptually, but the center for rotate is part of the rotate operation itself. If you mix up the order, you get different results.

**Verification:**
Use a known test case: `<rect x="100" y="100" width="50" height="50" transform="rotate(90, 125, 125)"/>`
- The rectangle's center is at (125, 125)
- After 90-degree rotation around (125, 125), the top-left corner (100, 100) should move to (125, 100)
- Test fails if you cannot predict where the element goes

---

### Fix Pitfall R2: Confusing SVG rotate Syntax with CSS rotate

**What goes wrong:**
Developer implements `rotate(deg)` as CSS `rotate(deg)` without realizing SVG allows a 3-argument form.

**SVG rotate syntax:**
- `rotate(45)` - rotate 45 degrees around origin (0,0)
- `rotate(45, 100, 100)` - rotate 45 degrees around point (100, 100)

**CSS rotate syntax:**
- `rotate(45deg)` - always around element center (or transform-origin)
- No 3-argument form exists in CSS

**The mistake:**
```typescript
// WRONG: Treating SVG rotate like CSS rotate
element.style.transform = `rotate(${rotateDeg}deg)`
```
This ignores the center point entirely.

**The correct approach:**
The SVG `rotate(deg, cx, cy)` must be decomposed into:
1. A translation that moves (cx, cy) to origin
2. A rotation around origin
3. A translation that moves (cx, cy) back

**Also watch for:**
- Negative angles: SVG allows `rotate(-45, 100, 100)` - the math must handle this correctly
- The regex in `parseTransform` at line 52 already handles 3 arguments correctly - ensure the implementation uses all 3

---

### Fix Pitfall R3: Not Handling the No-Center Case

**What goes wrong:**
Developer adds center support but breaks the case where no center is specified.

**The mistake:**
```typescript
// WRONG: Assuming center always exists
const x2 = (x - rotateCX) * cos - (y - rotateCY) * sin + rotateCX
```
When `rotateCX` is undefined (from `rotate(45)` without center), this produces `NaN`.

**The correct approach:**
```typescript
// RIGHT: Default to origin when no center specified
const cx = rotateCX ?? 0
const cy = rotateCY ?? 0
// Then proceed with rotation around (cx, cy)
```

---

### Fix Pitfall T1: Confusing Baseline with Bottom or Top

**What goes wrong:**
Developer thinks "baseline" means "bottom of the text" and converts incorrectly.

**The actual SVG text coordinate system:**
- `y` attribute specifies the **baseline** position
- The baseline is the line the letters "sit on" - not the top edge, not the bottom edge
- Ascenders (like 'h', 'b', 'k') extend above the baseline
- Descenders (like 'g', 'p', 'y') extend below the baseline

```
     top
      |
   ascent |  <- typically ~0.75em above baseline for Latin fonts
      |    |
 baseline --|--> y attribute points here
      |    |
   descent | <- typically ~0.25em below baseline for Latin fonts
      |
    bottom
```

**The mistake:**
```typescript
// WRONG: baseline IS NOT bottom
const textTop = svgY  // treating y as top - WRONG
const textTop = svgY - fontSize  // treating y as bottom - WRONG
```

**The correct approach:**
```typescript
// RIGHT: Baseline to top means moving DOWN by the ascent
// For Latin fonts, ascent is roughly 0.75-0.85 of font size
const textTop = svgY - (fontSize * 0.75)
```

**Verification:**
For `<text y="100" font-size="16">Hello</text>`:
- Baseline is at y=100
- With 0.75 multiplier, top edge = 100 - (16 * 0.75) = 88
- This means the text box top is 12 pixels ABOVE the baseline

---

### Fix Pitfall T2: Wrong Font Metric Approximation

**What goes wrong:**
Developer hardcodes a single multiplier without understanding when it fails.

**The mistake:**
```typescript
// WRONG: Assuming 0.75 works for all fonts
const offset = fontSize * 0.75

// Also wrong: Assuming it's fontSize * 1.0 (baseline to bottom)
const offset = fontSize
```

**Why 0.75 is approximate:**
Different font metrics have different baseline-to-top ratios:
- Arial/Helvetica: ~0.75-0.80
- Times New Roman: ~0.72-0.78
- CJK (Chinese/Japanese/Korean): ~0.85-0.95 (different baseline model)
- Script fonts: varies widely
- Bold/Italic variants: same ratio as parent (metrics defined by font, not style)

**The correct approach:**
```typescript
// BETTER: Accept approximation but log a warning for unusual cases
const baselineRatio = getBaselineRatio(fontFamily) // from a metric table

// Or at minimum, acknowledge the approximation:
const BASELINE_RATIO = 0.75 // Approximation for Latin fonts; wrong for CJK
const textTop = svgY - (fontSize * BASELINE_RATIO)
```

**When the 0.75 fails most:**
1. CJK text - baseline model is different
2. Very small font sizes (8px or less) - rounding errors amplify
3. Very large font sizes (72px+) - metric differences become visible
4. Mixed script text (Latin + CJK in same line) - cannot use single ratio

---

### Fix Pitfall T3: Not Accounting for Scale When Converting Baseline

**What goes wrong:**
Developer converts baseline to top but forgets that the result still needs to be scaled.

**The mistake:**
```typescript
// WRONG: Conversion not followed by scaling
const textTop = svgY - (fontSize * 0.75)
// Uses textTop directly without scale factor
```

**The correct approach (as in current code at line 496):**
```typescript
// RIGHT: Convert baseline to top, THEN scale
// coords.top is baseline, fontSize is untransformed
const textTop = (coords.top + fontSize * 0.75) * scaleY
```

**Why this matters:**
If SVG viewBox is 800x600 and target canvas is 1000x562.5:
- scaleY = 562.5/600 = 0.9375
- Without scaling, text appears in wrong position relative to other elements

---

## Sources

- SVG 1.1 Specification: Transform attribute https://www.w3.org/TR/SVG11/coords.html#TransformAttribute
- SVG 1.1 Specification: Text element https://www.w3.org/TR/SVG11/text.html
- Code analysis of `src/coordinate-mapper.ts` (lines 51-57 for rotation parse, lines 189-196 for text handling)
- Code analysis of `src/transformer/transform-to-pptel.ts` (lines 493-496 for text baseline conversion)

---

*Pitfalls research for: svg-to-pptel coordinate transformation library*
*Researched: 2026-06-27*