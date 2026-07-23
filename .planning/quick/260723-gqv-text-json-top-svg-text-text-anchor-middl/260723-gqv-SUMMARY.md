---
quick_id: 260723-gqv
description: 给 text 转 json 后的 top 加一个逻辑：如果 svg 中 text 的 text-anchor="middle" 就需要转 json 的 top 值加一个常量（默认 -5）
status: complete
commit: d91da53
date: 2026-07-23
---

# Quick Task Summary: text-anchor="middle" 时 top 偏移补偿

## 目标

SVG `<text text-anchor="middle">` 转 PPTElement 时，结果 top 视觉位置偏下，需要一个常量补偿来修正对齐。

## 实施

### 1. 添加常量与偏移逻辑（`src/transformer/transform-to-pptel.ts`）

在 `case 'text':` 内、`try` 块前新增模块级常量：

```typescript
const TEXT_ANCHOR_MIDDLE_TOP_OFFSET = -5
```

在 `try/catch` 块后、`textAnchorForLeft` 处理前新增：

```typescript
if (element.attrs['text-anchor'] === 'middle') {
  textTop += TEXT_ANCHOR_MIDDLE_TOP_OFFSET
}
```

### 2. 新增测试（`__tests__/text-anchor.test.ts`）

3 个新用例覆盖：
- `text-anchor="middle"` 时 top 比基线小 5
- `text-anchor="start"` 不应用偏移
- `text-anchor="end"` 不应用偏移

## 验证

- TypeScript 编译通过（`npx tsc --noEmit` 无错误）
- `__tests__/text-anchor.test.ts` 7/7 通过（原 4 + 新 3）
- 完整 vitest 套件中 text/tspan 相关测试全部通过
- shape-rx 等 4 个预存在失败与本次修改无关

## 影响范围

- 单行文本：直接修改 `result.top`
- 多行文本：`textTop` 作为 `extractTspansWithPosition` 的 baseTop 传入，每个 tspan 的 top 都基于 baseTop，偏移自动传播到每行
- 不影响 `start`/`end`/无 text-anchor 的文本 top 值

## 提交

- `d91da53` feat(text): text-anchor=middle 时对 top 加 -5 补偿
- 文件：src/transformer/transform-to-pptel.ts (+9, -1), __tests__/text-anchor.test.ts (+33, -1)