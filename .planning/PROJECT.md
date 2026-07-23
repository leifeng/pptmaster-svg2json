# svg-to-pptel

## What This Is

A TypeScript library that converts SVG files into PowerPoint element JSON format. Given an SVG string, it parses the XML, maps coordinates to a 1000×562.5 canvas, transforms SVG shapes/text/images into PPTElement objects, and outputs JSON.

## Core Value

Accurately convert SVG visual elements to PowerPoint JSON — every coordinate, transform, and style maps correctly to the target canvas.

## Requirements

### Validated

- ✓ SVG parsing via fast-xml-parser — parses XML into element tree
- ✓ Coordinate mapping from SVG viewBox to 1000×562.5 canvas
- ✓ Shape conversion (rect, circle, ellipse, path, polygon, polyline, line)
- ✓ Text element extraction with font-family, font-size, fill
- ✓ Image element with href/xlink:href
- ✓ CLI tool (svg2pptel) with file/directory input
- ✓ Basic transform attribute (translate, scale only — no rotate center)
- ✓ **resvg-js text measurement** — accurate bounding box via @resvg/resvg-js
- ✓ **lineHeight default 1** — text line height set to 1 instead of 1.5
- ✓ **transparent stroke handling** — stroke opacity extracted to outline.opacity field
- ✓ **rotate(deg, cx, cy) with center point** — correct rotation around specified center
- ✓ **text baseline offset** — configurable BASELINE_OFFSET_RATIO (0.8)
- ✓ **nested `<g>` transform accumulation** — parent transform composed with child
- ✓ **S/s T/t bezier reflection** — correct smooth quadratic/cubic bezier control point calculation
- ✓ **clipPath preprocessing** — coordinate expansion before transform pipeline
- ✓ **baseline-shift pixel scaling** — absolute pixel values scaled by scaleY
- ✓ **TEXT-WHPASS-01/02/03** — SVG text width/height passthrough fast path
- ✓ **PATH-MERGE-01~05** — path merge decision tree and implementation
- ✓ **FONT-PREPROCESS-01~04** — font preprocessor normalizes all fonts to Source Han Sans CN Regular

### Active

(None — v1.7 complete, next milestone not yet planned)

### Out of Scope

- Additional SVG element types beyond rect/circle/ellipse/path/polygon/polyline/line/text/image
- SVG filter effects (blur, drop-shadow) — PPTElement doesn't support these
- Gradient fills beyond solid color — not in current PPTElement schema
- Font fallback or text layout engine — single-font text only
- SVGO optimization — not needed for parsing, adds bundle size
- Build system upgrades (tsup) — deferred
- Dependency upgrades — deferred to after transform fixes stabilize

## Context

**Existing library** — svg-to-pptel v1.7, published as npm package.

**Current state** — v1.7 milestone complete. All phases (10-12) shipped. Ready for next milestone planning.

**Target canvas** — 1000×562.5 (16:9 aspect ratio).

**Tech stack:** TypeScript strict mode, CommonJS, fast-xml-parser, cac, picocolors, uuid, @resvg/resvg-js

## Constraints

- **Target canvas**: 1000×562.5 — hard-coded, not configurable
- **TypeScript**: Strict mode, compiled to CommonJS
- **Dependencies**: fast-xml-parser, cac, picocolors, uuid, @resvg/resvg-js

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No AST wrapper layer | Direct parse→transform pipeline | ✓ Confirmed |
| Canvas 1000×562.5 | 16:9 standard slide proportion | ✓ Confirmed |
| 0.8 multiplier for text baseline | Fixed ratio for baseline→top | ✓ Confirmed |
| resvg-js for text measurement | NAPI native addon, accurate glyph bounding box | ✓ Complete |
| Parent transform composition | Pass parent transform to mapCoordinates without AST mutation | ✓ Complete |
| clipPath via AST preprocessing | Expand clipPath definitions before transform pipeline | ✓ Complete |
| Pixel baseline-shift scaling | Scale pixel values by scaleY (e.g., -5px → -3.90625) | ✓ Complete |
| PATH-MERGE decision tree | MergeDecision enum for merge/no-merge/cautious-merge | ✓ Complete |
| Text Width/Height Passthrough | Skip resvg-js when valid width/height attributes present | ✓ Complete |
| Font Preprocessing | Normalize all fonts to Source Han Sans CN Regular | ✓ Complete |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.7 — Complete

**Status:** SHIPPED 2026-07-23

All planned features delivered:
- PATH-MERGE decision tree and implementation (Phases 10)
- TEXT-WHPASS SVG text attribute passthrough (Phase 11)
- FONT-PREPROCESS font normalization (Phase 12)

---

## Previous Milestones

### v1.7 — Path 合并优化 (2026-07-23)

- PATH-MERGE decision tree for `<g>` path merging
- TEXT-WHPASS SVG text width/height passthrough
- FONT-PREPROCESS font normalization to Source Han Sans CN

### v1.6 — SVG Converter Refactor (2026-07-13)

- Nested `<g>` transform accumulation fixed
- S/s T/t bezier reflection corrected
- clipPath preprocessing integrated
- baseline-shift pixel values scaled by scaleY
- path-utils.ts extracted as unified module

### v1.5 — Use Tag Refactor (2026-07-10)

- autoEmbedIcons extracted to src/svg-use-handler.ts
- External SVG files via `<use href="file.svg">` rendered to PNG and embedded

### v1.4 — Directory Batch CLI (2026-07-02)

- CLI reads SVG files from directory, converts each to JSON in same directory
- Summary output: "Converted N files, M failed"

### v1.3 — resvg-js Text Measurement (2026-07-01)

- @resvg/resvg-js integrated for accurate text bounding box
- text-measurer.ts module with measureTextBBox()

### v1.2 — PPTist格式对齐 (2026-06-30)

Research confirmed all target PPTist schema properties already implemented or deferred.

### v1.1 — transform-fixes (2026-06-27~29)

- Correct rotate transform with rotation center (`rotate(deg, cx, cy)`)
- Correct text y coordinate (baseline → top)

---

*Last updated: 2026-07-23 after v1.7 milestone completion*
