# Stack Research

**Domain:** SVG to PPTElement JSON conversion (TypeScript library)
**Focus:** v1.2 PPTist schema alignment — rotate/flipH/flipV, text fill/outline/shadow/vAlign/fixedHeight/wordSpace, image outline/shadow/filters/clip, shape gradient/shadow/flipH/flipV, line stroke width
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

The v1.2 PPTist schema alignment requires **no new library dependencies**. All PPTElement types already exist in `slides.ts` with the required properties. The existing `fast-xml-parser` handles all SVG parsing including gradients, filters, and clipPaths.

The work is purely **TypeScript implementation** — adding missing SVG attribute parsing and mapping logic within the existing codebase.

## Core Technologies (No Changes)

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| TypeScript | ^5.5.0 | Language | Strict mode, compiles to CommonJS |
| fast-xml-parser | ^5.9.3 | SVG parsing | Already handles gradients, filters, clipPaths via first-pass collection |
| cac | ^6.7.14 | CLI framework | No CLI changes for v1.2 |
| uuid | ^14.0.1 | ID generation | No changes |
| picocolors | ^1.1.1 | CLI colors | No changes |

## What's Already Supported

Reviewing the existing codebase against v1.2 requirements:

### Transform Properties
| Property | Status | Location |
|----------|--------|----------|
| `rotate` | Supported | `PPTShapeElement`/`PPTImageElement` base type; `applyTransform()` handles it |
| `flipH` | Supported | `ImageOrShapeFlip` interface; `getFlipFromScale()` handles negative scale |
| `flipV` | Supported | Same as flipH |

### Text Properties
| Property | Status | Location |
|----------|--------|----------|
| `fill` | Supported | `colorToHex()` maps SVG fill |
| `outline` | Supported | Line 831 in transform-to-pptel.ts: `element.attrs.stroke` maps to outline |
| `shadow` | Partial | Parser sets `attrs.shadow`, but transformer ignores it for text (line 832: `shadow: undefined`) |
| `vAlign` | Partial | Hardcoded `'middle'` (line 833); could map from `dominant-baseline` |
| `fixedHeight` | Supported | Line 834: `fixedHeight` from SVG height attribute |
| `wordSpace` | Partial | Hardcoded `0` (line 835); SVG has `word-spacing` attribute not yet mapped |

### Image Properties
| Property | Status | Location |
|----------|--------|----------|
| `outline` | Supported | Line 865-873: stroke maps to outline |
| `shadow` | Supported | Line 876-878: `attrs.shadow` from filter def |
| `filters` | Missing | No parsing of CSS `filter="blur(5px)"` strings |
| `clip` | Missing | clipPath defs skipped (line 360); `clip-path` attr not resolved |

### Shape Properties
| Property | Status | Location |
|----------|--------|----------|
| `gradient` | Supported | `resolveFillReference()` in parser maps `fill="url(#id)"` to gradient |
| `shadow` | Supported | `resolveFilterReference()` in parser; line 420-422 in transformer |
| `flipH` | Supported | Via `getFlipFromScale()` |
| `flipV` | Supported | Via `getFlipFromScale()` |

### Line Properties
| Property | Status | Location |
|----------|--------|----------|
| `width` | Supported | Line 750-751: `stroke-width` maps to `result.width` |

## Implementation Work (No New Dependencies)

### 1. Image CSS Filter Parsing (Missing)

SVG elements can have `filter="blur(5px)"` as a direct CSS filter string, not just `filter="url(#id)"`.

**What to add:** `parseCssFilter()` function to parse CSS filter function syntax.

```typescript
// slides.ts already defines ImageElementFilters:
export interface ImageElementFilters {
  'blur'?: string; 'brightness'?: string; 'contrast'?: string;
  'grayscale'?: string; 'saturate'?: string; 'hue-rotate'?: string;
  'sepia'?: string; 'invert'?: string; 'opacity'?: string;
}
```

**Implementation:** Add `parseCssFilter()` in `coordinate-mapper.ts`. One regex-based function, no library.

### 2. Image ClipPath Resolution (Missing)

`clipPath` elements are currently skipped (line 360 in `transformElement`).

**What to add:** `collectClipPathDefs()` in `svg-parser.ts` (parallel to `collectFilterDefs`). Resolve `clip-path="url(#id)"` on images.

```typescript
// slides.ts already defines ImageElementClip:
export interface ImageElementClip {
  range: ImageClipDataRange;  // [[x1%, y1%], [x2%, y2%]]
  shape: string;
}
```

### 3. Text Shadow Wiring (Partial)

Parser's `resolveFilterReference()` sets `attrs.shadow` but `transformElement` text case has `shadow: undefined` hardcoded (line 832).

**Fix:** Check `element.attrs.shadow` for text elements.

### 4. Text wordSpace from SVG

SVG `word-spacing` attribute not yet mapped. Need:
- Add `'word-spacing'?: string` to `SvgAttrs` in `ast.ts`
- Map to `PPTTextElement.wordSpace` in `transformElement`

### 5. Text vAlign Refinement (Optional)

Currently hardcoded `'middle'`. SVG `dominant-baseline` attribute could map:
- `auto` → `'top'`
- `middle` → `'middle'`
- `hanging` → `'bottom'`

## No New Dependencies Required

All v1.2 features are achievable with:

| Feature | Approach | No Library Needed Because |
|---------|----------|--------------------------|
| CSS filter parsing | Native `parseFloat`, regex | Only need `filter="blur(5px)"` pattern |
| clipPath resolution | Existing first-pass collection pattern | Same as gradient/filter defs |
| Text shadow | Wire existing `attrs.shadow` | Parser already sets it |
| Text wordSpace | Map SVG `word-spacing` attr | Direct 1:1 mapping |
| Text vAlign | Map SVG `dominant-baseline` | Direct mapping possible |

## Alternatives Considered

| Library | Considered For | Why Not |
|---------|---------------|---------|
| `cssstyle`, `parse-css` | CSS filter parsing | Overkill — 1 regex suffices |
| `svg-parser`, `svg-path-parser` | SVG manipulation | fast-xml-parser handles everything |
| `color`, `tinycolor2` | Color manipulation | `colorToHex`/`colorToRgba` already inline |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `sharp` or `jimp` | Image processing | This is JSON converter; images as `src` URL |
| `svg-path-parser` | Path manipulation | Keep path `d` strings unchanged |
| `xml2js` | XML parsing | Less featureful than fast-xml-parser |

## Integration Points

### `src/parser/svg-parser.ts`
- Add `collectClipPathDefs()` (parallel to `collectFilterDefs`)

### `src/types/ast.ts`
- Add `'word-spacing'?: string` to `SvgAttrs`
- Add clipPath registry handling in `convertToSvgElement()`

### `src/transformer/transform-to-pptel.ts`
- Add `parseCssFilter()` for CSS filter strings
- Wire `element.attrs.shadow` for text (line 832)
- Add `wordSpace` mapping
- Add `clip` resolution for images
- Add `filters` resolution for images

### `src/mapper/coordinate-mapper.ts`
- Add `parseCssFilter()` export

## Phase-Specific Notes

| Phase | Features | Dependencies |
|-------|----------|--------------|
| 1 | Transform rotate/flip | Already implemented |
| 2 | Text fill/outline/shadow/vAlign/fixedHeight/wordSpace | Wire existing attrs.shadow, add wordSpacing map |
| 3 | Image outline/shadow/filters/clip | Add CSS filter parsing, clipPath resolution |
| 4 | Shape gradient/shadow/flipH/flipV, Line width | Already implemented |

## Version Compatibility

No new dependencies. All existing packages remain compatible.

| Package | Compatible | Notes |
|---------|------------|-------|
| fast-xml-parser@5.9.3 | YES | Handles gradients/filters/clipPaths |
| typescript@5.5.0 | YES | No change needed |
| vitest@2.0.0 | YES | Add tests for new features |

## Sources

- `src/slides.ts` — PPTElement types already define all required properties
- `src/types/ast.ts` — SVG AST types; gradient/filter already collected
- `src/parser/svg-parser.ts` — First-pass collection pattern (gradients/filters)
- `src/transformer/transform-to-pptel.ts` — Transformer implementation
- `src/mapper/coordinate-mapper.ts` — Transform parsing

---
*Stack research for: svg-to-pptel v1.2 PPTist schema alignment*
*Researched: 2026-06-30*
