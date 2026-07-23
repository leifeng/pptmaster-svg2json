# 12-CONTEXT.md — font-preprocess

## 来源

用户需求：在 SVG 被 svg2json 处理之前，将文件中所有字体替换为 "Source Han Sans CN Regular"。

## 约束

- 只修改字体相关属性，不改变 SVG 的其他内容
- 字体属性可能出现在：`font-family`、`font`、`font-size`、`font-weight`、`font-style` 等
- 需要处理 `<text>` 元素及其子元素 `<tspan>`、`<textPath>`
- 需要处理 CSS 样式中的字体声明（`<style>` 标签内的 CSS 规则）
- 替换应该是全局的，一次性处理整个 SVG 文件

## 目标

在 SVG 文件被解析和转换之前，将其字体统一替换为 "Source Han Sans CN Regular"，确保输出 PowerPoint 的一致性。

## 关键文件

- `src/` — SVG 解析和转换入口
- `src/transformer/` — transform-to-pptel.ts 是主要转换逻辑
