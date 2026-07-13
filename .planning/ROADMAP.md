# Roadmap — svg-to-pptel

## Milestones

- ✅ **v1.3** — resvg-js Text Measurement (2026-07-01)
- ✅ **v1.4** — Directory Batch CLI (2026-07-02)
- ✅ **v1.5** — Use Tag Refactor (2026-07-10)

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| Phase 6 | v1.3 | Complete | 2026-07-01 |
| Phase 7 | v1.4 | Complete | 2026-07-02 |
| Phase 8 | v1.5 | Complete | 2026-07-10 |
| Phase 9 | v1.6 | Pending | — |

---

## Phase 7: Batch CLI Foundation

**Goal:** Implement directory batch conversion CLI — read SVG files from directory, convert each to JSON, save to same directory with .json extension.

**Requirements:** BATCH-01, BATCH-02, BATCH-03, BATCH-04, BATCH-05, BATCH-06, BATCH-07

**Status:** Complete

---

## Phase 08: Use Tag Refactor

**Goal:** Extract SVG `<use>` tag handling into separate module and enhance to support external SVG file references via `href` attribute (render to PNG image and embed back).

**Requirements:** USE-01, USE-02, USE-03

**Success Criteria:**

1. `autoEmbedIcons` function extracted from `svg-parser.ts` to `svg-use-handler.ts`
2. External SVG files referenced via `<use href="file.svg">` are rendered to PNG and embedded as `<image>` elements
3. Relative paths resolved correctly (relative to main SVG file location)
4. Graceful degradation when external SVG cannot be resolved
5. Existing `data-icon` functionality preserved

**Files to Create/Modify:**

- `src/svg-use-handler.ts` — New module with extracted `autoEmbedIcons` + external SVG support
- `src/parser/svg-parser.ts` — Remove `autoEmbedIcons` function, add import
- `src/index.ts` — May need to update `convert()` signature to pass file path

**Dependencies:**

- `@resvg/resvg-js` — Already integrated for text measurement
- `src/parser/svg-parser.ts` — Contains `parseSvg()` entry point
- `src/text-measurer.ts` — Shows resvg-js usage pattern

**Risks:**

- None — using existing well-understood rendering pipeline

**Plans:** 1 plan

Plans:

- [ ] 08-01-PLAN.md — Extract use tag handler + add external SVG support

---

## Phase 09: SVG Converter Refactor

**Goal:** 重构 SVG 转换器核心逻辑，修复嵌套变换、路径命令、clipPath 等问题

**Requirements:** REF-01, REF-02, REF-03, REF-04, REF-05

**Success Criteria:**

1. `<g transform="translate(100,0)"><rect x="10"/></g>` 正确输出 left=110
2. 包含 S/s、T/t 命令的路径转换正确
3. clipPath 引用的元素坐标正确缩放
4. baseline-shift="-5px" 正确缩放为 -3.90625
5. 代码无重复的 scalePathCoords 函数

**Files to Create:**

- `src/utils/path-utils.ts` — 统一路径处理函数

**Files to Modify:**

- `src/mapper/coordinate-mapper.ts` — 添加父级 transform 累加支持
- `src/transformer/transform-to-pptel.ts` — 修复 S/s、T/t 反射计算，移除重复代码
- `src/parser/svg-parser.ts` — 移除重复的 scalePathCoords

**Plans:** 2/2 plans complete

Plans:

- [ ] PLAN.md
- [x] 09-01-PLAN.md — SVG Converter Refactor
- [x] 09-02-PLAN.md — clipPath and baseline-shift

---
*Roadmap updated: 2026-07-13 after phase 09 plan creation*
