---
name: path-header-coord-bug
description: path元素坐标转换错误 - encoder卡片标题栏path转换后位置不对
metadata:
  type: bug
  severity: high
  file: exampels/ppt169_attention_is_all_you_need/svg_output/06_encoder_decoder.svg
  element: path#cdd67816 (card-encoder header)
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: unknown
---

## 症状

SVG中card-encoder组的header path元素：

```svg
<path d="M 94 160 h 527 a 14 14 0 0 1 14 14 v 90 h -555 v -90 a 14 14 0 0 1 14 -14 Z" fill="#1A365D"/>
```

转换后JSON:
- left: 62.5, top: 125
- width: 433.59375, height: 81.25
- viewBox: [555, 104]
- path: "M94,160H621A14,14,0,0,1,635,174V264H80V174A14,14,0,0,1,94,160Z"

## 期望值

SVG viewBox: 0 0 1280 720
假设canvas为960x540, scaleX = 960/1280 = 0.75

原始path坐标: x=94, y=160, width=527, height=104 (从path d计算)
期望canvas坐标: left=70.5, top=120, width=395.25, height=78

实际canvas坐标: left=62.5, top=125, width=433.59375, height=81.25

## 对比: 同组内rect元素

card-encoder rect (SVG):

```svg
<rect x="80" y="160" width="555" height="500" rx="14" .../>
```

转换后JSON:
- left: 62.5, top: 125
- width: 433.59375, height: 390.625

两个元素的left/top完全相同，但SVG中rect在x=80，path在x=94。

## 关键发现

1. 两个元素的left=62.5, top=125相同，但SVG x坐标不同（80 vs 94）
2. path的viewBox [555, 104] 正确（等于原始path包围框）
3. 但width=433.59375 与 viewBox[0]=555 不匹配
   - 433.59375 / 555 ≈ 0.781... 不是常规的0.75
4. rect的width=433.59375 与 rect SVG width=555 / 0.75(理论比例) = 416.25 不符

## 根因分析

### 发现的问题

**path 元素的坐标计算使用了几何边界框的最小值，而不是路径的实际起始位置。**

对于路径 `d="M 94 160 h 527 a 14 14 0 0 1 14 14 v 90 h -555 v -90 a 14 14 0 0 1 14 -14 Z"`:
- 路径**实际开始绘制**的位置是 (94, 160) - 第一个 M 命令的位置
- 但几何边界框的 minX = 80（因为顶部左侧圆弧延伸到 x=80）

当前 `pathBoundingBox()` 函数返回的是几何边界框 [80, 160, 555, 104]，导致：
- path 的 left = 80 * 0.78125 = 62.5
- 路径实际应该从 x=94 开始，left 应该 = 94 * 0.78125 = 73.4

### 正确的计算

SVG viewBox: 0 0 1280 720
targetCanvas: [1000, 562.5] (默认)
scaleX = 1000/1280 = 0.78125

| 元素 | SVG x | 期望 left | 实际 left | 差异 |
|------|-------|-----------|-----------|------|
| rect | 80 | 62.5 | 62.5 | ✓ |
| path | 94 | 73.4 | 62.5 | ✗ 差14px |

path 和 rect 在 JSON 中 left 都是 62.5，但 SVG 中 rect 在 x=80，path 从 x=94 开始（差14px inset）。

### 问题代码位置

`src/mapper/coordinate-mapper.ts` 中的 `pathBoundingBox` 函数和 `mapCoordinates` 的 path 处理：

```typescript
// coordinate-mapper.ts:385-390
case 'path': {
  const d = typeof attrs.d === 'string' ? attrs.d : ''
  const bbox = pathBoundingBox(d)
  if (bbox) {
    left = bbox.left * Math.abs(sx) + tx  // 使用 minX=80，应该是 startX=94
    top = bbox.top * Math.abs(sy) + ty
    width = bbox.width  // NO groupScale applied here
    height = bbox.height  // NO groupScale applied here
  }
  break
}
```

`pathBoundingBox` 函数返回几何边界框，包含所有访问过的点（包括圆弧返回的部分），但没有返回路径的起始绘制位置。

### 解决方案

需要修改 `pathBoundingBox` 来追踪路径的起始位置（第一个 M 命令的位置），并让 `mapCoordinates` 中的 path 处理使用起始位置而不是 minX。

或者在 `mapCoordinates` 的 path case 中，添加逻辑来检测并使用 M 命令的起始坐标。

### 验证

path 起始位置 x=94:
- 期望 left = 94 * 0.78125 = 73.4375
- 实际 left = 62.5
- 差异 = 73.4375 - 62.5 = 10.9375 ≈ 14 * 0.78125 ✓

这证实了差异正好是 14px 的圆弧半径乘以 scale。
