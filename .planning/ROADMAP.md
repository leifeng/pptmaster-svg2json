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
- 🚧 **v1.10** — Animation Sidecar Extension (in progress)

## Phases

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
  - 13-01 baseline: 同步 `verifyFontLoaded()` 验证器 + 11 单测 + 1 子进程集成测试
  - 13-02 gap closure: 三层防御 (magic-bytes + getBBox) + 真实子进程 exit-code 捕获 + 3 个真实损坏字体端到端 + 移除 dead `run` export

</details>

<details>
<summary>✅ v1.7 — Path 合并优化 (Phases 10-12) — SHIPPED 2026-07-23</summary>

- [x] Phase 10: Path Merge — 决策树与合并引擎 (2/2 plans) — completed 2026-07-13
- [x] Phase 11: Text Width/Height Passthrough — SVG text 属性直通 (1/1 plan) — completed 2026-07-23
- [x] Phase 12: Font Preprocess — 统一字体为 Source Han Sans CN Regular (1/1 plan) — completed 2026-07-23

</details>

<details>
<summary>✅ v1.6 — SVG Converter Refactor (Phases 9) — SHIPPED 2026-07-13</summary>

- [x] Phase 9: SVG Converter Refactor — completed 2026-07-13
  - nested `<g>` transform accumulation fixed
  - S/s T/t bezier reflection corrected
  - clipPath preprocessing integrated
  - baseline-shift pixel values scaled by scaleY
  - path-utils.ts extracted as unified module

</details>

<details>
<summary>✅ v1.5 — Use Tag Refactor (Phase 8) — SHIPPED 2026-07-10</summary>

- [x] Phase 8: Use Tag Refactor — completed 2026-07-10
  - autoEmbedIcons extracted to src/svg-use-handler.ts
  - External SVG files via `<use href="file.svg">` rendered to PNG and embedded

</details>

<details>
<summary>✅ v1.4 — Directory Batch CLI (Phase 7) — SHIPPED 2026-07-02</summary>

- [x] Phase 7: Directory Batch CLI — completed 2026-07-02
  - CLI reads SVG files from directory, converts each to JSON in same directory
  - Summary output: "Converted N files, M failed"

</details>

<details>
<summary>✅ v1.3 — resvg-js Text Measurement (Phase 6) — SHIPPED 2026-07-01</summary>

- [x] Phase 6: resvg-js Text Measurement — completed 2026-07-01
  - @resvg/resvg-js integrated for accurate text bounding box
  - text-measurer.ts module with measureTextBBox()

</details>

## Active

### 🚧 v1.10 — Animation Sidecar Extension

### Phase 15: animation-sidecar-extended

**Goal:** 扩展动画 sidecar 处理 — `effect: "none"` 不生成动画、default 与 transition 字段扩展处理、三方字段原封不动存 extensions、三方→PPTist effect 全覆盖映射、三方 `delay + duration` 合并到 PPTist `duration`
**Requirements:** ANIM-NONE-01/02/03, ANIM-EXTS-01/02, ANIM-MAP-EXT-01/02/03, ANIM-DELAY-01, ANIM-INHERIT-01, ANIM-CHROME-01
**Plans:** 2 plans

**Wave 1** ✅ completed 2026-10-15
- [x] 15-01-PLAN.md — Mapping 53/33/53 全覆盖 + effect:none cascade + transition 'none' → 'no' + delay+duration 合并 + new counters

**Wave 2** ✅ completed 2026-10-15
- [x] 15-02-PLAN.md — `resolveEffectiveRow` 纯函数 + extensions 三字段补全 + chrome 助手 + chromeSkippedGroups counter

**Reference:** `E:\git\svg2json\ELEMENT_ANIMATIONS.md`, `E:\git\svg2json\animation-adaptation-analysis.md`, `E:\git\svg2json\.planning\phases\15-animation-sidecar-extended\15-CONTEXT.md`, `E:\git\svg2json\.planning\phases\15-animation-sidecar-extended\15-RESEARCH.md`

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
| Phase 15 | v1.10 | Complete (pending closeout) | 2026-10-15 |

---

*Roadmap reorganized: 2026-10-15 during v1.9 milestone closeout (override_closeout)*
