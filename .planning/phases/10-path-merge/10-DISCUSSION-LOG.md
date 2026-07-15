# Phase 10: Path Merge — 决策树与合并引擎 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-13
**Phase:** 10-Path Merge — 决策树与合并引擎
**Areas discussed:** G1-决策树位置, G2-包围盒计算, G3-d属性拼接, G4-evenodd处理

---

## G1: 决策树实现位置

| Option | Description | Selected |
|--------|-------------|----------|
| A. walk() 中拦截 | 在 walk() 处理 <g> 时检测全 path 子元素，调用决策树，返回合并元素 | |
| B. 独立模块 | 新建 src/merger/path-merge.ts，决策树逻辑独立，walk() 调用它 | ✓ |

**User's choice:** B. 独立模块
**Notes:** 决策树逻辑独立，不污染 walk() 函数

---

## G2: 包围盒计算

| Option | Description | Selected |
|--------|-------------|----------|
| A. 解析 path 命令 | 扩展 path-utils.ts，解析 M/L/H/V/A/C/Q/S/T/Z 计算外包矩形（曲线近似） | ✓ |
| B. resvg 渲染 | 用 @resvg/resvg-js 渲染每个 path 取像素边界（更准确，但 heavier） | |

**User's choice:** A. 解析 path 命令
**Notes:** 扩展 path-utils.ts，解析 path 命令计算外包矩形

---

## G3: d 属性拼接策略

| Option | Description | Selected |
|--------|-------------|----------|
| A. 简单空格连接 | d1 + " " + d2，保持相对坐标，依赖 SVG 多子路径语义 | |
| B. 绝对坐标归一化 | 每个 d 先 toAbsolutePath() 再连接，避免状态混淆 | ✓ |

**User's choice:** B. 绝对坐标归一化
**Notes:** 每个 d 先 toAbsolutePath() 再用空格连接

---

## G4: evenodd 谨慎合并

| Option | Description | Selected |
|--------|-------------|----------|
| A. 跳过合并 | 检测到任何 evenodd path，直接不合并（安全保守） | ✓ |
| B. 标记风险后合并 | 记录警告日志，输出仍合并，但可能与原始视觉不符 | |

**User's choice:** A. 跳过合并
**Notes:** evenodd 镂空效果依赖 path 绘制顺序和嵌套关系，合并后会改变视觉

---

## Claude's Discretion

无 — 所有决策均由用户明确选择

## Deferred Ideas

无 — 所有讨论均在 Phase 10 范围内
