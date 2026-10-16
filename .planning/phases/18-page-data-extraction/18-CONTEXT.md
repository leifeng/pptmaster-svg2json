# Phase 18: page-data-extraction - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

## Phase Boundary

Transformer 在 transformer 阶段为 v1.12 已锁定 17 个 contentKey (34 entries 实际) 命中的 PPTTextElement 写入 SVG 原始 `textContent`,并在 `convertOne()` 末尾通过 `buildPageData(elements)` 聚合为 `slide.pageData` 字段(sibling of `elements`)。TOC 数据按 N 升序聚合为 `directory: [{index, title, desc}]` 数组(仅 fixture 实际命中项)。

是 v1.12 contentKey 协议的"数据侧"补全 — v1.12 给 PPTElement 打 `contentKey` 标"语义角色",v1.13 把对应**实际纯文本**从 SVG 原始 `textContent` 提取到 `slide.pageData`,PPTist 端可直接读 `pageData.directory[0].title` 等结构化数据,无需自己再解析 PPTTextElement 的 HTML content。

## Requirements (locked via ROADMAP.md § "Phase 18: page-data-extraction")

**20 requirements locked via `.planning/ROADMAP.md`:** PD-01, PD-02, PD-03, PD-04, PD-05, PD-06, PD-07, PD-08, PD-09, PD-10, PD-11, PD-12, PD-13, PD-14, PD-15, PD-16, PD-E2E-01, PD-E2E-02, PD-E2E-03, PD-E2E-04。Success Criteria 4 条全部锁定。本阶段不再重复确认 — 下游 planner 直接读 ROADMAP.md。

**In scope (from ROADMAP.md § "Phase 18"):**
- `src/utils/page-data.ts` 新增 helper (`buildPageData` 纯函数 + `PageData` / `PageDataDirectoryItem` 类型) — 共用 `getContentKeyFor()` lookup
- `PPTBaseElement.textContent?: string` 字段(`src/slides.ts` 紧邻 `contentKey?` 添加) — 仅当 PPTTextElement 命中 v1.12 已实现 34 个 contentKey 时写入
- `convertOne()` 末尾 `buildPageData(elements)` 写入 `slide.pageData` 字段
- TOC 数据按 N 升序聚合为 `directory: [{index, title, desc}]` 数组(仅 fixture 实际命中 N=1..4)
- mock SVG E2E + fixture E2E + 反向断言(无 contentKey 无 pageData / 非 PPTTextElement 不进 pageData)
- v1.13 不修改 `src/utils/content-key.ts` 现有映射表 — 完全复用 v1.12 已实现 34 entries

**Out of scope (from ROADMAP.md § "Phase 18"):**
- 修改 PPTist 源码 — 不动 `code/PPTist/`
- 解析 `{{TITLE}}` 占位符 — 文本原样保留(占位符交给 PPTist 端处理)
- 新增/修改 v1.12 内容映射表(`STATIC_CONTENT_KEY_MAP` / 动态 N 条目生成逻辑)
- 自动检测模板意图 / fallback — 无 id 不触发 pageData
- i18n / locale 变体 — 单语言模板数据
- `directory_item_number_N` 暴露到 `pageData.directory` — 仅 `index/title/desc` 三字段
- 重新设计 v1.12 `tspan[dy]` 拆分逻辑 — 仅消费已有 `contentKey` 标记

## Implementation Decisions

### 字段语义对 (textContent ↔ contentKey)

- **D-01:** `textContent` 字段写**窄范围** — 仅当 PPTTextElement 命中 v1.12 已实现 17 个 contentKey (即 34 entries) 时才写。**未命中映射表的 PPTTextElement 不写 textContent**(也即无 contentKey 即无 textContent,二者同生命周期 — 一对绑定出现) — **Reversibility:** reversible — 内部写入策略,floor 是 v1.12 已定锁定 contentKey 入口;若未来扩展为广范围需改 v1.18 contentKey lookup
- **D-02:** 字段名取 `textContent`(JS DOM 标准 API 同名)— 位置在 `PPTBaseElement`(`src/slides.ts:135` 附近,紧邻 `contentKey?` 声明)。继承到 PPTTextElement 自然落点 — **Reversibility:** reversible(字段命名改 rawText 需重生 fixture E2E baseline + PPTist 端 schema 通知 — 已发布的 fixture E2E baseline 影响定为 costly) — **rationale:** 用户明确指示与 JS DOM 同名;若改名,fixture JSON baseline 需重生,且 PPTist 端 schema 同步需协调
- **D-03:** `textContent` 与 v1.12 `contentKey` **互锁写入** — text case 中 `result.contentKey = contentKeyValue` 紧邻行 `result.textContent = extractRawText(element)`,互为字段存在条件。path-merge 分支与 v1.12 D-14 同样自动覆盖 — **Reversibility:** reversible(逻辑隔离 — 仅 transformElement() text case 末尾同步追加字段即可撤回)

### 文本来源与空白处理

- **D-04:** `textContent` 来源 — 直接取 fast-xml-parser 给出的对应 PPTTextElement 行的原始文本(单行 case 为 `<text>` 整体 textContent 多行为 `extractTspansWithPosition()` 每 row 对应的 tspans 内容)— **Reversibility:** reversible — 内部取值实现,不动 JSON 输出
- **D-05:** `textContent` **保留** SVG 源原始空白字符(占位符如 `{{TITLE}}` 原样保留符合 ROADMAP success criteria + N=0..N 内 `\n` 换行不 trim)— **Reversibility:** reversible — 仅文本取值行为,未来如需 trim 单字段追加 .trim() 即可

### TOC 多 desc 拼接 — First-Wins 策略

- **D-06:** 当 slide 内同一 N 出现 ≥2 个 `directory_item_desc_N` PPTTextElement(由 carrier 内多个 tspan[dy] 派生),`buildPageData()` 对该 N **保留首个**(`tspanElements` 数组索引最小者;`toc-item-{N}-note-carrier` 与 carrier-internal tspan[dy] 互斥 — v1.12 D-11 已锁互斥关系);若 fixture 实际 1 个 N 仅 1 个 tspan[dy],则自然仅为该值 — **Reversibility:** **one-way** — **rationale:** 一旦 fixture 中出现 N=1 carrier 含 2 个 tspan[dy],第二个会被丢弃;若未来需要拼接,需重新过 fixture E2E baseline 并破坏 PPTist 端 desc 字段契约(即 field 类型 string vs string[])
- **D-07:** 同样 first-wins 应用于 `title`(Row 1):即使 Row 1 实际只有 1 个 PPTTextElement(无 dy tspans 不拆 — v1.12 D-10 规则),未来若 fast-xml-parser 对同一 id 产生多 text element,亦仅取 Row 1 — **Reversibility:** costly — 工程妥协于 fixture 当前形态

### pageData 子集发射

- **D-08:** `slide.pageData` **仅含命中子集** — 17 (10 静态 + 动态 N 条目对应的 `directory_item_N` / `directory_item_desc_N`)映射里的命中才写到输出 JSON;未命中字段直接不存在(TPL-CB-03 模式)— 镜像 v1.12 / v1.11 field omission over null 共识 — **Reversibility:** reversible — 仅发射行为,新版 PPTist 端 schema 需重新协商字段空约定
- **D-09:** `slide.pageData` 整体字段在 slide 内**零命中**时整字段省略(不是 `null`/`{}`/`undefined` 占位)— 符合 ROADMAP success criteria 3 直接锁定 — **Reversibility:** reversible — 仅判断条件
- **D-10:** `directory_item_number_N` 不进入 `pageData.directory` — `pageData.directory` 仅含 `index/title/desc` 三字段,`number` 字段(对应 `directory_item_number_N` contentKey 的 PPTTextElement.textContent)在 PPTist 端通过 `slide.elements[i].textContent`(同该 PPTTextElement 上 `contentKey === "directory_item_number_N"`)读取 — **Reversibility:** reversible — 仅 pageData schema 限制

### 类型与位置

- **D-11:** `PageData` 接口位置 — `src/slides.ts` 中(与 `Slide` interface 同位置),不另起 d.ts — **Reversibility:** reversible — 仅文件位置,不影响引用
- **D-12:** `PageData` 形态(扁平 — 非嵌套):
  ```typescript
  interface PageData {
    cover_title?: string
    cover_subtitle?: string
    cover_author?: string
    chapter_number?: string
    chapter_title?: string
    chapter_desc?: string
    content_title?: string
    content_subtitle?: string
    end_title?: string
    end_subtitle?: string
    directory?: PageDataDirectoryItem[]   // TOC 数组(N 升序)
  }
  interface PageDataDirectoryItem {
    index: string   // "01".."04" 零填充字符串(per ROADMAP success criteria 2)
    title: string
    desc: string
  }
  ```
  静态字段 10 个 + 动态 directory 数组(动态字段不进 PageData interface — 因为按 contentKey 字符串分发,不重命名)— **Reversibility:** reversible — schema 名称调整需 PPTist 端同步
- **D-13:** `directoryItem.index` 形态 — **字符串零填充**(`"01"` / `"02"` / `"03"` / `"04"`),非数字 1 — 符合 ROADMAP success criteria 2 锁定字面值 — **Reversibility:** reversible — 类型宽度 string/number 切换,fixture baseline 需重生
- **D-14:** `directoryItem.desc` 必填(string),`directoryItem.title` 必填(string)— 即命中 `directory_item_N` 的 PPTTextElement 必须存在才能进 directory(对应 `directory_item_desc_N` contentKey 缺失时 desc = 同 PPTTextElement 的同一 row Row 1 文本的字符串降级或空字符串)— 见 Claude's Discretion

### Aggregation 集成点

- **D-15:** `buildPageData(elements: PPTElement[]): PageData | undefined` 在 `convertOne()`(src/transformer/transform-to-pptel.ts 末尾 — 类似 v1.11 findContentBounds 的集成点)末尾调用;返回 undefined 时 `slide.pageData` 字段不写(D-09 守卫)— **Reversibility:** reversible — 调用点位置调整,无需改 helper 接口
- **D-16:** helper 模块放置 `src/utils/page-data.ts`(ROADMAP 18-01 已锁定)— 与 v1.12 `src/utils/content-key.ts` 同位置规范,导入 `getContentKeyFor` 作字段分发 — **Reversibility:** reversible
- **D-17:** `buildPageData()` 内部复用 `getContentKeyFor()` — 静态字段直接查静态前缀匹配;`directory_item_*` 走 `^directory_item_(\d+)$` / `^directory_item_desc_(\d+)$` 正则捕获 N — **Reversibility:** reversible — 内部实现

### E2E 策略

- **D-18:** 测试三段对齐 v1.12 D-15 / v1.11 D-TPL-09:
  - 18-01 unit — `src/utils/page-data.ts` `buildPageData` 纯函数(命中分发 / 0 命中 / 空 elements / desc first-wins / directory sort / 静态字段 10 集合)
  - 18-02 textContent 字段集成 + 单元 E2E(`__tests__/text-content-extraction.test.ts`)— 写含 contentKey 的 PPTTextElement 才有 textContent + 反向断言未命中无 textContent
  - 18-03 mock SVG E2E(`__tests__/page-data-mock.test.ts`)— 含 fixture 中没的 N=5..8 / toc-item-N-note-carrier / 0 命中 slide / 静态字段缺失
  - 18-04 fixture SVG E2E(`tests/e2e/green-art-teaching-page-data.test.ts`)— fixture 重生(覆盖 01_cover + 02_toc + 03_chapter + 04_content + 05_ending 共 5 个含 pageData 命中) + v1.12 fixture 9 个无回归
  — **Reversibility:** reversible — 仅测试策略
- **D-19:** fixture 重生范围:**严格**仅 5 个 fixture SVG(`01_cover.svg` / `02_toc.svg` / `03_chapter.svg` / `04_content.svg` / `05_ending.svg`),其他 35 个 SVG 即使 transform 也无 pageData 命中不需重生 — 镜像 v1.12 D-16 策略 — **Reversibility:** reversible — fixture 维护边界
- **D-20:** 反向断言清单:
  - `e.textContent === undefined`(无 contentKey 不写 textContent)
  - `slide.pageData === undefined`(slide 内 0 命中无字段)
  - `pageData.directory` 字段缺失(无 N=1..8 命中)
  - 非 PPTTextElement 命中 contentKey(假设 fixture 中) — 不写 textContent,不进 pageData
  — **Reversibility:** reversible

### Claude's Discretion

- textContent whitespace strategy 细节 — 是否对每 row 内容做 `\s+` collapse / 前后 trim;**默认不 trim**(D-05 锁定 — 占位符与换行原样保留)— 仅当 PPTist 端消费报问题才回头
- `directoryItem.desc` 缺失 fallback — 当某 N 有 `title`(directory_item_N)但无 `directory_item_desc_N`,desc 是 `""`(空串)还是省略 desc 字段?默认**空串**(保证 interface 必填 string contract)— 后续可改为 undefined/omit 但需调整 schema
- `buildPageData()` 内部 N 解析正则 — 优先匹配 `directory_item_(\d+)$`,不匹配则跳过(防御未来新增 `directory_item_X_Y_N` 命名);**宽容 fallback**
- `elements` 数组排序冲突 — 多个 `directory_item_N` 同一 N 时的 first-wins 优先级按 elements 数组顺序(D-06 的"首个"由"数组首次出现"决定,fixture 实际 1 个 N 仅 1 个 Row 1 自然不会发生)
- textContent 嵌套合并策略 — multiline carrier Row 1 含 no-dy inline tspan 时(per v1.12 D-10 不拆),textContent 取 fast-xml-parser 整段拼接文本(`<text>` 元素 textContent);与 Row 2..N 单 tspan[dy] 取该 tspan 文本分离 — **不主动合并**

### Folded Todos

None — `cross_reference_todos` step found no matches.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-Level Decisions & Requirements
- `.planning/PROJECT.md` — svg-to-pptel 全局核心价值、v1.12 CK-01~17 决策、Milestone v1.13 描述("v1.12 contentKey 协议的数据侧补全")
- `.planning/REQUIREMENTS.md` §"Active v1.13" — v1.13 pageData 全部 20 个 PD-* 需求 requirements(per ROADMAP.md 锁定的 PD-01..16 + PD-E2E-01..04)
- `.planning/STATE.md` — Phase 17 v1.12 已 SHIPPED 状态 + CK-DEC-01~06 决策 + v1.13 planning 待起 — v1.12 D-03 / D-13 模式可直接复用
- `.planning/ROADMAP.md` §"Phase 18: page-data-extraction" — Phase 目标、Success Criteria 4 条、20 PD requirement 全列

### v1.12 Implementation Pattern (Code Mirror)
- `.planning/milestones/v1.12-phases/17-template-content-key/17-CONTEXT.md` — v1.12 决策集 D-01~D-17 + contentKey 与 textContent 同生命周期判断依据
- `src/utils/content-key.ts` — v1.12 helper(34 entries:10 静态 + 24 动态)— v1.18 pageData 完全复用 `getContentKeyFor()` lookup
- `src/slides.ts:135-152` — `PPTBaseElement` interface 当前形态;v1.18 添加 `textContent?: string` 紧邻 `contentKey?`
- `src/slides.ts:787-796` — `Slide` interface(`elements` 字段 + `contentBounds?` 来自 v1.11) — v1.18 添加 `pageData?: PageData` 紧邻 `contentBounds?`
- `src/slides.ts:184` — `PPTTextElement extends PPTBaseElement` — textContent 自然继承
- `src/transformer/transform-to-pptel.ts:1011` 附近 — `transformElement()` 顶部 `isTemplate` 计算模式(D-12 镜像点:提取 rawText)
- `src/transformer/transform-to-pptel.ts:1535` 附近 — v1.12 contentKey 注入点(D-03 镜像:textContent 同步写)
- `src/transformer/transform-to-pptel.ts:863` — `hasLineBreakTspans()` helper(D-04 multiline 判定复用)
- `src/transformer/transform-to-pptel.ts:1773/1779/1793` — `isMultiline` / `tspanElements = extractTspansWithPosition()` / `tspanElements.map` Row 构造(D-04 multiline 拆分依据)

### v1.11 Implementation Pattern (Slide-level Aggregation Mirror)
- `.planning/milestones/v1.11-phases/16-template-element-marking/16-CONTEXT.md` — v1.11 决策集 D-TPL-01~07,D-12/13 写法参考
- v1.11 `findContentBounds()` DFS helper + `convertOne()` 末尾集成 + `Slide.contentBounds?: {...}` 字段省略守卫 — v1.18 `buildPageData()` 同模式镜像

### Fixtures (E2E Baseline)
- `exampels/green-art-teaching/svg_output/01_cover.svg.svg.json` — cover 主样本:含 3 cover 静态字段已命(contentKey 已确认),`cover-date-carrier` 反向断言
- `exampels/green-art-teaching/svg_output/02_toc.svg.svg.json` — TOC 主样本:directory_item_number_N (4) + directory_item_N (4) + directory_item_desc_N (4) — v1.18 pageData.directory 长度 4 来源
- `exampels/green-art-teaching/svg_output/03_chapter.svg.svg.json` — chapter 主样本:含 3 chapter 静态字段(contentKey 已确认)
- `exampels/green-art-teaching/svg_output/04_content.svg.svg.json` — content 主样本:含 2 content 静态字段;同时含 `content-object-slot-template` — v1.11 contentBounds 字段同时存在不冲突
- `exampels/green-art-teaching/svg_output/05_ending.svg.svg.json` — closing/ending 主样本:含 2 closing 静态字段(closing-thanks-carrier → end_title)
- `exampels/green-art-teaching/svg_output/` — 40 个 SVG 总体,v1.18 重生范围:**严格**5 个(D-19)— 其他 35 个 SVG 即使 transform 也无 pageData 命中

### Existing Tests Pattern
- `__tests__/content-key-mock.test.ts` — v1.12 mock SVG E2E 模式参考(v1.18 `__tests__/page-data-mock.test.ts` 同位置)
- `__tests__/content-key.test.ts` — v1.12 单元测试风格(v1.18 `__tests__/page-data.test.ts` 单元测试)
- `tests/e2e/green-art-teaching-content-key.test.ts` — v1.12 fixture E2E 模式(v1.18 `tests/e2e/green-art-teaching-page-data.test.ts` 同位置)
- `tests/e2e/green-art-teaching-template-marking.test.ts` — v1.11 fixture E2E 风格(20 fixture 全集 + 反向断言 + 字段缺失断言)
- `.planning/milestones/v1.12-phases/17-template-content-key/17-02-PLAN.md` — v1.12 transformer 集成风格
- `.planning/milestones/v1.12-phases/17-template-content-key/17-03-PLAN.md` — v1.12 mock E2E plan 风格

## Existing Code Insights

### Reusable Assets
- **`getContentKeyFor(id: string): string | undefined`** (`src/utils/content-key.ts:64`) — v1.18 pageData 全字段分发依据;D-17 复用
- **`CONTENT_KEY_VALUES: readonly string[]`** (`src/utils/content-key.ts:75`) — v1.18 E2E 反向白名单断言来源
- **`PPTBaseElement` interface** (`src/slides.ts:135-152`) — D-02 textContent 字段添加位置(紧邻 contentKey)
- **`Slide` interface** (`src/slides.ts:787-796`) — D-15 pageData 字段添加位置(紧邻 contentBounds)
- **`transformElement()` text case top-level** (`src/transformer/transform-to-pptel.ts:1011` 附近) — D-03 镜像点:在 `isTemplate` 计算旁加 `textContentValue = extractRawText(element)`,text case 末尾追加 `result.textContent = textContentValue`
- **`tspanElements.map((tspan, idx) => ...)`** (`src/transformer/transform-to-pptel.ts:1793`) — D-04 multiline 每 row PPTTextElement 构造 — 每 row 独立 rawText 字段
- **`hasLineBreakTspans()`** (`src/transformer/transform-to-pptel.ts:863`) — D-04 multiline 判定复用
- **`findContentBounds()` DFS pattern** (`src/transformer/transform-to-pptel.ts` v1.11) — v1.18 `buildPageData()` 集成模式镜像
- **`convertOne()` 末尾集成点** (`src/transformer/transform-to-pptel.ts`) — v1.11 `slide.contentBounds = findContentBounds()` 注入位置,v1.18 `slide.pageData = buildPageData(slide.elements)` 同位置

### Established Patterns
- **v1.11 TPL-CB-03 字段省略守卫**:contentKey / pageData / contentBounds 不写时直接 `不赋值` — JSON 字段不存在
- **v1.12 CK-DEC-01 静态 Record**:helper 内部用 `Record<string, string>` 配合 `for` 循环预生成;v1.18 buildPageData 用 `Object.keys()` 判断静态命中 vs 动态 N 解析
- **D-TPL-06 字段 seam 模式**:v1.11 templateType = `result.templateType = 1` in case tail;v1.12 contentKey = `if (contentKeyValue) result.contentKey = contentKeyValue`;v1.18 textContent = `result.textContent = textContentValue` (互锁)
- **field omission over null**:helper 返回 `undefined` 即字段不写
- **fixture baseline 重生 + fixture E2E 反向断言**:v1.18 5 fixture 重生 + 9 fixture 无回归(v1.12)
- **mock SVG E2E 覆盖非 fixture 形态**:v1.18 N=5..8 + note-carrier + 0 命中 slide

### Integration Points
- **`src/utils/page-data.ts` (新建)**:D-16 v1.18 helper module;导出 `buildPageData(elements)` / `PageData` / `PageDataDirectoryItem`
- **`src/slides.ts:135` 附近 (PPTBaseElement)**:D-02 新增 `textContent?: string` 字段
- **`src/slides.ts:787` 附近 (Slide)**:D-15 新增 `pageData?: PageData` 字段
- **`src/transformer/transform-to-pptel.ts:1011` 附近 (transformElement 顶部)**:D-03 `textContentValue` 计算
- **`src/transformer/transform-to-pptel.ts:text case 末尾 (~1820)`**:D-03 `result.textContent = textContentValue`
- **`src/transformer/transform-to-pptel.ts:1793 附近 (multiline map 内 row 构造)`**:D-04 每 row `result.textContent = rawRowText`
- **`src/transformer/transform-to-pptel.ts:convertOne() 末尾`**:D-15 `slide.pageData = buildPageData(slide.elements)`(同 v1.11 contentBounds 集成点风格)

## Specific Ideas

### Fixture-Driven Sample Anchors
- **01_cover.svg.svg.json**:已有 3 个 cover_title / cover_subtitle / cover_author PPTTextElement (contentKey 已标记) — v1.18 E2E 直接断言 `pageData.cover_title === element.textContent`
- **02_toc.svg.svg.json**:已有 4 个 `directory_item_N` (Row 1) + 4 个 `directory_item_desc_N` (Row 2..N 各 1 个 tspan[dy]) — v1.18 E2E 直接断言 `pageData.directory.length === 4`、`directory[0].index === "01"`、`directory[0].title === "{{TOC_ITEM_1_TITLE}}"`、`directory[0].desc === "{{TOC_ITEM_1_DESC}}"`(具体占位符以 02_toc.svg 实际文本为准)
- **03_chapter.svg.svg.json**:3 chapter_* 静态字段 — 类似 cover
- **04_content.svg.svg.json**:2 content_* 静态字段 + `content-object-slot-template` 不写 textContent(v1.11 slot 例外延续)
- **05_ending.svg.svg.json**:2 closing_* → end_title / end_subtitle 字段(D-12 字段命名映射)
- **fixture 整体反向断言样本**:`exampels/202610131101001/02_cover.svg` 等非命中 fixture 的 svg.json 中 `slide.pageData === undefined`(v1.18 ROADMAP success criteria 3 直接锁定)

### Implementation Order Suggestion (PLAN Draft)
- **18-01 (Wave 1)**: `src/utils/page-data.ts`(helper `buildPageData` + `PageData` / `PageDataDirectoryItem` 类型)+ `getContentKeyFor()` 复用 + 单元测试(`__tests__/page-data.test.ts`)
- **18-02 (Wave 2)**: `PPTBaseElement.textContent?: string` + `Slide.pageData?: PageData` 字段声明 + `transformElement()` text case 注入 + multiline map row 注入(D-03)+ `convertOne()` 末尾 `buildPageData()` 调用 + mock SVG E2E(`__tests__/text-content-extraction.test.ts` — 含未命中不上 textContent 反向断言)
- **18-03 (Wave 3)**: fixture JSON baseline 重生 5 个 + fixture E2E(`tests/e2e/green-art-teaching-page-data.test.ts` — PD-01 ~ PD-16 + 4 项反向断言 + 无回归 9 v1.12 tests)
- **18-04 (Wave 4)**: mock SVG E2E(`__tests__/page-data-mock.test.ts`)覆盖 N=5..8 / toc-item-N-note-carrier / 0 命中 slide / desc first-wins / title missing desc fallback

### Slide Schema Notes
- PPTBaseElement v1.18 后字段:`id / left / top / lock / groupId / width / height / rotate / link / name / templateType / contentKey / textContent` — 13 个原生字段 + 3 个 Phase 16/17/18 注入
- Slide v1.18 后字段:`id / elements / notes / remark / background / animations / turningMode / sectionTag / type / contentBounds / pageData` — elements + contentBounds(page) + pageData(phase 18 注入)
- `Slide.contentBounds` 与 `Slide.pageData` 同时可存在不冲突(contentBounds 走 `<g id="content-object-slot-template">` 提取;pageData 走 PPTTextElement.contentKey 聚合 — 二者源独立)

## Deferred Ideas

None — discussion stayed within phase scope. 4 个灰色区域均拍板,无 scope creep;future conflict scenarios 全部 one-way 显式记录(rationale given)。

**Future-conflict Acknowledgements (不是 deferred scope,只是一次性决策):**
- N=2+ tspan[dy] 单 N carrier 在 fixture 中出现时,desc 第二个+会被丢弃(D-06 one-way)
- 多 PTTextElement 同 id 同 contentKey 第一胜出(D-07 costly)
- 占位符原样保留不解析(D-05 + ROADMAP success criteria)

---

*Phase: 18-page-data-extraction*
*Context gathered: 2026-10-16*
