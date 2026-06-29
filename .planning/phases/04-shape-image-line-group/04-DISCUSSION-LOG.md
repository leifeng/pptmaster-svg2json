# Phase 4 Discussion Log

**Date:** 2026-06-29
**Phase:** 04-shape-image-line-group

## Areas Discussed

### Area 1: rx/ry rounded corners (SHPE-01)

**Question:** How should SVG rect rx/ry (corner radius) be converted to a PPTist path?

**Options presented:**
1. Arc commands — Use SVG arc commands (A) in the path
2. pathFormula approach — Keep path as basic rect, set pathFormula='roundRect'
3. Manual corner arcs — Insert explicit arc segments at each corner

**Decision:** Arc commands (Recommended)
**Rationale:** Most idiomatic SVG approach, directly maps to PPTist path format

---

### Area 2: Shadow mapping (SHPE-03)

**Question:** What SVG construct should map to PPTElementShadow (h, v, blur, color)?

**Options presented:**
1. filter:drop-shadow — Parse filter="url(#shadow)" with feDropShadow
2. Dedicated shadow elements — Look for duplicate shapes offset below
3. SVG feGaussianBlur + feOffset — Parse complex filter chains

**Decision:** filter:drop-shadow (Recommended)
**Rationale:** Standard SVG shadow mechanism, directly maps to PPTElementShadow fields

---

### Area 3: Group groupId propagation (GROUP-01)

**Question:** How should <g id='header'> affect PPTElement output?

**Options presented:**
1. Propagate to children — Assign groupId to each direct child element
2. Group as wrapper only — Store groupId on group itself, don't propagate

**Decision:** Propagate to children (Recommended)
**Rationale:** PPTist handles grouping via groupId on individual elements, children need the groupId

---

### Area 4: Image outline + LINE-01

**Question:** What should provide outline on image elements, and what's the LINE-01 mapping?

**Options presented:**
1. stroke on image + stroke-width→width — IMGE: stroke attr → outline; LINE: stroke-width → width
2. Use image clip-path outline — Outline comes from clipped image edges
3. Image has no outline — Mark IMGE-01 as outline-less

**Decision:** stroke on image + stroke-width→width
**Rationale:** Natural SVG stroke mapping for both image and line elements

---

## Summary

| Area | Requirement | Decision |
|------|-------------|----------|
| rx/ry rounded corners | SHPE-01 | Arc commands in path |
| Shadow mapping | SHPE-03 | filter:drop-shadow → PPTElementShadow |
| groupId propagation | GROUP-01 | Propagate to children |
| Image outline source | IMGE-01 | stroke attr → outline |
| LINE stroke-width | LINE-01 | stroke-width → width |

---

*Log created: 2026-06-29*
