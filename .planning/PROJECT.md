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
- ✓ **ANIM-CLI-01~03** — Parent-dir CLI dispatch + sidecar detection — v1.9
- ✓ **ANIM-ID-01~02** — `<group_id>__<nanoid(8)>` id naming under `<g>` children — v1.9
- ✓ **ANIM-MAP-01~06** — `animations.json` ↔ `<g id="gid">` mapping, single-entry + array forms, extensions field for unmapped — v1.9
- ✓ **ANIM-TRANS-01~03** — duration seconds→ms, trigger `on-click→click` mapping, effect whitelist mapping — v1.9
- ✓ **ANIM-TURN-01** — 48-key → 12 `TurningMode` mapping with `fade` fallback — v1.9
- ✓ **ANIM-DEFAULTS-01** — `defaults.animation` / `defaults.transition` propagation through slide-level — v1.9
- ✓ **ANIM-DIAG-01** — Mapping/preserved/dropped field counter summary (stderr-only) — v1.9

### Active

#### v1.10 — Animation Sidecar Extension (in progress)

- [ ] **ANIM-NONE-01**: `groups[gid].effect === "none"`（legacy 单 effect 形式）时不发射任何 PPTAnimation
- [ ] **ANIM-NONE-02**: `defaults.animation.effect === "none"` 时该 slide 不生成 animations，除非 row-level effect 显式非 none
- [ ] **ANIM-NONE-03**: `defaults.transition.effect === "none"` 或 slide-level `transition.effect === "none"` 时 `slide.turningMode === "no"`（保留 auto_advance / sound 语义）
- [ ] **ANIM-EXTS-01**: 所有 row 字段（含 `restart`、`after_effect`、`sound`）原样保留到 `extensions`（camelCase 顶层键）
- [ ] **ANIM-EXTS-02**: `effect_options` 顶层 camelCase 为 `effectOptions`，嵌套键 verbatim
- [ ] **ANIM-MAP-EXT-01**: `ENTRANCE_MAP` 覆盖所有 53 个三方 entrance_* key，值 ∈ PPTist 84-effect whitelist 或 fallback
- [ ] **ANIM-MAP-EXT-02**: `EMPHASIS_MAP` 覆盖所有 33 个三方 emphasis_* key
- [ ] **ANIM-MAP-EXT-03**: `EXIT_MAP` 覆盖所有 53 个三方 exit_* key
- [ ] **ANIM-DELAY-01**: PPTAnimation.duration = clamp(round((row.delay + row.duration) * 1000), 100, 5000)
- [ ] **ANIM-INHERIT-01**: 实现 `resolveEffectiveRow` 纯函数，五层链路 CLI → deck → slide → group → row
- [ ] **ANIM-CHROME-01**: 导出 `CHROME_REGEX` 与 `isChromeGroupId(id)` 助手；不接入 iteration loop（forward-compat）
- [ ] **ANIM-LEGACY-01**: 29 个 legacy 输入名（`fly`/`zoom`/`wipe_left` 等）归一到 canonical `entrance_*`，再走映射查表 — _post-v1.9 fix_ (post-ship)
- [ ] **ANIM-ORIGTRIG-01**: `extensions.originalTrigger` 无条件保留 D-11 spec 意图 — _post-v1.9 fix_ (post-ship)

### Out of Scope

- 修改 PPTist 源码 — 不动 `code/PPTist/`
- 修改 animations.json schema — 接受三方规范原文
- 修改 svg_output/ 目录结构 — 仅添加 annotations，不动 SVG 内容
- 运行 PPTist 播放验证 — 转换器只生成 JSON，播放由 PPTist 端负责
- 集成 GSAP / anime.js 处理 motion path — 保留 `extensions.originalEffect` 即可，path_* 不做运行时播放
- 处理三方 sound 资源 — PPTist 不支持音频动画，sound 字段丢弃并写入 extensions

## Context

**Existing library** — svg-to-pptel v1.8, published as npm package.

**Current state** — v1.9 milestone SHIPPED 2026-10-15 (override_closeout, 30 items acknowledged as deferred tech debt). Phase 14 (PPTist Animation Sidecar Injection) shipped with 3 plans, 9 feat/test commits, +4888 LOC. Post-ship fixes: `extensions.originalTrigger` unconditional preservation (D-11), legacy name normalization (29-entry LEGACY_NAME_MAP). v1.10 (Phase 15) implementation complete, awaiting separate closeout.

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
| v1.9: PPTAnimation.extensions 全量字段 | 用户要求 JSON 无损 — 即使 PPTist 不识别也保留三方原字段 | ✓ Complete |
| v1.9: id 命名 `<g.id>__<nanoid(8)>` | 双下划线分隔避开 PPTist nanoid 冲突；跨 g 唯一 | ✓ Complete |
| v1.9: 父目录入参含 svg_output/ + animations.json | 三方约定目录结构；保留单 SVG 入口作为隐式父目录（cwd/svg_output/） | ✓ Complete |
| v1.9: D-22 strict guard | 不在 sidecar 里的 slide 永不生成 animations（含 transition） | ✓ Complete |
| v1.9: N→N group coverage | 每 row × 每个匹配 groupId 的 PPTElement 都发射 animation | ✓ Complete |
| v1.9: ANIM-DIAG-01 stderr diagnostics | 转换结束打印 5 项计数 (slides/animations/extensions/unmapped/delay) | ✓ Complete |
| v1.9 post-fix: LEGACY_NAME_MAP (29 项) | fly/zoom/wipe_left 等裸名归一到 canonical entrance_* 再走映射 | ✓ Complete (post-ship) |
| v1.9 post-fix: originalTrigger unconditional | 与 originalEffect 对齐 — 无条件保留 D-11 spec 意图 | ✓ Complete (post-ship) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.10 — Animation Sidecar Extension (Planning)

**Status:** Phase 15 (Wave 1+2) implementation complete, awaiting `/gsd-complete-milestone v1.10` to formalize closeout. Plus post-ship fixes (ANIM-LEGACY-01, ANIM-ORIGTRIG-01) shipped as v1.9.1 hot-fix — see STATE.md deferred items.

**Goal:** 扩展动画 sidecar 处理 — `effect: "none"` cascade, 三方字段原封不动存 extensions, 三方→PPTist effect 全覆盖映射 (53/53/33), `delay + duration` 合并, inheritance chain, chrome forward-compat.

**Reference docs:**
- 三方原始 schema：`E:\git\svg2json\ELEMENT_ANIMATIONS.md`
- 映射关系：`E:\git\svg2json\PPTIST_ANIMATION_MAPPING.md`
- 实例 sidecar：`E:\git\svg2json\exampels\ppt169_attention_is_all_you_need\animations.json`

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

### v1.9 — PPTist Animation Sidecar Injection (2026-10-15)

**Closeout type:** override_closeout — all phases verified, but 30 open debug items acknowledged as deferred tech debt (28 v1.x-carried + 1 v1.10 post-ship + 1 v1.8 verification gap).

- ANIM-CLI-01~03: parent-dir CLI dispatch with `svg_output/` + `animations.json` convention
- ANIM-ID-01~02: `<group_id>__<nanoid(8)>` id-injection in transformer
- ANIM-MAP-01~06: sidecar → slide bridge with 1:1 + N→N coverage and `extensions` passthrough
- ANIM-TRANS-01~03: duration seconds→ms, trigger mapping, effect whitelist mapping
- ANIM-TURN-01: 48-key → 12 `TurningMode` with `fade` fallback
- ANIM-DEFAULTS-01: per-entry → sidecar defaults inheritance
- ANIM-DIAG-01: stderr-only diagnostic summary (5 counters)
- Post-ship fixes: `extensions.originalTrigger` unconditional + 29-entry `LEGACY_NAME_MAP` legacy normalization

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

*Last updated: 2026-10-15 after v1.9 milestone closeout (override_closeout)*
