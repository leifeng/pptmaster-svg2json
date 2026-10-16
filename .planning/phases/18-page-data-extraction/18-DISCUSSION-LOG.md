# Phase 18: page-data-extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 18-page-data-extraction
**Areas discussed:** textContent 提取范围 / textContent 字段命名 / TOC desc 多行拼接 / pageData 字段何时省略 / partial hits 模式

---

## 1. textContent 提取范围

| Option | Description | Selected |
|--------|-------------|----------|
| 广 — 所有 PPTTextElement 都写 textContent | 每个 PPTTextElement 不论是否有 contentKey 都写;pageData 是上层语义聚合 | |
| **窄 — 仅 contentKey 命中才写 textContent** | 只有 v1.12 已实现 17 个 contentKey (34 entries) 命中的 PPTTextElement 写 | ✓ |
| 两层语义分层 | textContent 与 contentKey 同生命周期,pageData 仅从二者同时有的元素聚合 | |

**User's choice:** 窄 — 仅 contentKey 命中才写 textContent
**Notes:** D-01 锁定为"textContent 与 contentKey 一对绑定出现"。镜像 v1.12 的 contentKey 注入位置 + 路径(text case only + path-merge 自动覆盖)。

---

## 2. textContent 字段命名

| Option | Description | Selected |
|--------|-------------|----------|
| **textContent** | 与 JS DOM API 同名 | ✓ |
| rawText | 语义明确,避开 DOM 重名 | |
| svgText | 明确"SVG 源文本",但易泄露 SVG 字样进 PPT JSON | |

**User's choice:** textContent (与 JS DOM API 同名)
**Notes:** D-02 锁定。位置同 `contentKey?` 在 `PPTBaseElement`(`src/slides.ts:135`)。reverse 成本:coldly(若改名,fixture baseline 需重生 + PPTist schema 同步)。

---

## 3. TOC desc 多行拼接策略

| Option | Description | Selected |
|--------|-------------|----------|
| 拼为多行字符串 (\n 分隔) | 多 tspan[dy] 拼接为单字符串,PPTist 多行字符串 | |
| desc = string[] 数组 | desc 改为数组,需重建 PPTist schema 与 PPTTextElement filter | |
| **仅首 spans[dy] 胜出** | 第二个及后续 desc tspans 丢弃,fixture 实际 N=1 各 1 个自然命中 | ✓ |

**User's choice:** 仅首 spans[dy] 胜出
**Notes:** D-06 锁定为一次性 one-way 决策(rationale:fixture N=1 各 1 desc 自然命中)。若未来 fixture 出现 N=1 多 desc,第二+会被丢弃,需新 phase 解决。

---

## 4. pageData 字段何时省略 (整体)

| Option | Description | Selected |
|--------|-------------|----------|
| 总是发空对象 `{}` | slide 无命中也发 `pageData: {}` | |
| 整字段省略(零命中) | slide 内无 contentKey 命中,slide.pageData 字段不出现 | (locked by ROADMAP success criteria 3) |
| 全字段 undefined(key 存在值 undefined) | 17 个静态字段全在,值为 undefined | |

**User's choice:** 整字段省略(ROADMAP success criteria 3 直接锁定;未作为讨论 — 已是要求)
**Notes:** D-09 锁定。判定条件:`buildPageData()` 返回 `undefined` 时 `slide.pageData` 不写。

---

## 5. pageData 部分命中模式(已选)

| Option | Description | Selected |
|--------|-------------|----------|
| **发命中子集 (TPL-CB-03 模式)** | 仅命中的 contentKey 字段写到输出 JSON,未命中不出现 | ✓ |
| 发 17 + 动态全集 (undefined 未命中) | 17 + 24 字段全在,值 undefined | |

**User's choice:** 发命中子集 (TPL-CB-03 模式)
**Notes:** D-08 锁定。镜像 v1.11 TPL-CB-03 + v1.12 field omission over null 共识。

---

## Claude's Discretion

- textContent 空白处理细节(默认不 trim,D-05 锁定原样保留占位符与换行)
- `directoryItem.desc` 缺失 fallback(默认空串,保证 interface 必填 contract)
- `buildPageData()` 内部 N 解析正则(宽容 fallback,匹配 `directory_item_(\d+)$`)
- elements 数组顺序冲突 first-wins 由数组首次出现决定
- multiline Row 1 含 no-dy inline tspan 时,textContent 取 fast-xml-parser 整段拼接文本(不主动合并)

## Deferred Ideas

None — discussion stayed within phase scope. 4 区域均锁定决策;无 scope creep,无 deferred idea 落到未来 phase。

**Future-conflict 风险一次性记录:**
- N=2+ tspan[dy] 单 N carrier 在 fixture 中出现时,desc 第二个+会被丢弃(D-06 one-way)
- 多 PTTextElement 同 id 同 contentKey 第一胜出(D-07 costly)
- 占位符原样保留不解析(D-05 + ROADMAP success criteria)
