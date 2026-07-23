# 11-CONTEXT.md — text-width-height-passthrough

## 来源

用户需求：在解析 SVG 测量文本 box 时，如果 SVG `<text>` 元素已声明 `width` 和 `height` 属性，就跳过 resvg-js 测量，直接使用声明值（缩放后）放入 JSON。

## 约束

- **仅作用于 SVG `<text>` 元素**：其他标签（rect / circle / image 等）保持原行为。
- **同时声明两个属性**：只有 `width` 和 `height` 都存在且能解析为正数时才走直通路径；任一缺失或非法都回退到 resvg-js 测量。
- **必须缩放**：属性值是 SVG 坐标系下的原始值，需要乘 `scaleX` / `scaleY`（与 viewBox → canvas 的缩放比例一致）后再写入 JSON。
- **ascent 仍需可用**：resvg-js 同时提供 width / height / y（baseline 偏移）。直通路径下没有 `measured.y`，textTop 的计算需要其他来源：
  - 单行文本：继续使用 `FALLBACK_ASCENT_RATIO` 启发式（思源 0.764）保持视觉一致。
  - 多行文本（multiline tspan 分支）：各 tspan 自带 fontSize 与 baseTop，可继续走 `extractTspansWithPosition` 现有逻辑。
- **不影响 `fixedHeight` 推断**：当前 line 1598 的 `const fixedHeight = !!element.attrs.height` 仍保留。

## 目标

在 `transformElement` 的 `text` 分支顶部加入"宽高直通"快路径：检测 SVG `<text>` 的 `width` / `height` 属性，同时存在时直接使用（按 scaleX / scaleY 缩放），跳过 `measureTextElement` 调用。

## 关键文件

- `src/transformer/transform-to-pptel.ts` — `transformElement` 内 `case 'text'` 分支（line 1474 附近）
- `src/constants.ts` — `FALLBACK_ASCENT_RATIO`、`TEXT_WIDTH_SAFETY_MARGIN`（如果需要新增常量可放这里）
- `src/text-measurer.ts` — `measureTextElement`（无需改动，仅跳过调用）
