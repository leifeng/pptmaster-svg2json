---
status: resolved
trigger: 我才发现在生成带有contentKey的json数据里多了textContent，这个是什么时候带的，虽然没什么影响
created: 2026-10-19
updated: 2026-10-19
goal: find_root_cause_only
---

# Current Focus

hypothesis: textContent 字段是在 Phase 18 (D-03/D-04) 添加到 contentKey JSON 输出中的 — src/transformer/transform-to-pptel.ts 注释明确标记 "D-03 (Phase 18): inject textContent locked to contentKey presence"
next_action: 用 git log -S "textContent" / git blame 找到引入 commit(确认 phase 18 / v1.13)
test: (in progress — code evidence collected)
expecting: 找到引入 textContent 到 contentKey 输出的 commit hash + phase 文档编号

## Symptoms

- Expected: 想知道 textContent 字段是什么时候/在哪个 phase 添加到带有 contentKey 的 JSON 输出的
- Actual: 当前带有 contentKey 的元素输出里出现了 textContent 字段（用户认为多余但不影响功能）
- Error: 无
- Timeline: 用户刚刚发现（具体从哪个版本起不明）
- Reproduction: 生成带有 contentKey 的 JSON 数据

## Eliminated

## Evidence

### 2026-10-19 — Grep code search results
- checked: 仓库内 textContent 引用
- found: src/transformer/transform-to-pptel.ts 中三处 `result.textContent = ...` 写入点(line 1855 / 1864 / 1902),全部位于 `if (contentKeyValue) { ... result.contentKey = contentKeyValue; result.textContent = ... }` 内(严格执行 D-03 互锁)
- found: src/slides.ts line 167 声明 `textContent?: string`,JSDoc 注释明确标注 "Phase 18 / v1.13 D-02"
- found: src/utils/page-data.ts line 43-49 `getTextContent()` 读取 `element.textContent` 作为 pageData 字段的字面来源
- implication: textContent 不是孤儿字段,有下游消费者(pageData 聚合)

### 2026-10-19 — git log -S 锁定引入 commit
- checked: `git log -S "result.textContent = tspan.text"` 与 `git log -S "result.textContent = extractRawText(element)"` 同时返回 **唯一 commit: `03b7b2e44a18d814db4e282c9360b533545f32ab`**
- found: `feat(18-02): integrate textContent/pageData into transformer pipeline` — author zcl, **Fri Oct 16 17:41:44 2026 +0800**
- found: 该 commit 修改 4 个文件 src/index.ts / src/slides.ts / src/transformer/transform-to-pptel.ts / src/utils/page-data.ts,共 +91 / -53
- implication: textContent 字段是 phase 18 / v1.13 plan 02 引入,不是 phase 17(那时只有 contentKey)

### 2026-10-19 — git diff 03b7b2e~1..03b7b2e 直接对比
- checked: 父 commit 的 src/slides.ts
- found: 父 commit 仅声明 `contentKey?: string` (line 155),**没有任何 textContent 字段**;`textContent?: string` 是该 commit 新增的 12 行 JSDoc + 1 行字段
- implication: contentKey 与 textContent 不在同一 phase 引入 — contentKey 来自 phase 17 (v1.12),textContent 来自 phase 18-02 (v1.13),验证用户观察 (先有 contentKey,后冒出来 textContent)

### 2026-10-19 — phase 17 (contentKey) commits 交叉验证
- `c517ff9 feat(17-01): contentKey helper + 单元测试 (Phase 17 wave 1)`
- `cc0cab2 feat(17-02): PPTBaseElement.contentKey 字段 + 单行 text case 注入 (Wave 2)`
- implication: contentKey 是 v1.12 ship 前引入,确认 phase 18 之前 contentKey 输出没有 textContent 字段

### 2026-10-19 — phase 18 D-02 / D-03 决策追溯
- checked: 18-DISCUSSION-LOG.md
- found: D-02 决策 "User's choice: textContent (与 JS DOM API 同名)",位置在 PPTBaseElement,reverse 成本:coldly(若改名,fixture baseline 需重生 + PPTist schema 同步)
- found: 18-02-SUMMARY.md 明确 patterns-established "Pattern 1:contentKey 命中即 textContent 写入(互锁)— 单行 + multiline 任何 case 都不能单独写 textContent"
- implication: textContent 是设计上有意与 contentKey 互锁写入的(不是宽松 always-on),用户觉得"多余"是因为 PPTBaseElement 上原本就有 `content` 字段(PPIst schema 必填项),与 textContent 概念重叠但用途不同(textContent 保 raw SVG 原文,占位符如 `{{TITLE}}` 不替换)

## Resolution

root_cause: textContent 字段由 Phase 18 / v1.13 plan 02 (commit `03b7b2e4` 2026-10-16) 引入到 `PPTBaseElement`,与既有的 `contentKey` 字段互锁(D-03)写入 — **仅当 PPTTextElement 命中 contentKey 映射表时**才会同步追加 textContent(所以你看到"带 contentKey 的元素才有 textContent"是设计意图,不是 bug)。
fix: N/A(diagnose-only,不修改代码)
verification: N/A
files_changed: []
why_designed: phase 18 的 pageData 聚合器(`buildPageData()` 在 `src/utils/page-data.ts`)需要原始 SVG 文本作为 10 静态字段 + directory.* 的字面来源,但 PPTist 的 `content` 字段是经过 placeholder 替换 / 样式包裹的产物,无法反向映射回原始 token。所以引入一个 parallel 字段 `textContent` 保 raw 原文(D-05:`{{TITLE}}` 占位符原样保留)。
key_commit: `03b7b2e4 feat(18-02): integrate textContent/pageData into transformer pipeline`
key_phase: `18-page-data-extraction/02`
key_decision: `D-02`(`textContent` 命名 = JS DOM API 同名)+ `D-03`(`textContent` 与 `contentKey` 同生命周期互锁)

## Notes

User intent: 追溯历史 — 不修改代码。diagnose-only 模式。
Target: 找到引入 textContent 到 contentKey 输出的 commit 和上下文。

补充:用户感觉"多余" = `textContent` 与 PPTist schema 的 `content` 字段概念上重叠。它们实际互补:
- `content` = 渲染用(可能已被 placeholder 替换 + 包 HTML 标签),PPTist 渲染管线消费
- `textContent` = 原文保真(raw SVG 文本节点),pageData 聚合 + 反向追踪链路消费
如果你确实认为多余想清理,需要先确认下游 (pageData) 是否已迁移到其他来源 — 这是设计决策,不是 bug fix。