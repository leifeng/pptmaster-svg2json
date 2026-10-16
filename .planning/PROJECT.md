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
- ✓ **ANIM-NONE-01/02/03** — `effect: "none"` cascade (legacy row / defaults.animation / defaults.transition) — v1.10
- ✓ **ANIM-EXTS-01/02** — All row fields (incl. `restart`/`after_effect`/`sound`) preserved to extensions via camelCase; effect_options top-level → `effectOptions`, nested verbatim — v1.10
- ✓ **ANIM-MAP-EXT-01/02/03** — Three-way mapping tables extended to 53/33/53 full coverage of ELEMENT_ANIMATIONS.md §4.6 — v1.10
- ✓ **ANIM-DELAY-01** — PPTAnimation.duration = clamp(round((delay + duration) × 1000), 100, 5000) — v1.10
- ✓ **ANIM-INHERIT-01** — `resolveEffectiveRow` pure function with 5-layer inheritance chain (CLI → deck → slide → group → row) — v1.10
- ✓ **ANIM-CHROME-01** — `CHROME_REGEX` + `isChromeGroupId()` forward-compat helpers (not wired into iteration) — v1.10
- ✓ **ANIM-LEGACY-01** — 29-entry LEGACY_NAME_MAP normalizing bare names (`fly`/`zoom`/`wipe_left`/etc.) to canonical `entrance_*` — v1.10 post-ship
- ✓ **ANIM-ORIGTRIG-01** — `extensions.originalTrigger` unconditional preservation per D-11 spec intent — v1.10 post-ship
- ✓ **TPL-MARK-01** — renderable element id contains `-template` → `templateType=1` — v1.11
- ✓ **TPL-MARK-02** — `<g id="*-template">` ancestor chain propagation to renderable children (any depth) — v1.11
- ✓ **TPL-MARK-03** — `content-object-slot-template` exception (excludes both elementId and groupId match) — v1.11
- ✓ **TPL-CB-01** — `data-pptx-bounds` on `<g id="content-object-slot-template">` → slide.contentBounds `{x, y, width, height}` — v1.11
- ✓ **TPL-CB-02** — first match wins (DFS depth-first) — v1.11
- ✓ **TPL-CB-03** — field omitted when slot missing/malformed (no null leakage) — v1.11
- ✓ **TPL-NONREN-01** — `<defs>` / `<linearGradient>` etc. skipped before templateType assignment — v1.11
- ✓ **TPL-E2E-01** — 20-fixture E2E coverage with exact bounds + counts — v1.11
- ✓ **TPL-E2E-02** — reverse assertion: templateType ∈ {1, undefined} only (with explicit anti-values null/true/'1'/2) — v1.11
- ✓ **CK-01 ~ CK-10**: 10 静态映射(cover/chapter/content/closing)→ 对应 contentKey 注入 PPTTextElement — v1.12
- ✓ **CK-11 ~ CK-13**: TOC 动态 N=1..8 三类(number/carrier/note-carrier)+ multiline tspan[dy] 拆分 → directory_item_*_N 注入 — v1.12
- ✓ **CK-14 / CK-15**: 非映射 id 整字段省略(`undefined` 不序列化,不是 null/空串)— v1.12
- ✓ **CK-16**: contentKey 仅施加于 PPTTextElement 类型,非文本元素即使 id 命中也忽略 — v1.12
- ✓ **CK-17**: 动态 N=1..8 上限锁定,fixture 实际 N=1..4 命中 — v1.12

### Active

_(v1.13 Page Data Extraction — requirements 定义中,待写 `.planning/REQUIREMENTS.md`)_

### Out of Scope

- 修改 PPTist 源码 — 不动 `code/PPTist/`
- 修改 animations.json schema — 接受三方规范原文
- 修改 svg_output/ 目录结构 — 仅添加 annotations，不动 SVG 内容
- 运行 PPTist 播放验证 — 转换器只生成 JSON，播放由 PPTist 端负责
- 集成 GSAP / anime.js 处理 motion path — 保留 `extensions.originalEffect` 即可，path_* 不做运行时播放
- 处理三方 sound 资源 — PPTist 不支持音频动画，sound 字段丢弃并写入 extensions

## Context

**Existing library** — svg-to-pptel v1.8, published as npm package.

**Current state** — v1.12 milestone SHIPPED 2026-10-16 (verified_closeout — 17/17 must-haves passed, 76 tests passed). Now entering v1.13 (Page Data Extraction) kickoff: 基于 v1.12 已实现的 17 个 contentKey,在 transformer 阶段提取 SVG 原始 textContent,输出 `slide.pageData` 字段。Phase 18 (page-data-extraction) 计划中,等待 `/gsd-plan-phase 18` 执行。

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
| v1.10: `resolveEffectiveRow` 纯函数 | 五层 inheritance chain 抽出,DTO 化 row-level 子解析 | ✓ Complete |
| v1.10: D-13 `delay + duration` 合并 | PPTAnimation.duration clamp [100, 5000] ms | ✓ Complete |
| v1.10: D-02/D-03 `effect: "none"` 级联 | row / defaults.animation / defaults.transition 全部走 'no'/'skip' 兜底 | ✓ Complete |
| v1.10: ANIM-CHROME-01 forward-compat | `CHROME_REGEX` + `isChromeGroupId()` 助手导出但不接入 | ✓ Complete (forward-compat) |
| v1.10 post-fix: LEGACY_NAME_MAP | 29 项裸名归一(镜像 ELEMENT_ANIMATIONS.md §4.7 lines 490-520) | ✓ Complete (post-ship) |
| v1.10 post-fix: originalTrigger unconditional | 无条件保留 row.trigger,与 originalEffect 行为对齐 | ✓ Complete (post-ship) |
| v1.11: `templateType?: 1` literal field | 字面量类型让 TypeScript 编译期拦截非法赋值,反向断言锁字面量 | ✓ Complete |
| v1.11: typeof-guarded `.includes('-template')` | 防御 fast-xml-parser 在 attributeValueParsing 模式下把 id 解析为 number 的情形 | ✓ Complete |
| v1.11: D-TPL-07 (revised) slot subtree 例外 | elementId 和 groupId 命中 `-template` 时,若等于 `content-object-slot-template` 则不写 — slot 子树不向下传播 | ✓ Complete |
| v1.11: convertOne 内 `findContentBounds()` DFS | 不动 `transformToPPTElement()` 签名 → 所有现有调用点/单元测试零回归 | ✓ Complete |
| v1.11: 严格 `/\\s+/` 解析 `data-pptx-bounds` | `Number()` + `Number.isNaN` 三重过滤拒绝 "98abc" 前缀解析泄漏 | ✓ Complete |
| v1.11: `Object.keys(slide)` 字段缺失断言 | 比 `slide.contentBounds === undefined` 更贴近 TPL-CB-03 "字段直接省略"字面要求 | ✓ Complete |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

## Current Milestone: v1.13 — Page Data Extraction (Planning)

**Status:** Planning 2026-10-16 (awaiting `/gsd-plan-phase 18` execution).

**Goal:** 基于 v1.12 已实现的 17 个 contentKey,在 transformer 阶段提取 SVG 原始 textContent,输出 `slide.pageData` 字段(sibling of `elements`)。目录数据特殊处理为 `[{index, title, desc}]` 数组(按 N 升序,仅 fixture 命中项)。是 v1.12 `contentKey` 注入的下游"语义数据"扩展。

**为什么需要 v1.13:** v1.12 给 PPTElement 打上 `contentKey` 标记,只告诉 PPTist"这是哪个语义角色"。但 PPTist 在做内容绑定时还需要拿到对应的**实际纯文本数据**(如封面标题文案、目录第 1 条标题 + 描述)。把这些文本从 SVG 原始 `textContent` 提取到 `slide.pageData`,PPTist 端可直接读 `pageData.directory[0].title` 等结构化数据,无需自己再解析 PPTTextElement 的 HTML content。是 v1.12 contentKey 协议的"数据侧"补全。

**Phase 结构:**
- Phase 18: page-data-extraction — transformer 阶段新增 `PPTBaseElement.textContent` + `slide.pageData`,复用 v1.12 `getContentKeyFor()` 映射,TOC 数组按 N 升序聚合

**Reference docs:**
- v1.12 contentKey 实现:`src/utils/content-key.ts`(34 entries,10 静态 + 24 动态 N=1..8)
- v1.12 contentKey 注入点:`src/transformer/transform-to-pptel.ts:1535`
- 模板 fixtures:`exampels/green-art-teaching/templates/`(01_cover / 02_toc / 03_chapter / 04_content / 05_ending)
- 注释来源:`exampels/green-art-teaching/templates/01_cover.svg:56-66`(IPageData 协议定义)

---

## Previous Milestones

### v1.12 — Template Content Key Annotation (2026-10-16)

**Closeout type:** verified_closeout — 17/17 must-haves passed, 76 tests green (45 unit + 8 mock SVG E2E + 14 fixture E2E + 9 v1.11 regression). Phase 17 implementation complete.

- CK-01~03: cover 3 静态 id → `cover_title` / `cover_subtitle` / `cover_author`
- CK-04~06: chapter 3 id → `chapter_number` / `chapter_title` / `chapter_desc`
- CK-07~08: content 2 id → `content_title` / `content_subtitle`
- CK-09~10: closing 2 id → `end_title` / `end_subtitle`
- CK-11~13: TOC 3 类动态 N=1..8 (number / carrier / note-carrier) → `directory_item_number_N` / `directory_item_N` / `directory_item_desc_N`
- CK-14/15/16: 字段省略守卫(未命中/未知/非文本)
- CK-17: 实际 fixture N=1..4 命中,N=5..8 静默跳过

### v1.11 — Template Element Marking (2026-10-16)

**Closeout type:** override_closeout — verification 跳过 but implementation 22/22 tests passing (13 unit + 9 E2E).

- TPL-MARK-01: renderable element id 含 `-template` → `templateType=1`
- TPL-MARK-02: `<g id="*-template">` 祖先链传播(任意深度)
- TPL-MARK-03: `content-object-slot-template` 例外(不向下传播)
- TPL-CB-01: `data-pptx-bounds` → `slide.contentBounds {x, y, width, height}`
- TPL-CB-02/03: 首匹配胜出 + 字段缺失省略
- TPL-E2E-01/02: 20 fixture E2E + 反向断言

### v1.10 — Animation Sidecar Extension (2026-10-15)

**Closeout type:** verified_closeout — audit clean. Phase 15 + 2 post-ship fixes.

- ANIM-NONE-01~03: `effect: "none"` 级联
- ANIM-EXTS-01/02: 全字段保留到 `extensions`
- ANIM-MAP-EXT-01/02/03: 53/33/53 完整覆盖映射
- ANIM-DELAY-01: `delay + duration` 合并 ms
- ANIM-INHERIT-01: `resolveEffectiveRow` 五层继承链
- ANIM-CHROME-01: forward-compat helpers
- Post-ship: `LEGACY_NAME_MAP` (29 entries) + `originalTrigger` unconditional

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

*Last updated: 2026-10-16 after v1.13 milestone kickoff (page-data-extraction planning, awaiting `/gsd-plan-phase 18` execution)*
