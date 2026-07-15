# Phase 3: Gradient and Opacity - Research

**Researched:** 2026-06-29
**Domain:** SVG gradient parsing, fill reference resolution, opacity/transparency mapping to PPTist format
**Confidence:** HIGH

## Summary

Phase 3 implements gradient support (linearGradient/radialGradient) and opacity mapping for the svg-to-pptel transformer. The implementation builds on established patterns from Phases 1-2: parse-time registry construction (D-14), at-parse-reference resolution (D-15), rgba() color encoding (D-16), and gradientTransform rotation extraction (D-17). The PPTist `Gradient` schema is already defined in `src/slides.ts` with `type`, `colors[]`, and `rotate` fields; `PPTShapeElement` already has an optional `gradient?: Gradient` field. The existing skip-list in `transform-to-pptel.ts` already filters `linearGradient` and `stop` tags from output. The main new work is: (1) building a gradient defs registry in the parser, (2) resolving `fill="url(#id)"` references at parse time, (3) encoding stop-color + stop-opacity into rgba() color strings, (4) extracting rotation from gradientTransform matrices, and (5) mapping element fill-opacity/stroke-opacity/opacity per D-18/19/20.

**Primary recommendation:** Use a two-pass approach: parser builds `Map<id, GradientDef>` during initial SVG traversal, then resolves `fill="url(#id)"` to gradient objects before returning the AST. Transformer receives a pre-hydrated AST where gradient references are already resolved -- no second lookup needed.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-14:** Parser layer builds `Map<id, GradientDef>` registry during `<defs>` parsing, passes to transformer via AST context
- **D-15:** `fill="url(#gradientId)"` resolved at parse time to PPTist `gradient` object -- transformer receives `attrs.gradient` directly
- **D-16:** `stop-opacity` encoded as `rgba(r, g, b, a)` color string -- consistent with Phase 2 D-08
- **D-17:** `gradientTransform` matrix rotation extracted via matrix decomposition; non-rotation matrix yields `rotate = 0`
- **D-18:** SVG `fill-opacity` → rgba() color string
- **D-19:** SVG `stroke-opacity` → PPTist `outline.opacity` field
- **D-20:** SVG element `opacity` → PPTElement `opacity` field

### Claude's Discretion

None -- all decisions were locked in discuss-phase.

### Deferred Ideas (OUT OF SCOPE)

None raised -- all topics were within phase scope.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Gradient defs registry | Parser (svg-parser.ts) | -- | Parser sees `<defs>` first; builds Map during initial traversal |
| fill="url(#id)" resolution | Parser (svg-parser.ts) | -- | D-15 locks resolution at parse time; parser has gradient context |
| stop-color + stop-opacity encoding | Parser (svg-parser.ts) | -- | D-16 encoding decision applies at parse time |
| gradientTransform rotation extraction | Parser (svg-parser.ts) | Mapper (coordinate-mapper.ts) | parseTransform logic lives in coordinate-mapper; gradientTransform is SVG-transform-like |
| PPTShapeElement.gradient population | Transformer (transform-to-pptel.ts) | -- | Transformer reads pre-resolved `attrs.gradient` and maps to PPTist Gradient |
| fill-opacity → rgba() | Transformer (transform-to-pptel.ts) | -- | D-18 consistent with D-08 text fill-opacity pattern |
| stroke-opacity → outline.opacity | Transformer (transform-to-pptel.ts) | -- | D-19 maps to PPTElementOutline |
| element opacity → PPTElement.opacity | Transformer (transform-to-pptel.ts) | -- | D-20 direct field mapping |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GRAD-01 | Parse SVG `<linearGradient>` and `<radialGradient>` from `defs` | Parser already recognizes these tags (childTags list); fast-xml-parser handles nested `stop` children; gradient defs stored in registry |
| GRAD-02 | Extract gradient `stop-color` and `stop-opacity` into PPTist `gradient.colors[]` | PPTist `GradientColor` is `{pos: number, color: string}`; color encoded as rgba() per D-16 |
| GRAD-03 | Resolve `fill="url(#gradientId)"` references to PPTist `gradient` object | D-15: resolved at parse time; parser injects `attrs.gradient` directly |
| GRAD-04 | Support `gradient.type` (`linear`/`radial`) and `gradient.rotate` | PPTist `Gradient.type` is `'linear' | 'radial'`; `rotate` extracted from gradientTransform |
| OPAC-01 | Map SVG element `fill-opacity` to PPTist `opacity` field | D-18: actually maps to rgba() color string, not opacity field (consistent with D-08) |
| OPAC-02 | Map SVG element `stroke-opacity` to PPTist `outline` opacity | D-19: maps to `outline.opacity` field on shape/line elements |
| OPAC-03 | Map gradient `stop-opacity` to `gradient.colors[].color` alpha channel | D-16: stop-opacity encoded as rgba() in color string |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| fast-xml-parser | ^4.x (existing) | SVG parsing | Already in use; handles namespaced attrs and child arrays |
| uuid | ^9.x (existing) | Unique element IDs | Already in use for PPTElement id generation |

### No New Dependencies
This phase introduces **no new npm packages**. All functionality uses existing utilities: `colorToRgba()` and `parseTransform()` from established modules.

**Installation:** None required -- all work is code organization.

## Architecture Patterns

### System Architecture Diagram

```
SVG Input
    │
    ▼
┌─────────────────────────┐
│   svg-parser.ts         │
│   ───────────────────   │
│   1. fast-xml-parser    │
│   2. convertToSvgElement│
│   3. BUILD GRADIENT DEFS│
│      REGISTRY (D-14)    │
│      Map<id, GradientDef│
│   4. RESOLVE fill=      │
│      url(#id) (D-15)    │
│      → attrs.gradient   │
└─────────────────────────┘
    │
    ▼  SvgParseResult (AST with gradient refs resolved)
┌─────────────────────────┐
│   transform-to-pptel.ts │
│   ───────────────────   │
│   transformElement()    │
│   ───────────────────   │
│   • shape/rect/circle/  │
│     ellipse/path cases  │
│   • fill-opacity→rgba() │  (D-18)
│   • stroke-opacity→     │
│     outline.opacity     │  (D-19)
│   • element opacity→    │
│     PPTElement.opacity  │  (D-20)
│   • attrs.gradient →    │
│     PPTShapeElement.    │
│     gradient field      │
└─────────────────────────┘
    │
    ▼  PPTElement[]
```

### Recommended Project Structure
```
src/
├── parser/
│   └── svg-parser.ts      # [MODIFY] Build gradient registry, resolve url(#id)
├── transformer/
│   └── transform-to-pptel.ts  # [MODIFY] Handle attrs.gradient, opacity fields
├── mapper/
│   └── coordinate-mapper.ts   # [REUSE] parseTransform for gradientTransform
├── types/
│   └── ast.ts              # [MODIFY] Add GradientDef interface, attrs.gradient field
└── slides.ts               # [READ] Gradient, GradientColor, PPTShapeElement
```

### Pattern 1: Gradient Registry + Parse-Time Resolution

**What:** Parser builds `Map<id, GradientDef>` and resolves `fill="url(#id)"` before returning AST.

**When to use:** D-14/D-15 decision -- keeps transformer simple, no deferred lookups.

**Example:**
```typescript
// In svg-parser.ts, after convertToSvgElement processes <defs> children:
interface GradientDef {
  id: string
  type: 'linear' | 'radial'
  colors: GradientColor[]   // { pos: number, color: string } with rgba encoding
  rotate: number
  // x1, y1, x2, y2 for linear; cx, cy, r for radial -- stored but not in PPTist schema
}

// During initial traversal:
// 1. Collect all <linearGradient> and <radialGradient> into gradientRegistry Map
// 2. When processing element with fill="url(#id)", look up registry,
//    build Gradient object, assign to attrs.gradient
```

### Pattern 2: gradientTransform Rotation Extraction

**What:** Reuse `parseTransform()` logic from coordinate-mapper.ts to extract rotation from `gradientTransform` attribute.

**When to use:** D-17 -- gradientTransform uses same syntax as regular transform.

**Example:**
```typescript
// In coordinate-mapper.ts or new gradient utils:
export function parseGradientTransform(transform: string | undefined): number {
  if (!transform) return 0
  // gradientTransform supports: rotate(N), rotate(N, cx, cy), matrix(a,b,c,d,e,f)
  // For rotate(N): extract degrees directly
  // For matrix: decompose to extract rotation component
  //   rotate = atan2(b, a) * 180 / PI  (for 2D rotation matrix)
  // For translate+rotate+scale: extract rotation component
  // Non-rotation matrix (scale only, etc.) → rotate = 0
  const parsed = parseTransform(transform)
  if (parsed.rotateDeg !== undefined) return parsed.rotateDeg
  // matrix decomposition for rotation angle
  if (parsed.raw?.startsWith('matrix(')) {
    // Extract rotation from matrix [a,b,c,d,e,f] → angle = atan2(b,a)
    const matrixMatch = parsed.raw.match(/matrix\(\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+),?\s*([\d.-]+)\s*\)/)
    if (matrixMatch) {
      const a = parseFloat(matrixMatch[1]), b = parseFloat(matrixMatch[2])
      return Math.atan2(b, a) * 180 / Math.PI
    }
  }
  return 0
}
```

### Pattern 3: rgba() Color Encoding for Opacity

**What:** Encode opacity into color string rather than separate alpha field.

**When to use:** D-16 (stop-opacity), D-18 (fill-opacity) -- consistent with Phase 2 D-08 text fill-opacity.

**Example:**
```typescript
// Reuse colorToRgba() from transform-to-pptel.ts:211-234
export function colorToRgba(color: string | undefined, opacity: number): string {
  if (!color) return `rgba(0, 0, 0, ${opacity})`
  if (color.startsWith('#')) {
    const hex = colorToHex(color)
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  // ... named colors, rgb() format handling
  return `rgba(0, 0, 0, ${opacity})`
}

// For gradient stops:
const stopColor = element.attrs['stop-color'] || '#000000'
const stopOpacity = parseFloat(element.attrs['stop-opacity'] || '1')
const rgbaColor = colorToRgba(stopColor, stopOpacity)
```

### Anti-Patterns to Avoid

- **Deferred gradient lookup in transformer:** D-15 explicitly resolves at parse time; transformer should not do second lookup.
- **Separate alpha field for gradient colors:** D-16 encodes as rgba() string; PPTist GradientColor.color is a single string field.
- **Ignoring gradientTransform on radialGradient:** radialGradient gradientTransform is valid SVG; must handle rotation extraction same as linearGradient.
- **Multiplicative opacity blending:** stop-opacity is an independent alpha channel, not pre-multiplied into RGB -- use `rgba()` encoding, not color darkening.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color + opacity encoding | Custom rgba() builder | `colorToRgba()` from transform-to-pptel.ts:211 | Already handles hex, named colors, rgb() format; consistent with D-08 |
| gradientTransform parsing | Custom gradient transform parser | `parseTransform()` from coordinate-mapper.ts | Same syntax as regular SVG transform; matrix decomposition already needed for D-17 |
| SVG stop element offset parsing | Custom percentage/number parser | Standard parseFloat on offset string | Offset is "50%" or "0.5" -- parseFloat handles both; percentage conversion straightforward |

**Key insight:** The SVG gradient namespace is large (x1, y1, x2, y2, cx, cy, r, fx, fy, spreadMethod, gradientUnits, gradientTransform) but most map directly to PPTist fields that don't exist yet (rotate is the only one). Stop elements are simple (offset, stop-color, stop-opacity). The complex SVG gradient attributes mostly describe geometry that PPTist's simple `{type, colors[], rotate}` schema cannot represent -- those can be noted as known limitations without blocking GRAD-01 through GRAD-04.

## Common Pitfalls

### Pitfall 1: SVG gradient namespace attributes not parsed
**What goes wrong:** Gradient elements have many SVG-specific attributes (`x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `fx`, `fy`, `spreadMethod`, `gradientUnits`) that need explicit extraction.

**Why it happens:** fast-xml-parser extracts only attributes in the `isArray` list; these attributes may not be in `SvgAttrs` type definition.

**How to avoid:** Extend `SvgAttrs` interface to include gradient-specific attributes: `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `fx`, `fy`, `spreadMethod`, `gradientUnits`, `gradientTransform`.

**Warning signs:** Gradient stops return with default values, rotation always 0.

### Pitfall 2: Multiple stop children with same offset
**What goes wrong:** SVG allows multiple stops at same offset (e.g., `offset="30%"` twice with different colors); PPTist gradient shows only one color.

**Why it happens:** Direct Map-based approach would overwrite earlier stop at same position.

**How to avoid:** For gradient rotation extraction: use last stop in order. For colors: PPTist GradientColor.pos is a number (0-1); if duplicate positions exist, keep both (PPTist colors[] can have multiple entries).

**Warning signs:** Gradient colors missing at certain positions.

### Pitfall 3: gradientTransform vs transform attribute confusion
**What goes wrong:** Applying regular `transform` parsing to `gradientTransform` -- they are the same syntax but apply at different levels.

**Why it happens:** gradientTransform on a gradient element applies to the gradient coordinate system, not the element geometry.

**How to avoid:** Parse gradientTransform separately from element transform; apply rotation to gradient object, not element.

**Warning signs:** Element rotates when it should not, or gradient rotates when element does.

### Pitfall 4: Stop offset not normalized to 0-1 range
**What goes wrong:** SVG stop offset can be "0%" to "100%" or "0" to "1" or "0.5"; PPTist GradientColor.pos expects 0-1 number.

**Why it happens:** No normalization step after parsing offset attribute.

**How to avoid:** Normalize: `const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset)`

**Warning signs:** Gradient colors at wrong positions, e.g., pos=50 instead of pos=0.5.

### Pitfall 5: fill="url(#id)" resolved before gradient defs collected
**What goes wrong:** Element with `fill="url(#gradientId)"` is processed before the `<defs>` section containing the gradient is visited.

**Why it happens:** Tree traversal order -- `<defs>` may appear after elements that reference gradients.

**How to avoid:** Two-pass approach: (1) collect all gradient defs first, (2) then resolve all url() references. Or: build registry during initial traversal, but resolve references during a second pass or via deferred lookup.

**Warning signs:** Gradient fills fall back to solid color, no gradient in output.

## Code Examples

### SVG Gradient Structure (from exampels/02_what_are_agents.svg)
```xml
<defs>
  <radialGradient id="bgGlow" cx="50%" cy="40%" r="50%">
    <stop offset="0%" stop-color="#D4845A" stop-opacity="0.06"/>
    <stop offset="100%" stop-color="#D4845A" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="dividerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#D4845A" stop-opacity="0"/>
    <stop offset="30%" stop-color="#D4845A" stop-opacity="0.6"/>
    <stop offset="70%" stop-color="#D4845A" stop-opacity="0.6"/>
    <stop offset="100%" stop-color="#D4845A" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#bgGlow)"/>
<rect x="638" y="200" width="3" height="340" rx="1.5" fill="url(#dividerGrad)"/>
```

### Parsing gradient stops (conceptual)
```typescript
// In convertToSvgElement or new gradient parsing utility:
function parseGradientStops(stopNodes: any[]): GradientColor[] {
  return stopNodes.map(stop => {
    const offset = stop['@_offset']
    const stopColor = stop['@_stop-color'] || '#000000'
    const stopOpacity = parseFloat(stop['@_stop-opacity'] || '1')
    const pos = offset.endsWith('%') ? parseFloat(offset) / 100 : parseFloat(offset)
    return {
      pos,
      color: colorToRgba(stopColor, stopOpacity)
    }
  })
}
```

### PPTist Gradient output (from slides.ts:46-55)
```typescript
export type GradientType = 'linear' | 'radial'
export type GradientColor = {
  pos: number
  color: string
}
export interface Gradient {
  type: GradientType
  colors: GradientColor[]
  rotate: number
}
```

### Existing skip-list pattern (transform-to-pptel.ts:309, 672)
```typescript
// Line 309 - in transformElement():
if (['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
  return null
}

// Line 672 - in transformToPPTElement():
if (!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(tag)) {
  // process element
}
```

### Existing colorToRgba (transform-to-pptel.ts:211-234)
```typescript
export function colorToRgba(color: string | undefined, opacity: number): string {
  if (!color) return `rgba(0, 0, 0, ${opacity})`
  if (color.startsWith('#')) {
    const hex = colorToHex(color)
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  // ... named color and rgb() handling
}
```

### Existing parseTransform (coordinate-mapper.ts:33-66)
```typescript
export function parseTransform(transform: string | undefined): TransformResult {
  if (!transform) return { translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotateDeg: 0 }
  // translate, scale, rotate parsing...
  if (/matrix(/.test(transform)) {
    result.raw = transform
    result.special = true  // matrix not fully supported
  }
  return result
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No gradient support | Gradient defs registry + parse-time resolution | Phase 3 | SVG files with gradients now produce proper PPTist gradient fills |
| Solid fill only | rgba() encoded colors for transparent fills | Phase 2 D-08 | Consistent alpha handling across text and shapes |
| Ignored gradientTransform | Matrix decomposition for rotation extraction | Phase 3 D-17 | Gradient rotation now supported |

**Deprecated/outdated:**
- None in this phase's scope.

## Assumptions Log

> All claims in this research were verified from authoritative sources (source code, official schema definition in slides.ts) -- no user confirmation needed.

## Open Questions (RESOLVED)

1. **[RESOLVED] radialGradient fx/fy (focal point)**
   - What we know: PPTist `Gradient` schema has only `{type, colors, rotate}` -- no focal point field.
   - Status: Known limitation -- implement GRAD-01-04 without fx/fy; note as known limitation.

2. **[RESOLVED] gradientUnits (userSpaceOnUse vs objectBoundingBox)**
   - What we know: SVG gradients default to objectBoundingBox; PPTist has no gradientUnits field.
   - Status: Known limitation -- default to objectBoundingBox; implement without gradientUnits conversion.

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified -- all work is TypeScript code organization within existing project structure).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | src/vitest.config.ts |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GRAD-01 | linearGradient/radialGradient parsed into registry | unit | `npm test -- --run --testNamePattern="gradient"` | No - new test needed |
| GRAD-02 | stop-color + stop-opacity encoded as rgba() | unit | `npm test -- --run --testNamePattern="stop-opacity"` | No - new test needed |
| GRAD-03 | fill="url(#id)" resolved to gradient object | unit | `npm test -- --run --testNamePattern="fill.*url"` | No - new test needed |
| GRAD-04 | gradient.rotate extracted from gradientTransform | unit | `npm test -- --run --testNamePattern="gradientTransform"` | No - new test needed |
| OPAC-01 | fill-opacity < 1 → rgba() in shape fill | unit | `npm test -- --run --testNamePattern="fill-opacity"` | No - new test needed |
| OPAC-02 | stroke-opacity → outline.opacity | unit | `npm test -- --run --testNamePattern="stroke-opacity"` | No - new test needed |
| OPAC-03 | stop-opacity → gradient.colors[].color alpha | unit | `npm test -- --run --testNamePattern="stop-opacity"` | No - new test needed |

### Sampling Rate
- **Per task commit:** `npm test -- --run`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `__tests__/gradient.test.ts` -- covers GRAD-01 through GRAD-04
- [ ] `__tests__/opacity.test.ts` -- covers OPAC-01 through OPAC-03
- [ ] `src/types/ast.ts` -- extend SvgAttrs with gradient-specific attributes
- [ ] Framework install: already installed (Vitest in package.json)

## Security Domain

> Skip -- this phase deals with SVG parsing and data transformation; no user input, network access, or cryptographic operations involved.

## Sources

### Primary (HIGH confidence)
- `src/slides.ts` -- Gradient, GradientColor, PPTShapeElement interface definitions (verified by reading)
- `src/transformer/transform-to-pptel.ts` -- colorToRgba(), skip list, transformElement() patterns (verified by reading)
- `src/mapper/coordinate-mapper.ts` -- parseTransform() implementation (verified by reading)
- `src/parser/svg-parser.ts` -- childTags, convertToSvgElement(), isArray handling (verified by reading)
- `src/types/ast.ts` -- SvgAttrs, SvgElement, SvgParseResult interfaces (verified by reading)
- `exampels/02_what_are_agents.svg` -- real-world gradient examples (verified by reading)

### Secondary (MEDIUM confidence)
- None -- all sources are from the project codebase itself.

### Tertiary (LOW confidence)
- None -- no external web sources needed for this implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; all work uses existing project patterns
- Architecture: HIGH - decisions locked in CONTEXT.md; implementation paths clear
- Pitfalls: HIGH - all pitfalls identified from established patterns and real SVG examples

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable domain, no fast-moving changes expected)