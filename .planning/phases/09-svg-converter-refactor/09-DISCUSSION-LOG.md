# Phase 09: svg-converter-refactor - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 09-svg-converter-refactor
**Areas discussed:** 变换传递方式, clipPath 展开方式, 路径工具归并

---

## 变换传递方式

| Option | Description | Selected |
|--------|-------------|----------|
| 维持 AST 修改（当前实现） | child.attrs.transform = effectiveTransform，简单直接。AST 在转换后无用，污染可接受。 | ✓ |
| 改为参数传递 | mapCoordinates(parentTransform) 接收父级变换，child.attrs.transform 保持不变。需改 mapCoordinates 签名。 | |

**User's choice:** 维持 AST 修改（当前实现）
**Notes:** 转换器场景 AST 无复用价值，直接修改简单有效。

---

## clipPath 展开方式

| Option | Description | Selected |
|--------|-------------|----------|
| 内联展开 | 在 walk() 遇到 clipPath 时，展开其引用的子元素并应用坐标缩放。当前 skip 的 clippath 元素会被替换为展开后的内容。 | |
| 预处理模式（推荐） | 在 transformToPPTElement 调用前，对 AST 做一次 clipPath/mask 预处理。改动更大但更干净。 | ✓ |

**User's choice:** 预处理模式
**Notes:** clipPath/mask 的展开在转换前完成，转换流程更干净。

---

## 路径工具归并

| Option | Description | Selected |
|--------|-------------|----------|
| 移到 svg-parser.ts | 移除 transform-to-pptel.ts 中的重复，仅保留 svg-parser.ts 的版本供两处调用。 | |
| 独立 path-utils.ts（计划中） | 按 REF-05 创建 src/utils/path-utils.ts，两处都 import 新模块。需要确保支持所有命令（M/L/H/V/A/C/Q/S/T/Z）。 | ✓ |

**User's choice:** 独立 path-utils.ts（计划中）
**Notes:** REF-05 已规划，创建统一模块是正确方向。

---

## Claude's Discretion

S/s、T/t 反射计算的具体实现细节由 researcher/planner 决定。
baseline-shift 绝对值缩放的具体判断逻辑（px vs 百分比）由 researcher 调研确定。

## Deferred Ideas

无
