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
- 🚧 **v1.12** — Template Content Key Annotation (Planning)

## Phases

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

🚧 **v1.12 — Template Content Key Annotation** (Planning — `Phase 17` ready to plan)

- [ ] **Phase 17: template-content-key** — transformer 阶段按 id 映射表在 PPTTextElement 上注入 `contentKey`(13 已知模板 + TOC multiline tspan 拆分 + 4 项行为守卫)

## Phase Details

### Phase 17: template-content-key

**Goal**: Transformer 识别 SVG 中"模板文本元素"(已知 13 个 id 模板),通过 `contentKey` 字段标记到 PPTTextElement,供 PPTist 端用作"用户填写正文"的语义绑定键(cover_title / directory_item_1 / chapter_title 等)。是 v1.11 `templateType=1` 标记的下游语义扩展。

**Depends on**: Phase 16 (v1.11 templateType=1 注入点复用 — `src/transformer/transform-to-pptel.ts:1535`)

**Requirements**: CK-01, CK-02, CK-03, CK-04, CK-05, CK-06, CK-07, CK-08, CK-09, CK-10, CK-11, CK-12, CK-13, CK-14, CK-15, CK-16, CK-17

**Success Criteria** (what must be TRUE):
  1. 封面三类文本元素带语义键 — `cover-title-carrier` / `cover-subtitle-carrier` / `cover-author-carrier` 三个 id 命中的 PPTTextElement,分别在 JSON 输出携带 `contentKey: "cover_title"` / `"cover_subtitle"` / `"cover_author"`
  2. 章节/正文/结尾共七类文本元素带语义键 — `chapter-number-carrier` / `chapter-title-carrier` / `chapter-desc-carrier` / `content-title-carrier` / `content-subtitle-carrier` / `closing-thanks-carrier` / `closing-subtitle-carrier` 七个 id 命中 PPTTextElement 时分别注入 `chapter_number` / `chapter_title` / `chapter_desc` / `content_title` / `content_subtitle` / `end_title` / `end_subtitle`
  3. 目录项编号与正文主体带语义键 — 对 N∈1..4,`toc-item-{N}-number` 与 `toc-item-{N}-carrier` 的主体文本(leading inline text)在 PPTTextElement 上分别携带 `contentKey: "directory_item_number_N"` 与 `"directory_item_N"`
  4. 目录项描述行作为独立 PPTTextElement 携带 desc 语义键 — 当 `toc-item-{N}-carrier` 内部出现 `<tspan dy="...">` 时,每个带 dy 的 tspan 单独渲染为 PPTTextElement 并携带 `contentKey: "directory_item_desc_N"`,N 与父 carrier 保持一致;N∈5..8 的 carrier 整体不携带 `contentKey`(不影响已实现 N∈1..4 行为)
  5. 非映射 id、非文本元素、未知模板静默跳过 — id 不在 13 个映射表内的 PPTTextElement 或 id 命中但元素类型非 text(shape/image/line)时,输出 JSON 中该元素`不出现` `contentKey` 字段(整字段省略,不是 `null`/`undefined`/`""`);未来新增模板 id 无需改代码即被静默跳过

**Plans**: TBD

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
| Phase 17 | v1.12 | Planning | - |

---

*Roadmap updated: 2026-10-16 after v1.12 milestone kickoff (Phase 17 planned for content-key annotation)*
