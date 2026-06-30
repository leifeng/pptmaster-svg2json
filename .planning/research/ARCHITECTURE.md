# Architecture Research: PPTist Schema Alignment (v1.2)

**Project:** svg-to-pptel v1.2 PPTist格式对齐
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone aligns svg-to-pptel output with the complete PPTist PPTElement schema. Analysis of the existing codebase shows most extensions are already implemented: `rotate`/`flipH`/`flipV` flow through `applyTransform()`, text/image/shape/line element types already output their respective extension properties, and `stroke-width` already maps to line `width`.

Gaps identified for v1.2 completion:
1. **Image `filters`** — CSS filter strings (`blur`, `brightness`, etc.) from SVG `filter` element not converted to PPTist `ImageElementFilters` format
2. **Image `clip`** — SVG `clipPath` not converted to PPTist `ImageElementClip` format
3. **Shape `pattern`** — SVG `pattern` fill not supported (only `linearGradient`/`radialGradient` currently work)
4. **Shape-internal `text`** — `<text>` inside `<shape>` not propagated to `PPTShapeElement.text`

The existing pipeline is well-structured for adding these: the `attrs.gradient` and `attrs.shadow` resolution pattern (D-15, D-22) provides a precedent for resolving `filter="url(#id)"` to structured objects at parse time.

## Current Pipeline (v1.1 State)

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree
    ├── gradient resolved: attrs.gradient = Gradient object (D-15)
    └── shadow resolved: attrs.shadow = PPTElementShadow object (D-22)
    ↓
[coordinate-mapper.ts]
    ├── parseTransform() → TransformResult { translateX/Y, scaleX/Y, rotateDeg, rotateCX/CY }
    └── mapCoordinates() → CoordinateMapping { left, top, width, height }
    ↓
[transform-to-pptel.ts]
    └── transformElement() → PPTElement (rotate/flipH/flipV from applyTransform())
        ├── rect/circle/ellipse/path/polline/polyline → PPTShapeElement
        ├── text → PPTTextElement
        ├── image → PPTImageElement
        └── line → PPTLineElement
    ↓
JSON Output (PPTElement[])
```

## Integration Analysis by Extension Category

### Category 1: Transform Extensions — `rotate`/`flipH`/`flipV`

**Status:** ALREADY IMPLEMENTED

**Integration point:** `src/transformer/apply-transform.ts` + each shape/image case in `transform-to-pptel.ts`

**How it works:**
- `applyTransform(left, top, width, height, transform)` returns `{ left, top, width, height, rotate, flipH?, flipV? }`
- `getFlipFromScale()` derives flip from negative scale values (D-03/D-04)
- `getRotateDeg()` extracts raw rotation degrees (D-02)
- When `rotateCX/CY` is defined, rotation is baked into coordinates and `rotate` returns 0 (D-01)

**What each element case does:**
```typescript
// Every shape case (rect, circle, ellipse, path, polygon, polyline):
const transformed = applyTransform(left, top, width, height, transform)
const { rotate, flipH, flipV } = transformed
// ... build PPTShapeElement with rotate, flipH, flipV ...

// Image case:
const transformed = applyTransform(left, top, width, height, transform)
const { rotate, flipH, flipV } = transformed
// ... build PPTImageElement with rotate, flipH, flipV ...
if (flipH) result.flipH = true
if (flipV) result.flipV = true
```

**v1.2 action:** No changes needed — this is already complete.

---

### Category 2: Text Extensions — `fill`/`outline`/`shadow`/`vAlign`/`fixedHeight`/`wordSpace`

**Status:** MOSTLY IMPLEMENTED

**Current implementation in `transform-to-pptel.ts` text case (lines 759-843):**

| Property | Implementation | Status |
|----------|---------------|--------|
| `fill` | `result.fill = colorToHex(fillColor)` | ✓ Implemented |
| `outline` | `result.outline = { color, width: 1 }` when `attrs.stroke` present | ✓ Implemented |
| `shadow` | `result.shadow = attrs.shadow` (from filter resolution) | ✓ Implemented |
| `vAlign` | `result.vAlign = 'middle'` hardcoded | ⚠️ Should be configurable or detected |
| `fixedHeight` | `result.fixedHeight = !!element.attrs.height` | ✓ Implemented |
| `wordSpace` | `result.wordSpace = 0` hardcoded | ⚠️ Should map from `letter-spacing` |
| `lineHeight` | `result.lineHeight = 1.5` hardcoded | ⚠️ Should be configurable |
| `paragraphSpace` | `result.paragraphSpace = 5` hardcoded | ⚠️ Should be configurable |
| `vertical` | `result.vertical = writingMode === 'vertical-rl'\|\|'vertical-lr'` | ✓ Implemented |
| `defaultFontSize` | `result.defaultFontSize = scaledFontSize` | ✓ Implemented |

**Gaps in text extensions:**
1. **`wordSpace`:** Should map from SVG `letter-spacing` attribute instead of hardcoded 0
2. **`outline.width`:** Currently hardcoded to 1, should use `stroke-width`
3. **`fill` with gradient:** Text does not support gradient fill per PPTist schema (only solid color)

**v1.2 action:**
```typescript
// wordSpace: letter-spacing already parsed, use it
const letterSpacing = parseFloat(String(element.attrs['letter-spacing'] || '0'))
// wordSpace is in px, letter-spacing in em typically — may need conversion

// outline.width: use stroke-width instead of hardcoded 1
...(element.attrs.stroke && { outline: { color: colorToHex(element.attrs.stroke) || '#000000', width: parseFloat(element.attrs['stroke-width'] || '1') } }),
```

---

### Category 3: Image Extensions — `outline`/`shadow`/`filters`/`clip`/`flipH`/`flipV`/`radius`/`colorMask`

**Status:** PARTIALLY IMPLEMENTED

**Current implementation in `transform-to-pptel.ts` image case (lines 846-884):**

| Property | Implementation | Status |
|----------|---------------|--------|
| `outline` | `result.outline = { width, color }` when `attrs.stroke` present | ✓ Implemented |
| `shadow` | `result.shadow = attrs.shadow` (from filter resolution) | ✓ Implemented |
| `flipH`/`flipV` | From `applyTransform()` | ✓ Implemented |
| `filters` | NOT IMPLEMENTED | ✗ Gap |
| `clip` | NOT IMPLEMENTED | ✗ Gap |
| `radius` | NOT IMPLEMENTED | ✗ Gap (SVG doesn't have native radius on image) |
| `colorMask` | NOT IMPLEMENTED | ✗ Gap |

**Gap: Image `filters`**

SVG `filter` element with `feColorMatrix`, `feGaussianBlur`, etc. should map to CSS filter strings. The existing `attrs.shadow` resolution (D-22) shows the pattern:

```typescript
// D-22: SVG filter="url(#shadowId)" → shadow (resolved at parse time)
if (element.attrs.shadow) {
  result.shadow = element.attrs.shadow
}
```

For image filters, we need to similarly resolve `filter="url(#filterId)"` to an `ImageElementFilters` object. The challenge is that SVG filters are complex (many filter primitives) while PPTist `ImageElementFilters` is a simple CSS-like object with keys like `blur`, `brightness`, `contrast`, etc.

**Architecture decision needed:** Either:
- **A)** Parse SVG filter primitives and emit simplified CSS filters (complex, may lose fidelity)
- **B)** Skip filter conversion (document as out-of-scope)
- **C)** Use a simplified mapping for common cases like `feGaussianBlur` → `filters.blur`

**Gap: Image `clip`**

SVG `clipPath` elements define clipping regions. The PPTist `ImageElementClip` has `range: [[x1,y1], [x2,y2]]` (percentages) and `shape: string` (clipping shape name).

This requires:
1. Detecting `clip-path="url(#id)"` on image elements
2. Resolving the clipPath element's geometry
3. Converting to PPTist clip format

Complex; recommend deferring to v1.3+ unless specifically needed.

---

### Category 4: Shape Extensions — `gradient`/`shadow`/`flipH`/`flipV`/`outline`/`pattern`

**Status:** MOSTLY IMPLEMENTED

**Current implementation:** Gradient and shadow already resolved at parse time (D-15, D-22). Each shape case in `transform-to-pptel.ts` outputs these properties.

| Property | Implementation | Status |
|----------|---------------|--------|
| `gradient` | `result.gradient = attrs.gradient` when present | ✓ Implemented |
| `shadow` | `result.shadow = attrs.shadow` | ✓ Implemented |
| `flipH`/`flipV` | From `applyTransform()` | ✓ Implemented |
| `outline` | `result.outline = { style, width, color, opacity? }` | ✓ Implemented |
| `pattern` | NOT IMPLEMENTED | ✗ Gap |
| `special` | Set for paths with non-M/L/H/V commands | ✓ Implemented |
| `text` | NOT IMPLEMENTED | ✗ Gap |
| `pathFormula` | NOT IMPLEMENTED | ✗ Gap |
| `keypoints` | NOT IMPLEMENTED | ✗ Gap |

**Gap: Shape `pattern`**

SVG `<pattern>` elements define repeating tile fills. Supporting this requires:
1. Detecting `fill="url(#patternId)"` on shape elements
2. Parsing the pattern's `width`, `height`, `viewBox`, and content
3. Converting to PPTist `pattern` string format (unknown format — needs research)

**Gap: Shape-internal `text`**

When `<text>` is a child of a `<shape>` in the SVG tree, it should be propagated to `PPTShapeElement.text` property. Currently, text elements are processed independently and not attached to their parent shape.

**Architecture for text-as-child-of-shape:**
```typescript
// In transformElement() for shape cases:
// Check if shape has text children
const textChild = element.children.find(child => child.type.toLowerCase() === 'text')
if (textChild) {
  result.text = {
    content: extractTextContentFromElement(textChild),
    defaultFontName: 'Microsoft YaHei',
    defaultColor: colorToHex(textChild.attrs.fill) || '#000000',
    align: 'middle', // or detect from writing-mode
  }
}
```

---

### Category 5: Line Extensions — `width`

**Status:** ALREADY IMPLEMENTED

**Current implementation (line case, lines 732-757):**
```typescript
const strokeWidth = parseFloat(String(element.attrs['stroke-width'] || '0'))
result.width = strokeWidth || 1
```

`stroke-width` correctly maps to `PPTLineElement.width` with fallback to 1.

---

## Component Modifications Summary

| Component | Changes Needed | Complexity |
|-----------|---------------|------------|
| `src/transformer/transform-to-pptel.ts` | Text: wordSpace from letterSpacing, outline.width from stroke-width; Image: filters/clip/resolution | Medium |
| `src/parser/svg-parser.ts` | Resolve `clipPath` references and `pattern` references at parse time (like gradient/shadow) | Medium-High |
| `src/types/ast.ts` | May need new types for clip/pattern resolution | Low |
| `src/slides.ts` | No changes needed — schema types already define all properties | None |

**No changes needed to:**
- `src/mapper/coordinate-mapper.ts` — coordinate mapping already correct
- `src/transformer/apply-transform.ts` — transform application already complete
- `src/shapes/shape-to-path.ts` — path generation already correct

---

## Data Flow After v1.2 Additions

```
SVG String
    ↓
[svg-parser.ts] → SvgElement tree
    ├── gradient resolved: attrs.gradient = Gradient (D-15)
    ├── shadow resolved: attrs.shadow = PPTElementShadow (D-22)
    ├── clip resolved: attrs.clip = ImageElementClip (NEW — D-30)
    └── pattern resolved: attrs.pattern = string (NEW — D-31)
    ↓
[coordinate-mapper.ts] → CoordinateMapping (unchanged)
    ↓
[transform-to-pptel.ts]
    ├── Text case: wordSpace←letterSpacing, outline.width←stroke-width (D-32)
    ├── Image case: filters←filter resolution, clip←clip resolution (NEW)
    ├── Shape case: text←child text element (NEW), pattern←pattern resolution (NEW)
    └── Line case: width already correct (D-24)
    ↓
JSON Output (PPTElement[])
```

---

## Build Order Recommendation

**Phase 1: Quick Wins (Low Risk)**
1. Fix text `wordSpace` to use `letter-spacing` attribute
2. Fix text `outline.width` to use `stroke-width`
3. Verify all other text/image/shape/line extensions are working

**Phase 2: Image Extensions (Medium Risk)**
1. Research PPTist `ImageElementFilters` format and CSS filter string mapping
2. Implement SVG filter-to-filters conversion (at least `feGaussianBlur` → `blur`)
3. Defer `clip` to v1.3 (complexity high, low urgency)

**Phase 3: Shape Extensions (Medium Risk)**
1. Implement text-as-child-of-shape propagation
2. Research PPTist `pattern` string format
3. Defer `pathFormula` and `keypoints` (editor-specific features)

---

## Anti-Patterns to Avoid

1. **Do NOT add filter/clip/pattern resolution to `transformElement()`** — These should be resolved at parse time like `gradient` and `shadow` (D-15, D-22 pattern). Adding resolution logic to the transformer creates mixed responsibilities.

2. **Do NOT implement full SVG filter primitive parsing** — SVG filters are extremely complex. Only map the simplest cases (`feGaussianBlur` → `blur`) and skip the rest.

3. **Do NOT change the coordinate pipeline** — `mapCoordinates()` and `applyTransform()` are working correctly. Extensions do not need coordinate changes.

4. **Do NOT add new element types** — The v1.2 scope is extending existing element types, not adding new SVG element support.

---

## Sources

- Code analysis: `src/transformer/transform-to-pptel.ts` — all element case implementations
- Code analysis: `src/transformer/apply-transform.ts` — transform extension handling
- Code analysis: `src/slides.ts` — PPTElement type definitions
- Code analysis: `src/parser/svg-parser.ts` — gradient/shadow resolution pattern (D-15, D-22)
- D-15, D-22, D-24, D-25, D-26, D-27, D-28 — existing implementation decisions from v1.1

---

*Architecture research for: svg-to-pptel v1.2 PPTist格式对齐*
*Researched: 2026-06-30*
