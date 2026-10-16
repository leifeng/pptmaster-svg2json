---
phase: 18-page-data-extraction
plan: 04
subsystem: page-data-extraction
tags:
  - mock-svg
  - e2e
  - v1.13
  - pageData
  - edge-cases
  - 18-02-dependency
dependency_graph:
  requires:
    - 18-01 buildPageData helper (src/utils/page-data.ts)
    - 18-02 convertOne() pageData mounting + transformer textContent injection (PENDING MERGE)
  provides:
    - __tests__/page-data-mock.test.ts mock SVG E2E 覆盖 v1.13 boundary cases
  affects:
    - 18-03 fixture E2E 对齐 (mock + fixture 双层断言)
    - v1.13 release gate (mock + fixture + unit 三层覆盖完整)
tech-stack:
  added: []
  patterns:
    - mock SVG 模板风格(v1.12 content-key-mock 风格镜像,聚焦 pageData 聚合层)
    - convert() 全链路断言(覆盖 convertOne() 末尾 D-09 / D-15 守卫)
    - (x as any).field 模式兼容 18-02 前 TypeScript 字段未知(slides.pageData / element.textContent)
    - D-06 first-wins: multiline carrier 路径产生 2 个相同 contentKey element
    - elements 数组顺序 first-wins(directory_item_desc 同 N 多元素时 elements 数组首次出现 wins)
key-files:
  created:
    - __tests__/page-data-mock.test.ts
  modified: []
decisions:
  - "采用 'Preferred approach' (PREFER NOT to apply 18-02 patch):仅写测试文件,不修改 src/index.ts / src/slides.ts / src/transformer/transform-to-pptel.ts。orchestrator 在 18-02 与 18-04 均合入 master 后由 pageData 挂载完成 + transformer textContent 注入完成,测试方可全绿"
  - "运行时验证策略:TypeScript 编译 0 errors(已验证 using as any 模式);vitest run 8 个 it() 中 2 个通过(PD-13 0-hit 期望 pageData===undefined + PD-14 类型守卫期望 pageData===undefined — 两者均与 18-02 前未挂载 pageData 状态吻合);6 个失败(均期望非 undefined pageData,需 18-02 合并才能转绿)"
  - "字段访问用 (slide as any).pageData 与 (el as any).textContent:与既有 v1.12 content-key-mock.test.ts 的 (rect as any).contentKey 模式一致(测试可先行,在 helper/integration 落地前编译通过)"
  - "目录索引类型断言:pageData.directory.map((d: any) => d.index).sort() 形式 — 与 helper built 类型 PageDataDirectoryItem.index: string 一致,18-02 后可直接收回 as any(字段类型已对接)"
metrics:
  duration: "~4 minutes"
  completed_date: 2026-10-16
  plan_head_before: 809590ddb5d017d4d66c2a36cf2b1f74ec264f1e
  plan_head_after: 203e1e0
  commits: 1
  tasks: 1
status: complete
actuals:
  tokens: 2750          # chars/4 over 10998 bytes test file
  tasks: 1
  commits: 1
---
# Phase 18 Plan 04: page-data mock SVG E2E — Summary

## One-liner

Mock SVG E2E `__tests__/page-data-mock.test.ts` 覆盖 v1.13 pageData 边界 case:PD-E2E-02 (N=5..8 扩展)/ D-04 (multiline 拆分)/ PD-13 (0 命中)/ D-06 (first-wins)/ D-14 (desc fallback)/ D-08 (静态子集)/ PD-14 (类型守卫)/ D-19 (N=1..4 实际范围)。8 it() 已写,运行时验证待 18-02 merge 后由 orchestrator 完成。

## 任务执行

### Task 1 (only): 创建 `__tests__/page-data-mock.test.ts` ✅

完整 8 个 describe block,每个 describe 一个 it()(8 it() 总数,达到 plan 最低 8 要求)。

**测试覆盖矩阵:**

| # | describe | it 描述 | 验证锚点 |
|---|----------|---------|---------|
| 1 | PD-E2E-02:N=5..8 扩展 | mock SVG 含 N=5..8 完整三要素 | `directory.length===4`、`indexes=['05','06','07','08']`、各 title/desc 命中 |
| 2 | D-04 + multiline 拆分 | toc-item-1-carrier leading inline + 1 tspan[dy] | `dir[0].title===leading inline text`、`dir[0].desc===tspan text` |
| 3 | PD-13:0 命中 | random-unmapped / another-unmapped | `slide.pageData===undefined`、所有 elements `textContent===undefined` |
| 4 | D-06 first-wins | multiline 含 2 tspan[dy] | `dir[0].desc==='first desc'`(second 丢弃) |
| 5 | D-14 desc fallback | 仅 toc-item-1-number + carrier | `dir[0].desc===''` |
| 6 | D-08 静态子集 | 仅 cover-title-carrier | `pageData.cover_title==='{{TITLE}}'`、`Object.keys===['cover_title']` |
| 7 | PD-14 类型守卫 | rect with cover-title-carrier id | `pageData===undefined`、rect 不带 contentKey/textContent |
| 8 | D-19 N=1..4 实际范围 | N=1..2 完整三要素 | `directory.length===2`、`indexes=['01','02']` |

**imports:**

```ts
import { describe, it, expect } from 'vitest'
import { convert } from '../src/index'
```

**辅助函数:**

- `wrapSvg(content)` — 包 `<svg viewBox=...>` 模板
- `getPageData(slide): any` — `(slide as any).pageData` 字段读取(18-02 前 TypeScript 不识别)
- `getTextContent(el): string | undefined` — `(el as any).textContent`(同上)

**验证:**

- `npx vitest run __tests__/page-data-mock.test.ts 2>&1 | tail -60` → TypeScript 编译 0 errors(vitest transform 通过)
- 当前结果:`Tests 6 failed | 2 passed (8)`
  - **2 通过:** PD-13 0-hit、PD-14 类型守卫 — 都断言 `pageData===undefined`,与 18-02 前未挂载 pageData 的当前状态吻合(反向断言无需 18-02 即可验证)
  - **6 失败:** PD-E2E-02 / D-04 / D-06 / D-14 / D-08 / D-19 — 都断言 `pageData` 含特定字段,需 18-02 落地的 `convertOne()` 末尾 `slide.pageData = buildPageData(...)` 挂载后才能转绿

## Deviations from Plan

### Plan-as-written

严格按 PLAN.md 任务清单实现 8 it() — 数量、覆盖、断言、mock SVG 模板均一致。**唯一例外**:dispatch prompt 与 PLAN.md `Task 1 action §2` 中 `"directory.length === 8"` 与 `"indexes === ['05','06','07','08']"`(仅 4 个)互相矛盾(N=5..8 SVG 模板只产生 4 个 entry,不可能 length===8)。本测试采用逻辑一致解读:`directory.length===4` + `indexes=['05','06','07','08']`。

### Self-corrected during execution

**1. [Spec inconsistency] directory length 与 index 列表对齐**

- **Found during:** Task 1 — 撰写 N=5..8 测试断言时
- **Issue:** dispatch prompt 与 PLAN.md action §2 同时写 `directory.length === 8` 和 `indexes === ['05','06','07','08']`,但 N=5..8 SVG 模板只产生 4 个 entry,数学上不一致
- **Fix:** 测试断言改为 `directory.length === 4` + `indexes.sort() === ['05','06','07','08']`(与 N=5..8 SVG 模板真实输出对齐)
- **Files modified:** `__tests__/page-data-mock.test.ts`
- **Commit:** 203e1e0

**2. [18-02 dependency] 测试运行时验证需 18-02 合入**

- **Found during:** Task 1 — vitest run 验证后
- **Issue:** worktree base (809590d) 仅含 18-01(helper),未含 18-02(transformer textContent 注入 + convertOne pageData 挂载);`Slide.pageData` 字段未声明、`PPTBaseElement.textContent` 字段未声明
- **处理:** 按 dispatch "Preferred approach" — 仅写测试文件 + `(x as any).field` 兼容模式,**不**应用 18-02 patch。orchestrator 在 18-02 与 18-04 同时合入 master 后,本测试方可 100% 转绿(`convertOne()` 末尾挂载 pageData + transformer textContent 注入完成后,8 个 it() 全部转绿)
- **替代方案 (a) 不采用原因:** 等待 18-02 完成会拖延本计划交付
- **替代方案 (b) 不采用原因:** 应用 18-02 patch 至本 worktree 会与 18-02 真实 PR 产生 merge conflict,orchestrator 解决冲突的成本高
- **Files modified:** none — `src/index.ts` / `src/slides.ts` / `src/transformer/transform-to-pptel.ts` 均未触碰(供 18-02 合并时干净接入)
- **Verification:** `npx vitest run __tests__/page-data-mock.test.ts` → TypeScript 编译通过(0 errors) + 2 个反向断言已通过 + 6 个正向断言待 18-02 合并后验证

## Key Technical Details

### 为什么用 `(slide as any).pageData` 模式

`Slide` interface 在 18-02 后才会新增 `pageData?: PageData` 字段(同理 `PPTBaseElement.textContent?: string`)。本计划在 18-02 之前写测试,需用 `as any` 模式兼容 TypeScript 字段未知 — 这是 v1.12 content-key-mock.test.ts 已建立的模式(`expect((rect as any).contentKey).toBeUndefined()`)。18-02 merge 后 orchestrator 可选择:

- (a) 保留 `as any` cast(运行无碍,TypeScript 仍合法)
- (b) 移除 `as any` cast,直接访问 `slide.pageData` 与 `el.textContent`(更严格的 type-safe)

### helper-first vs convert-full 策略分工

| 计划 | 测试入口 | 验证焦点 |
|------|---------|---------|
| 18-01 (`__tests__/page-data.test.ts`) | `buildPageData(elements)` helper 直调 | helper 单元行为(none-side dependency) |
| 18-02 (`__tests__/text-content-extraction.test.ts`) | `parseSvg` + `transformToPPTElement` | transformer 集成 + textContent 字段 |
| **18-04 (本计划)** | `convert(svg)` 全链路 | `convertOne()` 末尾 D-09 / D-15 守卫 + pageData 聚合层 |
| 18-03 (fixture E2E) | `convert()` 跑真实 fixture SVG | 5 fixture 实际行为 + 9 fixture 无回归 |

### 0-hit 与 type-guard 反向断言测试提前通过

PD-13 (0 命中) 与 PD-14 (类型守卫) 的预期均为 `slide.pageData === undefined`,在 18-02 落地**之前**就已自然通过(因为 `convertOne()` 当前**不**调用 buildPageData,pageData 字段**不**会被挂载)。这两个反向断言是 18-02 merge 前后**双向 stable** 的:

| 状态 | PD-13 预期 | 实际 | 测试 |
|------|----------|------|------|
| 18-02 前(当前) | undefined | undefined | 通过 |
| 18-02 后 | undefined | undefined | 通过(但 pageData 因 0 命中守卫不挂载) |

反向断言在两个状态下均 green — 是 v1.13 release gate 的**稳定性指标**。

## Files Created

```
__tests__/page-data-mock.test.ts  (10998 bytes) — 8 vitest mock SVG E2E 覆盖 N=5..8 + 0-hit + first-wins + type guard + 6 other boundary cases
```

无任何源文件修改 — `src/index.ts` / `src/slides.ts` / `src/transformer/transform-to-pptel.ts` 均未触碰,留待 18-02 合并时干净接入。

## Commits

- `203e1e0 test(18-04): mock SVG E2E for pageData edge cases (N=5..8, 0-hit, first-wins, type guard)`

## Success Criteria Met

- [x] `__tests__/page-data-mock.test.ts` 8 it() 完成,覆盖 **PD-E2E-02** (N=5..8 扩展)+ **D-04** (multiline 拆分)+ **PD-13** (0 命中)+ **D-06** (first-wins)+ **D-14** (desc fallback)+ **D-08** (静态子集)+ **PD-14** (类型守卫)+ **D-19** (N=1..4 实际范围)
- [x] v1.13 mock + fixture + unit 三层覆盖完整骨架已就位(unit: `__tests__/page-data.test.ts`;fixture E2E: `tests/e2e/green-art-teaching-page-data.test.ts` - 待 18-03 完成;mock E2E: `__tests__/page-data-mock.test.ts` - 本计划)
- [x] **不**修改 `src/utils/content-key.ts`(D-15 锁定)v1.12 映射表(34 entries)保持原状
- [ ] runtime 8 it() 全绿 — **18-02 dependency**:需 18-02 落地的 `convertOne()` pageData 挂载 + transformer textContent 注入完成后,6 个正向断言方能转绿(2 个反向断言已 green)
- [x] TypeScript 编译 0 errors(vitest transform 步骤通过)
- [x] 既有 v1.12 (contentKey 注入 76 tests)无回归 — 本测试仅添加新文件,未触及既有源

## Self-Check: PASSED

**1. Created files exist:**

- `E:/git/svg2json/.claude/worktrees/agent-aec233ec8318a8ac8/__tests__/page-data-mock.test.ts` — FOUND (10998 bytes, 263 lines, 8 it() cases)
- `E:/git/svg2json/.claude/worktrees/agent-aec233ec8318a8ac8/.planning/phases/18-page-data-extraction/18-04-SUMMARY.md` — FOUND (10788 bytes, 170 lines)

**2. Commits exist:**

- `203e1e0` test(18-04): mock SVG E2E for pageData edge cases — `git merge-base --is-ancestor 203e1e0 HEAD` → FOUND
- `7e9c52d` docs(18-04): record plan summary — present in `git log --oneline -3`

**3. Verification status (vitest run):**

`npx vitest run __tests__/page-data-mock.test.ts 2>&1 | tail -60` → `Tests 6 failed | 2 passed (8)`

- TypeScript 编译 0 errors — PASS
- 8 vitest cases 已注册(discoverable by vitest)
- 2 反向断言已 green (PD-13 0-hit / PD-14 类型守卫 — 双向 stable)
- 6 正向断言 → 18-02 merge 后由 orchestrator 验证

**4. 18-02 dependency — explicitly documented:**

本计划的 6 个正向断言等待 18-02 落地的 `convertOne()` pageData 挂载 + transformer textContent 注入完成。orchestrator 在 18-02 与 18-04 同时合入 master 后,本测试方可转绿(已写入 SUMMARY.md "Success Criteria Met" 章节)。

**5. Ledger recorded:**

`E:/git/svg2json/.git/worktrees/agent-aec233ec8318a8ac8/gsd-plan-head-before-18-04` → `809590ddb5d017d4d66c2a36cf2b1f74ec264f1e`(plan head before)

`git rev-list --count 809590d..HEAD` → 2 commits for this plan
