# Phase 6: resvg-js Text Measurement - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning

<domain>
## Phase Boundary

用 resvg-js 渲染的字形边界框替代 `calcTextWidthYaHei()` 的启发式字符比例估算，获得准确的文本宽高。

</domain>

<decisions>
## Implementation Decisions

### 批量化 vs 逐个测量
- **D-33:** 逐个串行 `await` 测量 — 每个 `<text>` 元素单独调用 resvg-js 渲染，完全串行，不使用 `Promise.all()` 并行
- **D-34:** 暂不考虑批量优化 — 50 个文本元素以下逐个测量足够，不预留批量接口

### 测量失败时的错误处理
- **D-35:** 测量失败时回退到启发式估算 — 当 resvg-js 渲染失败、WASM 加载失败或返回空边界框时，使用 `calcTextWidthYaHei()` 的启发式方法，保证 SVG 始终能转换

### Tspan 扁平化策略
- **D-36:** 忽略 tspan 位置偏移 — 将 `<tspan>` 子元素内容用 `\n` 连接后作为单行文本传给 resvg-js 测量，`x`/`dy` 属性在测量阶段忽略，仅在 transformElement 输出 JSON 时保留其 HTML 结构（`<p>` 标签）

### ViewBox 溢出处理
- **D-37:** 使用 1280×720 固定尺寸 — 测量用的临时 SVG 使用固定 viewBox `0 0 1280 720`，确保内容不被截断

### Claude's Discretion
- 测量函数的错误捕获细节（try/catch 范围、错误类型过滤）
- 临时 SVG 的 width/height 属性值（与 viewBox 保持一致即可）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 架构研究
- `.planning/research/ARCHITECTURE.md` — resvg-js 集成方案（集成点、WASM 初始化策略、临时 SVG 构造方式）

### 需求文档
- `.planning/REQUIREMENTS.md` §v1.3 — MEAS-01~11 需求清单

### 项目状态
- `.planning/STATE.md` — 当前项目状态（v1.3 milestone）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/transformer/transform-to-pptel.ts` — `transformElement()` 的 text case 是修改点，`calcTextWidthYaHei()` 将被移除
- `src/parser/svg-parser.ts` — 解析出的 `SvgElement` 包含 `text` 和 `children`（tspan）供展平用

### Established Patterns
- `convert()` in `src/index.ts` 已是 async — async 传播到 `transformToPPTElement()` 和 `walk()` 的改动已有基础
- 启发式估算函数 `calcTextWidthYaHei()` 和常量 `BASELINE_OFFSET_RATIO` 在移除前需保留作为 fallback

### Integration Points
- `text-measurer.ts`（新建）→ `transformElement()` text case — 测量函数调用
- `@resvg/resvg-js` 包依赖安装 → `package.json`

</code_context>

<specifics>
## Specific Ideas

- 测量 SVG 使用 `xml:space="preserve"` 保持空白符
- Tspan 展平后的 `\n` 连接仅用于测量，输出的 `content` 仍保持 `<p>` HTML 结构
- Fallback 的启发式估算使用与现有 `calcTextWidthYaHei()` 完全相同的逻辑

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-resvg-js-text-measurement*
*Context gathered: 2026-07-01*