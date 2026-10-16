# Roadmap — svg-to-pptel

## Milestones

- ✅ **v1.0** — Initial release (2026-06-25)
- ✅ **v1.1** — transform-fixes (2026-06-29)
- ✅ **v1.2** — PPTist格式对齐 (2026-06-30)
- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)
- ✅ **v1.6** — SVG Converter Refactor (2026-07-13)
- ✅ **v1.7** — Path 合并优化 (2026-07-23)
- ✅ **v1.8** — CLI 字体验证 (2026-08-07)
- ✅ **v1.9** — PPTist Animation Sidecar Injection (2026-10-15)
- ✅ **v1.10** — Animation Sidecar Extension (2026-10-15)
- ✅ **v1.11** — Template Element Marking (2026-10-16)
- ✅ **v1.12** — Template Content Key Annotation (2026-10-16)
- 🚧 **v1.13** — Page Data Extraction (Planning)

## Phases

<details>
<summary>✅ v1.12 — Template Content Key Annotation (Phase 17) — SHIPPED 2026-10-16</summary>

- [x] Phase 17: template-content-key (4/4 plans) — completed 2026-10-16
  - 17-01: `src/utils/content-key.ts` helper (10 静态 + 24 动态 N=1..8 × 3 类 = 34 entries) + 单元测试 45 it() (10 静态 + 24 动态 + 4 reverse + 3 boundary + 4 invariant)
  - 17-02: `PPTBaseElement.contentKey?: string` 字段 + `transformElement()` 顶部 compute + 单行 text case 末尾写入 + CK-16 类型守卫(8 个非文本 case 不写)
  - 17-03: multiline text case `tspanElements.map` Row 1 (→ `directory_item_N`) vs Row 2..N (→ `directory_item_desc_N`) 区分 + mock SVG E2E 8 it() (N=5..8 三类 + tspan[dy] 拆分 + reverse + 类型守卫 + 白名单)
  - 17-04: 20 fixture svg.json 重生 + fixture E2E 14 it() (CK-01 ~ CK-17 全 slide 反向断言)
  - **Closeout type:** verified_closeout — verifier passed 17/17 must-haves;76 tests passed (45 unit + 8 mock + 14 fixture + 9 v1.11 无回归);30 acknowledged carry-over items still suppressed from v1.9

</details>

<details>
<summary>✅ v1.11 — Template Element Marking (Phase 16) — SHIPPED 2026-10-16</summary>

- [x] Phase 16: template-element-marking (3/3 plans) — completed 2026-10-16
  - 16-01: PPTBaseElement.templateType?: 1 字面量字段 + transformElement() 顶部 typeof-guarded isTemplate 注入(8 cases + multiline + icon + path-merge)
  - 16-02: Slide.contentBounds?: {x, y, width, height} 可选字段 + findContentBounds() DFS helper + convertOne() 集成
  - 16-03: 9 E2E 测试 on `exampels/green-art-teaching` 20 fixture slides(cover≥5 / toc≥4 / ending≥4 / 04_content 精确 contentBounds + 反向断言 + 字段缺失断言)
  - **Post-ship fix (2026-10-16):** text single-line 分支补 templateType 注入(`5466417`)— 16-01 实施遗漏
  - **Closeout type:** override_closeout — verification 跳过但 implementation 测试 22/22 通过(13 unit + 9 E2E);30 acknowledged carry-over items still suppressed from v1.9

</details>

<details>
<summary>✅ v1.10 — Animation Sidecar Extension (Phase 15) — SHIPPED 2026-10-15</summary>

- [x] Phase 15: animation-sidecar-extended (2/2 plans) — completed 2026-10-15
  - 15-01: Extend ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP to 53/33/53 = 139 full coverage + D-02 none cascade + D-03 transition 'none' → turningMode 'no' + D-13 delay+duration merge + 2 new diagnostics counters
  - 15-02: `resolveEffectiveRow` pure-function resolver (D-15 inheritance) + D-06 afterEffect/sound extensions + D-04 chrome forward-compat helpers + `chromeSkippedGroups` counter
  - **Post-ship fixes (2026-10-15):** `extensions.originalTrigger` unconditional preservation (commit `9fa7fec`); 29-entry `LEGACY_NAME_MAP` normalizing fly/zoom/wipe_left etc. (commit `913e342`)
  - **Closeout type:** verified_closeout — 30 acknowledged items still suppressed from v1.9 close, audit clean

</details>

<details>
<summary>✅ v1.9 — PPTist Animation Sidecar Injection (Phase 14) — SHIPPED 2026-10-15</summary>

- [x] Phase 14: pptist-animation-from-sidecar (3/3 plans) — completed 2026-10-15
  - 14-01: Parent-dir CLI dispatch + convertDir() shell + transformer id-injection (D-05~09) + PPTAnimation.extensions field (D-10)
  - 14-02: Pure-function mapper tables + sidecar → slide bridge + convertDir() wiring (D-11~23) — animations live for the first time
  - 14-03: D-21 row-level defaults + D-23 stderr-only diagnostics + 74-test E2E coverage (ANIM-DIAG-01)
  - **Closeout type:** override_closeout (30 items acknowledged as deferred tech debt; v1.9 itself fully verified)

</details>

<details>
<summary>✅ v1.8 — CLI 字体验证 (Phase 13) — SHIPPED 2026-08-07</summary>

- [x] Phase 13: CLI Font Validation (2/2 plans) — completed 2026-08-06

</details>

<details>
<summary>✅ v1.7 — Path 合并优化 (Phases 10-12) — SHIPPED 2026-07-23</summary>

- [x] Phase 10: Path Merge (2/2 plans) — completed 2026-07-13
- [x] Phase 11: Text Width/Height Passthrough (1/1 plan) — completed 2026-07-23
- [x] Phase 12: Font Preprocess (1/1 plan) — completed 2026-07-23

</details>

<details>
<summary>✅ v1.6 — SVG Converter Refactor (Phase 9) — SHIPPED 2026-07-13</summary>

- [x] Phase 9: SVG Converter Refactor — completed 2026-07-13

</details>

<details>
<summary>✅ v1.5 — Use Tag Refactor (Phase 8) — SHIPPED 2026-07-10</summary>

- [x] Phase 8: Use Tag Refactor — completed 2026-07-10

</details>

<details>
<summary>✅ v1.4 — Directory Batch CLI (Phase 7) — SHIPPED 2026-07-02</summary>

- [x] Phase 7: Directory Batch CLI — completed 2026-07-02

</details>

<details>
<summary>✅ v1.3 — resvg-js Text Measurement (Phase 6) — SHIPPED 2026-07-01</summary>

- [x] Phase 6: resvg-js Text Measurement — completed 2026-07-01

</details>

## Active

🚧 **v1.13 — Page Data Extraction** (Planning — `Phase 18` ready, awaiting `/gsd-plan-phase 18` execution)

- [x] **Phase 18: page-data-extraction** — transformer 阶段新增 `PPTBaseElement.textContent` + `slide.pageData` 字段,复用 v1.12 `getContentKeyFor()` 映射;TOC 数据按 N 升序聚合为 `[{index, title, desc}]` 数组 (completed 2026-10-16)
  - [ ] 18-01: `src/utils/page-data.ts` helper (`buildPageData` 纯函数 + `PageData` / `PageDataDirectoryItem` 类型) + 单元测试
  - [ ] 18-02: `PPTBaseElement.textContent?: string` 字段 + `transformElement()` 顶部写入 SVG 原始 textContent(单行 + multiline 两 case) + CK-16 类型守卫延续
  - [ ] 18-03: `slide.pageData?: PageData` 字段 + `convertOne()` 末尾 `buildPageData(elements)` 集成 + mock SVG E2E
  - [ ] 18-04: 5 fixture svg.json 重生 + fixture E2E `tests/e2e/green-art-teaching-page-data.test.ts` (PD-01 ~ PD-16 + 4 项反向断言 + 无回归 9 v1.12 tests)

## Phase Details

### Phase 18: page-data-extraction

**Goal**: Transformer 阶段在 PPTTextElement 上写入 SVG 原始 `textContent`,并在 slide 末尾通过 `buildPageData(elements)` 聚合为 `slide.pageData` 字段。复用 v1.12 已实现的 17 个 contentKey 作为 pageData 字段名映射;TOC 数据按 N 升序聚合为 `directory: [{index, title, desc}]` 数组(仅 fixture 实际命中项)。是 v1.12 contentKey 协议的"数据侧"补全。

**Depends on**: Phase 17 (v1.12 contentKey 注入点 `src/transformer/transform-to-pptel.ts:1535`)

**Requirements**: PD-01, PD-02, PD-03, PD-04, PD-05, PD-06, PD-07, PD-08, PD-09, PD-10, PD-11, PD-12, PD-13, PD-14, PD-15, PD-16, PD-E2E-01, PD-E2E-02, PD-E2E-03, PD-E2E-04

**Success Criteria** (what must be TRUE):
  1. **静态字段提取** — 对 01_cover / 03_chapter / 04_content / 05_ending 四个 fixture,`slide.pageData` 含 cover_title / cover_subtitle / cover_author / chapter_number / chapter_title / chapter_desc / content_title / content_subtitle / end_title / end_subtitle 十个静态字段(实际命中的子集),值是 SVG 原始 textContent(占位符如 `{{TITLE}}` 原样保留)
  2. **目录数组聚合** — 对 02_toc fixture,`slide.pageData.directory` 是长度为 4 的数组(N=1..4 实际命中),每项含 `index`(`"01"`..`"04"`)/ `title`(来自 carrier 主行 textContent,如 `{{TOC_ITEM_1_TITLE}}`)/ `desc`(来自 carrier 内 dy=tspan 的 textContent,如 `{{TOC_ITEM_1_DESC}}`)三字段
  3. **行为守卫** — slide 内无任何 PPTTextElement 命中 v1.12 已实现的 17 个 contentKey → `slide.pageData` 字段整字段省略(不是 `null`/`{}`/`undefined`);非 PPTTextElement 即使 id 命中也不进 pageData(沿用 v1.12 CK-16 模式)
  4. **不动映射表** — v1.13 不修改 `src/utils/content-key.ts` 的 `STATIC_CONTENT_KEY_MAP` / 动态 entry 生成逻辑;新增的 pageData 完全基于 v1.12 已有的 17 个 contentKey

**Plans**: 4/4 plans complete (TBD)

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| Phase 6 | v1.3 | Complete | 2026-07-01 |
| Phase 7 | v1.4 | Complete | 2026-07-02 |
| Phase 8 | v1.5 | Complete | 2026-07-10 |
| Phase 9 | v1.6 | Complete | 2026-07-13 |
| Phase 10 | v1.7 | Complete | 2026-07-13 |
| Phase 11 | v1.7 | Complete | 2026-07-23 |
| Phase 12 | v1.7 | Complete | 2026-07-23 |
| Phase 13 | v1.8 | Complete | 2026-08-06 |
| Phase 14 | v1.9 | Complete | 2026-10-15 |
| Phase 15 | v1.10 | Complete | 2026-10-15 |
| Phase 16 | v1.11 | Complete | 2026-10-16 |
| Phase 17 | v1.12 | Complete | 2026-10-16 |
| Phase 18 | v1.13 | Planning | — |

---

*Roadmap updated: 2026-10-16 after v1.13 milestone kickoff (Phase 18 page-data-extraction planned)*
