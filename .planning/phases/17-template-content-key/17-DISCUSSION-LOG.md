# Phase 17: template-content-key - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-16
**Phase:** 17-template-content-key
**Areas discussed:** contentKey 字段挂载位置, TOC multiline split 后的 contentKey 挂载, N∈5..8 carrier 内 tspan[dy] 行为, E2E baseline 策略, note-carrier vs carrier tspan 优先级, fixture 重生范围, contentKey 写入位置

---

## Area 1: contentKey 字段挂载位置

**Q1:** contentKey 字段应放在哪里?

| Option | Description | Selected |
|--------|-------------|----------|
| PPTBaseElement (架构对齐 v1.11) | 对齐 v1.11 模板类型: `templateType=1` 在 PPTBaseElement 上 | ✓ |
| PPTTextElement-only (类型收紧) | 仅在 PPTTextElement 上加 `contentKey?: string` | |
| 两层 (基类 + 特化加强) | 同时加: PPTBaseElement 加 `contentKey?: never` 占位 | |

**User's choice:** PPTBaseElement(架构对齐 v1.11)

**Q2:** 字段类型表达式?

| Option | Description | Selected |
|--------|-------------|----------|
| `contentKey?: string` (宽松) | 只约束是 string | |
| Literal Union (13 个值) | TypeScript literal union,反向断言完全靠类型系统 | |
| 中间: `string` + `CONTENT_KEY_VALUES` const 对象 | runtime 反向断言有依据,TS 表达较轻量 | ✓ |

**User's choice:** 中间方案

**Q3:** contentKey 写入是否依赖 templateType=1?

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 (只看 id 映射) | 两者各自判定路径,生命周期独立 | ✓ |
| 依赖 (必须 templateType=1) | 仅当 isTemplate 时才写 contentKey | |
| 独立但同位置 | 各自判定但同位置写入 | |

**User's choice:** 独立 — 只看 id 是否匹配映射表

**Q4:** 运行时反向保护?

| Option | Description | Selected |
|--------|-------------|----------|
| 代码集中 + 仅 text case 写 | top 计算 + text case 末尾写 | |
| 代码集中 + defensive guard | 同上 + assert 防御 | |
| 映射包装函数提取 | 抽 helper `getContentKeyFor()` | ✓ |

**User's choice:** 映射包装函数提取

**Q5:** helper 文件位置?

| Option | Description | Selected |
|--------|-------------|----------|
| 本文件内部 top-level function | 在 transform-to-pptel.ts 顶部加 helper | |
| 独立模块 src/utils/content-key.ts | 新建模块导出 helper + CONTENT_KEY_MAP | ✓ |
| 现在不入参 (todo follow-up) | 先 helper 同一文件,位置选择作为 17-02 决定 | |

**User's choice:** 独立模块 `src/utils/content-key.ts`

**Notes:** 用户连续选择 5 个 sub-question 才锁定完整架构。

---

## Area 2: TOC multiline split 后的 contentKey 挂载

**Q1:** TOC multiline 拆分后 contentKey 挂载策略?

| Option | Description | Selected |
|--------|-------------|----------|
| Array 各项不同 key(严格 CK-13) | Row 1 → `directory_item_N`, Row 2..N → `directory_item_desc_N` | ✓ |
| Array 每项都挂 title + desc | 每个都同时挂两者 | |
| 仅首行挂 N (不遵 CK-13) | 仅 Row 1 挂 `directory_item_N` | |
| 单 key + PPTist 推断位置 | 仅 background 语义 | |

**User's choice:** Array 各项不同 key(严格 CK-13)

**Q2 (clarification):** 用户补充"如果 text 里有 tspan, 那么 tspan 肯定是目描述"。然后提到 `id="toc-item-{N}-note-carrier"` 也是目录描述。

**Q3:** `toc-item-{N}-note-carrier` 是否属于 v1.12 范围?

| Option | Description | Selected |
|--------|-------------|----------|
| 属于 v1.12 (CK-N+1) | 同步在 CONTENT_KEY_MAP 增加动态生成器 + 手写 mock E2E | ✓ |
| 属于未来 phase | v1.13 独立阶段处理 | |
| 仅理解背景, 不是 v1.12 任务 | 仅作为背景解释 | |

**User's choice:** 加入 v1.12(映射 + 手写 E2E)

**User 补充映射:** `toc-item-{N}-note-carrier` 映射 `directory_item_desc_N`

**Q4:** `toc-item-{N}-note-carrier` 的 N 范围?

| Option | Description | Selected |
|--------|-------------|----------|
| N∈1..4 | 与原 carrier 同 1..4 | |
| N∈1..8 | 扩展 | ✓ |
| N∈1..10 | 完整 | |

**User's choice:** N∈1..8(扩展)

**Q5:** carrier 内带 dy 与不带 dy 的 tspan, 区分策略?

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 dy tspan 走 desc 拆分 | CK-13 严格范围,无 dy tspan 视为同一行 inline | ✓ |
| 任何 tspan 都走 desc 拆分 | 任何 tspan 都视为 desc | |
| 仅 dy tspan + 兜底 | CK-14 fallback | |

**User's choice:** 仅 dy tspan 走 desc 拆分

**Notes:** 用户最初补充时引入 note-carrier 新场景,经过 3 个 sub-question 才稳定为"加入 v1.12 + N∈1..8 + 仅 dy 拆分"。

---

## Area 3: N∈5..8 carrier 内 tspan[dy] 行为

**Q1:** N∈5..8 carrier 内 tspan[dy] 行为?

(User clarification 请求)

**User 描述场景:** "5 个目录名称, 每个名称中拆分出了描述后, 这些描述的 contentKey 不写?"

**Q2 (后续):** N∈5..8 范围处理?

| Option | Description | Selected |
|--------|-------------|----------|
| 仅跳过 contentKey 字段 (PPTTextElement 照带) | 现有逻辑跑 + 不写字段 | |
| 跳过整个 carrier (不发任何 PPTTextElement) | 整段不输出 | |
| 拆分+静默 N4 | tspan[dy] 仍可挂 desc_N (无视 N 范围) | |

**User 推翻:** **"按 1-8 处理,N 是多少就写多少,需要在 svg 中判断一共有几个"**

**User's final:** 改为动态范围——不再是固定的 1..4,改成 1..8 预生成 + SVG 实际 N 决定。

**Q3 (重新):** 动态 vs 静态 Map 路线?

| Option | Description | Selected |
|--------|-------------|----------|
| 动态 1..8 + Cache | 1..8 全量预生成,运行时按 SVG 实际出现的 N 写 | ✓ |
| 静态 1..4 + 5..8 动态 | 双路径,保留静态 map 不变 | |
| 纯动态 1..8 | 仅生成实际出现的 1..max | |

**User's choice:** 动态 1..8 + Cache

**Notes:** 用户推翻了 CK-DEC-02 "1..4 静态 + 5..8 skip" 决策,改为"动态 1..8 全量"。这导致 STATE.md CK-DEC-02 需更新。

---

## Area 4: E2E baseline 策略

**Q1:** v1.12 E2E 怎么测?

| Option | Description | Selected |
|--------|-------------|----------|
| Regenerate Baseline (全量重生) | 重生所有 20 fixture JSON 含 contentKey | |
| 定向断言 (保留旧基线 + 单测) | 旧基线不变 + 仅加 13 个 contentKey 单测 | |
| 混合 (重生 1..4 + mock 5..8) | 19 fixture 重生 + mock SVG E2E | ✓ |

**User's choice:** 让 Claude 推荐 → 最终选混合

**Notes:** Claude 推荐方案 3 混合,理由: fixture 1..4 重生一次 + mock SVG E2E 覆盖动态边界。

---

## Explore round 1: note-carrier 与 carrier 内 tspan 同时存在

**Q:** 同 N 同时存在 carrier(带 tspan[dy]) 与 note-carrier 怎么办?

| Option | Description | Selected |
|--------|-------------|----------|
| 都写 (key 1+1) | 两类均写 contentKey,PPTist 决定优先级 | |
| 代码外文档预期 | 不写代码,只是预期设计 | |
| note 优先 | note-carrier 优先,carrier tspan 不拆 | |

**User 答复:** **"没有这种情况,不需要考虑"** (fixture 不会两者并存,未来也不考虑)

**Notes:** 用户隐式声明了 note-carrier / carrier 内 tspan 互斥的 fixture 约束,代码不需要 overlap 处理。

---

## Explore round 2: fixture 重生范围

**Q:** 重生多少 SVG JSON 文件作为基线?

| Option | Description | Selected |
|--------|-------------|----------|
| 仅 19 fixture 重生 | 仅含 contentKey 的 19 个 JSON | ✓ |
| 全 40 套 fixture 重生 | 全部 baseline | |
| 重生 fixture + 缓存现仃 | 19 个 + file metadata | |

**User's choice:** 仅 19 fixture 重生

---

## Explore round 3: contentKey 写入位置

**Q:** 写入位置集中度?

| Option | Description | Selected |
|--------|-------------|----------|
| top-level + text case 末尾 | top 计算 + text case 末尾 | ✓ |
| helper 包装于 text case + mutator 函数 | helper 同时判 type | |
| 仅 top-level 计算, 各 case 自己调 helper | 各 case 自己比 | |

**User's choice:** top-level + text case 末尾

---

## Claude's Discretion

- `getContentKeyFor()` 内部实现:预生成 `Map<string, string>`(或静态初始化后冻结 Record)— 模块 load 时构造,运行时 O(1) lookup
- `CONTENT_KEY_VALUES` 数组:从映射表 `Object.values()` 派生(单一来源)
- 反向断言机制:E2E 内显式断言 `contentKey === undefined`,TS 类型上依赖 `contentKey?: string`
- multiline 路径下 `extractTspansWithPosition()` 返回 row 顺序——第 1 项视为 Row 1
- `cover-date-carrier` 等未映射 id 在 fixture 中已存在,e2e 反向断言的天然样本

## Deferred Ideas

None — discussion stayed within phase scope. Note-carrier / carrier 内 tspan 互斥规则与 fixture 锁定一致;1..8 动态范围与用户"N 是多少就写多少"指示一致;未来若出现两者并存,需 v1.13 单独 phase 处理。
