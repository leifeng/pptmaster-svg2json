# Phase 2: Text 元素扩展 - Discussion Log

**Discussion Date:** 2026-06-29
**Participants:** User + Claude

## Topics Discussed

### 1. 富文本格式规范
**Question:** PPTist 文本元素使用什么富文本格式？
**Answer:** 用户指出查看 `code/PPTist/src/utils/prosemirror/index.ts` 了解 PPTist 规范。
**Decision:** 使用 ProseMirror schema 规范，参考 marks.ts 和 nodes.ts。

### 2. text-anchor → text-align
**Question:** SVG `text-anchor` 如何映射到 PPTist？
**Answer:** 用户明确：
- `text-anchor="start/end"` → `left/right`（取决于文本方向）
- `text-anchor="middle"` → `center`
- 用 `<p>` 标签的 `text-align` 样式实现
**Decision:** D-09

### 3. font-weight → strong
**Question:** `font-weight="bold"` 如何映射？
**Answer:** 用户确认 → `<strong>` mark。
**Question:** `font-weight="600"` 或 `"700"` 也映射吗？
**Decision:** bold/600/700 都转 `<strong>` mark。

### 4. vAlign / vertical
**Question:** PPTist 有 `vertical?: boolean`，但 TEXT-06 要求 `vAlign`。是同一个东西吗？
**Answer:** 用户确认是一个东西。
**Decision:** D-07

### 5. 透明度颜色处理
**Question:** `fill-opacity` 带透明度的颜色放哪里？
**Answer:** 用户明确：有透明色请配置在 `<span style="color: rgba(...)">` 中，而不是 `defaultColor`。
**Decision:** D-08

### 6. 不映射的字段
**Question:** 以下字段是否需要映射？
- wordSpace, paragraphSpace, outline, shadow, fixedHeight
**Answer:** 用户明确：SVG 中的元素属性如果没有 PPTist 对应字段就不需要赋值。
**Decision:** D-13 — 这些字段不映射

### 7. fill 作为文字前景色
**Question:** SVG `fill` 是背景色还是前景色？
**Answer:** 用户确认 `fill` 是文字前景色，目前代码 `defaultColor: colorToHex(element.attrs.fill)` 是正确的。
**Decision:** D-12

## Deferred Ideas
- `text-decoration` 其他值（overline, blink）暂不支持
- `font-style="italic"` → `<em>` mark（未在 TEXT-01~09 中，但富文本规范支持）

## Summary
所有灰度区域在一次讨论中全部澄清。用户提供了 PPTist ProseMirror 规范路径，所有 TEXT-01~09 的实现方式均已明确。