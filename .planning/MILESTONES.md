# Milestones

## v1.6 — SVG Converter Refactor

**Started:** 2026-07-10
**Completed:** 2026-07-13
**Status:** Complete

**Goal:** 重构 SVG 转换器核心逻辑，修复嵌套变换、路径命令、clipPath 等问题

**Deliverables:**
- 修复 `<g>` 嵌套 transform 累加问题
- 修复 S/s、T/t 命令反射计算
- clipPath 预处理集成
- baseline-shift 像素值缩放
- 提取 path-utils.ts 模块

**Key Decisions:**
- REF-01: Parent transform composition via composeTransforms()
- REF-02: S/s T/t reflection formula rx=2*curX-prevCtrlX, ry=2*curY-prevCtrlY
- REF-03: clipPath coordinate expansion via AST preprocessing
- REF-04: baseline-shift pixel scaling by scaleY
- REF-05: Unified path utilities in src/utils/path-utils.ts

**Metrics:**
- Phases: 1 (Phase 09)
- Plans: 2 (09-01, 09-02)
- Commits: 7 (70fc433 → cf89dbd)
- Timeline: ~1 day

**Accomplishments:**
1. Nested `<g>` transform accumulation fixed — parent transform composed with child via composeTransforms()
2. S/s T/t bezier reflection corrected with proper control point tracking
3. clipPath preprocessing integrated as AST preprocessor (clip-path-preprocessor.ts)
4. baseline-shift pixel values scaled by scaleY (e.g., -5px → -3.90625)
5. path-utils.ts extracted as unified module for toAbsolutePath and scalePathCoords
6. ellipse cx/cy fixed — scale factors properly applied to center coordinates

---

## v1.5 — Use Tag Refactor

**Started:** 2026-07-10
**Completed:** 2026-07-10
**Status:** Complete

**Goal:** Extract SVG `<use>` tag handling into separate module and enhance to support external SVG file references

**Deliverables:**
- Extract autoEmbedIcons to src/svg-use-handler.ts
- External SVG files via `<use href="file.svg">` rendered to PNG and embedded
- Relative paths resolved based on main SVG file location

**Key Decisions:**
- USE-01: Extract autoEmbedIcons to independent module
- USE-02: Use resvg-js to render external SVG to PNG
- USE-03: Relative paths resolved via svgFilePath parameter

---

## v1.4 — Directory Batch CLI

**Started:** 2026-07-02
**Completed:** 2026-07-02
**Status:** Complete

**Goal:** Implement directory batch conversion CLI — read SVG files from directory, convert each to JSON, save to same directory

**Deliverables:**
- Directory-based batch conversion CLI
- Read all .svg files from input directory
- Output JSON files to same directory
- Summary output: "Converted N files, M failed"

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

---

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
