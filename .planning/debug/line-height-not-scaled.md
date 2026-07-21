# Line 高度未缩放问题

## 问题描述

在 `src/transformer/transform-to-pptel.ts` 的 line case "无 transform" 分支中，line 元素的 `startRel`/`endRel` 计算没有应用 `scaleX`/`scaleY` 缩放。

## 问题位置

`src/transformer/transform-to-pptel.ts` 第 1219-1222 行

## 问题代码（修复前）

```typescript
startRelX = x1 - coords.left
startRelY = y1 - coords.top
endRelX = x2 - coords.left
endRelY = y2 - coords.top
```

## 修复后代码

```typescript
startRelX = (x1 - coords.left) * scaleX
startRelY = (y1 - coords.top) * scaleY
endRelX = (x2 - coords.left) * scaleX
endRelY = (y2 - coords.top) * scaleY
```

## 影响

当 SVG 中 line 元素没有 transform 属性时，其坐标计算未应用 scaleX/scaleY 缩放因子，导致输出的 PPTLineElement 的 start/end 坐标不正确。

## 验证方法

重新转换 `exampels/ppt169_attention_is_all_you_need/svg_output/15_ablations.svg`，确认 line 的 end 坐标已缩放。修复后 line track 的 end 应该是 [0, 381.25] 而不是 [0, 488]。

## 修复日期

2026-07-21