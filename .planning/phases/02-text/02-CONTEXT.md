# Phase 2: Text 元素扩展 - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

## Phase Boundary

Text 元素扩展：完整支持 Text 元素的样式属性和 HTML 内容格式化。

**Requirements:** TEXT-01, TEXT-02, TEXT-03, TEXT-04, TEXT-05, TEXT-06, TEXT-07, TEXT-08, TEXT-09

## Implementation Decisions

### 富文本格式规范

- **D-10:** 使用 PPTist ProseMirror 富文本规范
  - 参考: `code/PPTist/src/utils/prosemirror/schema/marks.ts` — inline marks
  - 参考: `code/PPTist/src/utils/prosemirror/schema/nodes.ts` — block nodes (paragraph)
  - Mark 优先级: strong > em > fontsize > fontname > forecolor > backcolor > underline > strikethrough

### Text-Anchor 映射

- **D-09:** `text-anchor` → `<p>` 标签的 `text-align` 样式
  - `text-anchor="start"` → `text-align: left`
  - `text-anchor="end"` → `text-align: right`
  - `text-anchor="middle"` → `text-align: center`
  - 只在非 left 时显式设置 align 属性（left 是默认）

### Font-Weight 映射

- **D-11:** `font-weight` 为 bold/600/700 → `<strong>` mark
  - 其他 font-weight 值不映射

### 颜色和透明度

- **D-12:** SVG `fill` 作为文字前景色 → `defaultColor` 字段
- **D-08:** 如果有透明色（`fill-opacity` < 1），配置在 `<span style="color: rgba(...)">` 中，而非 `defaultColor`
  - `defaultColor` 接收不透明颜色字符串

### vAlign / Vertical

- **D-07:** PPTist 的 `vertical?: boolean` 即为 TEXT-06 要求的 `vAlign`
  - 对应 SVG `writing-mode` 或 `dominant-baseline` 属性
  - 具体映射规则待研究（planning 阶段确认）

### 不映射的字段

- **D-13:** 以下字段不映射（PPTist 无对应字段）：
  - `wordSpace` — 无对应
  - `paragraphSpace` — 无对应
  - `outline` — PPTist 无 text outline 概念
  - `shadow` — PPTist 无 text shadow 概念
  - `fixedHeight` — PPTist 无此字段

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### PPTist 富文本规范
- `code/PPTist/src/utils/prosemirror/schema/marks.ts` — ProseMirror marks 定义（strong, em, fontsize, fontname, forecolor, backcolor, underline, strikethrough 等）
- `code/PPTist/src/utils/prosemirror/schema/nodes.ts` — ProseMirror nodes 定义（paragraph with align/indent/textIndent）

### 现有实现
- `src/transformer/transform-to-pptel.ts` — transformElement 函数，text case 在 508-545 行
- `src/slides.ts` — PPTTextElement 接口定义（182-198 行）
- `src/mapper/coordinate-mapper.ts` — parseTransform 实现

### 需求文档
- `.planning/REQUIREMENTS.md` § Text (TEXT-01~09)
- `.planning/ROADMAP.md` — Phase 2 目标定义

## Existing Code Insights

### 当前 Text 实现
- text case 生成 `<p style=""><span style="font-size: Npx;">content</span></p>`
- `defaultColor` 直接从 `element.attrs.fill` 获取
- `lineHeight: 1.5` 硬编码
- 无 text-anchor 映射
- 无 font-weight 映射

### PPTTextElement 已有字段
```typescript
interface PPTTextElement extends PPTBaseElement {
  content: string
  defaultFontName: string
  defaultFontSize?: number
  defaultColor: string
  outline?: PPTElementOutline      // 未使用
  fill?: string                    // 未使用
  lineHeight?: number
  wordSpace?: number               // 未使用
  opacity?: number
  shadow?: PPTElementShadow        // 未使用
  paragraphSpace?: number          // 未使用
  vertical?: boolean               // D-07: 即 vAlign
  textType?: TextType
  inset?: TextInset
}
```

### 待确认的映射
- `writing-mode` → `vertical` 的具体转换规则（planning 阶段研究）
- `dominant-baseline` / `alignment-baseline` 是否影响 vAlign

## Deferred Ideas

- `text-decoration` 其他值（overline, blink）暂不支持
- `font-style="italic"` → `<em>` mark（未在 TEXT-01~09 中，但富文本规范支持）
- 多语言字体 fallback（如 `font-family="Arial, sans-serif"`）

---

*Phase: 2-Text 元素扩展*
*Context gathered: 2026-06-29*