# Feature Research

**Domain:** SVG to PowerPoint JSON converter library
**Researched:** 2026-06-26
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Basic shape conversion (rect, circle, ellipse, path, line, polygon, polyline) | Standard SVG shapes used in all diagrams | LOW | Current implementation covers all these; path only handles M/L/H/V commands |
| Text extraction with font-family, font-size, fill | Diagrams contain labels, titles, annotations | MEDIUM | Current implementation approximates text bounds; baseline-to-top conversion uses 0.75 multiplier |
| Image element with href/xlink:href | Logos, photos, icons in diagrams | LOW | Current implementation handles both attribute names |
| Transform support (translate, scale) | Diagrams use positioning and scaling | LOW | Current implementation handles these; rotation center is missing |
| Color parsing (named colors, hex, rgb) | All visual elements have colors | LOW | Named colors (147), hex, rgb() supported; rgba/hsl/hsla not supported |
| ViewBox to canvas coordinate mapping | Responsive SVGs use viewBox | LOW | Maps to 1000x562.5 canvas (16:9) |
| CLI tool with file input | Users need to convert files | LOW | Single file and directory batch processing supported |
| Output JSON format | Downstream consumption | LOW | Current `{ elements: PPTElement[] }` format works |
| Stroke styles (solid, dashed, dotted) | Diagrams use line styles | LOW | Parsed from stroke-dasharray; 2=dotted, 5=dashed |
| Opacity support | Transparency in diagrams | LOW | Per-element opacity parsed and passed through |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable when targeting professional diagram conversion.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Rotate transform with center point `rotate(deg, cx, cy)` | Many SVGs use rotation around anchor points | MEDIUM | Currently rotate is ignored; PROJECT.md identifies this as active issue |
| Accurate text y-coordinate (baseline to top) | Text positioning accuracy critical for labels | MEDIUM | Uses 0.75 * fontSize offset; actual font metrics vary by typeface |
| Full path command support (C, Q, A, S, T, Z) | Complex diagrams use Bezier curves and arcs | HIGH | pathBoundingBox only parses M/L/H/V; curves marked as "special" with no output |
| Group semantics preservation (groupId) | Grouped elements should stay grouped in PPT | MEDIUM | Currently groups flattened; groupId never assigned |
| Gradient fills | Professional diagrams use gradients | MEDIUM | Gradients parsed but never converted to PPTElement gradient format |
| Matrix transform support | Some design tools emit matrix() transforms | HIGH | Marked as "special" but not handled; element coordinates wrong |
| preserveAspectRatio handling | SVG images should not stretch | LOW | Currently ignored; images may distort |
| Advanced color formats (rgba, hsl, hsla, percentage rgb) | Modern design tools use these | LOW | Currently fallback to black for unsupported formats |
| ClipPath/mask support | Diagrams use clipping for masking | HIGH | Silently skipped; content renders incorrectly |
| SVG use element expansion | Reusable components via symbols | MEDIUM | use elements not expanded; referenced content omitted |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems or are out of scope.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| SVG filter effects (blur, drop-shadow, feGaussianBlur) | Professional designers use effects | PPTElement schema does not support filters; would require rasterization | Accept limitation; use pre-filtered SVGs |
| CSS cascading/style resolution | Complex SVGs use external styles | Requires full CSS parser and cascade resolution; adds massive complexity | Parse inline style attributes only |
| SVG animation support | Animated diagrams exist | Animations don't map to static PowerPoint slides | Not applicable to this use case |
| Font fallback or text layout engine | Multi-font text with proper wrapping | Single-font-per-text-element design; full layout engine out of scope | Keep single-font limitation |
| Real-time/live SVG conversion | Some use cases want watch mode | Unnecessary for file conversion library | Provide CLI batch processing instead |
| Interactive SVG features (events, scripts) | Some SVGs have interactivity | PowerPoint is not interactive; not applicable | Strip interactivity, keep visual |

## Feature Dependencies

```
SVG Input
    └──requires──> SVG Parser (fast-xml-parser)
                           └──requires──> AST/Element Tree
                                              │
                           ┌─────────────────┼─────────────────┐
                           │                 │                 │
                    CoordinateMapper    ShapeConverter    Transformer
                           │                 │                 │
                           │                 └──requires──> Path d strings
                           │                                   │
                           └──────────────────────┬────────────┘
                                                  │
                                         PPTElement JSON Output

Text Positioning
    └──requires──> Font Metrics (baseline → top)
                      └──requires──> fontSize knowledge

Rotate Transform
    └──requires──> Rotation center (cx, cy)
                      └──requires──> transform matrix math

Group Handling
    └──requires──> Group ID assignment
                      └──requires──> Preserve parent-child relationships
```

### Dependency Notes

- **Coordinate mapping requires SVG parser:** The viewBox dimensions and element positions come from parsed SVG structure
- **Shape conversion requires coordinate mapping:** Bounding boxes computed before path conversion
- **Text baseline correction requires fontSize:** The 0.75 multiplier approach is font-dependent
- **Rotate with center requires transform matrix math:** Simple rotation around origin is different from rotation around arbitrary center
- **Group semantics requires parent tracking:** Currently groups are flattened; groupId would need to propagate from parent to children

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to validate the concept.

- [ ] Basic shape conversion (rect, circle, ellipse, path with M/L/H/V, polygon, polyline, line) -- core value proposition
- [ ] Text extraction with font styling (font-family, font-size, fill) -- diagrams have labels
- [ ] Image element with href/xlink:href -- logos and icons appear in diagrams
- [ ] Transform support (translate, scale, rotate without center) -- common transforms work
- [ ] ViewBox to 1000x562.5 canvas mapping -- correct output coordinates
- [ ] Color parsing (named, hex, rgb) -- colors render correctly
- [ ] CLI with file input -- users can convert files
- [ ] Stroke styles (solid, dashed, dotted) -- line styles work
- [ ] Opacity support -- transparency works

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Rotate transform with center point -- many SVGs use `rotate(deg, cx, cy)`
- [ ] Text baseline-to-top y-coordinate correction -- improves text positioning accuracy
- [ ] Full path command support (C, Q, A, S, T) -- complex curves render correctly
- [ ] Group semantics with groupId -- grouped elements stay grouped
- [ ] preserveAspectRatio handling -- images don't distort

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Gradient fills -- professional diagrams need this
- [ ] Matrix transform support -- some design tools emit it
- [ ] Advanced color formats (rgba, hsl) -- broader SVG compatibility
- [ ] ClipPath/mask support -- masking effects
- [ ] SVG use element expansion -- reusable components

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Basic shape conversion | HIGH | LOW | P1 |
| Text extraction with font styling | HIGH | MEDIUM | P1 |
| Image element | HIGH | LOW | P1 |
| Transform (translate, scale) | HIGH | LOW | P1 |
| Coordinate mapping (1000x562.5) | HIGH | LOW | P1 |
| Color parsing | HIGH | LOW | P1 |
| CLI file input | HIGH | LOW | P1 |
| Stroke styles | MEDIUM | LOW | P1 |
| Opacity | MEDIUM | LOW | P1 |
| Rotate with center | HIGH | MEDIUM | P2 |
| Text baseline correction | HIGH | MEDIUM | P2 |
| Full path commands (C/Q/A/S/T) | MEDIUM | HIGH | P2 |
| Group semantics | MEDIUM | MEDIUM | P2 |
| preserveAspectRatio | MEDIUM | LOW | P2 |
| Gradient fills | HIGH | MEDIUM | P3 |
| Matrix transform | MEDIUM | HIGH | P3 |
| Advanced color formats | LOW | LOW | P3 |
| ClipPath/mask | LOW | HIGH | P3 |
| SVG use expansion | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | svg-to-pptel (ours) | Direct SVG importers (PowerPoint) | Online converters |
|---------|---------------------|-----------------------------------|-------------------|
| Basic shapes | Yes (all 7 types) | Yes | Yes |
| Text styling | Yes (family, size, color) | Yes | Partial |
| Transforms | translate, scale only | Yes | Varies |
| Rotation center | No (bug) | Yes | No |
| Coordinate mapping | 1000x562.5 fixed | Match source | Match source |
| CLI | Yes | No | No |
| Library API | Yes | No | No |
| Path curve support | M/L/H/V only | Full | Varies |
| Group preservation | No (flattened) | Yes | No |
| Gradients | No (not converted) | Yes | No |
| Batch directory | Yes | No | No |

**Our advantages:** CLI tool, library API, TypeScript, batch processing, fixed 16:9 output canvas

**Our gaps:** Rotation center bug, curve path support, group preservation, gradient conversion

## Sources

- Project codebase analysis: `src/transformer/transform-to-pptel.ts`, `src/mapper/coordinate-mapper.ts`, `src/parser/svg-parser.ts`
- Type definitions: `src/slides.ts` (PPTElement schema), `src/types/ast.ts` (SVG AST)
- Known concerns documented: `.planning/codebase/CONCERNS.md`
- Project requirements: `.planning/PROJECT.md`

---
*Feature research for: SVG to PowerPoint JSON converter*
*Researched: 2026-06-26*