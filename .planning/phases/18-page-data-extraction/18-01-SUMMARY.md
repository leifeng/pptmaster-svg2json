---
phase: 18-page-data-extraction
plan: 01
subsystem: page-data-extraction
tags:
  - helper
  - aggregation
  - v1.13
  - pageData
  - toc
dependency_graph:
  requires:
    - src/utils/content-key.ts (D-17 复用 getContentKeyFor)
  provides:
    - buildPageData(elements) 纯函数
    - PageData / PageDataDirectoryItem TS interface
  affects:
    - 18-02 transformer 集成 (consume buildPageData + add textContent field)
    - 18-03/18-04 E2E 测试 (依赖聚合行为稳定)
tech-stack:
  added: []
  patterns:
    - 纯函数聚合 (no I/O / no time / no random)
    - first-wins via elements array order
    - field omission over null (D-08)
    - type guard (type === 'text')
key-files:
  created:
    - src/utils/page-data.ts
    - __tests__/page-data.test.ts
  modified: []
decisions:
  - "D-06 first-wins for directory_item_desc_N (one-way)"
  - "D-07 first-wins for directory_item_N (costly)"
  - "D-08 field omission (subset emission)"
  - "D-09 0 命中 → undefined"
  - "D-10 number field 不进 pageData 数组"
  - "D-13 index 字符串零填充"
  - "D-14 desc/title 缺失 fallback ''"
  - "D-17 复用 getContentKeyFor()"
  - "Implementation: @ts-expect-error 占位等待 18-02 添加 PPTBaseElement.textContent 字段"
metrics:
  duration: "~4 minutes"
  completed_date: 2026-10-16
  tokens: 5300    # chars/4 over 10004 bytes page-data.ts + 11069 bytes test = 21073 bytes
  tasks: 2
  commits: 2
  plan_head_before: 6be725e62fc61ea264e749d5b3c8f42d83260644
  plan_head_after: e96331f
status: complete
actual_commits:
  - bf3790e (feat)
  - e96331f (test)
---

# Phase 18 Plan 01: page-data 聚合 helper — Summary

## One-liner

`buildPageData(elements)` 纯函数聚合 PPTElement[] → PageData 或 undefined,复用 v1.12 `getContentKeyFor()`,静态 10 字段 + 动态 TOC 目录字段(D-06/D-07 first-wins / D-08 字段省略 / D-09 0 命中 / D-13 零填充 index)。

## 任务执行

### Task 1: 创建 `src/utils/page-data.ts` ✅

- 顶部 imports `PPTElement` / `PPTTextElement` 与 `getContentKeyFor`(D-17)
- 接口:`PageData`(10 静态可选字段 + 可选 `directory: PageDataDirectoryItem[]`)+ `PageDataDirectoryItem`(index/title/desc 必填 string)
- `buildPageData(elements)` 实现:filter type === 'text' → switch 静态字段 first-wins → 正则捕获 N 处理 dynamic 三类(directory_item_N / directory_item_desc_N / directory_item_number_N)→ 按 N 升序输出 directory → 0 命中返回 undefined(D-09)/ 子集发射(D-08)
- 模块局部正则:`^directory_item_(\d+)$` / `^directory_item_desc_(\d+)$` / `^directory_item_number_(\d+)$`
- 类型兼容策略:用 `// @ts-expect-error - textContent field added in 18-02 on PPTBaseElement (18-01 提前实现)` 占位 — 18-02 后该行可移除

**验证:** `npm run build 2>&1 | grep -E '(error TS|page-data\.ts)'` → 空输出(0 errors);`dist/src/utils/page-data.{js,d.ts}` 已产出。

### Task 2: 单元测试 `__tests__/page-data.test.ts` ✅

19 it() 覆盖矩阵(超过最低 18 要求):

- **PD-01..PD-03 + PD-06..PD-12 静态字段聚合**(2 it):单字段占位符保留 / 10 字段全部命中键集合断言
- **PD-04 + PD-05 目录聚合**(2 it):N=1..4 完整三要素(number + title + desc)+ 按 N 升序排(输入 N=3,1,4,2 → '01','02','03','04')
- **PD-13 0 命中**(4 it):空数组 / 非 text 元素 / 无 contentKey / textContent undefined
- **D-06 first-wins desc**(1 it):同 N=1 含 2 desc → 首次胜出
- **D-07 first-wins title**(1 it):同 N=1 含 2 title → 首次胜出
- **D-08 字段子集发射**(2 it):仅命中 cover_title / 静态命中无 directory
- **D-10 / D-13 index 派生**(3 it):无 number fallback String(N).padStart / number 含 textContent "02" / directoryItem 仅含 index/title/desc 三字段
- **D-14 desc/title 必填 fallback**(2 it):仅 title → desc="" / 仅 desc → title=""
- **mixed 混合**(1 it):同时 cover_title + N=1 目录条目
- **N 边界**(1 it):N=9 越界 getContentKeyFor 返回 undefined,buildPageData 静默容错

**验证:** `npx vitest run __tests__/page-data.test.ts` → `Test Files 1 passed (1) / Tests 19 passed (19)`。

## Deviations from Plan

### Plan-as-written

无。所有 D-06/D-07/D-08/D-09/D-10/D-13/D-14/D-17 决策按 PLAN 锁定实现,无规则 1-3 触发(规则 4 不适用)。

### Self-corrected during execution

**1. 计划预期修复 — 测试期望排序键集合顺序调整**

- **Found during:** Task 2 vitest first run
- **Issue:** 测试 "10 静态字段全部命中" 期望 `['cover_author', 'cover_subtitle', 'cover_title', 'chapter_desc', ...]`(按分类分组的视觉顺序),但 `.sort()` 调用产出真正的字母序(`chapter_*` < `content_*` < `cover_*` < `end_*`)。期望与 `.sort()` 语义不符。
- **Fix:** 测试期望改为 `.sort()` 实际产出的字母序:`['chapter_desc', 'chapter_number', 'chapter_title', 'content_subtitle', 'content_title', 'cover_author', 'cover_subtitle', 'cover_title', 'end_subtitle', 'end_title']`。生产代码 (buildPageData) 不变。
- **Files modified:** `__tests__/page-data.test.ts`
- **Commit:** e96331f

**2. 计划预期修复 — 测试索引错误**

- **Found during:** Task 2 vitest first run
- **Issue:** "提供 number N=2 含 textContent '02'" 测试断言 `result.directory[1]` 但 N=2 是唯一输入项,索引应为 `[0]`。
- **Fix:** 索引修正为 `[0]`。生产代码 (buildPageData) 不变。
- **Files modified:** `__tests__/page-data.test.ts`
- **Commit:** e96331f

## Key Technical Details

### buildPageData 实现要点

- **类型守卫顺序:** 先 `el.type === 'text'` 过滤(D-02 mirror PD-16 类型守卫)再处理 contentKey
- **静态字段分发:** switch 覆盖 10 个 contentKey 字面量,first-wins 用 `staticFields[fieldName] === undefined` 检查
- **动态 N 解析:** 用 `Number.parseInt(match[1], 10)` 转数字(防御非数字 N,但 content-key.ts 已锁定 N∈1..8)
- **directory 累积:** Map<number, {title, desc, index}> 暂存 + first-wins 检查 + index 优先级
- **index fallback:** `entry.index !== undefined && entry.index !== ''` 守护,否则用 `String(n).padStart(2, '0')`
- **输出排序:** `Array.from(directoryMap.keys()).sort((a, b) => a - b)` 升序
- **空命中守卫:** `Object.keys(staticFields).length === 0 && directory.length === 0` → undefined

### 18-02 集成 hook

`src/utils/page-data.ts` 内的 `@ts-expect-error` 注释是临时占位。18-02 在 `PPTBaseElement` 添加 `textContent?: string` 字段后,需:

1. 移除 `src/utils/page-data.ts:90` 的 `@ts-expect-error` 注释
2. (可选)将 `(element as PPTTextElement).textContent` 简化为 `element.textContent`

helper 接口与算法均无需调整 — 仅类型兼容层一行。

## Files Created

```
src/utils/page-data.ts           (10004 bytes) — PageData / PageDataDirectoryItem + buildPageData
__tests__/page-data.test.ts      (11069 bytes) — 19 vitest cases covering all D-06..D-17
```

## Commits

- `bf3790e feat(18-01): add page-data aggregation helper with buildPageData() pure function`
- `e96331f test(18-01): add unit tests for buildPageData covering static/dynamic/0-hit/first-wins/omission`

## Success Criteria Met

- [x] `src/utils/page-data.ts` 已创建,`buildPageData` / `PageData` / `PageDataDirectoryItem` 已 export,TypeScript strict mode 编译通过(`npm run build` 0 errors for page-data)
- [x] `__tests__/page-data.test.ts` 19 it() 全部通过(>18 要求),覆盖 10 静态字段聚合 / 目录 N=1..4 / 0 命中 / first-wins / 字段省略 / index fallback / desc fallback
- [x] `buildPageData` 内部复用 `getContentKeyFor()` (D-17);`directory_item_number_N` 不进 pageData 数组 (D-10);directory 按 N 升序排
- [x] v1.13 不修改 `src/utils/content-key.ts` 现有映射表 — 完全复用 v1.12 已实现 34 entries
