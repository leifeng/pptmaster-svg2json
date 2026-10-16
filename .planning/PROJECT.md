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

### Active

- [ ] **CK-01**: 识别 `cover-title-carrier` → 注入 `contentKey: "cover_title"`
- [ ] **CK-02**: 识别 `cover-subtitle-carrier` → 注入 `contentKey: "cover_subtitle"`
- [ ] **CK-03**: 识别 `cover-author-carrier` → 注入 `contentKey: "cover_author"`
- [ ] **CK-04**: 识别 `chapter-number-carrier` → 注入 `contentKey: "chapter_number"`
- [ ] **CK-05**: 识别 `chapter-title-carrier` → 注入 `contentKey: "chapter_title"`
- [ ] **CK-06**: 识别 `chapter-desc-carrier` → 注入 `contentKey: "chapter_desc"`
- [ ] **CK-07**: 识别 `content-title-carrier` → 注入 `contentKey: "content_title"`
- [ ] **CK-08**: 识别 `content-subtitle-carrier` → 注入 `contentKey: "content_subtitle"`
- [ ] **CK-09**: 识别 `closing-thanks-carrier` → 注入 `contentKey: "end_title"`
- [ ] **CK-10**: 识别 `closing-subtitle-carrier` → 注入 `contentKey: "end_subtitle"`
- [ ] **CK-11**: 识别 `toc-item-{N}-number` (N=1..4,预留 1..8) → 注入 `contentKey: "directory_item_number_N"`
- [ ] **CK-12**: 识别 `toc-item-{N}-carrier` 文本主体 → 注入 `contentKey: "directory_item_N"`
- [ ] **CK-13**: 识别 `toc-item-{N}-carrier` 内 `tspan[dy]` → 注入 `contentKey: "directory_item_desc_N"`
- [ ] **CK-14**: 非模板元素(id 不含 `-template` 或不属于映射表)不输出 `contentKey` 字段(字段直接省略,不是 null)
- [ ] **CK-15**: 未知 id 静默跳过(不报错,后续可扩展),仅对 13 个已知模板输出 `contentKey`
- [ ] **CK-16**: contentKey 仅施加于 PPTTextElement 类型元素;其他类型(shape/image/line 等)即使 id 命中映射也忽略

### Out of Scope

- 修改 PPTist 源码 — 不动 `code/PPTist/`
- 修改 animations.json schema — 接受三方规范原文
- 修改 svg_output/ 目录结构 — 仅添加 annotations，不动 SVG 内容
- 运行 PPTist 播放验证 — 转换器只生成 JSON，播放由 PPTist 端负责
- 集成 GSAP / anime.js 处理 motion path — 保留 `extensions.originalEffect` 即可，path_* 不做运行时播放
- 处理三方 sound 资源 — PPTist 不支持音频动画，sound 字段丢弃并写入 extensions

## Context

**Existing library** — svg-to-pptel v1.8, published as npm package.

**Current state** — v1.11 milestone SHIPPED 2026-10-16 (override_closeout — verification skipped but 22/22 implementation tests passing including 9 E2E). Phase 16 (template-element-marking) shipped with 3 plans + 1 post-ship fix (single-line text templateType injection missed in 16-01 implementation). 5 files changed +854/-1. 13 unit + 9 E2E tests passing. Now entering next milestone planning.

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

## Current Milestone: v1.11 — Template Element Marking (Shipped)

**Status:** Shipped 2026-10-16 (override_closeout — verification skipped, 22/22 implementation tests passing).

**Goal:** 在 transformer 阶段识别 SVG 中的"模板元素"(`<element id="*-template">` 或 `<g id="*-template">` 子树),通过 `templateType=1` 标记到 PPTElement;同时把 `content-object-slot-template` 的 `data-pptx-bounds` 解析为 slide 级 `contentBounds` 字段,供 PPTist 端用作"正文/分栏插入区域"提示。

**Goal:** 自动识别 SVG 中的"模板元素"(`<element id="*-template">` 或 `<g id="*-template">` 子元素),通过 `templateType=1` 标记到 PPTElement;同时把 `content-object-slot-template` 的 `data-pptx-bounds` 解析为 slide 级 `contentBounds` 字段,供 PPTist 端用作"正文/分栏插入区域"提示。

**为什么需要 v1.11:** ppt-master 端在做 PPT 模板与数据分离时,需要知道哪些元素是"模板(背景图、装饰)",哪些是"内容占位(由 PPTist 端填正文/分栏)"。当前 svg2json 输出把这两类元素一视同仁地铺进 `slide.elements[]`,丢失了原始 svg 的语义层级。标记 `templateType=1` 是最小代价恢复语义的方案。

**Phase 结构:**
- Phase 16: template-element-marking — transformer 阶段加 templateType=1 + slide-level contentBounds 提取

**Reference docs:**
- 模板来源 fixtures：`E:\git\svg2json\exampels\green-art-teaching\templates\`(纯模板)+ `svg_output\`(带数据最终输出)
- 三方原始 schema：`E:\git\svg2json\ELEMENT_ANIMATIONS.md`(无关,以前动画 leftover)
- 映射关系：`E:\git\svg2json\PPTIST_ANIMATION_MAPPING.md`(无关)

**Status:** Milestone kickoff 2026-10-14, awaiting `/gsd-plan-phase 14` execution.

**Goal:** SVG → PPTist JSON 转换时自动消费 `animations.json` sidecar，生成符合 PPTist 运行时需求的 `slide.animations[]` / `slide.turningMode`，并全量保留三方原始字段到 `extensions`。

**Phase structure:**
- Phase 14: pptist-animation-from-sidecar — 父目录 CLI + id 命名 + 映射 + 兜底 + extensions 全量保留

**Reference docs:**
- 适配分析：`E:\git\svg2json\animation-adaptation-analysis.md`
- 三方 spec：`E:\git\ppt-master\docs\animations.md`
- 实例 sidecar：`E:\git\svg2json\exampels\202610131101001\animations.json`

---

## Current Milestone: v1.12 — Template Content Key Annotation

**Status:** Planning (awaiting `/gsd-plan-phase 17` execution).

**Goal:** 在 transformer 阶段识别 SVG 中的"模板文本元素"(已知 13 个 id 模板),通过 `contentKey` 字段标记到 PPTTextElement;该字段供 PPTist 端用作"用户填写正文"的语义绑定键(cover_title / directory_item_1 / chapter_title 等)。是 v1.11 `templateType=1` 标记的下游扩展。

**为什么需要 v1.12:** v1.11 只告诉 PPTist "这是模板元素",但 PPTist 端需要更细的语义角色 — 知道是封面标题、目录第 1 条、章节序号等 — 才能在用户填写内容时自动定位目标元素。`contentKey` 字段是 PPTist 内容绑定协议要求的稳定字符串键。

**Phase 结构:**
- Phase 17: template-content-key — transformer 阶段按 id 映射表注入 contentKey,覆盖 cover/toc/chapter/content/closing 五大类型 + TOC multiline tspan 边界处理

**Reference docs:**
- 模板来源 fixtures：`E:\git\svg2json\exampels\green-art-teaching\templates\`(02_toc.svg / 03_cover.svg / ...)
- v1.11 模板标记实现：`src/transformer/transform-to-pptel.ts:1535` (templateType 注入点)

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

### v1.10 — Animation Sidecar Extension (2026-10-15)

**Closeout type:** verified_closeout — all phases verified, audit clean (30 acknowledged carry-over items still suppressed from v1.9 close). Phase 15 implementation complete + 2 post-ship fixes.

- ANIM-NONE-01~03: `effect: "none"` cascade (row / defaults.animation / defaults.transition)
- ANIM-EXTS-01/02: full field preservation to `extensions` (camelCase top-level, nested verbatim)
- ANIM-MAP-EXT-01/02/03: 53/33/53 full-coverage mapping tables (`ENTRANCE_MAP` / `EMPHASIS_MAP` / `EXIT_MAP`)
- ANIM-DELAY-01: `delay + duration` merged into single clamped ms duration
- ANIM-INHERIT-01: `resolveEffectiveRow` pure-function with 5-layer inheritance chain
- ANIM-CHROME-01: forward-compat helpers (`CHROME_REGEX` + `isChromeGroupId`)
- Post-ship fixes:
  - ANIM-LEGACY-01: 29-entry `LEGACY_NAME_MAP` normalizing fly/zoom/wipe_left etc. → canonical `entrance_*` (commit `913e342`)
  - ANIM-ORIGTRIG-01: `extensions.originalTrigger` unconditional preservation (commit `9fa7fec`)

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

*Last updated: 2026-10-16 after v1.12 milestone kickoff (Phase 17 planned for content-key mapping)*
