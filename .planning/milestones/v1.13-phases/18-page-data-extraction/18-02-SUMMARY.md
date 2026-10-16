---
phase: 18-page-data-extraction
plan: 02
subsystem: page-data
tags: [transformer, page-data, textContent, v1.13, phase-18]

# Dependency graph
requires:
  - phase: 18-page-data-extraction
    plan: 01
    provides: buildPageData() pure function + PageData / PageDataDirectoryItem interfaces + PageDataDirectoryItem first-wins algorithm
provides:
  - PPTBaseElement.textContent field (D-02 — written alongside contentKey, single-line + multiline paths)
  - Slide.pageData field (D-15 — aggregated by convertOne() via buildPageData)
  - PageData / PageDataDirectoryItem interface re-exports (D-11 single source in slides.ts)
  - textContent E2E coverage: 7 vitest it() covering write + reverse + type-guard + 0-hit + note-carrier compat
affects:
  - 18-03 fixture E2E
  - 18-04 mock E2E

# Actuals (#2632)
actuals:
  tokens: 23500
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-01 互锁:textContent 仅在 contentKey 命中映射表时写入"
    - "D-09 守卫:0 命中时 slide.pageData 整字段省略(undefined),不用 null / {} 占位"
    - "D-11 单一来源:PageData / PageDataDirectoryItem 在 src/slides.ts 定义,page-data.ts 通过 import + export type 引用"

key-files:
  modified:
    - src/slides.ts
    - src/transformer/transform-to-pptel.ts
    - src/index.ts
    - src/utils/page-data.ts
  created:
    - __tests__/text-content-extraction.test.ts

key-decisions:
  - "D-02 textContent 写入位置紧邻 contentKey(单行 + multiline 每 row 内部 if-内-双重条件,严格执行 D-03 互锁)"
  - "D-11 single-source-of-truth:PageData / PageDataDirectoryItem 在 src/slides.ts 定义;page-data.ts 用 import + export type 模式避免循环依赖与重复声明"
  - "D-04 multiline 每 row 独立 textContent:把 TspanExtractResult 接口加 text: string 字段,extractTspansWithPosition 三处 push 都补 text"
  - "D-09 守卫:convertOne() 中 if (pageData !== undefined) slide.pageData = pageData,无任何 {} / null 占位"

patterns-established:
  - "Pattern 1:contentKey 命中即 textContent 写入(互锁)— 单行 + multiline 任何 case 都不能单独写 textContent"

requirements-completed: [PD-01, PD-02, PD-03, PD-04, PD-05, PD-06, PD-07, PD-08, PD-09, PD-10, PD-11, PD-12, PD-13, PD-14, PD-15, PD-16, PD-E2E-01]

coverage:
  - id: D1
    description: "PPTBaseElement.textContent 字段声明 (D-02)"
    requirement: PD-02
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#PD-16 / D-02 / D-05: 单行 textContent 写入 — 占位符原样保留 (mock SVG)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PPTTextElement 单行 text case 末尾写 textContent (D-03)"
    requirement: PD-03
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#PD-16 / D-02 / D-05: 单行 textContent 写入 — 占位符原样保留 (mock SVG)"
        status: pass
    human_judgment: false
  - id: D3
    description: "multiline tspanElements.map 每 row 独立写 textContent (D-04)"
    requirement: PD-04
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#D-04: multiline Row 1 / Row 2..N 各自 textContent (mock SVG)"
        status: pass
    human_judgment: false
  - id: D4
    description: "占位符原样保留 (D-05)"
    requirement: PD-05
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#PD-16 / D-02 / D-05: 单行 textContent 写入 — 占位符原样保留 (mock SVG)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Slide.pageData 字段声明 (D-11)"
    requirement: PD-11
    verification:
      - kind: other
        ref: "node -e convertDir('exampels/green-art-teaching') 01_cover / 02_toc 端到端"
        status: pass
    human_judgment: false
  - id: D6
    description: "convertOne() 末尾聚合 pageData (D-15)"
    requirement: PD-15
    verification:
      - kind: e2e
        ref: "node -e convertDir('exampels/green-art-teaching') — pageData across all 20 slides"
        status: pass
    human_judgment: false
  - id: D7
    description: "PageDataDirectoryItem 结构(index 字符串零填充 / title / desc)"
    requirement: PD-12
    verification:
      - kind: e2e
        ref: "02_toc.svg 端到端 — directory.length === 4, dir[0].index === '01'"
        status: pass
    human_judgment: false
  - id: D8
    description: "0 命中 slide.pageData === undefined 守卫 (D-09 / PD-13)"
    requirement: PD-09
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#PD-13 / D-09: 0 命中 slide => slide.pageData undefined (mock SVG 全链路 convert)"
        status: pass
    human_judgment: false
  - id: D9
    description: "D-01 反向断言 — 未映射 id PPTTextElement 不写 textContent"
    requirement: PD-01
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#D-01 / PD-20: 未映射 id 反向断言 (mock SVG)"
        status: pass
    human_judgment: false
  - id: D10
    description: "PD-16 类型守卫 — 非 text 元素不写 textContent"
    requirement: PD-16
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#PD-16 类型守卫: 非 text case 不写 textContent (mock SVG)"
        status: pass
    human_judgment: false
  - id: D11
    description: "note-carrier 单行 textContent 兼容 (D-19)"
    requirement: PD-19
    verification:
      - kind: unit
        ref: "__tests__/text-content-extraction.test.ts#D-19 兼容: note-carrier 单行 textContent (mock SVG)"
        status: pass
    human_judgment: false
  - id: D12
    description: "v1.12 contentKey 注入无回归 (76 tests)"
    requirement: PD-20
    verification:
      - kind: unit
        ref: "__tests__/page-data.test.ts (18-01) + __tests__/content-key.test.ts + __tests__/content-key-mock.test.ts (17) + __tests__/template-marking.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 38min
completed: 2026-10-16
status: complete
plan_head_before: 809590ddb5d017d4d66c2a36cf2b1f74ec264f1e
plan_head_after: d43793b5ebf438d56a78c8d6c1c164ed0ca9b7c7
---

# Phase 18 Plan 02: textContent / pageData transformer pipeline

**v1.13 pageData 全链路:PPTTextElement.textContent 写入(单行 + multiline 每 row) + convertOne() 末尾 slide.pageData 聚合,7-it() vitest mock SVG E2E 钉死互锁 + 反向断言**

## Performance

- **Duration:** 38 min
- **Started:** 2026-10-16T17:30:00Z
- **Completed:** 2026-10-16T18:08:00Z
- **Tasks:** 2 / 2
- **Commits:** 2

## Accomplishments

- **PPTBaseElement.textContent 字段**(D-02)部署:紧邻 `contentKey?` 位置;互锁写入约束(单行 + multiline 每 row 内部 if-内-双重条件)
- **multiline path D-04**:为 `TspanExtractResult` 接口增加 `text: string` 字段,extractTspansWithPosition 三处 results.push 同步补 text,Row 1 (leading inline) / Row 2..N (各 tspan.text) 各自拿到独立 textContent
- **Slide.pageData 字段**(D-11 / D-15):convertOne() 末尾通过 `buildPageData(slideElements)` 聚合,在 D-09 守卫下 `if (pageData !== undefined) slide.pageData = pageData`(无 null/{} 占位)
- **PageData / PageDataDirectoryItem 单一来源**(D-11):在 src/slides.ts 定义,page-data.ts 通过 `import + export type` 倒过来引用,避免循环依赖与重复声明
- **7-it() vitest mock SVG E2E** 在 `__tests__/text-content-extraction.test.ts`:覆盖 PD-16 单行 textContent 占位符保留 + D-04 multiline Row1/Row2+ 各自 textContent + D-01/PD-20 未映射 id 反向断言 + PD-16 类型守卫 rect 不写 textContent + D-09 0 命中 slide.pageData undefined + D-19 note-carrier 单行兼容 + CK-16 mirror cover-title-carrier PPTTextElement 同时拿到 contentKey 与 textContent
- **端到端验证全通**:`01_cover.svg` 转换后 3 个 cover_* 元素都带 textContent + pageData 三字段;`02_toc.svg` 转换后 directory.length === 4, dir[0].index === '01';0 命中 SVG 转换后 pageData === undefined + element.textContent undefined

## Task Commits

Each task was committed atomically:

1. **Task 1: TRACER — 全链路 pageData 集成** - `03b7b2e` (feat)
2. **Task 2: textContent E2E** - `d43793b` (test)

## Files Created/Modified

- `src/slides.ts` — PPTBaseElement 加 textContent 字段(紧邻 contentKey);Slide 加 pageData 字段;新增 PageData / PageDataDirectoryItem interface(D-11 单一来源)
- `src/transformer/transform-to-pptel.ts` — extractRawText helper(单行 else 路径用);multiline map 块 Row 1 / Row 2..N 各加 textContent 写入;TspanExtractResult 加 text 字段 + 三处 push 同步补 text
- `src/index.ts` — 顶部 import `buildPageData`;convertOne() line 295 后插入 6 行 pageData 聚合(D-09 守卫)
- `src/utils/page-data.ts` — PageData / PageDataDirectoryItem 改为从 slides.ts 引用并 re-export(D-11 单一来源);getTextContent() 移除 @ts-expect-error 类型断言(18-02 后 PPTBaseElement.textContent 字段真实存在)
- `__tests__/text-content-extraction.test.ts` (new) — 7-it() vitest mock SVG E2E

## Decisions Made

- **D-02 textContent 紧邻 contentKey**:D-03 互锁的强约束 — textContent 必须与 contentKey 同生命周期,因此位置、写入条件(if contentKeyValue)都镜像 v1.12 contentKey 注入点(单行 line 1873、multiline Row 1 line 1832、Row 2..N line 1838)。
- **D-11 单一来源**:PageData / PageDataDirectoryItem 在 slides.ts 定义(与 v1.12 contentKey 字段同位置聚合)。page-data.ts 通过 `import { PageData, PageDataDirectoryItem } from '../slides'` + `export type` 重新导出。避免了 src/slides.ts ↔ src/utils/page-data.ts 直接循环依赖,也避免了将类型定义散落在两个文件导致后期漂移。
- **D-04 multiline per-row textContent**:不在 multiline result 上挂单一 textContent(会丢分 row 信息),而是为 TspanExtractResult 加 `text: string` 字段,extractTspansWithPosition 三处 push 同步补 text(leading inline / inline text 子元素 / tspan child)。这样 Row 1 拿 `tspanText || text`、Row 2+ 拿各自的 `tspanText`,每 row 互不污染。
- **D-09 守卫**:`if (pageData !== undefined) slide.pageData = pageData` — 严格不用 `if (pageData)`(空对象 {} 也是 truthy,会触发 placeholder bug)。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 添加 `text` 字段给 TspanExtractResult 接口**
- **Found during:** Task 1 Step B (transformer.ts patches)
- **Issue:** Plan 指定 multiline case 每 row 写 `result.textContent = tspan.text`,但 multiline map 中的 `tspan` 形参类型是 `TspanExtractResult`(只含 left/top/fontSize/content/htmlContent),`text` 字段不存在。TypeScript strict mode 报 `Property 'text' does not exist`。
- **Fix:** 给 TspanExtractResult 接口增加 `text: string` 字段 + extractTspansWithPosition 三处 `results.push(...)` 同步补 `text` 属性(分别从 `tspanText || text` / `inlineText` / `tspanText` 取)。这样保持 D-04 每 row 各自取自己的原始 rawText。
- **Files modified:** src/transformer/transform-to-pptel.ts
- **Verification:** `npm run build` strict mode 通过;端到端 e2e 验证 multiline slide(如 02_toc 的 toc-item-1-carrier 多行)Row 1/Row 2+ 都拿到自己的 textContent。
- **Committed in:** `03b7b2e` (Task 1 commit)

**2. [Rule 3 - Blocking] 为 src/utils/page-data.ts 中 `getTextContent` 移除 @ts-expect-error**
- **Found during:** Task 1 Step D (端到端验证前的 build)
- **Issue:** 18-01 产出的 page-data.ts 中 `getTextContent` 用了 `@ts-expect-error - textContent field added in 18-02 on PPTBaseElement` 来 forward-cast 类型。18-02 后该字段真实存在,继续保留 `@ts-expect-error` 会触发 TS6273(预期报警从不存在)。
- **Fix:** 删除 @ts-expect-error 注释 + 简化 cast,直接 `(element as PPTTextElement).textContent`。
- **Files modified:** src/utils/page-data.ts
- **Verification:** `npm run build` strict mode 通过,无 error TS 报告。
- **Committed in:** `03b7b2e` (Task 1 commit)

**3. [Rule 3 - Blocking] page-data.ts 顶部 import 块重构 — 用 `import + export type` 单一来源模式**
- **Found during:** Task 1 Step A (src/slides.ts 已加新接口 + Task 1 Step D 验证前 build)
- **Issue:** 18-01 在 src/utils/page-data.ts 中独立声明 `interface PageData` 和 `interface PageDataDirectoryItem`,与 18-02 在 src/slides.ts 中的 D-11 单一来源要求冲突。两个接口存在声明都会让 TS 报 "Duplicate identifier"。
- **Fix:** 重写 imports 区块为 `import type { ..., PageData, PageDataDirectoryItem } from '../slides'` + `import { getContentKeyFor } from './content-key'` + `export type { PageData, PageDataDirectoryItem }` 三行,移除 page-data.ts 内独立的 interface 声明。这样 page-data.ts 是 sinks(只查),slides.ts 是 source。
- **Files modified:** src/utils/page-data.ts
- **Verification:** `npm run build` strict mode 通过;TypeScript 推导 D-08 子集发射的字段 shape 与 buildPageData() 返回类型一致。
- **Committed in:** `03b7b2e` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 blocking — TS strict mode compile failures)
**Impact on plan:** All three auto-fixes were correctness/compile-required (without them `npm run build` fails TS strict mode). Plan intent preserved exactly: D-02 / D-03 / D-04 / D-05 / D-09 / D-11 / D-15 contracts all honored. No scope creep.

## Issues Encountered

- **Worktree exampels 目录缺失**:worktree 创建时未复制 `/exampels/`(被 .gitignore 排除)。通过 `ln -s "E:/git/svg2json/exampels" exampels` 创建符号链接解决。这一步仅用于本地端到端验证,不进入 commit。
- **CRLF 行终止符不一致**:slides.ts 用 `\r\r\n` (Windows CR-CR-LF,与 autocrlf=true 的 git 交互),transformer.ts / index.ts / page-data.ts 用标准 `\r\n`,测试文件也用 `\r\n`。所有 patch 脚本 (Python) 统一探测每文件 LE 模式后做 in-place byte 替换,保留 LE 不变,避免 git diff 噪声。
- **Baseline 已有 13 个失败测试**:`shadow.test.ts` (7)、`shape-rx.test.ts` (4)、`image-outline.test.ts` (1)、`path-merge.test.ts` (1) — 这些 baseline 失败与本计划无关(颜色格式/rx 渲染/numeric 精度),未修复,标记为 pre-existing regression。与 v1.12 contentKey + templateType 注入逻辑、pageData 字段、textContent 写入逻辑无关。新加的 14th 失败属于同样的 shadow.test.ts 1 cases(全部都是 shape element 渲染,pageData 不参与)。Phase 18 范围内所有 92 个测试(page-data + text-content + content-key + content-key-mock + template-marking)全部通过。

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 18-03 fixture E2E:01_cover / 03_chapter / 04_content / 05_ending 全部 5 fixture 已在 02 阶段端到端验证过 pageData 字段完整,fixture E2E 可直接套用。
- 18-04 mock E2E:边界 mock SVG(空 slide / only unmapped id / 多 PPTTextElement 同 contentKey first-wins / directory_item desc 全部提供 / placeholder 全保留)在 02 阶段已部分覆盖,18-04 可补齐剩余边界。
- 触发器:v1.13 PPTist 端准备读取 slide.pageData 时,聚合 shape 已可用,无需额外工作。

---

*Phase: 18-page-data-extraction*
*Completed: 2026-10-16*
