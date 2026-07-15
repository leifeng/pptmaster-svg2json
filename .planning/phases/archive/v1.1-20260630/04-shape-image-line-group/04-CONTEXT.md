# Phase 4: Shape/Image/Line/Group Extensions - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

## Phase Boundary

补充各类型元素的缺失字段：Shape (rx/ry, shadow, gradient, flipH/flipV)、Image (outline, shadow)、Line (stroke-width)、Group (groupId)。

**Requirements:** SHPE-01~04, IMGE-01~02, LINE-01, GROUP-01

## Implementation Decisions

### SHPE-01: rx/ry rounded corners

- **D-21:** `rx`/`ry` (rect corner radius) → SVG arc commands (A) in path string
  - Generate rounded rectangle path using arc commands at each corner
  - `rectToPath` → `roundedRectToPath` with rx/ry as ellipse radii
  - sweep-flag determines corner direction (clockwise = 1)
  - When rx=0 or ry=0 → degenerate to sharp corners (no arc)
  - When rx/ry exceed half-width/half-height → clamp to half of min(width, height)

### SHPE-03: Shadow mapping

- **D-22:** SVG `filter="url(#shadowId)"` with `<feDropShadow>` → `PPTElementShadow`
  - Parse `filter` attr on element → look up filter def by id
  - Extract from `<feDropShadow>`: `dx`→h, `dy`→v, `stdDeviation`→blur, `fEColor`/`shadow-color`→color
  - Fallback: inline `filter: drop-shadow(...)` CSS parsing
  - Apply to: rect, circle, ellipse, path, polygon, polyline, image

### GROUP-01: groupId propagation

- **D-23:** `<g id="groupName">` → propagate `groupId` to direct child elements
  - During transformElement, when tag='g' with id, assign groupId to each child
  - Children inherit parent `<g>` id as their `groupId` field
  - Group wrapper element itself not output (children output individually)
  - Nested groups: innermost `<g id>` takes precedence for children

### LINE-01: stroke-width mapping

- **D-24:** SVG `stroke-width` → `PPTLineElement.width`
  - `stroke-width` already maps to outline width in shape elements
  - For line elements specifically: stroke-width → PPTLineElement.width field
  - Default to 1 when stroke-width absent or 0

### IMGE-01: Image outline

- **D-25:** `<image>` with `stroke` attribute → `PPTImageElement.outline`
  - PPTImageElement.outline uses PPTElementOutline type
  - stroke color → outline.color, stroke-width → outline.width
  - No stroke → outline undefined

### SHPE-02/04: Already implemented

- SHPE-02 (gradient field on shapes): Already implemented in Phase 3
- SHPE-04 (flipH/flipV): Already implemented in Phase 1

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PPTist Schema
- `src/slides.ts` — PPTShapeElement (gradient, shadow, flipH, flipV, path), PPTImageElement (outline, shadow, flipH, flipV), PPTLineElement (width, shadow), PPTElementShadow (h, v, blur, color), PPTElementOutline (style, width, color, opacity)

### Existing Implementation
- `src/transformer/transform-to-pptel.ts:313-363` — rect case (rx not yet handled, shadow not yet set)
- `src/transformer/transform-to-pptel.ts:613-631` — line case (width not yet set)
- `src/transformer/transform-to-pptel.ts:720-739` — image case (outline/shadow not yet set)
- `src/transformer/transform-to-pptel.ts:741-743` — g case (just returns null, no groupId propagation)

### Requirements
- `.planning/REQUIREMENTS.md` § Shape Extensions (SHPE-01~04), Image Extensions (IMGE-01~02), Line Extensions (LINE-01), Group (GROUP-01)
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria

### Prior Phase Decisions
- `.planning/phases/03-gradient-opacity/03-CONTEXT.md` — D-14~20: gradient/gradientTransform, opacity mappings
- `.planning/phases/02-text/02-CONTEXT.md` — D-08: fill-opacity → rgba()

## Existing Code Insights

### Reusable Assets
- `rectToPath()` in `src/transformer/transform-to-pptel.ts` — generates basic rect path, needs rounded variant
- `colorToHex()`, `parseDashArray()` — reusable utilities
- Phase 1 `applyTransform()` — handles rotate/flipH/flipV already
- Phase 3 gradient handling — `attrs.gradient` already set on shapes

### Established Patterns
- Skip list: `['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath']` — filter defs skipped
- transform parsing already handles flipH/flipV for rect/circle/ellipse
- group children processed separately — g case returns null

### Integration Points
- transform-to-pptel.ts → rect/circle/ellipse/path/polygon/polyline need shadow output
- transform-to-pptel.ts → image needs outline and shadow output
- transform-to-pptel.ts → line needs width from stroke-width
- transform-to-pptel.ts → g needs to propagate groupId to children

## Deferred Ideas

None — all raised topics were within phase scope.

---

*Phase: 4-Shape/Image/Line/Group Extensions*
*Context gathered: 2026-06-29*
