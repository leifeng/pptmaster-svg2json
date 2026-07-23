---
quick_id: 260723-gqv
slug: text-json-top-svg-text-text-anchor-middl
description: 给 text 转 json 后的 top 加一个逻辑：如果 svg 中 text 的 text-anchor="middle" 就需要转 json 的 top 值加一个常量（默认 -5）
status: complete
---

# Quick Task: text-anchor="middle" 时 top 偏移补偿

## 目标

在 SVG `<text text-anchor="middle">` 转 PPTElement 时，对结果 `top` 加一个常量补偿（默认 -5 画布像素），
解决 middle 对齐文本视觉位置偏下的对齐问题。

## 实施

### 任务 1：添加常量并应用偏移

**文件：** `src/transformer/transform-to-pptel.ts`

**位置：** `case 'text':` 分支内，`try { ... } catch { ... }` 之后、`textAnchorForLeft` 处理之前

**改动：**

1. 在 `text-measurer` 调用附近添加模块级常量：

```typescript
/**
 * 当 SVG <text text-anchor="middle"> 时，对转换后的 PPTElement.top 加一个常量补偿，
 * 解决 middle 对齐文本视觉位置偏下的对齐问题。单位：画布像素。
 */
const TEXT_ANCHOR_MIDDLE_TOP_OFFSET = -5
```

2. 在 `textTop` 计算完成后（try/catch 块后）添加偏移：

```typescript
// 当 text-anchor="middle" 时，对 top 加常量补偿以修正视觉对齐
// 默认偏移 -5 画布像素（可通过 TEXT_ANCHOR_MIDDLE_TOP_OFFSET 调整）
if (element.attrs['text-anchor'] === 'middle') {
  textTop += TEXT_ANCHOR_MIDDLE_TOP_OFFSET
}
```

### 任务 2：添加测试用例

**文件：** `__tests__/text-anchor.test.ts`

**新增用例：** 验证 `text-anchor="middle"` 时 `result.top` 等于基线 `top - 5`（即 `TEXT_ANCHOR_MIDDLE_TOP_OFFSET`）。

## 验证

- 跑 `npm run build` 确保 TypeScript 编译通过
- 跑 `npx vitest run __tests__/text-anchor.test.ts` 确保新用例通过
- 跑 `npx vitest run` 确保没有回归

## 影响范围

- 单行文本（`case 'text'` 的单行分支）：`result.top` 直接受影响
- 多行文本（multiline 分支）：`textTop` 作为 `extractTspansWithPosition` 的 `baseTop` 传入，每个 tspan 的 top 都会基于 baseTop 计算，所以偏移会正确传播到每行
- 不影响 `text-anchor` 为 `start`/`end`/缺失时的 top 值

## 备注

- 常量位置放在 `text-measurer` 安全边距常量（`TEXT_WIDTH_SAFETY_MARGIN = 25`）附近，保持一致风格
- 默认 -5 是用户指定的初始值，后续如需可调整或改成函数参数