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
- ✓ **baseline-shift pixel scaling** — Scale pixel values by scaleY (e.g., -5px → -3.90625)
- ✓ **TEXT-WHPASS-01/02/03** — SVG text width/height passthrough fast path — v1.7
- ✓ **PATH-MERGE-01~05** — path merge decision tree and implementation — v1.7
- ✓ **FONT-PREPROCESS-01~04** — font preprocessor normalizes all fonts to Source Han Sans CN Regular — v1.7
- ✓ **FONT-VALIDATION-01~03** — CLI startup font validation with three-layer defense (existsSync + magic-bytes + getBBox) — v1.8
- ✓ **DIR-BATCH-01** — Directory batch CLI processes `*.svg` recursively, outputs `<svg>.json` siblings — v1.4

### Active

#### v1.9 — PPTist Animation Sidecar Injection

- [ ] **ANIM-CLI-01**: CLI 入参改为接受「父级目录」路径；目录中 `svg_output/` 子目录放源 SVG，根目录可放 `animations.json`（可选）
- [ ] **ANIM-CLI-02**: 检测到 `animations.json` 时自动启用动画注入；缺失时不报错，按无动画模式生成
- [ ] **ANIM-CLI-03**: 父目录输入时输出仍为多文件 JSON（每个 SVG 一个 .json），位于 `svg_output/` 内
- [ ] **ANIM-ID-01**: transformer 给 `<g id="x">` 子元素生成的 PPTElement.id 使用 `<group_id>__<nanoid(8)>` 格式，确保跨 g 不冲突且定位精确
- [ ] **ANIM-ID-02**: 同一 `<g>` 下多个子元素各自获得独立 id（即使被 path-merge 合并仍保留子 id，可选择性挂动画）
- [ ] **ANIM-MAP-01**: `animations.json` 的 `slides.<slide_id>` 对应 `svg_output/<slide_id>.svg`（去后缀）
- [ ] **ANIM-MAP-02**: `slides.<slide_id>.groups.<group_id>` 对应 SVG 中 `<g id="<group_id>">` 锚点
- [ ] **ANIM-MAP-03**: 每个 group 解析为 1+ 条 `PPTAnimation` 写入对应 Slide 的 `animations` 数组
- [ ] **ANIM-MAP-04**: `elId` 字段使用对应元素在 transformer 阶段生成的 `<group_id>__<nanoid(8)>` id
- [ ] **ANIM-MAP-05**: 单 entry 格式 `{effect, order, duration}` 与 `effects[]` 数组格式都支持
- [ ] **ANIM-MAP-06**: 三方字段未映射项保留到 `PPTAnimation.extensions` 字段，**全量无损**
- [ ] **ANIM-TRANS-01**: `duration` 单位转换：三方秒 → PPTist 毫秒（×1000 + round）
- [ ] **ANIM-TRANS-02**: `trigger` 转换：`on-click → click`、`with-previous → meantime`、`after-previous → auto`
- [ ] **ANIM-TRANS-03**: `effect` 映射：能映射的（entrance + emphasis + exit 常用 key）写到 PPTAnimation.effect；映射不到的写到 `extensions.originalEffect`
- [ ] **ANIM-TURN-01**: `slides.<slide_id>.transition.effect` 写入 `Slide.turningMode`，48 个三方 key → 12 个 TurningMode（未对应 fallback 为 `fade`）
- [ ] **ANIM-DEFAULTS-01**: `defaults.animation` / `defaults.transition` 生效于所有 slide 的对应字段缺省值
- [ ] **ANIM-DIAG-01**: 转换结束打印被映射/被保留/被丢弃字段的统计报告（写 stderr，不进 JSON）

### Out of Scope

- 修改 PPTist 源码 — 不动 `code/PPTist/`
- 修改 animations.json schema — 接受三方规范原文
- 修改 svg_output/ 目录结构 — 仅添加 annotations，不动 SVG 内容
- 运行 PPTist 播放验证 — 转换器只生成 JSON，播放由 PPTist 端负责
- 集成 GSAP / anime.js 处理 motion path — 保留 `extensions.originalEffect` 即可，path_* 不做运行时播放
- 处理三方 sound 资源 — PPTist 不支持音频动画，sound 字段丢弃并写入 extensions

## Context

**Existing library** — svg-to-pptel v1.8, published as npm package.

**Current state** — v1.8 milestone SHIPPED 2026-08-07. Phase 13 (CLI Font Validation) completed with 24 tests green, plus 15 pre-existing failures in gradient / image-outline / path-merge / shadow / shape-rx suites (documented, accepted, deferred to future milestones).

**Target canvas** — 1000×562.5 (16:9 aspect ratio).

**Tech stack:** TypeScript strict mode, CommonJS, fast-xml-parser, cac, picocolors, uuid, @resvg/resvg-js

**Three-party spec source:** `E:\git\ppt-master\docs\animations.md` (52 transition + 203 effect keys)
**Sidecar instance data:** `E:\git\svg2json\exampels\202610131101001\animations.json` (13 slide overrides)

## Constraints

- **Target canvas**: 1000×562.5 — hard-coded, not configurable
- **TypeScript**: Strict mode, compiled to CommonJS
- **Dependencies**: fast-xml-parser, cac, picocolors, uuid, @resvg/resvg-js
- **Fonts**: Source Han Sans CN Regular (single font, validated at CLI startup)
- **Three-party fidelity**: animations.json 全量字段保留（不丢字段），即使 PPTist 不识别也写到 extensions

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
| Three-layer font validation | existsSync + TTF magic-bytes + Resvg getBBox non-zero | ✓ Complete (v1.8) |
| Real subprocess exit-code tests | Direct catch on err.status / err.stderr | ✓ Complete (v1.8) |
| Directory Batch CLI | v1.4 directory input → sibling .json output | ✓ Complete |
| v1.9: PPTAnimation.extensions 全量字段 | 用户要求 JSON 无损 — 即使 PPTist 不识别也保留三方原字段 | — Pending |
| v1.9: id 命名 `<g.id>__<nanoid(8)>` | 双下划线分隔避开 PPTist nanoid 冲突；跨 g 唯一 | — Pending |
| v1.9: 父目录入参含 svg_output/ + animations.json | 三方约定目录结构；保留单 SVG 入口作为隐式父目录（cwd/svg_output/） | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.9 — PPTist Animation Sidecar Injection (Planning)

**Status:** Milestone kickoff 2026-10-14, awaiting `/gsd-plan-phase 14` execution.

**Goal:** SVG → PPTist JSON 转换时自动消费 `animations.json` sidecar，生成符合 PPTist 运行时需求的 `slide.animations[]` / `slide.turningMode`，并全量保留三方原始字段到 `extensions`。

**Phase structure:**
- Phase 14: pptist-animation-from-sidecar — 父目录 CLI + id 命名 + 映射 + 兜底 + extensions 全量保留

**Reference docs:**
- 适配分析：`E:\git\svg2json\animation-adaptation-analysis.md`
- 三方 spec：`E:\git\ppt-master\docs\animations.md`
- 实例 sidecar：`E:\git\svg2json\exampels\202610131101001\animations.json`

---

## Previous Milestones

### v1.8 — CLI 字体验证 (2026-08-07)

- FONT-VALIDATION three-layer defense + CLI startup gate + real subprocess tests

### v1.7 — Path 合并优化 (2026-07-23)

- PATH-MERGE decision tree for `<g>` path merging
- TEXT-WHPASS SVG text width/height passthrough
- FONT-PREPROCESS font normalization to Source Han Sans CN

### v1.6 — SVG Converter Refactor (2026-07-13)

- Nested `<g>` transform accumulation fixed
- S/s T/t bezier reflection corrected
- clipPath preprocessing integrated
- baseline-shift pixel values scaled by scaleY

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

*Last updated: 2026-10-14 after v1.9 milestone kickoff*
