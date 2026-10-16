# Phase 16: template-element-marking - Context

**Gathered:** 2026-10-16
**Status:** Ready for planning

## Phase Boundary

在 transformer 阶段识别 SVG 中"模板元素"(id 含 `-template` 子串或祖先 `<g id="*-template">` 子树),
通过 `templateType=1` 标记到 renderable PPTElement;同时把 `content-object-slot-template` 元素的
`data-pptx-bounds` 解析为 slide 级 `contentBounds: { x, y, width, height }` 字段(保留 SVG viewBox 原始坐标)。

为 PPTist 端做"模板/数据内容分离"提供语义层级提示:
- `templateType=1` 标记模板元素(背景/装饰),PPTist 端可以锁定不可编辑
- `slide.contentBounds` 标记内容插入区域,PPTist 端可填正文/分栏

## Requirements (locked via REQUIREMENTS.md)

**10 requirements are locked.** See `.planning/REQUIREMENTS.md` §"v1.11 Requirements" for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `.planning/REQUIREMENTS.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from REQUIREMENTS.md):**
- TPL-MARK-01: renderable 元素 id 含 `-template` 子串 → `templateType=1`
- TPL-MARK-02: 祖先链 `<g id="*-template">` 子树传播(任意层级)→ `templateType=1`
- TPL-MARK-03: `id === "content-object-slot-template"` 例外 — 即使匹配 `-template`,**不**写 `templateType=1`
- TPL-CB-01: `data-pptx-bounds` 空格分隔四数 → slide.contentBounds `{x, y, width, height}`
- TPL-CB-02: 多 slot → 仅第一个
- TPL-CB-03: 不存在 → 字段不出现(JSON 直接省略)
- TPL-NONREN-01/02: 非 renderable 元素不进 elements[],无 templateType
- TPL-E2E-01/02: 反向断言"templateType 仅取 1 或 undefined" + fixture 覆盖

**Out of scope (from REQUIREMENTS.md):**
- 对 gradient/defs/style 节点 templateType 标记
- PPTist 端 slot 注入(运行时数据填充)
- `data-pptx-placeholder` / `data-pptx-layer` / `data-pptx-editable` 之外的属性保留
- 改动 svg2json 已有的 path-merge 等 group 子树并入行为

## Implementation Decisions

### templateType 字段语义

- **D-TPL-01:** `templateType` 字段类型为字面量 `1`(`number`),不是布尔或字符串 — **Reversibility:** one-way — rationale: TPL-E2E-02 反向断言锁定了"PPTElement 上 templateType 仅取 1 或 undefined";一旦 16 个 fixture E2E 测试基线化,改类型需重新生成所有 `.svg.json` 期望文件
- **D-TPL-02:** `slide.contentBounds` 数值保留 SVG viewBox 原始坐标(1280×720 空间),不缩放到 canvas(1000×562.5) — **Reversibility:** reversible — rationale: TPL-DEC-04 描述为"纸面 PPTist 协议",贴三方 `data-pptx-bounds` 原文;若需 canvas 坐标,PPTist 端在消费时一行缩放即可,无 fixture 数据迁移问题
- **D-TPL-03:** path-merge 后的合并元素**带** `templateType=1`(当 `<g id="*-template">` 内 path 被 merge 时) — **Reversibility:** one-way — rationale: TPL-MARK-02 "renderable 元素位于 `<g id="*-template">` 子树内" 的语义在 merge 元素上扩展;merge 元素是合成代表;fixture E2E 锁定后改"不带"会让所有 merge 元素 fixture 断言失败
- **D-TPL-05:** multiline text 拆行后,每个 line element 都独立带 `templateType=1` — **Reversibility:** one-way — rationale: 拆行后的 text element 都是从同一 `<text>` 元素 context 派生(groupId 已并入),templateType 跟随父文本决策;每行独立 E2E 断言锁后需重新 baseline

### 实现集成点

- **D-TPL-04:** `contentBounds` 提取逻辑放在 `convertOne()` 内(`src/index.ts`),从 AST root.children 单独扫一遍 — **Reversibility:** reversible — rationale: convertOne 是构造 Slide 的位置,已有 AST 访问权;不动 `transformToPPTElement()` 签名 → 所有现有调用点、单元测试、`convertDir()` 都无需修改;若将来 extract 逻辑需要复用,可再升级为独立 helper 模块
- **D-TPL-06:** templateType 应用逻辑在 `transformElement()` 顶部统一计算 `isTemplate`,然后注入到每个 switch case 的 result(rect/circle/ellipse/path/polygon/polyline/line/text/image);path-merge 分支(在 `transformToPPTElement()` `walk()` 的 group-merge 块)显式判断 `<g id="*-template">` 后给 mergedElement 加 `templateType=1` — **Reversibility:** reversible — 内部重构,不暴露在 Slide 输出 schema
- **D-TPL-07:** 计算 `isTemplate` 的判定:`element.attrs.id` 含子串 `-template` **或** `groupId` 含子串 `-template` — **Reversibility:** reversible — 实现细节;不暴露 schema

### Claude's Discretion

- 用单个 transform 函数(`transformElement`)内部计算 + 注入 `templateType`,不引入独立 `template-marker.ts` 模块
- `data-pptx-bounds` 解析容错:严格空格分隔(`/\s+/`),四数不足则 skip 该 slot,留 `contentBounds: undefined`(等同 TPL-CB-03)
- multiline text 的 `id` 派生保持现有 `${id}-line-${idx}` 模式(templateType 字段是新增,不改变 id 命名)
- E2E 测试结构:在 `__tests__/template-marking.test.ts`(新增)内做 fixture 覆盖,与现有 `transform-element.test.ts` 风格对齐

### Folded Todos

None — `cross_reference_todos` 步骤未匹配到本 phase 的 todos

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 项目级决策与需求
- `.planning/PROJECT.md` — 项目核心价值、TPL-DEC-01~05 项目级决策、Milestone v1.11 描述
- `.planning/REQUIREMENTS.md` §"v1.11 Requirements" — 10 个 TPL-* 编号需求(TPL-MARK-01~03, TPL-CB-01~03, TPL-NONREN-01~02, TPL-E2E-01~02)
- `.planning/STATE.md` — Phase 16 当前状态(planning)
- `.planning/ROADMAP.md` §"Phase 16: template-element-marking" — Phase 目标、3 个 wave plan 草案

### Fixture(必读,作为 E2E 期望基线)
- `exampels/green-art-teaching/svg_output/04_content.svg` — **TPL-CB-01 主样本**: `<g id="content-object-slot-template" data-pptx-bounds="98 180 1084 404">` 是 04 slide 的 contentBounds 来源(TPL-E2E-01 期望)
- `exampels/green-art-teaching/svg_output/01_cover.svg` — **TPL-MARK-01 主样本**: 6 个顶层 `-template` 元素(`hero-master-backdrop-template`, `hero-master-hills-template`, `cover-grain-spray-template`, `cover-band-far-template`, `cover-band-near-template`, `cover-author-plate-template`)TPL-E2E-01 期望 ≥5 template-marked
- `exampels/green-art-teaching/templates/04_content.svg` — 纯模板(无数据填充),id 命名一致,用于人工对照 svg_output/ 数据填充后版本
- `exampels/green-art-teaching/svg_output/02_toc.svg` — TPL-E2E-01 期望 ≥4 template-marked 的 toc cards 装饰元素
- `exampels/green-art-teaching/svg_output/20_ending.svg` — TPL-E2E-01 期望 ending-specific 装饰元素 template-marked
- `exampels/green-art-teaching/svg_output/` 全部 20 个文件 — TPL-E2E-01 全 fixture 覆盖

### 核心代码位置(必读,实现目标)
- `src/transformer/transform-to-pptel.ts` — `transformElement()` (line ~1011) 是 templateType 注入主战场;`transformToPPTElement()` (line ~1863) 的 `walk()` (line ~1886) 内 path-merge 分支 (line ~1928-1992) 是 mergedElement templateType 处理点
- `src/index.ts` — `convertOne()` (line ~207) 是 contentBounds 提取主位置;`convert()` (line ~270) 和 `convertDir()` (line ~320) 调用入口
- `src/slides.ts` — `Slide` 接口 (line ~777)、`PPTBaseElement` 接口 (line ~135) — 新增 `templateType?: 1` 字段、`contentBounds?: ContentBounds` 字段的位置
- `src/types/ast.ts` — `SvgElement` (line ~92)、`SvgAttrs` (line ~41) — `data-pptx-bounds` 属性的读取接口
- `src/merger/path-merge.ts` — `createMergedShapeElement()`,`shouldMerge()` — path-merge 决策点,mergedElement id 派生

### 既有测试(参考风格)
- `__tests__/transform-element.test.ts` — 单元素转换测试风格,template-marking 测试应遵循
- `tests/e2e/202610131101001.test.ts` — fixture-based E2E 测试模式,template-marking E2E 应遵循

## Existing Code Insights

### Reusable Assets
- **`pptelIdWithFallback()`** (`src/utils/id-generator.ts`) — id 命名 `<group_id>__<nanoid(8)>`,path-merge fallback id 使用;templateType 是额外字段,不与 id 命名冲突
- **`firstChildIdByGroup: Map<string, string>`** (`src/transformer/transform-to-pptel.ts:1883`) — path-merge 时使用,mergedElement 的 groupId 与原始 SVG `<g id>` 对应;此 groupId 字段可复用用于 D-TPL-07 的 isTemplate 计算
- **`effectiveGroupId` 累积** (`src/transformer/transform-to-pptel.ts:1899`) — `isG ? (element.attrs.id || undefined) : currentGroupId`,TPL-MARK-02 祖先链传播完全复用此机制;无需新建传播通道
- **`inferBackground()`** (`src/index.ts:180`) — convertOne 已有的从 elements[] 提取背景模式;D-TPL-04 可参照此模式在 convertOne 中从 AST 提取 contentBounds

### Established Patterns
- **renderable 元素白名单**: `transformToPPTElement()` 的 `walk()` 用 `!['defs', 'linearGradient', 'stop', 'filter', 'marker', 'clippath'].includes(child.type.toLowerCase())` 过滤非 renderable — TPL-NONREN-01 直接复用此判断
- **groupId 写入模式**: `result.groupId = groupId`(在 `transformElement()` 各 case 末尾) — templateType 写入模式可参照此 pattern,在每 case 的 result 构造块末尾统一追加 `if (isTemplate) result.templateType = 1`
- **multiline text 拆行**: `transformElement()` text case 中 `tspanElements.map(...)` 返回 `PPTTextElement[]` — D-TPL-05 注入后每行 result 同样写 templateType

### Integration Points
- **`transformElement()` 顶部** (line 1011-1029): 此处统一计算 `isTemplate` = `(element.attrs.id?.includes('-template') || groupId?.includes('-template')) && element.attrs.id !== 'content-object-slot-template'`,在所有 switch case 内应用前先确定
- **`walk()` path-merge 块** (line 1928-1992): mergedElement 推送前,加 `if (effectiveGroupId?.includes('-template')) mergedElement.templateType = 1`
- **`convertOne()` Slide 装配** (line 257-265): 在 `slide.elements` 装配完后,从 `ast.root` 扫描第一个 `id === "content-object-slot-template"` 的元素,读 `data-pptx-bounds` 解析四数,写入 `slide.contentBounds = {x, y, width, height}`(若 slot 缺失则跳过此赋值,JSON 字段不出现 — TPL-CB-03)
- **`Slide` 类型扩展** (`src/slides.ts:777`): 在 `Slide` 接口内 `elements?: PPTElement[]` 之后新增 `contentBounds?: { x: number; y: number; width: number; height: number }`(可选字段,TPL-CB-03 锁"字段直接省略")
- **`PPTBaseElement` 类型扩展** (`src/slides.ts:135`): 在 `name?: string` 之后新增 `templateType?: 1`(literal number,可选字段,反向断言 TPL-E2E-02 锁"仅取 1 或 undefined")

## Specific Ideas

### Fixture 数据样本(供 E2E 期望对照)
- **04_content.svg** contentBounds 期望值:`{ x: 98, y: 180, width: 1084, height: 404 }` — 原文 SVG 坐标 1280×720 空间,与现有 04_content.svg.json(基线)对比,新增 `contentBounds` 字段(若未生成则先跑 svg2json 生成基线)
- **01_cover.svg.json** 期望 template-marked element 数 ≥5:`hero-master-backdrop-template`(rect), `hero-master-hills-template`(image), `cover-grain-spray-template`(image), `cover-band-far-template`(image), `cover-band-near-template`(image), `cover-author-plate-template`(text or image)
- **02_toc.svg.json** 期望 template-marked element 数 ≥4:toc cards 装饰元素
- **20_ending.svg.json** 期望 ending-specific 装饰元素 template-marked

### 实施入口优先级
- 16-01-PLAN.md (Wave 1): transformer id-tag propagation — 实现 D-TPL-01/03/05/07,修改 `transformElement()` 各 case 末尾 + path-merge 分支
- 16-02-PLAN.md (Wave 2): slide-level contentBounds 提取 — 实现 D-TPL-02/04,修改 `convertOne()`,新增 `findContentBounds()` helper
- 16-03-PLAN.md (Wave 3): E2E 测试 — 覆盖 TPL-E2E-01/02,f遍历 `exampels/green-art-teaching/svg_output/*.svg.json`

### PPTist schema 备注
- 现有 PPTist `Slide` 接口(本项目内 `src/slides.ts:777`)无 `templateType` 和 `contentBounds` 字段;新增为可选,JSON output 是向后兼容的(PPTist 端会忽略未识别字段或自行消费)
- `templateType?: 1` 是 literal number type,在 TypeScript 中用 `as const` 或 `1 as const` 实现;反向断言 `TPL-E2E-02` 锁"`templateType === 1` 或 `templateType === undefined`",禁止其它值

## Deferred Ideas

None — discussion stayed within phase scope. TPL-CB-02 锁定的"仅第一个 bounds"语义当前足够,若未来需要支持多 content 区域,可另起 phase。

---

*Phase: 16-template-element-marking*
*Context gathered: 2026-10-16*