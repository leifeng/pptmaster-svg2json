# SVG to JSON 转换处理流程

**项目**: svg2json — 将 SVG 转换为 PPTist JSON 格式  
**源 SVG 尺寸**: 任意（默认 1280×720）  
**目标画布**: 1000×562.5（16:9 比例）  
**输出格式**: PPTist 演示文稿 JSON

---

## 总体流程图

```
原始 SVG 字符串
      │
      ▼
┌─────────────────────────────────┐
│  阶段一：解析与树构建            │
│  src/parser/svg-parser.ts      │
│  • fast-xml-parser 解析 XML     │
│  • linkedom 修复混合 text/tspan │
│  • 建立 gradient/filter/pattern│
│    三个注册表                   │
│  • 解析 defs 中的资源定义        │
│  • 解析 viewBox/width/height   │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  阶段二：预处理                  │
│  • svg-use-handler: 展开 <use>  │
│  • clip-path-preprocessor:      │
│    展开 clipPath 定义            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  阶段三：坐标映射与变换累积        │
│  src/mapper/coordinate-mapper.ts│
│  • 解析 transform 属性           │
│  • 组合父子 transform            │
│  • 将元素几何属性转为            │
│    left/top/width/height        │
│  src/transformer/apply-transform│
│  • 处理旋转（有无中心点）         │
│  • 处理翻转（负 scale）          │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  阶段四：元素类型转换             │
│  src/transformer/               │
│    transform-to-pptel.ts        │
│  • 几何图形 → path (SVG path)   │
│  • 文本 → HTML content          │
│  • 渐变/阴影/图案在解析时已处理   │
│  • 坐标缩放至目标画布            │
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  阶段五：背景推断与组装           │
│  src/index.ts (convert 函数)    │
│  • 推断背景（纯色/渐变/图案）     │
│  • 组装 Slide/Presentation JSON  │
└───────────────┬─────────────────┘
                │
                ▼
         PPTist JSON 输出
```

---

## 阶段详解

### 阶段一：解析与树构建

**文件**: `src/parser/svg-parser.ts` — `parseSvg()`

| 步骤 | 操作内容 | 文件位置 |
| :--- | :--- | :--- |
| 1.1 | **解析 XML**: 使用 `fast-xml-parser` 将 SVG 字符串解析为 JS 对象，属性前缀 `@_` | `svg-parser.ts:983` |
| 1.2 | **修复混合内容**: 使用 `linkedom` 重新解析 `<text>` 元素的混合 text/tspan 内容，保持文档顺序正确 | `svg-parser.ts:576-612` |
| 1.3 | **建立渐变注册表**: 遍历 `<defs>` 中的 `<linearGradient>` 和 `<radialGradient>`，存入 `gradientRegistry` Map | `svg-parser.ts:73-159` |
| 1.4 | **建立滤镜注册表**: 遍历 `<defs>` 中的 `<filter>`，解析 `feDropShadow` 等基元，存入 `filterRegistry` | `svg-parser.ts:222-257` |
| 1.5 | **建立图案注册表**: 遍历 `<defs>` 中的 `<pattern>`，存入 `patternRegistry`（图案渲染为 PNG） | `svg-parser.ts:165-216` |
| 1.6 | **解析 viewBox**: 从根 SVG 属性提取 `viewBox`，默认 `[0, 0, 1280, 720]` | `svg-parser.ts:459-464` |
| 1.7 | **解析宽高**: 从根 SVG 属性提取 `width/height`，优先使用属性值，否则用 viewBox | `svg-parser.ts:1035-1038` |
| 1.8 | **解析渐变引用**: `resolveFillReference()` — `fill="url(#gradientId)"` → 将 gradient 对象存入元素 `attrs.gradient`，替换 fill | `svg-parser.ts:263-313` |
| 1.9 | **解析滤镜引用**: `resolveFilterReference()` — `filter="url(#shadowId)"` → 将 shadow 对象存入元素 `attrs.shadow` | `svg-parser.ts:398-430` |
| 1.10 | **解析图案引用**: `resolvePatternReference()` — `fill="url(#patternId)"` → 将 patternId 存入 `attrs.pattern`，供后续渲染 PNG | `svg-parser.ts:320-333` |

**关键类型**:
```typescript
// src/types/ast.ts
interface SvgElement {
  type: string           // 元素标签名（小写）
  attrs: SvgAttrs        // 属性 map
  children: SvgElement[] // 子元素
  text?: string          // 文本内容
}

interface SvgParseResult {
  root: SvgElement       // SVG 根元素
  viewBox: [number, number, number, number]  // [minX, minY, width, height]
  width: number
  height: number
  patternRegistry: Map<string, PatternDef>
}
```

---

### 阶段二：预处理——展开资源引用

#### 2.1 展开 `<use>` 标签

**文件**: `src/svg-use-handler.ts` — `autoEmbedIcons()`

| 步骤 | 操作内容 |
| :--- | :--- |
| 2.1.1 | 遍历 DOM 树，识别 `<use>` 标签 |
| 2.1.2 | 通过 `href`/`xlink:href` 查找被引用元素（来自 `<defs>` 或 `<symbol>`） |
| 2.1.3 | 深克隆引用元素内容 |
| 2.1.4 | 将 `<use>` 的 `x`、`y` 和 `transform` 转换为矩阵，乘入克隆内容的每个坐标点 |
| 2.1.5 | 用克隆内容替换 `<use>` 标签 |

#### 2.2 展开 `<clipPath>` 定义

**文件**: `src/transformer/clip-path-preprocessor.ts` — `preprocessClipPaths()`

| 步骤 | 操作内容 |
| :--- | :--- |
| 2.2.1 | 遍历 AST，收集所有 `<clipPath>` 定义到 Map（id → clipPath 元素） |
| 2.2.2 | 遍历每个有 `clip-path="url(#id)"` 的元素 |
| 2.2.3 | 找到对应的 clipPath 定义，将其子元素克隆并变换（乘以 clipPath 的 transform） |
| 2.2.4 | 将变换后的子元素注入到引用元素中，移除 `clip-path` 属性 |
| 2.2.5 | clipPath 子元素的坐标被转换到 canvas 坐标空间 |

---

### 阶段三：遍历并累积变换（坐标映射核心）

#### 3.1 Transform 解析

**文件**: `src/mapper/coordinate-mapper.ts` — `parseTransform()`

支持解析以下 transform 命令（可组合）：
- `translate(tx, ty)` — 累积相加
- `scale(sx, sy)` — 累积相乘
- `rotate(deg, cx, cy?)` — 提取角度和旋转中心
- `matrix(...)` — 标记为 `special: true`，不做矩阵计算

#### 3.2 坐标映射

**文件**: `src/mapper/coordinate-mapper.ts` — `mapCoordinates()`

将 SVG 元素的**几何属性**转换为 `left/top/width/height`：

| 元素类型 | 几何属性 | 映射规则 |
| :--- | :--- | :--- |
| `<rect>` | `x, y, width, height` | `left = x * \|sx\| + tx` |
| `<circle>` | `cx, cy, r` | `left = cx - r`, `width = 2*r` |
| `<ellipse>` | `cx, cy, rx, ry` | `left = cx - rx`, `width = 2*rx` |
| `<line>` | `x1, y1, x2, y2` | `left = min(x1,x2)`, `width = \|x2-x1\|` |
| `<path>` | `d`（path 数据） | 从 `d` 属性解析 M/L/H/V/A 命令计算包围盒 |
| `<text>` | `x, y, font-size` | 粗略估计：`width = fontSize * 10` |
| `<image>` | `x, y, width, height` | 同 rect |

**父子 Transform 组合**（`coordinate-mapper.ts:206`）:
```typescript
// 父 transform 先应用，子 transform 后应用
effectiveTransform = composeTransforms(parentTransform, element.attrs.transform)
// composeTransforms 返回 "parentTransform childTransform" 拼接字符串
// parseTransform 累积解析所有命令
```

#### 3.3 变换应用

**文件**: `src/transformer/apply-transform.ts` — `applyTransform()`

| 情况 | 处理方式 |
| :--- | :--- |
| **有旋转中心** (`rotate(deg, cx, cy)`) | 绕中心旋转四个角点，重新计算包围盒，`rotate = 0` | 
| **无旋转中心** | `rotate = rotateDeg`，坐标不变 |
| **负 scale** | `flipH = true`（scaleX<0）或 `flipV = true`（scaleY<0） |

**旋转公式**（绕中心旋转）:
```
px = x - cx, py = y - cy
rx = px*cos(θ) - py*sin(θ)
ry = px*sin(θ) + py*cos(θ)
final_x = rx + cx, final_y = ry + cy
```

---

### 阶段四：元素类型转换（逐元素处理）

**文件**: `src/transformer/transform-to-pptel.ts` — `transformElement()`

#### 4.1 缩放系数

从 SVG viewBox 到目标画布（1000×562.5）的缩放：
```typescript
scaleX = targetCanvas[0] / viewBox[2]   // 1000 / 1280 = 0.78125
scaleY = targetCanvas[1] / viewBox[3]   // 562.5 / 720 = 0.78125
```

#### 4.2 路径类元素

| 元素 | 转换规则 |
| :--- | :--- |
| `<rect>` | `rx>0` 或 `ry>0` → `roundedRectToPath()`，否则 `rectToPath()` |
| `<circle>` | → `circleToPath(cx, cy, r)` |
| `<ellipse>` | → `ellipseToPath(cx, cy, rx, ry)` |
| `<polygon>` | 解析 points，→ `polygonToPath()` |
| `<polyline>` | 解析 points，→ `polylineToPath()`（无 Z 结尾） |
| `<path>` | 调用 `toAbsolutePath()` 将相对命令转绝对，保留 path 数据 |

#### 4.3 文本元素 `<text>`

| 步骤 | 操作 | 文件位置 |
| :--- | :--- | :--- |
| 4.3.1 | 提取 `font-family`, `font-size`, `fill`, `text-anchor` | `transform-to-pptel.ts:1069-1078` |
| 4.3.2 | 构建 HTML content，处理 `baseline-shift`（`super`/`sub` → CSS `vertical-align`） | `transform-to-pptel.ts:410-465` |
| 4.3.3 | 多行检测：有 `x` 属性的 tspan → 换行；无 `x` → 同行（公式/上下标） | `transform-to-pptel.ts:471-483` |
| 4.3.4 | 文本测量：使用 `resvg-js`（`measureTextElement`）获取准确宽高，备选启发式估计 | `transform-to-pptel.ts:1089-1120` |
| 4.3.5 | 提取 tspan 位置：`extractTspansWithPosition()` 计算每个 tspan 的 `left/top` | `transform-to-pptel.ts:497-582` |
| 4.3.6 | 多行文本：每个 tspan → 独立 `PPTTextElement` | `transform-to-pptel.ts:1199-1222` |
| 4.3.7 | 单行文本：单个 `PPTTextElement`，`content` 为 HTML `<p>...</p>` | `transform-to-pptel.ts:1225-1247` |

**文本坐标转换**:
```typescript
// SVG text y 是基线，转换为 top
textTop = transformed.top - fontSize * 0.8 * scaleY
// 0.8 是 ascent 比率（经验值）
```

**tspan 位置计算**（考虑父文本 x 和 scale）:
```typescript
// tspanX 公式
effectiveX = (tspanX - parentX) * scaleX + baseLeft
// dy 累加到 top
currentTop += dy * scaleY
// baseline-shift 像素值也乘以 scaleY
if (/^-?\d+px$/.test(baselineShift)) {
  currentTop -= pixelValue * scaleY
}
```

#### 4.4 线条元素 `<line>`

```typescript
// 有 transform 时：从变换后的坐标反推相对位置
startRelX = (x1t - coords.left) * scaleX
startRelY = (y1t - coords.top) * scaleY
endRelX = (x2t - coords.left) * scaleX
endRelY = (y2t - coords.top) * scaleY

// 无 transform 时：简单相对坐标
startRelX = 0, startRelY = 0
endRelX = width, endRelY = 0
```

#### 4.5 图片元素 `<image>`

```typescript
// 提取 src（兼容 xlink:href 和 href）
src = element.attrs['xlink:href'] || element.attrs.href
// 宽高直接从 coords（已应用 transform 和 scale）
```

---

### 阶段五：背景处理与 JSON 组装

**文件**: `src/index.ts` — `convert()`

#### 5.1 图案背景 PNG 渲染（D-36）

| 步骤 | 操作 |
| :--- | :--- |
| 5.1.1 | 检测 `patternRegistry.size > 0` |
| 5.1.2 | 查找背景组 `<g id="bg-texture">` |
| 5.1.3 | 序列化为独立 SVG 字符串（含 `<defs>` 和 `<rect>`） |
| 5.1.4 | 调用 `renderSvgToPng()` 渲染为 base64 PNG |
| 5.1.5 | 过滤掉背景组元素（`groupId` 含 `bg`/`background`） |

#### 5.2 背景推断

```typescript
// inferBackground() — 检查第一个元素是否为满画布矩形
if (first.type === 'shape' && 
    first.left === 0 && first.top === 0 &&
    first.width === canvasWidth && first.height === canvasHeight) {
  // 背景矩形 → 提取 fill 或 gradient
  if (first.gradient) return { type: 'gradient', gradient: first.gradient }
  if (first.fill) return { type: 'solid', color: first.fill }
}
```

#### 5.3 组装 PPTist JSON

```typescript
// 最终输出结构
{
  title: '未命名演示文稿',
  width: 1000,
  height: 562.5,
  theme: { themeColors: [...], ... },
  slides: [{
    id: uuidv4(),
    elements: [PPTElement, ...],
    background?: { type: 'solid'|'gradient'|'image', ... }
  }]
}
```

---

## 元素类型映射表

| SVG 元素 | PPTist 类型 | 输出字段 |
| :--- | :--- | :--- |
| `<rect>` | `PPTShapeElement` | `path`, `viewBox`, `fill`/`gradient`, `outline` |
| `<circle>` | `PPTShapeElement` | `path`, `viewBox`, `fill`/`gradient`, `outline` |
| `<ellipse>` | `PPTShapeElement` | `path`, `viewBox`, `fill`/`gradient`, `outline` |
| `<path>` | `PPTShapeElement` | `path`, `viewBox`, `fill`/`gradient`, `outline` |
| `<polygon>` | `PPTShapeElement` | `path`, `viewBox`, `fill`/`gradient`, `outline` |
| `<polyline>` | `PPTShapeElement` | `path`, `viewBox`, `fill: 'none'`, `outline` |
| `<line>` | `PPTLineElement` | `start`, `end`, `style`, `color`, `width` |
| `<text>` + `<tspan>` | `PPTTextElement` | `content`（HTML）, `defaultFontSize`, `left/top/width/height` |
| `<image>` | `PPTImageElement` | `src`, `left/top/width/height`, `fixedRatio: true` |
| `<g>` | — | 不输出，`groupId` 向下传递 |
| `<defs>`/`<linearGradient>`/`<filter>` | — | 解析时处理，不输出 |

---

## 关键设计决策

| 决策编号 | 内容 | 说明 |
| :--- | :--- | :--- |
| D-01 | 绕中心旋转 | 坐标预变换，`rotate = 0` | `apply-transform.ts:81-95` |
| D-03/D-04 | 负 scale = 翻转 | `scaleX < 0` → `flipH`, `scaleY < 0` → `flipV` | `apply-transform.ts:45-50` |
| D-08 | viewBox 1:1 映射 | SVG viewBox 坐标直接映射到 PPTElement left/top/width/height | `coordinate-mapper.ts:196` |
| D-15 | 渐变解析时解析 | `fill="url(#gradientId)"` 在 `parseSvg` 时转为 `attrs.gradient` | `svg-parser.ts:263-313` |
| D-22 | 滤镜解析时解析 | `filter="url(#shadowId)"` 在 `parseSvg` 时转为 `attrs.shadow` | `svg-parser.ts:398-430` |
| D-26 | ellipse 坐标缩放 | `cx/cy/rx/ry` 分别用 `scaleX/scaleY` 缩放，旋转中心也缩放 | `transform-to-pptel.ts:749-766` |
| D-36 | 图案转 PNG | pattern fill 在转换时渲染为 base64 PNG 而非保留 pattern 引用 | `index.ts:80-126` |
| D-37 | 线条最小尺寸 | 无填充的 path（stroke-only），若宽/高为 0，用 `stroke-width` 替代 | `transform-to-pptel.ts:883-889` |

---

## 坐标空间转换总结

```
SVG 原始坐标
    │
    │ parseTransform() — 解析 transform 属性
    ▼
SVG 坐标 + Transform
    │
    │ mapCoordinates() — 应用 transform 到几何属性
    ▼
Canvas 空间坐标（SVG viewBox 尺寸，如 1280×720）
    │
    │ scaleX = 1000/1280, scaleY = 562.5/720
    ▼
目标 Canvas 坐标（1000×562.5）
```
