# Phase 3: Gradient 和 Opacity - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

## Phase Boundary

Gradient 和 Opacity：支持 SVG 渐变定义（`<linearGradient>` / `<radialGradient>`）解析，`fill="url(#id)"` 引用解析，`stop-opacity` / `fill-opacity` / `stroke-opacity` 透明度映射到 PPTist 格式。

**Requirements:** GRAD-01, GRAD-02, GRAD-03, GRAD-04, OPAC-01, OPAC-02, OPAC-03

## Implementation Decisions

### Gradient defs storage

- **D-14:** 解析时构建 `Map<id, GradientDef>` 注册表，传递给 transformer
  - Parser 层在解析 `<defs>` 时构建注册表
  - Transformer 通过 ID 查找获取渐变定义
  - 清晰的关注点分离

### Fill reference resolution

- **D-15:** `fill="url(#gradientId)"` 在解析时直接解析为 PPTist `gradient` 对象
  - Parser 解析时查注册表，将 `url(#id)` 替换为 resolved gradient 对象
  - Transformer 直接使用 `attrs.gradient`，无需二次查找

### Alpha channel encoding

- **D-16:** `stop-opacity` 编码为 rgba() 颜色字符串
  - `color: "rgba(r, g, b, a)"` — alpha 嵌入颜色字符串
  - 与 Phase 2 D-08 (text fill-opacity) 保持一致
  - 无需修改 PPTist schema

### Gradient rotate mapping

- **D-17:** 从 `gradientTransform` 矩阵提取旋转角度
  - 分解 gradientTransform 矩阵获取旋转分量
  - 支持 `rotate(N)` 和含旋转的 matrix
  - 非旋转矩阵 → rotate = 0

### Opacity mapping (OPAC-01/02)

- **D-18:** SVG `fill-opacity` → rgba() 颜色字符串（与 D-08 一致）
- **D-19:** SVG `stroke-opacity` → outline 的 opacity 字段
- **D-20:** SVG 元素 `opacity` → PPTElement `opacity` 字段

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PPTist Schema
- `src/slides.ts` — `Gradient` interface (type: 'linear'|'radial', colors[], rotate), `GradientColor` (pos, color), PPTShapeElement opacity field

### Existing Implementation
- `src/parser/svg-parser.ts` — childTags includes 'linearGradient', 'stop' — parser already recognizes这些标签
- `src/transformer/transform-to-pptel.ts:309` — skip list includes 'linearGradient', 'stop'
- `src/mapper/coordinate-mapper.ts` — parseTransform 实现（可用于 gradientTransform 分解）

### Requirements
- `.planning/REQUIREMENTS.md` § Gradient (GRAD-01~04) 和 Opacity (OPAC-01~03)
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria

### Prior Phase Decisions
- `.planning/phases/02-text/02-CONTEXT.md` — D-08: fill-opacity < 1 → rgba() in span style（一致性问题）

## Existing Code Insights

### Reusable Assets
- `parseTransform()` in `src/mapper/coordinate-mapper.ts:33-66` — 可复用矩阵分解逻辑提取旋转角度
- `colorToRgba()` in `src/transformer/transform-to-pptel.ts:211-234` — 将 CSS 颜色 + opacity 转为 rgba() 字符串，可复用

### Established Patterns
- D-08 一致性：text fill-opacity → rgba()，gradient stop-opacity 也用 rgba()
- Skip list 模式：`['defs', 'linearGradient', 'stop', ...]` — gradient defs 不作为独立元素输出

### Integration Points
- svg-parser.ts → 需要在解析时收集 gradient defs 到注册表
- transform-to-pptel.ts → 需要处理 `fill="url(#id)"` 和 gradient 对象输出

## Deferred Ideas

None — all raised topics were within phase scope.

---

*Phase: 3-Gradient 和 Opacity*
*Context gathered: 2026-06-29*
