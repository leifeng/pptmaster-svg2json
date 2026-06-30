# Project Research Summary

**Project:** svg-to-pptel v1.2 PPTist Schema Alignment
**Domain:** SVG to PowerPoint JSON conversion library (TypeScript)
**Researched:** 2026-06-30
**Confidence:** HIGH

## Executive Summary

The v1.2 milestone aligns svg-to-pptel output with the complete PPTist PPTElement schema. Research confirms **no new library dependencies are needed** -- all work is TypeScript implementation within the existing codebase. The existing `fast-xml-parser` handles SVG parsing including gradients, filters, and clipPaths. The PPTElement types in `slides.ts` already define all required properties; the gap is in wiring SVG attributes to those types.

The existing pipeline is well-structured with a clear two-pass pattern: first collecting defs (gradients, filters) at parse time, then resolving references during element conversion. Most v1.2 work follows this same pattern. Three feature categories exist: (1) already-implemented transform/shape/line extensions requiring no changes, (2) partially-implemented text properties needing simple wiring fixes, and (3) complex image features (filters, clip) requiring dedicated conversion logic. The critical risk is following the existing resolution pattern -- adding new def-type logic to the transformer instead of the parser would break the architecture.

Key risks: explicit `undefined` initialization breaks JSON output (Pitfall 3), image filter SVG-to-CSS syntax mismatch (Pitfall 6), and image clip schema misalignment requiring percentage-based range conversion (Pitfall 8). All three are preventable with documented mitigation strategies.

## Key Findings

### Recommended Stack

No stack changes required. All v1.2 work is pure TypeScript within existing components.

**Core technologies (unchanged):**
- TypeScript ^5.5.0 -- strict mode, CommonJS output
- fast-xml-parser ^5.9.3 -- SVG parsing with gradient/filter/clipPath support
- cac ^6.7.14, uuid ^14.0.1, picocolors ^1.1.1 -- CLI/utility, no changes needed
- vitest ^2.0.0 -- add tests for new v1.2 features

**No new dependencies.** CSS filter parsing needs only regex. clipPath resolution follows existing two-pass pattern.

### Expected Features

**Must have (table stakes -- P1 for v1.2 launch):**
- `rotate`/`flipH`/`flipV` -- already implemented via `applyTransform()`
- `fill` on text/shape -- already implemented
- `outline` on text/shape/image -- already implemented (but text outline.width hardcoded to 1)
- `gradient` on shape -- already implemented via `attrs.gradient` resolution
- `width` on line -- already implemented (stroke-width maps to result.width)
- `fixedHeight` on text -- already implemented (!!element.attrs.height)
- `shadow` on text -- **NOT implemented** -- parser sets `attrs.shadow` but transformer hardcodes `shadow: undefined` (line 832)
- `vAlign` on text -- **NOT implemented** -- hardcoded `middle`
- `wordSpace` on text -- **NOT implemented** -- hardcoded `0`, SVG `letter-spacing` not propagated

**Should have (competitive -- P2, add when possible):**
- `filters` on image -- SVG `<filter>` effects (blur, brightness, grayscale, etc.) mapping to `ImageElementFilters` CSS filter strings
- `clip` on image -- SVG `<clipPath>` conversion to `ImageElementClip` with percentage-based range

**Defer (v2+):**
- `colorMask` on image -- color overlay/tint on images
- Shape `pattern` -- SVG `<pattern>` fill not currently supported
- Shape-internal `text` -- `<text>` inside `<shape>` not propagated to `PPTShapeElement.text`
- Full vertical text layout -- CJK vertical writing mode

### Architecture Approach

Well-structured pipeline: SVG String -> svg-parser.ts (SvgElement tree with gradient/shadow resolved at parse time) -> coordinate-mapper.ts (TransformResult + CoordinateMapping) -> transform-to-pptel.ts (PPTElement output). The two-pass def collection pattern (collect defs first, resolve references second) is the key architectural pattern.

**Major components:**
1. `src/parser/svg-parser.ts` -- First-pass def collection, element conversion. New def types (clip, pattern) must be added here following the `collectFilterDefs`/`resolveFilterReference` pattern
2. `src/mapper/coordinate-mapper.ts` -- Transform parsing (`parseTransform`) and coordinate mapping. No changes needed for v1.2
3. `src/transformer/transform-to-pptel.ts` -- Element case transformers. Text case needs wiring fixes (shadow, vAlign, wordSpace). Image case needs filters/clip integration
4. `src/transformer/apply-transform.ts` -- Transform application (rotate/flip/scale). Already complete

### Critical Pitfalls

1. **Dual-Copy Coordinate Bug (ellipse cx/cy)** -- When adding rotation-center support to ellipse, cx/cy get scaled twice: once in `mapCoordinates` and again when applying rotation center transform. Ensure rotation center and element coordinates are in the same coordinate space. (Pitfall 1)

2. **Adding `undefined` Explicitly Breaks JSON Output** -- `shadow: undefined` in object literal always adds the property to output JSON. Use conditional spread: `...(element.attrs.shadow && { shadow: element.attrs.shadow })`. Never initialize optional properties to `undefined`. (Pitfall 3)

3. **Image Filter Syntax Mismatch** -- SVG `<filter>` with `<feGaussianBlur>` etc. maps to CSS filter strings differently than 1:1. Requires explicit SVG-to-CSS filter conversion function, not direct attribute mapping. (Pitfall 6)

4. **Gradient Resolution Order Confusion** -- New def types must follow the two-pass pattern: collect defs first, then resolve references during element conversion. Adding resolution logic to the transformer breaks the architecture. (Pitfall 2)

5. **Image Clip Schema Misalignment** -- PPTist `ImageElementClip` uses percentage-based range `[[x1,y1],[x2,y2]]` + named shape. SVG clip coordinates are in SVG units. Conversion requires knowing intrinsic image dimensions and mapping units. (Pitfall 8)

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Text Property Wiring
**Rationale:** Lowest risk -- three one-line fixes in transform-to-pptel.ts (lines 832, 833, 835). Already-researched with clear solutions. Unblocks complete text element support.
**Delivers:** Text elements fully output shadow/vAlign/wordSpace from SVG attributes
**Addresses:** text shadow (remove hardcoded undefined), text vAlign (map from dominant-baseline), text wordSpace (map from letter-spacing)
**Avoids:** Pitfall 3 -- use conditional spread for all three properties

### Phase 2: Text Outline Width Fix
**Rationale:** Small targeted fix -- outline.width currently hardcoded to 1, should use stroke-width. One-line change in text case.
**Delivers:** Text outlines render at correct thickness matching SVG stroke-width
**Avoids:** Pitfall 3 -- conditional spread pattern

### Phase 3: Image Filters
**Rationale:** Medium-high complexity. Requires new SVG-to-CSS filter conversion logic. Two-pass pattern: add `collectFilterDefs` to parser (parallel to existing filter def collection), wire filter resolution to image case in transformer. At minimum implement `feGaussianBlur` -> `blur` mapping; other filter types can be documented as out-of-scope.
**Delivers:** Images with SVG `<filter>` effects output `ImageElementFilters` property
**Avoids:** Pitfall 6 -- build explicit SVG filter-to-CSS converter; Pitfall 3 -- conditional spread
**Research flag:** Complex integration -- needs phase research for filter primitive-to-CSS mapping details

### Phase 4: Image Clip
**Rationale:** High complexity. Requires clipPath element parsing, range calculation (percentage-based), and shape name lookup. Recommend deferring to v1.3 unless specifically needed.
**Delivers:** Images with SVG `<clipPath>` output `ImageElementClip` property
**Avoids:** Pitfall 8 -- design clip conversion carefully; research PPTist named clip shapes first
**Research flag:** Complex schema mapping -- needs phase research for percentage range calculation and named shape lookup

### Phase Ordering Rationale

- Text wiring (Phase 1-2) comes first because it is low-risk, already-understood, and unblocks correctness
- Image filters (Phase 3) follows because it requires new parser logic but follows established patterns
- Image clip (Phase 4) is deferred because of high complexity and low urgency (few SVGs use clipPath on images)
- Transform/flip/shape/line features are already implemented (D-01 through D-05, D-15, D-22, D-24, D-25) and require no changes

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Image Filters):** SVG filter primitive parsing is complex. Only `feGaussianBlur` -> `blur` is straightforward. Other filter primitives (feColorMatrix, feBlend, etc.) have no obvious PPTist equivalent. Needs API research to define scope.
- **Phase 4 (Image Clip):** PPTist named clip shapes and percentage range calculation need validation against actual PPTist consumer behavior.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Text Wiring):** Simple wiring fixes following existing `attrs.shadow` resolution pattern
- **Phase 2 (Text Outline Width):** One-line change, well-understood

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified from existing implementation; no changes needed |
| Features | HIGH | Source: PPTist TypeScript schema + existing implementation trace |
| Architecture | HIGH | Source: codebase analysis of pipeline and two-pass pattern |
| Pitfalls | HIGH | Source: codebase analysis identifying 10 pitfalls with code-level precision |

**Overall confidence:** HIGH

### Gaps to Address

- **Image filters scope:** The research identifies `feGaussianBlur` -> `blur` as straightforward, but other filter primitives may not map to PPTist simple CSS-like filter format. Needs validation during Phase 3 planning.
- **Image clip range calculation:** The percentage-based range conversion from SVG clip coordinates requires knowing the intrinsic image dimensions. This needs verification against PPTist consumer expectations.
- **Text shadow vs shape shadow rendering:** Identified in Pitfall 7 -- identical shadow parameters may render differently for text vs shape in PowerPoint. Needs visual verification if text shadow is critical.

## Sources

### Primary (HIGH confidence)
- `src/slides.ts` -- PPTist PPTElement type definitions (authoritative schema)
- `src/transformer/transform-to-pptel.ts` -- transformer implementation (authoritative)
- `src/transformer/apply-transform.ts` -- transform application logic
- `src/parser/svg-parser.ts` -- gradient/shadow resolution pattern (D-15, D-22)

### Secondary (MEDIUM confidence)
- MDN SVG filter spec -- CSS filter function syntax for image filters
- Existing implementation decisions D-01 through D-32 -- traced in code

### Tertiary (LOW confidence)
- PPTist named clip shapes (`configs/imageClip.ts`) -- not yet examined in this research cycle

---
*Research completed: 2026-06-30*
*Ready for roadmap: yes*
