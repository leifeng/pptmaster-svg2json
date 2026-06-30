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
- — SVG AST intermediate representation — **removed** in favor of direct transform pipeline

### Active

- [ ] **Correct rotate transform with rotation center** — `rotate(deg, cx, cy)` in SVG transform attribute; current code ignores rotation center
- [ ] **Correct text y coordinate (baseline → top)** — SVG text y is baseline, needs offset by fontSize to get top edge
- [ ] **Verified canvas scaling** — confirm all elements land at correct positions on 1000×562.5 canvas

### Out of Scope

- Additional SVG element types beyond rect/circle/ellipse/path/polygon/polyline/line/text/image — current set covers standard shapes
- SVG filter effects (blur, drop-shadow, etc.) — PPTElement doesn't support these
- Gradient fills beyond solid color — not in current PPTElement schema
- Font fallback or text layout engine — single-font text only

## Context

**Existing library** — svg-to-pptel v1.0.0, published as npm package. Brownfield project with existing CLI, parser, transformer, and shape converters.

**Reference implementation** provided by user for `applyTransform(x, y, transform)` — handles translate → rotate → scale chain. Rotation center support is the critical gap.

**Text baseline issue** — SVG `<text y="30">` means the text's baseline sits at y=30. The top edge of the text is approximately `y - fontSize * 0.75` in typical font metrics. Current code uses a 0.75 multiplier as an estimate.

**Target canvas** — 1000×562.5 (16:9 aspect ratio, 1.777...×). Scale factors derived from SVG viewBox dimensions relative to this canvas.

## Constraints

- **Target canvas**: 1000×562.5 — hard-coded, not configurable
- **TypeScript**: Strict mode, compiled to CommonJS
- **No runtime dependencies** beyond fast-xml-parser, cac, picocolors, uuid

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| No AST wrapper layer | Direct parse→transform pipeline; simpler, fewer allocations | — Pending |
| Canvas 1000×562.5 | 16:9 standard slide proportion | ✓ Confirmed |
| 0.75 multiplier for text baseline | Empirical approximation; actual font metric varies | ⚠️ Revisit |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: (none — see below)

## Milestone v1.2: PPTist格式对齐 — COMPLETED (no new work)

**Goal:** 将 svg-to-pptel 输出的 JSON 格式与 PPTist 的 PPTElement schema 完全对齐

**Outcome:** Research confirmed all target PPTist schema properties are already implemented or are wiring-only gaps in existing code. No new implementation required for v1.2 scope.

**Findings:**
- Transform (rotate/flipH/flipV): ✓ Fully implemented via `applyTransform`
- Text (fill/outline/fixedHeight): ✓ Fully implemented
- Text (shadow/vAlign/wordSpace): Parsed but hardcoded — wiring gaps, decided to defer
- Image (outline/shadow/flipH/flipV): ✓ Fully implemented
- Image (filters/clip/colorMask): Missing — decided to defer
- Shape (gradient/shadow/flipH/flipV/outline): ✓ Fully implemented
- Shape (pattern fill): Missing — decided to defer
- Line (width): ✓ Fully implemented
- Line (endpoints): Hardcoded — decided to defer

**Target features:** (all deferred to future milestones)

## Previous Milestone: v1.1 transform-fixes

**Goal:** Fix two critical SVG transform bugs: rotate transform center support and text baseline offset

**Target features:**
- Correct rotate transform with rotation center — `rotate(deg, cx, cy)` in SVG transform attribute; current code ignores rotation center
- Correct text y coordinate (baseline → top) — SVG text y is baseline, use configurable multiplier instead of hardcoded 0.75

---
*Last updated: 2026-06-27 after v1.1 milestone start*