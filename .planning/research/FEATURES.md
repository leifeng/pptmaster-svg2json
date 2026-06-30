# Feature Research

**Domain:** SVG to PPTElement JSON conversion library (svg-to-pptel)
**Current Milestone:** v1.2 PPTist schema alignment
**Researched:** 2026-06-30
**Confidence:** HIGH (source: PPTist TypeScript schema + existing implementation)

## Feature Landscape

This research maps PPTist schema properties to SVG equivalents, identifying what's already implemented, what's partially supported, and what's missing for the v1.2 PPTist schema alignment milestone.

---

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or produces incorrect output.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `rotate` on shapes/text/image | SVG `transform="rotate(deg cx cy)"` must render with correct rotation | MEDIUM | Already implemented via `applyTransform` with center support (D-01). rotateDeg stored on PPTElement, not baked into coordinates. |
| `flipH` / `flipV` on shapes/image | SVG `scale(-1, 1)` or `scale(1, -1)` must produce mirror effect | LOW | Already implemented via `getFlipFromScale` — negative scaleX → flipH, negative scaleY → flipV (D-03/D-04). |
| `fill` on text | SVG `fill` attribute or `<tspan fill="...">` must map to text color | LOW | Already implemented: `defaultColor` on PPTTextElement, per-span `color` style in HTML content (D-12). |
| `outline` on text | SVG `stroke` on text element must render as text border | LOW | Implemented for stroke color via `outline: { color, width }` (D-09, line 831). stroke-dasharray not applicable to text. |
| `outline` on shape | SVG `stroke` + `stroke-width` must render as shape border | LOW | Already implemented: `PPTElementOutline` with style/width/color (D-05, D-19). |
| `shadow` on shape/image | SVG `filter="url(#shadowId)"` must produce drop shadow | MEDIUM | Partially implemented — `element.attrs.shadow` resolved at parse time, but text shadow is hardcoded `undefined` (line 832). Shape/image shadow works. |
| `gradient` on shape | SVG `<linearGradient>` must render as gradient fill | MEDIUM | Already implemented: `attrs.gradient` resolved at parse time, output as `PPTShapeElement.gradient` (D-15). |
| `width` on line | SVG `stroke-width` must control line thickness | LOW | Already implemented: `stroke-width` → `PPTLineElement.width`, defaults to 1 (D-24, line 750-751). |
| `fixedHeight` on text | SVG `height` attribute presence controls text box auto-height behavior | LOW | Implemented: `!!element.attrs.height` (D-09, line 815). Maps to `PPTTextElement.fixedHeight`. |
| `vAlign` on text | Text vertical alignment inside text box | LOW | Schema supports `'top' \| 'middle' \| 'bottom'` but code hardcodes `'middle'` (line 833). Needs SVG mapping. |
| `wordSpace` on text | SVG `letter-spacing` must control character spacing | LOW | Schema supports `number` but code hardcodes `0` (line 835). SVG `letter-spacing` is already parsed but not propagated. |

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `filters` on image | SVG `<filter>` effects (blur, brightness, grayscale, etc.) on images | HIGH | Missing. Schema supports `ImageElementFilters`: blur, brightness, contrast, grayscale, saturate, hue-rotate, sepia, invert, opacity. Requires parsing SVG filter elements and mapping to CSS filter strings. |
| `clip` on image | SVG `<clipPath>` must crop images to defined shape | HIGH | Missing. Schema supports `ImageElementClip` with `range: [[x1,y1],[x2,y2]]` (percentages) and `shape: string`. Complex — requires clip-path parsing and range calculation. |
| `shadow` on text | SVG `filter="url(#shadowId)"` on text elements | MEDIUM | Currently `shadow: undefined` is hardcoded (line 832). SVG text shadow would require same filter resolution as shape/image. |
| `outline` on image | SVG `stroke` on image element produces image border | LOW | Implemented (D-25). `stroke` + `stroke-width` → `PPTImageElement.outline`. |
| `colorMask` on image | SVG color overlay on images | MEDIUM | Missing. PPTist schema supports `colorMask?: string` — color tint/mask on image. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| SVG `<filter>` blur on shapes | "Make shape edges soft" | Filter effects are raster operations; SVG filter resolution is complex and not well-supported in PPT | Recommend using gradient fills to simulate soft edges |
| SVG `<mask>` on shapes | "Cut out part of a shape" | Masks require canvas compositing that PPTist may not support | Use clipPath if available, or advise users to expand masks |
| `stroke-dasharray` text outline | "Dashed border on text" | Stroke dasharray on text is not a standard PPT concept and renders poorly | Skip or implement as separate dashed underline, not full outline |
| `writing-mode: vertical-*` full vertical text | "Support vertical CJK text" | While `vertical: boolean` is in schema, vertical text layout is complex (line breaks, punctuation handling) | Partial support: flag is set but content rendering may be inconsistent |

---

## Feature Dependencies

```
[rotate with center] ──requires──> [applyTransform D-01]
                              └──requires──> [applyRotateWithCenter]

[flipH/flipV] ──requires──> [getFlipFromScale D-03/D-04]
                       └──requires──> [parseTransform coordinate-mapper]

[gradient] ──requires──> [SVG linearGradient/radialGradient parsing]
                   └──requires──> [attrs.gradient resolution at parse time]

[shadow] ──requires──> [SVG filter="url(#id)" resolution at parse time]
             └──requires──> [shadow parser in svg-parser]

[filters on image] ──requires──> [SVG <filter> element parsing]
                   └──requires──> [CSS filter string generation]
                   └──requires──> [ImageElementFilters schema mapping]

[clip on image] ──requires──> [SVG <clipPath> element parsing]
              └──requires──> [range calculation (percentages)]
              └──requires──> [CLIPPATHS shape lookup]

[text shadow] ──requires──> [shadow parser (same as shape shadow)]
             └──requires──> [remove hardcoded undefined]

[text vAlign] ──requires──> [SVG baseline-shift or dominant-baseline mapping]
             └──requires──> [remove hardcoded 'middle']

[text wordSpace] ──requires──> [propagate letter-spacing from SVG]
                 └──requires──> [remove hardcoded 0]
```

---

## MVP Definition

### Launch With (v1.2)

Minimum viable set for PPTist schema alignment.

- [x] `rotate` — Already implemented (D-01)
- [x] `flipH` / `flipV` — Already implemented (D-03/D-04)
- [x] `fill` on text — Already implemented
- [x] `outline` on shape/text/image — Already implemented
- [x] `gradient` on shape — Already implemented (D-15)
- [x] `width` on line — Already implemented (D-24)
- [x] `fixedHeight` on text — Already implemented (D-09)
- [ ] `shadow` on text — Remove hardcoded `undefined`, propagate from SVG filter
- [ ] `vAlign` on text — Remove hardcoded `'middle'`, derive from SVG `dominant-baseline` or `baseline-shift`
- [ ] `wordSpace` on text — Remove hardcoded `0`, propagate from SVG `letter-spacing`

### Add After Validation (v1.x)

- [ ] `filters` on image — SVG filter effects on images
- [ ] `clip` on image — SVG clipPath support

### Future Consideration (v2+)

- [ ] `colorMask` on image — Color overlay/tint on images
- [ ] Full vertical text layout engine — CJK vertical writing mode

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| `shadow` on text | MEDIUM | LOW | P1 — remove hardcoded undefined, wire up existing shadow parser |
| `vAlign` on text | MEDIUM | LOW | P1 — derive from SVG attributes instead of hardcoding 'middle' |
| `wordSpace` on text | MEDIUM | LOW | P1 — propagate letter-spacing instead of hardcoding 0 |
| `filters` on image | HIGH | HIGH | P2 — requires SVG filter element parsing + CSS filter string generation |
| `clip` on image | HIGH | HIGH | P2 — requires clipPath parsing + range calculation + shape lookup |
| `colorMask` on image | MEDIUM | MEDIUM | P3 — future consideration |

**Priority key:**
- P1: Must have for v1.2 launch (schema alignment completeness)
- P2: Should have, add when possible (feature parity)
- P3: Nice to have, future consideration

---

## PPTist Schema Reference

### Transform Properties (on all elements via PPTBaseElement)

| Property | Type | SVG Source | Current Status |
|----------|------|------------|----------------|
| `rotate` | `number` | `transform="rotate(deg)"` or `rotate(deg,cx,cy)` | IMPLEMENTED — D-01 handles center rotation |
| `flipH` | `boolean` | `transform="scale(-1, 1)"` | IMPLEMENTED — D-03 via negative scaleX |
| `flipV` | `boolean` | `transform="scale(1, -1)"` | IMPLEMENTED — D-04 via negative scaleY |

### Text Element (PPTTextElement)

| Property | Type | SVG Source | Current Status |
|----------|------|------------|----------------|
| `fill` | `string` | `fill` attribute, `<tspan fill="...">` | IMPLEMENTED — `defaultColor` + per-span color style |
| `outline` | `PPTElementOutline` | `stroke` on text element | IMPLEMENTED — outline with color/width (D-09) |
| `shadow` | `PPTElementShadow` | `filter="url(#shadowId)"` | PARTIAL — hardcoded `undefined`, needs wiring |
| `vAlign` | `'top' \| 'middle' \| 'bottom'` | `dominant-baseline` or `baseline-shift` | PARTIAL — hardcoded `'middle'` |
| `fixedHeight` | `boolean` | SVG `height` attribute presence | IMPLEMENTED — `!!element.attrs.height` (D-09) |
| `wordSpace` | `number` | `letter-spacing` attribute | PARTIAL — hardcoded `0`, SVG value not propagated |
| `lineHeight` | `number` | Default 1.5 | IMPLEMENTED — hardcoded 1.5 |
| `opacity` | `number` | `opacity` attribute | IMPLEMENTED — propagated from SVG |
| `vertical` | `boolean` | `writing-mode: vertical-rl/vertical-lr` | IMPLEMENTED — derived from writing-mode (D-07) |
| `paragraphSpace` | `number` | Default 5 | IMPLEMENTED — hardcoded 5 |

### Image Element (PPTImageElement)

| Property | Type | SVG Source | Current Status |
|----------|------|------------|----------------|
| `outline` | `PPTElementOutline` | `stroke` + `stroke-width` | IMPLEMENTED — D-25 |
| `shadow` | `PPTElementShadow` | `filter="url(#shadowId)"` | IMPLEMENTED — via attrs.shadow (D-22) |
| `filters` | `ImageElementFilters` | `<filter>` element with blur/brightness/etc. | MISSING |
| `clip` | `ImageElementClip` | `<clipPath>` element | MISSING |
| `flipH` | `boolean` | `scale(-1, 1)` | IMPLEMENTED — D-03 |
| `flipV` | `boolean` | `scale(1, -1)` | IMPLEMENTED — D-04 |
| `radius` | `number` | Not directly SVG | MISSING — image corner radius |
| `colorMask` | `string` | Not directly SVG | MISSING — color overlay |

### Shape Element (PPTShapeElement)

| Property | Type | SVG Source | Current Status |
|----------|------|------------|----------------|
| `gradient` | `Gradient` | `<linearGradient>` / `<radialGradient>` | IMPLEMENTED — D-15 |
| `shadow` | `PPTElementShadow` | `filter="url(#shadowId)"` | IMPLEMENTED — D-22 |
| `flipH` | `boolean` | `scale(-1, 1)` | IMPLEMENTED — D-03 |
| `flipV` | `boolean` | `scale(1, -1)` | IMPLEMENTED — D-04 |
| `outline` | `PPTElementOutline` | `stroke` + `stroke-width` + `stroke-dasharray` | IMPLEMENTED — D-05, D-19 |
| `fill` | `string` | `fill` attribute | IMPLEMENTED — solid color or rgba for opacity |

### Line Element (PPTLineElement)

| Property | Type | SVG Source | Current Status |
|----------|------|------------|----------------|
| `width` | `number` | `stroke-width` attribute | IMPLEMENTED — D-24, defaults to 1 |
| `shadow` | `PPTElementShadow` | `filter="url(#shadowId)"` | NOT IMPLEMENTED — line shadow not wired |
| `style` | `LineStyleType` | `stroke-dasharray` | IMPLEMENTED — D-05, parseDashArray |
| `points` | `[LinePoint, LinePoint]` | Not directly SVG | NOT IMPLEMENTED — arrow/dot endpoints |

---

## Implementation Notes

### Shadow Schema (PPTElementShadow)
```typescript
interface PPTElementShadow {
  h: number   // horizontal offset
  v: number   // vertical offset
  blur: number
  color: string
}
```
SVG `filter="url(#shadowId)"` with `<feDropShadow>` resolves to this schema. The shadow is already being parsed in `svg-parser.ts` and stored in `attrs.shadow`. The issue is that for text elements, `shadow: undefined` is hardcoded in `transform-to-pptel.ts` line 832 instead of reading from `element.attrs.shadow`.

### Image Filters Schema (ImageElementFilters)
```typescript
interface ImageElementFilters {
  'blur'?: string      // px
  'brightness'?: string // %
  'contrast'?: string   // %
  'grayscale'?: string  // %
  'saturate'?: string   // %
  'hue-rotate'?: string // deg
  'sepia'?: string      // %
  'invert'?: string     // %
  'opacity'?: string    // %
}
```
Maps CSS filter functions. SVG `<filter>` with `<feGaussianBlur>`, `<feColorMatrix>` etc. would need to be converted to these CSS filter strings.

### Image Clip Schema (ImageElementClip)
```typescript
interface ImageElementClip {
  range: [[number, number], [number, number]]  // [[x1%, y1%], [x2%, y2%]]
  shape: string  // from CLIPPATHS
}
```
Range is percentage-based (0-100). Shape is a named clip path from `configs/imageClip.ts`.

### vAlign Mapping
SVG text vertical alignment can be inferred from:
- `dominant-baseline="hanging"` → `'top'`
- `dominant-baseline="middle"` → `'middle'`
- `dominant-baseline="baseline"` (default) → `'bottom'`
- `baseline-shift` values could also inform this

### wordSpace Mapping
SVG `letter-spacing` maps directly to `wordSpace: number`. The value is already being parsed (line 768) but not being used.

---

## Sources

- PPTist TypeScript schema: `code/PPTist/src/types/slides.ts` (HIGH confidence — authoritative schema)
- svg-to-pptel transformer: `src/transformer/transform-to-pptel.ts` (HIGH confidence — existing implementation)
- svg-to-pptel apply-transform: `src/transformer/apply-transform.ts` (HIGH confidence — existing implementation)
- SVG filter spec: https://developer.mozilla.org/zh-CN/docs/Web/SVG/Element/filter (MEDIUM confidence — web reference)

---
*Feature research for: SVG to PowerPoint JSON converter v1.2 PPTist schema alignment*
*Researched: 2026-06-30*