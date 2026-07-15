# Phase 5: v1.1 Transform 遗留修复 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 05-v1.1 Transform 遗留修复
**Areas discussed:** Ellipse cx/cy 变换方式, Text baseline ratio 确认, SVG text 坐标规则

---

## Ellipse cx/cy 变换方式

| Option | Description | Selected |
|--------|-------------|----------|
| 方案A — 比例映射 | transformed_cx = transformed.left + original_cx * scaleX；rx/ry 也按比例缩放。简单直接，符合 SVG scale 语义 | ✓ |
| 方案B — 旋转变换 | 把 cx/cy 当成绝对点做完整旋转变换，需要新增 transformPoint 工具函数 | |
| 方案C — 射线法 | 取椭圆4个端点旋转变换，计算新外接矩形。更数学化但实现成本高 | |

**User's choice:** 方案A — 比例映射
**Notes:** 用户提供了明确的 SVG→HTML 坐标转换规则列表，确认了 ellipse cx/cy 应按比例映射

---

## Text baseline ratio 确认

| Option | Description | Selected |
|--------|-------------|----------|
| 硬编码 0.75 | 不改 | |
| 导出为常量 BASELINE_OFFSET_RATIO = 0.75 | 在 transform-to-pptel.ts 顶部定义常量 | |
| 通过参数传入（函数式） | 过度工程化 | |

**User's choice:** 用户提供了完整的 SVG text 坐标规则文档，确认 ascent ≈ font_size × 0.8，而非 0.75
**Notes:** 用户提供了权威的 SVG→HTML 坐标转换规则：ascent ≈ font_size × 0.8，top_html = y_svg - ascent。最终决策：BASELINE_OFFSET_RATIO = 0.8（而非 0.75）

---

## SVG text 坐标规则（用户提供参考文档）

用户提供了清晰可用的 "SVG `<text>` → HTML 坐标转换规则列表"，关键点：
- ascent ≈ font_size × 0.8（而非 0.75）
- top_html = y_svg - ascent
- transform="scale(s)" 时：font_size *= s，坐标同步缩放
- text-anchor 处理水平对齐（已在 Phase 2 实现）

**User's choice:** 参考文档已提供，直接采用
**Notes:** 该文档作为 canonical reference 存入 05-CONTEXT.md

---

## Claude's Discretion

- Ellipse cx/cy 的 rotate-with-center 问题和 ellipse 未经过 applyTransform 坐标变换的问题，由代码分析直接确认，无需用户讨论

## Deferred Ideas

None
