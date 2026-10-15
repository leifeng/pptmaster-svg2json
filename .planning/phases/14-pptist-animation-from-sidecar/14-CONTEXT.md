---
phase: 14
name: pptist-animation-from-sidecar
padded: 14
source: user-decisions (AskUserQuestion) + inherited kickoff decisions (ANIM-DEC-01..06)
---

# Phase 14 — pptist-animation-from-sidecar — Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

---

## Phase Boundary

Phase 14 把 svg2json 从"单 SVG → 单 Slide JSON"升级到"父目录 → 多 Slide 演示文 + animations.json 注入"。实现三件事：

1. **CLI 父目录入参**：`<parent>/svg_output/*.svg` + 可选 `<parent>/animations.json`；多 slide JSON 输出。
2. **transformer id 命名策略**：保留 SVG 原 id（若有），无 id 时 fallback 到 `<group_id>__<nanoid(5)>`，保证 animations.json 的 `groups[gid]` 能精确锚定到 PPTElement。
4. **animations.json 注入**：按 slide_id 匹配 SVG 文件名（去后缀）；按 `<g id>` 匹配子元素；将 `groups[gid]` 解析为 1+ 条 `PPTAnimation` 写入 `slide.animations`；`slide.transition.effect` 映射到 `Slide.turningMode`；所有未映射/被覆盖的三方字段全量保留到 `extensions`。

---

## Implementation Decisions

### CLI 父目录布局与多 slide 输出（继承 ANIM-DEC-03）

- **D-01:** CLI 入参为父目录路径；目录中 `svg_output/*.svg` 是源 SVG 集合；根目录可放 `animations.json`（可选）。
- **D-02:** 单 SVG 入参向后兼容：保留 `svg2json file.svg` 单文件模式；当传 .svg 时不再检测同级目录 sidecar，纯单文件模式输出。**隐式父目录约定不启用**（避免路径解析歧义）— **Reversibility:** reversible — 入口模式改动只在 cli.ts 边界，不影响 transform 逻辑。
- **D-03:** 父目录入参时输出仍是多文件 JSON（每个 SVG 一个 .json），位于 `svg_output/<name>.svg.json`，非父目录根（ANIM-CLI-03）。
- **D-04:** `convert()` 返回签名扩展：`{ success, output, slide, elementCount }`；新增 `convertDir(parentDir, options)`（不在源码层做隐式转换 — 显式新函数）。多 slide 演示文组装由 `convertDir()` 完成。

### transformer id 命名（覆盖 ANIM-DEC-02 部分）

- **D-05:** 子元素已有 SVG 原 id → **保留**，转义优先，不重写。例：`content-title-carrier`、`card-temperature-bg` 直接作为 `PPTElement.id`。**Rationale:** 实际三方 SVG（`exampels/202610131101001/svg_output/03_overview.svg`）已用语义化 id，强行覆盖会丢失信息。— **Reversibility:** reversible — transform 输出层，单点改动。
- **D-06:** 子元素无 id 时 fallback 到 `<group_id>__<nanoid(5)>`（5 而非原 ANIM-DEC-02 的 8 — 与三方 SVG 子元素 id 风格一致，避免 8 字符过长）。例：`<g id="card-temperature">` 内 `<text>` 无 id → `card-temperature__a3kP9`。
- **D-07:** 无 group 包裹的元素 → 用 `nanoid(10)`（PPTist 内置 nanoid 长度），保持 PPTist 面板 diff 友好。
- **D-08:** path-merge 后单 PPTShapeElement 持有 group id 对应的 elId，动画挂在该 element 上。`merge` 前的子元素合并路径应记录 first-child 的 inner SVG id（如有）作为 merge 元素的 fallback 候选。**Rationale:** animations.json 的 `groups[gid]` 设计假设"组级动画"，与 merge 后单 element 一一对应即可。— **Reversibility:** one-way — merge 后 PPTElement.id 已暴露给 PPTist 端消费者，事后改 id 会破坏后续动画引用。
- **D-09:** `transform-to-pptel.ts` `walk()` 在分发到子元素前维护 `idRegistry: Map<innerSvgId, pptelId>`，使 merge 元素能溯源到原 SVG 子 id；保留 `groupId` 字段不变。

### PPTAnimation 字段扩展（继承 ANIM-DEC-01）

- **D-10:** `PPTAnimation` 接口新增 `extensions?: Record<string, any>` 字段（平铺 Record），用于全量保留三方原始字段 — **Reversibility:** one-way — 接口对外暴露。
- **D-11:** 映射后的三方字段**同时**保留原值到 `extensions`：`extensions.originalEffect`、`extensions.originalDuration`、`extensions.originalTrigger`、`extensions.originalType`、`extensions.originalOrder`、`extensions.originalDelay`、`extensions.originalTriggerShape` 等。**Rationale:** 调用方可读取 provenance；调试时三条 entry 完整可见。— **Reversibility:** costly — 修改后已有 JSON 结构逆向不兼容，但 v1.9 首次发布无历史负担。
- **D-12:** 不存在的三方字段（PPTist 无法表达的）全量保留：例如 `effect_options`（direction/amount/color/relative/size）、`repeat_count`/`repeat_duration`/`auto_reverse`/`rewind`/`accelerate`/`decelerate`/`bounce_end`/`restart` 等 — 完整字段名进 extensions（如 `extensions.effect_options`、`extensions.repet_count`）。
- **D-13:** 三方 fields 名 camelCase 化为 `extensions` 的键（与 JS 习惯一致）。

### PPTAnimation 类型推断与 fallback（继承 ANIM-DEC-04）

- **D-14:** `PPTAnimation.type` 推断按**三方 key 前缀**：`entrance_*` → `'in'`、`emphasis_*` → `'attention'`、`exit_*` → `'out'`、`path_*` → `'in'`（按 motion 视作入场轨迹，可后续调整）。无前缀且无法识别的 → 默认 `'in'`。**Rationale:** 简单可预测，104+ 个三方 key 都能分类。— **Reversibility:** reversible — 仅映射函数内部。
- **D-15:** 未识别的 effect fallback：按 type 默认值（in → `fadeIn`、attention → `pulse`、out → `fadeOut`）；原始 key 写入 `extensions.originalEffect`。**Rationale:** 动画可见可播放（fadeIn 永远有效），不丢 provenance。— **Reversibility:** reversible — 默认策略集中在 EFFECT_FALLBACK 常量。

### 映射策略细节（继承 ANIM-DEC-04/05）

- **D-16:** `entrance_*`/`emphasis_*`/`exit_*` 三方 key 在 PPTist 84 个 effect 中有视觉等价映射时**优先**做映射；不在表内 → 按 D-15 兜底。映射表维护在 `src/mappers/animation.ts`：
  - `ENTRANCE_MAP: Record<string, string>`（~30+ 项，覆盖三方实例 + 常见 entrance key）
  - `EMPHASIS_MAP: Record<string, string>`
  - `EXIT_MAP: Record<string, string>`
- **D-17:** `TRANSITION_MAP: Record<string, TurningMode>`（48 → 12），未对应 fallback `fade`（ANIM-DEC-05 已锁定）。`random` 保留让 PPTist 自身随机展开（与现有 `useSlidesWithTurningMode.ts` 兼容）。
- **D-18:** `order` 字段处理：PPTist 用 `trigger` 表达"与上一动画同时 / 上一动画之后"，**不使用** order 字段。映射方法（来自 animation-adaptation-analysis.md §4.3）：
  - 同 order → `trigger='meantime'`（并行播放）
  - 严格升序且未显式 trigger='with-previous' → `trigger='auto'`
  - 显式 trigger='on-click' → `trigger='click'`
  - 显式 trigger='with-previous' → `trigger='meantime'`
  - 显式 trigger='after-previous'（默认）→ `trigger='auto'`
  - 显式 trigger_shape（点击其它元素）→ `trigger='click'`（降级）
- **D-19:** `duration` 单位转换：三方秒 → PPTist 毫秒，`Math.round(threeSideDuration * 1000)`；范围裁剪到 PPTist 推荐 100-5000ms 区间。`defaults.animation.duration = 0.45s` 默认 → `450ms`。
- **D-20:** `PPTAnimation.id` 使用 `nanoid(10)`（与 PPTist 编辑面板一致便于 diff）；`elId` 来自 D-05~08 决策。

### defaults 与缺省行为

- **D-21:** `defaults.animation` / `defaults.transition` 影响所有有 animations 配置的 slide 的对应字段缺省值（ANIM-DEFAULTS-01）。
- **D-22:** 没有 entry 的 slide（animations.json 中缺 slide_id）→ **不**生成 `slide.animations`（让 PPTist 走默认无动画）。**不**自动根据 `defaults.animation` 给空 slide 灌动效。**Rationale:** 三方约定是"覆盖式"，无覆盖即无动画；自动推断会违背用户意图。— **Reversibility:** one-way — 行为对外可观察（最终 JSON 是否有 animations[]），影响下游消费。
- **D-23:** 转换结束打印 diagnostics 到 stderr（ANIM-DIAG-01）：被映射数 / 被保留 extensions 数 / 缺失 originals 数 / 警告（per-group elId 找不到时）。

### Claude's Discretion

- `nanoid(5)` 长度：5 字符 ≈ 60M 组合，三方目录下 153 个 group 的碰撞概率约 0.0001 — 选 5 而非 8 是文档记录偏差，但用户在本次 discussion 中明确指定 5，按用户输入为准。
- `convertDir()` API 形状：可作为新顶层函数（与现有 `convert()` 并列），也可作为 `convert()` 的 multi-mode（基于 SVGContentOrDir 类型判别）。建议前者 — 显式命名，类型明确。
- `extensions` 是否在最终 JSON 中**始终**存在（即使是空对象）：建议**只在有内容时**写入（`if (Object.keys(ext).length > 0) animation.extensions = ext`）— 减小 JSON 体积。

### Folded Todos

(无 — `cross_reference_todos` 返回 `todo_count: 0`)

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 适配分析与三方 schema
- `E:/git/svg2json/animation-adaptation-analysis.md` §4 — 三方→PPTist 映射设计（transition 映射、effect 映射、order/trigger 语义、duration 单位、PPTAnimation id/elId、不可映射字段处理）；§5 — svg2json 实现要点（CLI 改动、convert() 改造、buildAnimations 实现骨架、映射表位置、Slide.animations 可空性）；§7 — 风险与未决项
- `E:/git/ppt-master/docs/animations.md` L62-72 — 48 个三方 transition canonical key（Subtle 12 / Exciting 28 / Dynamic Content 6 + 5 旧名兼容）；L88-96 — 三方 Start mode 映射表；L233-251 — 三方 animation row 字段全集

### PPTist 运行时依赖
- `E:/git/svg2json/code/PPTist/src/types/slides.ts` L670-695（PPTAnimation / AnimationType / AnimationTrigger 定义）；L723（TurningMode 12 个枚举值）；L767-777（Slide.animations / Slide.turningMode）
- `E:/git/svg2json/code/PPTist/src/configs/animation.ts` — ENTER_ANIMATIONS / EXIT_ANIMATIONS / ATTENTION_ANIMATIONS / SLIDE_ANIMATIONS 84+36+12 个 effect 真值表（运行时 `ANIMATION_CLASS_PREFIX + effect` 拼 class）
- `E:/git/svg2json/code/PPTist/src/store/slides.ts` L84-111 `formatedAnimations` — trigger 折叠规则（click/meantime/auto → 二维数组 + autoNext）
- `E:/git/svg2json/code/PPTist/src/views/Screen/hooks/useExecPlay.ts` L58-106 — `runAnimation()` 实际 DOM 操作

### 实例数据（端到端测试样例）
- `E:/git/svg2json/exampels/202610131101001/animations.json` — 13 个 slide 覆盖的实例 sidecar（03/05/06/07/09/10/12/13/15/16/17/18/19）；effect 频次：entrance_wipe×5 / entrance_circle×4 / entrance_fly×3 / entrance_zoom×3 / entrance_dissolve×3 / entrance_glide×3 / entrance_box×3 ...
- `E:/git/svg2json/exampels/202610131101001/svg_output/03_overview.svg` — 子元素 id 模式样例（`<g id="card-temperature">` 内 `<text id="content-title-carrier">`），验证 D-05/D-06 决策的语义保留
- `E:/git/svg2json/exampels/202610131101001/svg_output/` — 20 个 SVG（`01_cover.svg` ~ `20_ending.svg`），slide_id 由文件名去后缀派生

### 项目当前状态
- `.planning/REQUIREMENTS.md` — 17 个 v1.9 需求（ANIM-CLI-01~03, ANIM-ID-01/02, ANIM-MAP-01~06, ANIM-TRANS-01~03, ANIM-TURN-01, ANIM-DEFAULTS-01, ANIM-DIAG-01）
- `.planning/STATE.md` Decisions §2.1 — 6 项 v1.9 kickoff decisions（ANIM-DEC-01~06）
- `.planning/PROJECT.md` Out of Scope — 明确"修改 PPTist 源码 / 修改 animations.json schema / 处理 motion path_* 运行时播放"为 v2 范围

---

## Existing Code Insights

### Reusable Assets

- `src/slides.ts` PPTAnimation 接口（L688-695）：仅需新增 `extensions?: Record<string, any>` 字段即可，type/trigger/elId/effect/duration 复用。
- `src/slides.ts` TurningMode enum（L723）：12 个枚举值已就位，与 PPTist 端 `useSlidesWithTurningMode.ts` 兼容。
- `src/slides.ts` Slide 接口（L767-777）：`animations?: PPTAnimation[]` / `turningMode?: TurningMode` 字段已存在，组装时直接赋值。
- `src/transformer/transform-to-pptel.ts` `walk()`（L1867+）：递归遍历已维护 `currentGroupId`、`parentTransform`、`inheritedAttrs`，D-05~09 的 id 注入可在 walk 内"分发前"补 `idRegistry`。
- `src/transformer/transform-to-pptel.ts` path-merge 决策（L1908-1958）：`shouldMerge()` + `extractCommonStyle()` + `createMergedShapeElement()` 已存在，D-08 merge elId 选择可在 `createMergedShapeElement` 返回时取 first-child SVG id 作为 fallback。
- `src/parser/svg-parser.ts` SvgElement.attrs：所有 SVG 元素的 attrs 已解析，包括 `id`。
- `src/cli.ts` 现有 main()（L67-128）：font validation gate 已有；目录/单 SVG 分流已有。新增"父目录模式"分支可放在 `isDirectory(input)` 之后。
- `src/font-validator.ts` `verifyFontLoaded()`：CLI 启动 gate 模板可复用（验证 / 早退 / 错误信息 picocolors 红色）。
- `picocolors` + `cac`：现有依赖复用，无新增 npm 包需求。

### Established Patterns

- 路径解析：`src/index.ts` L8 `import { resolve, dirname } from 'path'` + L125 `debugPath = resolve(__dirname, ...)` — 父目录 sidecar 检测可使用 `resolve(parentDir, 'animations.json')`。
- group id 继承：`transform-to-pptel.ts` L1876-1882 `effectiveGroupId` 已支持 SVG `<g id="x">` → 子元素 `groupId` 字段传播。
- pptel 元素 id 生成：`transform-to-pptel.ts` L1021 `const id = uuidv4()` — D-05~07 重写为"原 id 优先 → group_id__nanoid(5) → nanoid(10)"策略。
- log/logEnd：`src/utils.ts` 中 `log()` + `logEnd()` 已有 timing instrumentation；diagnostics 输出到 stderr 用 `console.error` 即可，无需新工具。

### Integration Points

- **CLI 入参解析** (`src/cli.ts` L10 `cli.command('<input>', 'SVG file or directory to convert')`)：父目录 mode 在 cac 层新增 option 或基于路径自动判定（statSync）。
- **`convert()` 输出位置** (`src/index.ts` L205-208)：单 Slide 输出结构；`convertDir()` 输出 `{ title, ..., slides: Slide[] }` 演示文级演示文结构。
- **transformer 输出 boundary** (`src/transformer/transform-to-pptel.ts` L1855 `transformToPPTElement()`)：id 注入在 walk 内 transformElement 调用前/后；D-08 merge elId 在 `createMergedShapeElement` 内部。
- **animation mapper module**（新建 `src/mappers/animation.ts`）：D-16/17 映射表 + `mapEffect()` + `mapTrigger()` + `mapTransition()` + `buildAnimations()` 函数位置。
- **slide-sidecar bridge**（新建 `src/animation-injector.ts` 或并入 `src/index.ts`）：从 animations.json 解析 → 按 slide_id 取 entry → 按 group_id 找 PPTElement → 生成 PPTAnimation[] + turningMode + 写入 slide.animations。

---

## Specific Ideas

### ID 命名格式参考（来自 examples）
- 子元素原 id 样例：`content-title-carrier`, `content-subtitle-carrier`, `content-object-lead`, `card-temperature-bg` 等
- group id 样例：`card-temperature`, `card-pulse`, `stage-1-rise`, `monitor-routine` 等
- 期望 PPTElement.id 输出：`content-title-carrier`（保留）/ `card-temperature__a3kP9`（fallback）/ `<nanoid(10)>`（无 group）

### 已知 PPTist runtime 限制（来自 animation-adaptation-analysis.md §1.1）
- `effect` 必须为 84 个真值表之一，否则 PPTist 运行时 `useExecPlay.ts` 拼 `ANIMATION_CLASS_PREFIX + effect` 后该动画不播放
- `TurningMode` 只有 12 个枚举值，且 PPTist 自身把 `random` 在 `useSlidesWithTurningMode.ts` 里展开成其它 11 个之一
- `trigger` 折叠由 `formatedAnimations` 完成，D-18 顺序敏感

### `defaults` 与 PPTist 默认值的偏差
- `defaults.animation.duration = 0.45s`（三方）vs PPTist 单动画默认 1000ms（1000ms）
- 转换后所有 duration 都是 explicit ms，不会触发 PPTist 默认推断

### 副作用：diagnostics 输出
- 转换结束打印到 stderr（不进 JSON）："User may customize [N1 slides], [N2 animations injected], [N3 fields preserved in extensions], [N4 unmapped effects fallback]" — 帮助调用方知晓"被丢弃的能力"

---

## Deferred Ideas

- **v2：motion path_* 运行时支持**（GSAP/anime.js 集成） — 已 Out of Scope（v1.9 不做运行时播放，path_* 降级为 entrance 或丢 extensions.originalEffect）
- **v2：PPTist effectOptions 字段扩展**（direction / amount / color 等） — 已 Out of Scope
- **v2：PPTist trigger_shape / delay / repeat_count / sound 支持** — 已 Out of Scope（v1.9 全部保留到 extensions 原值）
- **v2：PPTist 编辑面板逆向** — 读 PPTist JSON 反向生成 animations.json sidecar

### Reviewed Todos (not folded)

（无 — `cross_reference_todos` 返回 `todo_count: 0`）

---

*Phase: 14-pptist-animation-from-sidecar*
*Context gathered: 2026-10-15*