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

---

## v1.3 — resvg-js Text Measurement

**Started:** 2026-07-01
**Completed:** 2026-07-01
**Status:** Complete

**Goal:** 用 resvg-js 替代纯 JS 字体度量计算，获取 text 元素的真实宽度和高度

**Deliverables:**
- 安装 @resvg/resvg-js 依赖
- 创建 `src/text-measurer.ts` 模块，提供 `measureTextBBox()` API
- 通过 `transformElement()` → `walk()` → `transformToPPTElement()` 传播异步
- 移除废弃的 `calcTextWidthYaHei()` 和 `BASELINE_OFFSET_RATIO`
- 新增 `parseStrokeColor()` 函数处理透明 stroke

**Key Decisions:**
- D-35: Measurement failure falls back to heuristic
- D-36: Tspan children flattened with newline before measurement
- D-37: Fixed 1280x720 viewBox for measurement SVG

**Metrics:**
- Phases: 1 (Phase 6)
- Plans: 2 (06-01, 06-02)
- Files: 29 changed, +2008, -515
- Tests: 151 passed

**Accomplishments:**
1. 集成 @resvg/resvg-js 实现精确文本边界框测量
2. 创建 text-measurer.ts 模块
3. 通过 transformElement() → walk() → transformToPPTElement() 传播异步
4. 移除废弃函数 calcTextWidthYaHei 和 BASELINE_OFFSET_RATIO
5. 修复 circle fill="none" 和 path 缩放不一致问题
6. 修复 transparent stroke 颜色处理
