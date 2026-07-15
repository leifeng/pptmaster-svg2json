# 嵌套 `<g>` 标签解析详解

**项目**: svg2json  
**相关文件**: `src/parser/svg-parser.ts`, `src/transformer/transform-to-pptel.ts`, `src/mapper/coordinate-mapper.ts`  
**适用场景**: 含有嵌套 `<g>` 标签的 SVG 结构，尤其是带有多层 `transform` 属性的分组场景

---

## 1. 概述

嵌套 `<g>` 标签的处理分为三个阶段：

```
SVG 字符串
   │
   ▼
[阶段一：XML 解析]     →  SvgElement AST（fast-xml-parser）
   │
   ▼
[阶段二：递归 Walk]     →  组合 transform，继承 groupId
   │
   ▼
[阶段三：坐标映射]      →  计算最终 bounding box
   │
   ▼
PPTElement[]
```

---

## 2. 阶段一：XML 解析

**文件**: `src/parser/svg-parser.ts:969`

```typescript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
  isArray: (name) =>
    ['rect', 'circle', 'ellipse', 'path', 'polygon', 'polyline',
     'line', 'text', 'tspan', 'image', 'g', 'defs',
     'linearGradient', 'radialGradient', 'stop'].includes(name),
})
```

关键点：`g` 标签被声明为 `isArray = true`，意味着即使只有一个 `<g>` 子元素也会被解析为数组。解析结果是嵌套的 `SvgElement` 对象树：

```typescript
interface SvgElement {
  type: string;       // 'g', 'rect', 'text', 'path' 等
  attrs: SvgAttrs;    // 所有属性，transform 在这里
  children: SvgElement[];
  text?: string;
}
```

### 示例 SVG 对应的 AST 结构

```svg
<g transform="translate(60, 220)">
  <g transform="translate(0, 116)">
    <g transform="translate(0.0, 0.0) scale(1.16, 1.16)">
      <path d="M16 16v2a2 2 0 0 1 -2 2h-8..."/>
    </g>
    <text x="44" y="14">Multi-Head Self-Attention</text>
  </g>
</g>
```

```json
{
  "type": "g",
  "attrs": { "transform": "translate(60, 220)" },
  "children": [
    {
      "type": "g",
      "attrs": { "transform": "translate(0, 116)" },
      "children": [
        {
          "type": "g",
          "attrs": { "transform": "translate(0.0, 0.0) scale(1.16, 1.16)" },
          "children": [
            { "type": "path", "attrs": { "d": "M16 16v2a2..." }, "children": [] }
          ]
        },
        {
          "type": "text",
          "attrs": { "x": "44", "y": "14" },
          "children": [],
          "text": "Multi-Head Self-Attention"
        }
      ]
    }
  ]
}
```

---

## 3. 阶段二：递归 Walk（核心处理）

**文件**: `src/transformer/transform-to-pptel.ts:1330`

`transformToPPTElement` 中的 `walk` 函数是处理嵌套 `<g>` 的核心：

```typescript
async function walk(
  element: SvgElement,
  viewBox: [number, number, number, number],
  currentGroupId?: string,
  parentTransform?: string,  // 从父级累积的 transform
) {
  const tag = element.type.toLowerCase()
  const isG = tag === 'g'

  // ① groupId 继承规则：最近的祖先 g id 生效
  const effectiveGroupId = isG
    ? (element.attrs.id || undefined)   // 有 id 用自己的，没有则断开继承链
    : currentGroupId                     // 非 g 元素继承父级的

  // ② Transform 组合：将父级 transform 和自己的 transform 拼接
  const effectiveTransform = composeTransforms(parentTransform, element.attrs.transform)

  // ③ 递归处理子元素
  for (const child of element.children) {
    if (child.type.toLowerCase() === 'g') {
      // 嵌套 g：继续递归，传递累积的 transform 和 groupId
      await walk(child, viewBox, effectiveGroupId, effectiveTransform)
    } else {
      // 非 g 元素：调用 transformElement 进行最终变换
      await transformElement(child, viewBox, elements.length, targetCanvas,
                            effectiveGroupId, effectiveTransform)
    }
  }
}
```

---

## 4. Transform 组合规则

**文件**: `src/transformer/transform-to-pptel.ts:1313`

```typescript
function composeTransforms(parentTransform, childTransform) {
  if (!parentTransform && !childTransform) return undefined
  if (!parentTransform) return childTransform
  if (!childTransform) return parentTransform
  return `${parentTransform} ${childTransform}`  // 直接字符串拼接
}
```

### 示例：三层嵌套 g 的 transform 累积过程

```svg
<g transform="translate(60, 220)">          <!-- Level 1 -->
  <g transform="translate(0, 116)">         <!-- Level 2 -->
    <g transform="translate(0.0, 0.0) scale(1.16, 1.16)">  <!-- Level 3 -->
      <path d="..."/>
    </g>
  </g>
</g>
```

累积的 `effectiveTransform` 变化过程：

| 层级 | parentTransform | element.attrs.transform | effectiveTransform |
|------|-----------------|------------------------|--------------------|
| Level 1 | `undefined` | `translate(60, 220)` | `translate(60, 220)` |
| Level 2 | `translate(60, 220)` | `translate(0, 116)` | `translate(60, 220) translate(0, 116)` |
| Level 3 | `... translate(0, 116)` | `translate(0.0, 0.0) scale(1.16, 1.16)` | `translate(60, 220) translate(0, 116) translate(0.0, 0.0) scale(1.16, 1.16)` |

最终 `<path>` 元素会收到完整的 transform 字符串，然后由 `mapCoordinates` 解析并应用到所有坐标。

---

## 5. groupId 继承规则

- **有 `id` 的 `<g>`**：会成为新的 groupId 上下文的根，子元素继承这个 id
- **无 `id` 的 `<g>`**：不继承父级的 groupId（`undefined` 断开继承链）
- **嵌套时**：最内层有 `id` 的 `<g>` 覆盖外层的 groupId

```typescript
const effectiveGroupId = isG
  ? (element.attrs.id || undefined)  // 有 id 用自己的，没有则断开继承链
  : currentGroupId                  // 非 g 元素继承父级的
```

---

## 6. 阶段三：坐标映射与变换

**文件**: `src/mapper/coordinate-mapper.ts:197`

当 `walk` 遇到非 `g` 元素（如 `<rect>`, `<text>`, `<path>`）时，调用 `transformElement`，最终到 `mapCoordinates`：

```typescript
export function mapCoordinates(element, viewBox, parentTransform?) {
  // 1. 组合 transform
  const effectiveTransform = composeTransforms(parentTransform, attrs.transform)

  // 2. 解析 transform 字符串
  const transform = parseTransform(effectiveTransform)
  const tx = transform.translateX || 0
  const ty = transform.translateY || 0
  const sx = transform.scaleX ?? 1  // 默认 scale 为 1
  const sy = transform.scaleY ?? 1

  // 3. 对每个坐标属性应用变换
  switch (tag) {
    case 'rect':
      left   = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top    = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      width  = extractNumber(attrs.width, ...) * Math.abs(sx)
      height = extractNumber(attrs.height, ...) * Math.abs(sy)
      break
    case 'text':
      left = extractNumber(attrs.x, 0) * Math.abs(sx) + tx
      top  = extractNumber(attrs.y, 0) * Math.abs(sy) + ty
      break
    case 'path':
      // path d 属性保持不变，计算 bounding box 时应用变换
      const bbox = pathBoundingBox(d)
      if (bbox) {
        left   = bbox.left * Math.abs(sx) + tx
        top    = bbox.top * Math.abs(sy) + ty
        width  = bbox.width * Math.abs(sx)
        height = bbox.height * Math.abs(sy)
      }
      break
    // ... 其他元素类似
  }
}
```

### `parseTransform` 示例

输入：
```
"translate(60, 220) translate(0, 116) scale(1.1666666666666667, 1.1666666666666667)"
```

输出：
```typescript
{
  translateX: 60 + 0 + 0 = 60,
  translateY: 220 + 116 + 0 = 336,
  scaleX: 1.1666666666666667,
  scaleY: 1.1666666666666667
}
```

---

## 7. 完整数据流图

```
SVG Input
   │
   ▼
fast-xml-parser.parse()
   │  输出: { svg: { type:'svg', attrs:{}, children: [...] } }
   ▼
transformToPPTElement(ast)
   │
   └─→ walk(root)
         │
         ├─ <g transform="translate(60,220)">  ← 组合: "translate(60,220)"
         │     │
         │     └─ <g transform="translate(0,116)">  ← 组合: "... translate(0,116)"
         │           │
         │           └─ <g transform="translate(0,0) scale(1.16,1.16)">  ← 组合: "... scale(1.16,1.16)"
         │                 │
         │                 ├─ <path d="...">  →  mapCoordinates(path, ..., "... scale(1.16,1.16)")
         │                 │                          └─→ 应用 translate + scale
         │                 │
         │                 ├─ <text x="44" y="14">  →  mapCoordinates(text, ...)
         │                 │                          └─→ 应用 translate + scale 到 x, y
         │                 │
         │                 └─ <text x="44" y="36">  →  ...
         │
         ├─ <g transform="translate(0,168)">  ← 重新从 Level 1 累积
         │     └─ <g transform="translate(0,0) scale(1.16,1.16)">
         │           ├─ <path> → 应用 translate(0,168) + scale(1.16,1.16)
         │           └─ <text> → ...
         │
         └─ ... (其他 g 同理)
```

---

## 8. 关键文件索引

| 文件 | 作用 |
|------|------|
| `src/parser/svg-parser.ts:969` | `parseSvg()` — XML → AST |
| `src/transformer/transform-to-pptel.ts:1330` | `walk()` — 递归遍历 + transform 组合 |
| `src/transformer/transform-to-pptel.ts:1313` | `composeTransforms()` — transform 字符串拼接 |
| `src/mapper/coordinate-mapper.ts:197` | `mapCoordinates()` — 应用变换计算边界框 |
| `src/mapper/coordinate-mapper.ts:74` | `parseTransform()` — 解析 transform 字符串为数值 |
| `src/types/ast.ts:94` | `SvgElement` 接口定义 |
| `src/types/ast.ts:102` | `SvgParseResult` 接口定义 |

---

## 9. 注意事项

1. **transform 拼接顺序**：父级的 transform 在前，子级的在后。SVG 渲染时按从左到右顺序执行，因此拼接后的字符串要确保数学上等价。

2. **scale 影响坐标计算**：`mapCoordinates` 中使用 `Math.abs(sx)` 和 `Math.abs(sy)` 处理 scale，确保宽高始终为正。

3. **无 id 的 g 断开继承链**：如果希望子元素继承父级的 groupId，父级 `<g>` 必须有 `id` 属性。

4. **g 元素本身不输出**：`walk` 函数在遇到 `<g>` 标签时只递归处理其子元素，`g` 本身不产生 PPTElement。
