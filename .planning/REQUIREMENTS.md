# Requirements: svg-to-pptel

**Defined:** 2026-10-16
**Core Value:** Accurately convert SVG visual elements to PowerPoint JSON — every coordinate, transform, and style maps correctly to the target canvas.

## v1.13 Requirements

Requirements for the v1.13 milestone. Each maps to roadmap phases.

### Cover Page (静态字段映射)

- [x] **PD-01**: `slide.pageData.cover_title` 提取 `cover-title-carrier` PPTTextElement 的 SVG 原始 `textContent`(如 `{{TITLE}}` 占位符原样保留)
- [x] **PD-02**: `slide.pageData.cover_subtitle` 提取 `cover-subtitle-carrier` PPTTextElement 的 SVG 原始 `textContent`
- [x] **PD-03**: `slide.pageData.cover_author` 提取 `cover-author-carrier` PPTTextElement 的 SVG 原始 `textContent`

### TOC Page (数组聚合)

- [x] **PD-04**: `slide.pageData.directory` 是数组,按 N 升序排列(1..N),只包含 fixture 实际命中 contentKey 的 N 项(空数组不输出字段)
- [x] **PD-05**: 每个 `directory_item` 包含三个字段:`index`(来自 `toc-item-N-number` 的 textContent,如 `"01"`) / `title`(来自 `toc-item-N-carrier` 主行的 textContent) / `desc`(来自 `toc-item-N-carrier-line-1` 即带 `dy` 属性的 tspan 的 textContent)

### Chapter Page

- [x] **PD-06**: `slide.pageData.chapter_number` 提取 `chapter-number-carrier` PPTTextElement 的 SVG 原始 `textContent`
- [x] **PD-07**: `slide.pageData.chapter_title` 提取 `chapter-title-carrier` PPTTextElement 的 SVG 原始 `textContent`
- [x] **PD-08**: `slide.pageData.chapter_desc` 提取 `chapter-desc-carrier` PPTTextElement 的 SVG 原始 `textContent`

### Content Page

- [x] **PD-09**: `slide.pageData.content_title` 提取 `content-title-carrier` PPTTextElement 的 SVG 原始 `textContent`
- [x] **PD-10**: `slide.pageData.content_subtitle` 提取 `content-subtitle-carrier` PPTTextElement 的 SVG 原始 `textContent`

### Closing Page

- [x] **PD-11**: `slide.pageData.end_title` 提取 `closing-thanks-carrier` PPTTextElement 的 SVG 原始 `textContent`
- [x] **PD-12**: `slide.pageData.end_subtitle` 提取 `closing-subtitle-carrier` PPTTextElement 的 SVG 原始 `textContent`

### Behavioral Guarantees

- [x] **PD-13**: slide 内无 PPTTextElement 命中任何 v1.12 已实现 contentKey → `slide.pageData` 字段整个省略(同 v1.12 CK-14 模式,字段直接不出现,不是 `null`/`{}`)
- [x] **PD-14**: 非 PPTTextElement 即使 id 命中 contentKey 映射表,也不进 `pageData`(沿用 v1.12 CK-16)
- [x] **PD-15**: v1.13 不动 v1.12 contentKey 映射表 — 仅基于已实现的 17 个 contentKey 进行 pageData 提取;`01_cover.svg` 注释中提到的 `directory_title` / `content_description` / `content_item_*` 不在 v1.13 范围
- [x] **PD-16**: `PPTBaseElement` 新增 `textContent?: string` 字段,transformer 阶段对 PPTTextElement 写入 SVG 原始 `textContent`(包含 `<text>` 元素和 `<tspan>` 子元素);非 PPTTextElement 不写此字段

### Test Coverage

- [ ] **PD-E2E-01**: 5 fixture E2E 覆盖(`exampels/green-art-teaching/templates/01_cover.svg` / `02_toc.svg` / `03_chapter.svg` / `04_content.svg` / `05_ending.svg`),每个 fixture 验证 `slide.pageData` 存在且与 v1.12 contentKey 注入的 PPTElement 互相对应
- [ ] **PD-E2E-02**: `02_toc.svg` 验证 `pageData.directory` 数组长度=4(N=1..4 实际命中),每个 item 的 `index`/`title`/`desc` 都来自 SVG 原始 textContent(占位符原样保留)
- [ ] **PD-E2E-03**: 反向白名单断言 — 所有 fixture 的 `pageData` 字段名都来自 v1.12 已实现的 17 个 contentKey 集合,无意外值
- [ ] **PD-E2E-04**: 无回归 — v1.12 contentKey 注入点(76 tests passed)零影响,既不破坏 contentKey 字段,也不影响 templateType 注入

## Out of Scope

Explicit exclusions to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 扩展 contentKey 映射表(`directory_title` / `content_description` / `content_item_*`) | v1.13 用户决策:仅基于 v1.12 已实现的 17 个;新映射等待后续 milestone |
| 从 PPTElement.content 反提纯(去除 HTML) | 用户决策:文本来源是 SVG 原始 textContent(占位符原样),不做后处理 |
| N=1..8 占位(null 或空对象) | 含义被否决 — fixture 命中什么 pageData.dictionary 就有什么 item |
| 自动检测 i18n / locale variants | PPTist 绑定协议用单 canonical key |
| 把 pageData 抽离到 sidecar JSON | pageData 是 SVG → JSON 的转换结果,不是 PPTist 的运行时数据;保持内联在 slide 对象 |
| pageData 内容国际化/转码 | 文本按 SVG 原始输出,PPTist 端负责处理 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PD-01      | Phase 18 | Complete |
| PD-02      | Phase 18 | Complete |
| PD-03      | Phase 18 | Complete |
| PD-04      | Phase 18 | Complete |
| PD-05      | Phase 18 | Complete |
| PD-06      | Phase 18 | Complete |
| PD-07      | Phase 18 | Complete |
| PD-08      | Phase 18 | Complete |
| PD-09      | Phase 18 | Complete |
| PD-10      | Phase 18 | Complete |
| PD-11      | Phase 18 | Complete |
| PD-12      | Phase 18 | Complete |
| PD-13      | Phase 18 | Complete |
| PD-14      | Phase 18 | Complete |
| PD-15      | Phase 18 | Complete |
| PD-16      | Phase 18 | Complete |
| PD-E2E-01  | Phase 18 | Pending |
| PD-E2E-02  | Phase 18 | Pending |
| PD-E2E-03  | Phase 18 | Pending |
| PD-E2E-04  | Phase 18 | Pending |

**Coverage:**
- v1.13 requirements: 20 total (16 functional + 4 E2E)
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-16 for v1.13 milestone*
*Last updated: 2026-10-16 after initial definition*
