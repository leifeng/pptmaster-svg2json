# Debug: cover-tags 文本 x 位置不正确（text-anchor="middle" 继承失败）

## 症状

处理 `exampels/svg_output/01_cover.svg` 时，id 为 `cover-tags` 的 `<g>` 中 3 个 `<text>` 元素的 `left` 值不正确：

| 元素 | SVG x（中心点）| SVG textWidth | 期望 left | 实际 JSON left |
|------|---------------|--------------|----------|--------------|
| "DeepSeek Sparse Attention" | 400 (0.78125→312.5) | 180.58 | 312.5 - 180.58/2 = 222.21 | **312.5** ❌ |
| "Scalable RL Framework"       | 640 (0.78125→500)   | 160.15 | 500 - 160.15/2 = 419.92   | **500**   ❌ |
| "Agentic Task Synthesis"      | 880 (0.78125→687.5) | 155.83 | 687.5 - 155.83/2 = 609.58 | **687.5** ❌ |

`left` 值等于 SVG x 中心点乘以缩放因子（0.78125），完全没有应用 `text-anchor="middle"` 的左偏移。

## 根本原因

`cover-tags` 的 `<g>` 设置了 `text-anchor="middle"`，子 `<text>` 没有自己的 `text-anchor` 属性（依赖继承）。

`src/transformer/transform-to-pptel.ts` 的 `walk()` 函数（第 1806-1895 行）实现 D-38 属性继承，但**只处理了**：

```ts
// D-38: Inheritable attributes: fill, stroke, stroke-width, fill-opacity, stroke-opacity
```

**没有合并 `text-anchor`**（以及 `font-family` 等其他可继承属性）。

结果：在 `transformTextElement`（第 1567-1579 行）中：

```ts
const textAnchorForLeft = element.attrs['text-anchor']  // undefined！
let textLeft = transformed.left                          // 直接用了中心点
if (textAnchorForLeft === 'middle') {
  textLeft = transformed.left - textWidth / 2            // 没执行
} else if (textAnchorForLeft === 'end') {
  textLeft = transformed.left - textWidth                 // 没执行
}
```

`element.attrs['text-anchor']` 为 `undefined`，导致 `textLeft` 等于 `transformed.left`（中心点的 x 坐标）。

## 修复方案

修改 `walk()` 函数，让 `text-anchor`（以及同源问题相关的 `font-family`）也能从父 `g` 继承：

### 步骤 1：第 1809-1816 行（g → 子继承池）

```ts
if (isG) {
  if (element.attrs.fill !== undefined) effectiveInheritedAttrs.fill = element.attrs.fill
+ if (element.attrs['text-anchor'] !== undefined) effectiveInheritedAttrs['text-anchor'] = String(element.attrs['text-anchor'])
+ if (element.attrs['font-family'] !== undefined) effectiveInheritedAttrs['font-family'] = String(element.attrs['font-family'])
  // ...
}
```

### 步骤 2：第 1880-1895 行（继承池 → 子元素的 attrs 合并）

```ts
const mergedAttrs = { ...child.attrs }
+ if (child.attrs['text-anchor'] === undefined && effectiveInheritedAttrs['text-anchor'] !== undefined) {
+   mergedAttrs['text-anchor'] = effectiveInheritedAttrs['text-anchor']
+ }
+ if (child.attrs['font-family'] === undefined && effectiveInheritedAttrs['font-family'] !== undefined) {
+   mergedAttrs['font-family'] = effectiveInheritedAttrs['font-family']
+ }
  // ...
```

## 验证

- 重新处理 `01_cover.svg`，检查 cover-tags 中 3 个 text 的 `left` 值是否偏移为 `x - textWidth/2`
- 运行已有 `text-anchor.test.ts`，确保不破坏现有断言
- 添加新测试覆盖"父 g 继承 text-anchor"路径

## 风险与注意

- D-38 注释 "Inheritable attributes: ..." 需要扩展
- `font-family` 是一个新的可继承字段，必须先确认 `transformTextElement` 第 1478 行的逻辑会使用合并后的属性（是 `element.attrs['font-family']`，合并后会拿到）
