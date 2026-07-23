# Roadmap — svg-to-pptel

## Milestones

- 🔄 **v1.7** — Path 合并优化 (2026-07-13)
- ✅ **v1.6** — SVG Converter Refactor (2026-07-13)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)

---

## Phase 10: Path Merge — 决策树与合并引擎

**Goal:** 实现 `<g>` 内全 `<path>` 子元素的合并决策逻辑，减少输出元素数量

**Requirements:** PATH-MERGE-01, PATH-MERGE-02, PATH-MERGE-03, PATH-MERGE-04, PATH-MERGE-05

**Success Criteria:**

1. 决策树正确判断 path 是否可合并（共享样式 → 无独立语义 → fill="none"/无重叠 → 无 evenodd）
2. 公共样式属性从多个 path 中正确提取并合并
3. 包围盒重叠检测对 fill!="none" 的 path 正确工作
4. fill-rule="evenodd" 的 path 正确标记为谨慎合并
5. 合并后的 path 输出到 PPTElement 时坐标和样式正确

**Status:** Planning

---

## Phase 11: Text Width/Height Passthrough — SVG text 属性直通

**Goal:** SVG `<text>` 同时声明 `width` 和 `height` 时，跳过 resvg-js 测量，直接使用属性值（按 scaleX/scaleY 缩放）作为 PPTTextElement 的 width/height

**Requirements:** TEXT-WHPASS-01, TEXT-WHPASS-02, TEXT-WHPASS-03

**Success Criteria:**

1. `<text width="..." height="...">` 同时声明时，`transformElement` 不调用 `measureTextElement`
2. 缩放后 `width = parsedWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN`、`height = parsedHeight * scaleY`
3. 仅 `width` 或仅 `height` 或非数字 / 负值 / 零 时，回退到原测量路径

**Status:** Planning

---

## Phase 12: Font Preprocess — 统一字体为 Source Han Sans CN Regular

**Goal:** 在 SVG 被解析转换之前，将文件中所有字体替换为 "Source Han Sans CN Regular"

**Success Criteria:**

1. `normalizeFontFamily` 函数正确替换属性中的 `font-family`
2. CSS `<style>` 标签内的 `font-family` 声明被正确替换
3. 非字体属性（`font-size`、`fill` 等）保持不变
4. 现有测试全部通过

**Status:** Planned

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| Phase 6 | v1.3 | Complete | 2026-07-01 |
| Phase 7 | v1.4 | Complete | 2026-07-02 |
| Phase 8 | v1.5 | Complete | 2026-07-10 |
| Phase 9 | v1.6 | Complete | 2026-07-13 |
| Phase 10 | v1.7 | Planned | — |
| Phase 11 | v1.7 | Planning | — |
| Phase 12 | v1.7 | Planned | — |

---

*Roadmap updated: 2026-07-23 after Phase 11 removed*
