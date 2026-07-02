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

### Active

- [ ] **Correct rotate transform with rotation center** — `rotate(deg, cx, cy)` in SVG transform attribute
- [ ] **Verified canvas scaling** — confirm all elements land at correct positions on 1000×562.5 canvas

### Out of Scope

- Additional SVG element types beyond rect/circle/ellipse/path/polygon/polyline/line/text/image
- SVG filter effects (blur, drop-shadow) — PPTElement doesn't support these
- Gradient fills beyond solid color — not in current PPTElement schema
- Font fallback or text layout engine — single-font text only

## Context

**Existing library** — svg-to-pptel v1.3, published as npm package.

**Text baseline issue** — SVG `<text y="30">` means the text's baseline sits at y=30. Current implementation uses fixed 0.8 ratio for baseline-to-top conversion.

**Target canvas** — 1000×562.5 (16:9 aspect ratio).

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

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.4 — Directory Batch CLI

**Goal:** CLI that reads SVG files from a directory and converts them to JSON in the same directory

**Target features:**
- Directory-based batch conversion CLI
- Read all .svg files from input directory
- Output JSON files to the same directory with same filename
- Error handling for invalid/missing files

## Previous Milestones

### v1.2 — PPTist格式对齐 (2026-06-30)

Research confirmed all target PPTist schema properties already implemented or deferred.

### v1.1 — transform-fixes (2026-06-27~29)

- Correct rotate transform with rotation center
- Correct text y coordinate (baseline → top)

---

*Last updated: 2026-07-01 after v1.3 milestone*
