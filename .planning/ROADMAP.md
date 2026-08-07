# Roadmap — svg-to-pptel

## Milestones

- 🚧 **v1.9** — Text 段落合并 (2026-08-07 IN PROGRESS)
- ✅ **v1.8** — CLI 字体验证 (2026-08-07)
- ✅ **v1.7** — Path 合并优化 (2026-07-23)
- ✅ **v1.6** — SVG Converter Refactor (2026-07-13)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)

---

## Phases

<details>
<summary>🚧 v1.9 — Text 段落合并 (Phases 14-15) — IN PROGRESS 2026-08-07</summary>

- [ ] Phase 14: Tspan Unification Core — 合并所有 tspan 到单一 PPTTextElement,按换行属性切 `<p>` 段落
- [ ] Phase 15: Test Coverage + Regression — TEST-01..06 新场景覆盖 + TEST-07..08 锁定既有 inline 行为

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

---

## Phase Details

### Phase 14: Tspan Unification Core

**Goal**: SVG `<text>` 元素内含 `<tspan>` 时,所有内容合并为单个 PPTTextElement;换行 tspan (有 `x` 属性或 `dy`≠0) 拆分为独立 `<p>` 段落,inline tspan 与父内容合并到同一 `<p>` 内,符合 PPTist 多段落规范 (`<p>` 分隔 + `paragraphSpace` 间距)。

**Depends on**: Nothing (v1.9 first phase, but logically builds on Phase 11 width/height passthrough and Phase 12 font preprocess for text measurement stability)

**Requirements**: TEXT-01, TEXT-02, TEXT-03, TEXT-04, TEXT-05, TEXT-06, TEXT-07

**Success Criteria** (what must be TRUE):
  1. SVG `<text>` 内 `<tspan>` 内容全部合并到同一个 PPTTextElement — 不再拆分为多个 text 元素 (覆盖单 inline / 多换行 / 混合三种场景)
  2. 含换行属性的 `<tspan>` (`x` 属性或 `dy`≠0) 序列化为独立 `<p>` 段落,inline `<tspan>` (无换行属性) 与父文本片段在同一 `<p>` 内合并,样式继承正确
  3. `hasLineBreakTspans` 检测覆盖 `x` 属性 **和** `dy` 属性 (`dy` 值不为 0 视为换行,与现有 `x` 检测等价)
  4. 多行场景统一使用父 text 的 `left/top` 与 `width`;段落垂直间距由 `paragraphSpace` (默认 5px) 控制,不再由各自 tspan 的 `top` 偏移单独控制
  5. 嵌套 tspan (multi-level) 与混合 inline + 换行 tspan 按文档顺序生成 `<p>`,不丢失任何子元素内容

**Plans**: TBD

---

### Phase 15: Test Coverage + Regression

**Goal**: 测试套件覆盖 6 种新场景 (单 inline / 单 dy / 单 x / 多 tspan 多行 / 混合 / 嵌套),并锁定 2 类既有行为 (single-line 路径 + inline tspan 继承) 不回归。

**Depends on**: Phase 14

**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08

**Success Criteria** (what must be TRUE):
  1. TEST-01 单 tspan 行内: `<text>A<tspan>B</tspan>C</text>` → 1 个 PPTTextElement,content = `<p>A<span>B</span>C</p>`
  2. TEST-02/03 单 tspan 多行 (`dy` / `x`): `<text>A<tspan dy="1em">B</tspan></text>` 与 `<text>A<tspan x="0">B</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B</p>`
  3. TEST-04 多 tspan 多行: `<text><tspan x="0">A</tspan><tspan x="0">B</tspan></text>` → 1 个 PPTTextElement,content = `<p>A</p><p>B</p>`
  4. TEST-05 混合 inline + 换行 + TEST-06 嵌套 tspan 换行 场景输出符合 REQUIREMENTS.md 中定义的精确 content 字符串
  5. TEST-07/08 回归锁: 现有 single-line 路径与 inline tspan 继承样式测试全部保持绿色,既有 15 个 pre-existing 失败 (gradient / image-outline / path-merge / shadow / shape-rx) 不受影响

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
| Phase 14 | v1.9 | Not started | - |
| Phase 15 | v1.9 | Not started | - |

---

*Roadmap updated: 2026-08-07 for v1.9 milestone (Text 段落合并) — Phase 14 starts, 15 requirements mapped (TEXT-01..07 + TEST-01..08)*