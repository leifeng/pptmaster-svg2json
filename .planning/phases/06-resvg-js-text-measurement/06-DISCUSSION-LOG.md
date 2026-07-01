# Phase 6: resvg-js Text Measurement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-01
**Phase:** 6-resvg-js-text-measurement
**Areas discussed:** 批量化 vs 逐个测量, 测量失败时的错误处理, Tspan扁平化策略, ViewBox溢出处理

---

## 批量化 vs 逐个测量

| Option | Description | Selected |
|--------|-------------|----------|
| 逐个测量（推荐） | 每个<text>元素单独渲染，简单直接，开销可接受。当前研究建议：50个以下元素时逐个测量足够 | ✓ |
| 考虑批量优化 | 先实现逐个测量，但预留批量接口，适用于SVG包含50+文本元素的高频场景 | |

**User's choice:** 逐个测量（推荐）
**Notes:** 无并行，完全串行 await

---

## 测量失败时的错误处理

| Option | Description | Selected |
|--------|-------------|----------|
| 回退到启发式估算（推荐） | 测量失败时使用 calcTextWidthYaHei() 的启发式方法，保证SVG始终能转换，不因测量问题中断 | ✓ |
| 抛出错误让转换失败 | 测量失败时抛出错误，整个SVG转换失败，明确告知用户问题所在 | |
| 返回零宽高 + 警告日志 | 测量失败时返回width=0, height=0，打印警告日志，转换继续但不保证文本显示正确 | |

**User's choice:** 回退到启发式估算（推荐）

---

## Tspan扁平化策略

| Option | Description | Selected |
|--------|-------------|----------|
| 忽略位置，只测内容（推荐） | 将tspan内容用\n连接后作为单行文本测量，位置信息在transformElement中单独处理 | ✓ |
| 包含位置，计算总边界框 | 考虑每个tspan的x偏移，计算包含所有位置的最小边界框，更准确但实现更复杂 | |

**User's choice:** 忽略位置，只测内容
**Notes:** 用户确认：\n链接只用于测量阶段，输出的JSON content字段仍保持`<p>`标签HTML结构

---

## ViewBox溢出处理

| Option | Description | Selected |
|--------|-------------|----------|
| 保守大初始尺寸（推荐） | 用 fontSize * 20 宽度和 fontSize * 4 高度作为初始尺寸足够覆盖绝大多数文本，减少重新渲染 | |
| 先渲染，发现溢出再重新测量 | 先用小尺寸渲染，如果边界框溢出viewBox则重新渲染，更精确但可能多次调用resvg-js | |
| 无脑超大尺寸 | 用固定超大尺寸（如5000x1000）确保不溢出，简单但可能影响测量精度 | |
| 使用1280x720固定尺寸测量 | 直接使用1280×720固定尺寸测量 | ✓ |

**User's choice:** 使用1280x720固定尺寸测量

---

## Claude's Discretion

- 测量函数的错误捕获细节（try/catch 范围、错误类型过滤）
- 临时 SVG 的 width/height 属性值（与 viewBox 保持一致即可）

## Deferred Ideas

无