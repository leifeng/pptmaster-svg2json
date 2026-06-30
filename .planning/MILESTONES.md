# Milestones

## v1.2 — PPTist格式对齐

**Started:** 2026-06-30
**Completed:** 2026-06-30
**Status:** Complete — no new work required

**Goal:** 将 svg-to-pptel 输出的 JSON 格式与 PPTist 的 PPTElement schema 完全对齐

**Outcome:** Research confirmed all target PPTist schema properties already implemented or deferred. No new implementation needed.

**Deliverables:** None — all features already implemented or deferred to future milestones.

---

## v1.1 — transform-fixes

**Started:** 2026-06-27
**Completed:** 2026-06-29
**Status:** Complete

**Goal:** Fix two critical SVG transform bugs: rotate transform center support and text baseline offset

**Deliverables:**
- Correct rotate transform with rotation center (`rotate(deg, cx, cy)`)
- Correct text y coordinate (baseline → top) with configurable `BASELINE_OFFSET_RATIO`

**Key Decisions:**
- D-26: Ellipse cx/cy need separate rotation via applyRotateWithCenter
- D-27: Ellipse rx/ry use `Math.abs` on scale factors to remain positive
- D-28: `BASELINE_OFFSET_RATIO = 0.8` more accurate for SVG text baseline

---

## v1.0 — Initial release

**Status:** Complete

**Deliverables:**
- SVG parsing via fast-xml-parser
- Coordinate mapping from SVG viewBox to 1000×562.5 canvas
- Shape conversion (rect, circle, ellipse, path, polygon, polyline, line)
- Text element extraction with font-family, font-size, fill
- Image element with href/xlink:href
- CLI tool (svg2pptel)
- Basic transform attribute (translate, scale only)
