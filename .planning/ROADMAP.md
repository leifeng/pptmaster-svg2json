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
- 🚧 **v1.11** — Template Element Marking (Planning)

## Phases

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

### 🚧 v1.11 — Template Element Marking

### Phase 16: template-element-marking

**Goal:** transformer 阶段识别 SVG 中"模板元素"(id 含 `-template` 或祖先 `<g id="*-template">` 子树),通过 `templateType=1` 标记到 PPTElement;同时把 `content-object-slot-template` 元素的 `data-pptx-bounds` 解析为 slide 级 `contentBounds` 字段
**Requirements:** TPL-MARK-01/02/03, TPL-CB-01/02/03, TPL-NONREN-01/02, TPL-E2E-01/02
**Plans:** ~3 plans

**Wave 1** *(pending)*
- [ ] 16-01-PLAN.md — transformer id-tag propagation: 把 SVG 元素 id 与 group 祖先链传到底层 transformToPPTElement;renderable element 加 templateType?:1

**Wave 2** *(pending)*
- [ ] 16-02-PLAN.md — slide-level contentBounds 字段提取: 从 SVG 元素中找 `id="content-object-slot-template"`,读 `data-pptx-bounds` 空格分隔四数 → `{x, y, width, height}` 写入 slide 顶层

**Wave 3** *(pending)*
- [ ] 16-03-PLAN.md — E2E 测试 on `exampels/green-art-teaching/svg_output/*.svg.json`:每个 slide 的 template-marked element 数 + contentBounds 存在性 + 反向断言

**Reference:**
- Fixture 模板(纯模板,无数据填充):`E:\git\svg2json\exampels\green-art-teaching\templates\*.svg`
- Fixture 输出(带数据填充的最终 SVG):`E:\git\svg2json\exampels\green-art-teaching\svg_output\*.svg`
- 已知元素类型清单:`renderable` = `type ∈ {shape, text, image, path}` —— 其它 SVG 节点不进 slide.elements[]

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
| Phase 16 | v1.11 | Planning | — |

---

*Roadmap reorganized: 2026-10-16 during v1.11 milestone kickoff (Planning)*
