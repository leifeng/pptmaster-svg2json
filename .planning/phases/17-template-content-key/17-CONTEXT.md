# Phase 17: template-content-key - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

## Phase Boundary

Transformer 在 transformer 阶段按静态 + 动态 id 映射表(10 静态 + 8 动态 N∈1..8)在 PPTTextElement 上注入 `contentKey` 字段;字段仅对文本类型元素施加,标 13 类语义绑定键(cover_title / directory_item_1 / chapter_title / end_title 等)供 PPTist 端用作"用户填写正文"的语义绑定。

TOC multiline 处理: `toc-item-{N}-carrier` 内的 `tspan[dy]` 各拆为独立 PPTTextElement,挂 `directory_item_desc_N`;leading inline text 挂 `directory_item_N`。`toc-item-{N}-note-carrier`(N∈1..8)作为独立 id 也映射 `directory_item_desc_N`(与 carrier 内 tspan 互斥,fixture 不会两者并存)。

## Requirements (locked via REQUIREMENTS.md)

**17 requirements locked via `.planning/REQUIREMENTS.md` §"v1.12 Requirements".** This phase expands the locked set by 1 (the new note-carrier id → `directory_item_desc_N` mapping for N∈1..8) — see `Decisions` section discussion-log for explicit ratification.

Downstream agents MUST read `.planning/REQUIREMENTS.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from REQUIREMENTS.md v1.12 section):**
- **CK-01 ~ CK-03** cover: 3 个静态映射(`cover-title-carrier` / `cover-subtitle-carrier` / `cover-author-carrier`)
- **CK-04 ~ CK-06** chapter: 3 个静态映射(`chapter-number-carrier` / `chapter-title-carrier` / `chapter-desc-carrier`)
- **CK-07 ~ CK-08** content: 2 个静态映射(`content-title-carrier` / `content-subtitle-carrier`)
- **CK-09 ~ CK-10** closing: 2 个静态映射(`closing-thanks-carrier` / `closing-subtitle-carrier`)
- **CK-11 ~ CK-13** TOC: 1..N 动态(`toc-item-{N}-number` / `toc-item-{N}-carrier` 主体与 tspan[dy] 拆分)
- **CK-14** CK-15 CK-16 行为守卫(非映射 id 字段省略 / 未知 id 静默跳过 / 仅 PPTTextElement 写)
- **CK-17** 范围边界(N∈1..8 动态处理,SVG 实际 N 决定是否写 contentKey)

**Implicit expansion (decided this session, to be added to REQUIREMENTS.md before planning):**
- `toc-item-{N}-note-carrier` (N∈1..8) → `directory_item_desc_N` — 与 `carrier` 内 tspan[dy] 互斥(fixture 不两者并存,代码无需重叠处理)

**Out of scope (from REQUIREMENTS.md):**
- 其他 page-type 模板 id(仅 13 + 动态 24 = 共 13 + 24 entries 走映射)
- 自动检测模板意图(无 id 的 fallback)
- 重命名现有 carrier id
- i18n / locale 变体
- contentKey 在非模板元素上

## Implementation Decisions

### Architecture (mirrors v1.11 templateType=1 pattern)

- **D-01:** `contentKey?: string` 字段加在 **PPTBaseElement**(`src/slides.ts:135` 起)— 架构对齐 v1.11 `templateType?: 1` 位置 — **Reversibility:** one-way — rationale: 字段类型已在 16 个 fixture E2E 基线(将重生 19 fixture 含 contentKey)落定,后续若迁移到 PPTTextElement 需重建基线
- **D-02:** TypeScript 类型 `string` + 独立的 `CONTENT_KEY_VALUES: readonly string[]` 常量数组(运行时反向断言用)— 不使用 literal union(避免每次新增映射重建类型) — **Reversibility:** reversible — 仅为类型强度选择,不影响 JSON 输出
- **D-03:** contentKey 与 templateType=1 **独立判定**(只看 id 命中映射,不依赖 isTemplate)— 即同一 PPTBaseElement 可同时带 `templateType=1` 与 `contentKey`;也可仅其一或都不带 — **Reversibility:** reversible — 内部逻辑,无 schema 变动;但用户已确认语义"contentKey 不依赖 template"
- **D-04:** 抽取 helper 函数封装所有 contentKey 逻辑 — **Reversibility:** reversible — 仅重构位置,不动 JSON 输出
- **D-05:** helper 放独立模块 `src/utils/content-key.ts` — **Reversibility:** reversible — 模块边界,易于将来单测

### Static & Dynamic Mapping

- **D-06:** 10 个静态 id 走 Record 映射:
  - `cover-title-carrier` → `cover_title`
  - `cover-subtitle-carrier` → `cover_subtitle`
  - `cover-author-carrier` → `cover_author`
  - `chapter-number-carrier` → `chapter_number`
  - `chapter-title-carrier` → `chapter_title`
  - `chapter-desc-carrier` → `chapter_desc`
  - `content-title-carrier` → `content_title`
  - `content-subtitle-carrier` → `content_subtitle`
  - `closing-thanks-carrier` → `end_title`
  - `closing-subtitle-carrier` → `end_subtitle`
  — **Reversibility:** reversible — 静态常量调整,无 schema 变动

- **D-07:** TOC id 走 **1..8 动态预生成**(非"1..4 静态 + 5..8 动态"双路径):
  - `toc-item-{N}-number` (N∈1..8) → `directory_item_number_{N}`
  - `toc-item-{N}-carrier` (N∈1..8) → `directory_item_{N}`
  - `toc-item-{N}-note-carrier` (N∈1..8) → `directory_item_desc_{N}`
  - 预生成 cache 在模块 load 时静态展开(无需 memoization)— **Reversibility:** one-way — rationale: 用户明确要求"按 1-8 处理,N 是多少就写多少,需要在 SVG 中判断一共有几个";扩展函数 pure 但 mapping 上限锁定 8 是个外部约定(可改但需同步 fixture)

- **D-08:** SVG 实际出现的 N 才写 contentKey——预生成全范围 cache,运行时 lookup 找不到返回 `undefined`,字段省略 — **Reversibility:** reversible — 仅为查找语义,无 schema 变动;fixture 中 N=1..4 自然命中,扩展 N=5..8 仅依赖 SVG 输入

### TOC Multiline Split + Carrier Internals

- **D-09:** carrier 内 multiline 拆分时,每个 PPTTextElement 上挂不同的 contentKey:
  - Row 1(leading inline text) → `directory_item_{N}`(`toc-item-{N}-carrier` id 派生)
  - Row 2..N(每个 `tspan[dy]`) → `directory_item_desc_{N}`(N 与父 carrier 共享)
  — **Reversibility:** one-way — rationale: CK-13 明文要求;fixture E2E 基线锁后改"全部挂 directory_item_N"需重生 fixture
- **D-10:** carrier 内**无 dy 的中间 inline tspan** 不拆,与 leading text 同行(同 id,挂 `directory_item_{N}`)— 不视为独立的 multiline 行 — **Reversibility:** reversible — 内部多行 split 行为,fixture 不需修改
- **D-11:** `toc-item-{N}-note-carrier` 与 `carrier` 内 tspan[dy] 互斥:fixture 不会两者并存,代码不做重叠或优先级处理 — **Reversibility:** reversible — 隐含规则,fixture 验证;若未来冲突,需要用户在 v1.13 单独提出

### Transform Element Integration

- **D-12:** `transformElement()`(src/transformer/transform-to-pptel.ts:1011 附近)顶部统一计算:
  ```
  const contentKeyValue = getContentKeyFor(element.attrs.id)  // undefined 或 string
  ```
  然后在 `text` case 末尾统一追加(无论 multiline / 单行):
  ```
  if (contentKeyValue) result.contentKey = contentKeyValue
  ```
  - multiline 路径:`tspanElements.map((tspan, idx) => {...})` 内每 row 按 D-09 区分 Row 1 vs Row 2..N — **Reversibility:** reversible — 内部写法,无 schema 改动

- **D-13:** CK-16 类型守卫实现:仅在 text case 写 `result.contentKey`(`if (contentKeyValue) result.contentKey = contentKeyValue` 位于 text case 分支末尾,rect/circle/ellipse/path/polygon/polyline/line/image 各 case 不写)— 与 templateType=1 的"D-TPL-06 各 case 末尾 if (isTemplate) result.templateType = 1"模式区分(contentKey 仅 text 分支写)— **Reversibility:** reversible — 逻辑隔离
- **D-14:** `path-merge` 分支(mergedElement 在 transformToPPTElement() 的 walk() group-merge 块)由 D-12 + D-13 守卫自动 handle:mergedElement 是合成代表,本身就是 PPTBaseElement 子类型(contentKey 仅在 text 路径走,且 merged 路径默认不会发生) — **Reversibility:** reversible — 隐含覆盖

### E2E Strategy

- **D-15:** 混合测试策略 — fixture JSON 基线重生 19 个 SVG + mock SVG E2E 覆盖 note-carrier 与 5..8 动态 — **Reversibility:** reversible — 仅测试组织
- **D-16:** fixture 重生范围: 仅 19 个含 contentKey 的 SVG(`grep -lE 'id="(cover-title|cover-subtitle|cover-author|chapter-number-carrier|content-title-carrier|closing-thanks-carrier|toc-item-[0-9]+-(number|carrier))"' exampels/green-art-teaching/svg_output/*.svg`),其他 21 个 SVG 即使 transform 也不含 contentKey 不需重生 — **Reversibility:** reversible — fixture 维护边界
- **D-17:** mock SVG E2E 在 `__tests__/content-key-mock.test.ts`(新增)内覆盖:
  - `toc-item-5..8-{number,carrier,note-carrier}` 三类
  - `toc-item-{N}-carrier` 内 tspan[dy] 拆分(挂 directory_item_desc_N)
  - `toc-rail-title` 等未映射 id 反向断言(确认字段省略)
  — **Reversibility:** reversible — mock fixture,删除即可恢复

### Claude's Discretion

- `getContentKeyFor()` 内部实现:预生成 `Map<string, string>`(或静态初始化后冻结 Record)— 模块 load 时构造,运行时 O(1) lookup
- `CONTENT_KEY_VALUES` 数组来源:从映射表 `Object.values()` 派生(单一来源,无需手维护数组)
- 反向断言机制:E2E 内显式断言 `contentKey === undefined`(字段不存在),不靠 type guard;TS 类型上依赖 `contentKey?: string` 让 nil 表达合法
- multiline 路径下 `extractTspansWithPosition()` 返回 row 顺序——第 1 项视为 Row 1(leading inline),其他按文档顺序
- `cover-date-carrier` 等未映射 id 在 fixture 中已存在,e2e 反向断言的天然样本

### Folded Todos

None — `cross_reference_todos` step found no matches.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level Decisions & Requirements
- `.planning/PROJECT.md` — project core value、TPL-MARK-01~03 v1.11 决策、Milestone v1.12 描述
- `.planning/REQUIREMENTS.md` §"v1.12 Requirements" — 17 个 CK-* 需求 + Out of Scope 表;下阶段需追加 1 条 note-carrier 需求(N∈1..8 → directory_item_desc_N)
- `.planning/STATE.md` — Phase 17 当前 planning 状态 + CK-DEC-01~06 决策(部分需更新:D-03 "独立判定"取代"同生命周期";D-04 引入新动态范围)
- `.planning/ROADMAP.md` §"Phase 17: template-content-key" — Phase 目标、Success Criteria 4 条

### v1.11 Implementation Pattern (Code Mirror)
- `.planning/milestones/v1.11-phases/16-template-element-marking/16-CONTEXT.md` — v1.11 决策集 D-TPL-01~07,D-12/13 的写法参考 v1.11 D-TPL-06("transformElement() 顶部计算 + 各 case 末尾写")模式
- `src/slides.ts:135-147` — PPTBaseElement 当前位置,新增 `contentKey?: string` 字段的位置
- `src/slides.ts:184-` — PPTTextElement 接口,contentKey 在父类继承
- `src/transformer/transform-to-pptel.ts`:
  - ~line 1011 `transformElement()` 顶部 — isTemplate 计算模式(D-12 内容计算区)
  - ~line 1503 `if (isTemplate) result.templateType = 1` — D-13 注入模式参考(`if (contentKeyValue) result.contentKey = contentKeyValue`)
  - ~line 1535 多行 split 入口(用户描述:该处为 v1.11 templateType 注入点)
  - ~line 1773 `isMultiline = hasLineBreakTspans()` — multiline 判定
  - ~line 1779 `tspanElements = extractTspansWithPosition()` — multiline 拆分(D-09 的 row 顺序依据)
  - ~line 1793 `tspanElements.map((tspan, idx) => ...)` — multiline 每 row PPTTextElement 构造点(D-09 区分 Row 1 vs Row 2..N 的位置)
  - ~line 863 `hasLineBreakTspans()` — dy/y 检测(D-10 "无 dy 不拆"的判定依据)

### Fixtures (E2E Baseline)
- `exampels/green-art-teaching/svg_output/` — 40 个 SVG 总体,19 个含 contentKey 映射 id(D-16 重生范围)
- `exampels/green-art-teaching/svg_output/02_toc.svg` — TOC 主样本:含 `toc-item-1..4-number`、`toc-item-1..4-carrier`(内嵌 tspan[dy])、`toc-rail-title`(未映射,反向断言)、`toc-rail-label`(未映射)
- `exampels/green-art-teaching/svg_output/01_cover.svg` — cover 主样本:含 `cover-title-carrier` / `cover-subtitle-carrier` / `cover-author-carrier`(CK-01~03),还含 `cover-date-carrier`(未映射,反向断言)
- `exampels/green-art-teaching/svg_output/03_chapter.svg` — chapter 主样本:含 `chapter-number-carrier` / `chapter-title-carrier` / `chapter-desc-carrier`
- `exampels/green-art-teaching/svg_output/04_content.svg` — content 主样本:含 `content-title-carrier` / `content-subtitle-carrier`
- `exampels/green-art-teaching/svg_output/<20_ending>.svg`(待确认 — closing-thanks-carrier / closing-subtitle-carrier 所在) — closing 主样本

### Existing Tests Pattern
- `__tests__/transform-element.test.ts` — 单元素转换测试风格,mock SVG E2E 内容参考
- `tests/e2e/202610131101001.test.ts` — fixture-based E2E 模式参考
- `.planning/milestones/v1.11-phases/16-template-element-marking/16-03-PLAN.md` — v1.11 E2E 风格
- `.planning/milestones/v1.11-phases/16-template-element-marking/16-03-SUMMARY.md` — v1.11 E2E 完成情况

## Existing Code Insights

### Reusable Assets
- **`PPTBaseElement` interface** (`src/slides.ts:135-147`) — D-01 添加 `contentKey?: string` 的位置,与 `templateType?: 1` 并列
- **`PPTTextElement extends PPTBaseElement`** (`src/slides.ts:184`) — contentKey 自然继承,无需重复声明
- **`transformElement()` top-level `isTemplate`** (`src/transformer/transform-to-pptel.ts:1011`) — D-12 镜像:`const contentKeyValue = getContentKeyFor(element.attrs.id)`
- **`tspanElements.map((tspan, idx) => {...})`** (`src/transformer/transform-to-pptel.ts:1793`) — D-09 用 idx 区分 Row 1 vs Row 2..N 的位置
- **`hasLineBreakTspans()`** (`src/transformer/transform-to-pptel.ts:863`) — D-10 "无 dy 不拆"的判定复用

### Established Patterns
- **D-TPL-06 / templateType=1 注入**: result 构造块末尾 `if (isTemplate) result.templateType = 1` — D-13 contentKey 镜像为 `if (contentKeyValue) result.contentKey = contentKeyValue`(但仅 text case)
- **CK-DEC-01 静态 Record / 静态常量**:helper 内部用 `Record<string, string>` 配合 `for` 循环预生成 1..8 范围条目
- **field omission over null** (v1.11 TPL-CB-03):contentKey 不写时直接 `delete` 或不赋值,JSON 字段不存在
- **TypeScript literal const**:v1.11 用 `as const` 实现 literal `1`;v1.12 contentKey 是 string,用可选类型即可

### Integration Points
- **`transformElement()` 顶部** (line 1011 附近):D-12 计算 `contentKeyValue = getContentKeyFor(...)`(必须先于各 case switch)
- **text case 末尾** (line ~1820):D-13 注入 `if (contentKeyValue) result.contentKey = contentKeyValue`
- **multiline map 内 row 构造** (line ~1793):D-09 在每 row result 构造块末尾区分:
  - `if (idx === 0) result.contentKey = mapping[carrierId] = directory_item_{N}`
  - `else result.contentKey = directory_item_desc_{N}`
- **`src/utils/content-key.ts`** (新建):D-04/D-05 helper 模块,导出 `getContentKeyFor(id: string): string | undefined` 与 `CONTENT_KEY_VALUES: readonly string[]`
- **`src/slides.ts:135-147`**:D-01 新增字段位置

## Specific Ideas

### Fixture-Driven Sample Anchors
- **02_toc.svg**:`toc-item-1-carrier` 内 `<tspan x="572" dy="32.33" font-size="18">发热分期、常见热型、监测记录与误区</tspan>` — Row 1 → `directory_item_1`,Row 2 → `directory_item_desc_1`(CK-12 + CK-13 实测样本)
- **02_toc.svg**:`toc-rail-title` 内 `<tspan x="254.52" dy="110.46">录</tspan>` — 未映射 id,Row 1 也不带 contentKey(CK-14 fixture 反向断言样本)
- **01_cover.svg**:含 `cover-date-carrier`(未映射,CK-14 fixture 反向断言样本)+ 3 个 cover 映射 id
- **笔记 fixture**:`cover-title-carrier` id 含 `<tspan>` 但 inline-only(无 dy),按 D-10 不视为独立 multiline 行

### Implementation Order Suggestion (PLAN Draft)
- **17-01 (Wave 1)**: `src/utils/content-key.ts`(helper + CONTENT_KEY_VALUES)+ PPTBaseElement 字段声明 + 单元测试(`__tests__/content-key.test.ts`)
- **17-02 (Wave 2)**: `transformElement()` 集成 — top 计算 + text case 末尾写 + multiline map row 区分
- **17-03 (Wave 3)**: fixture JSON baseline 重生(19 个)+ fixture E2E(`tests/e2e/green-art-teaching-content-key.test.ts`)
- **17-04 (Wave 4)**: mock SVG E2E(`__tests__/content-key-mock.test.ts`)覆盖 note-carrier + 5..8 动态 + 反向断言

### Slide Schema Notes
- PPTBaseElement 在 `src/slides.ts:135` 现在有:`id / left / top / lock / groupId / width / height / rotate / link / name / templateType`;v1.12 新增 `contentKey?: string`
- `Slide.elements?: PPTElement[]`(src/slides.ts:~777)— 内容数组不变,contentKey 字段透出到每个 PPTTextElement
- PPTist 端消费:`slide.elements.find(e => e.contentKey === 'cover_title')` 即可定位

## Deferred Ideas

None — discussion stayed within phase scope. Note-carrier / carrier 内 tspan 互斥规则与 fixture 锁定一致;1..8 动态范围与用户"N 是多少就写多少"指示一致;未来若出现两者并存,需 v1.13 单独 phase 处理。

---

*Phase: 17-template-content-key*
*Context gathered: 2026-10-16*
