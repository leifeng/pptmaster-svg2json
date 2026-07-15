# Phase 09: svg-converter-refactor - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

<domain>
## Phase Boundary

重构 SVG 转换器核心逻辑，修复嵌套变换（REF-01）、S/s·T/t 路径命令反射计算（REF-02）、clipPath 裁剪（REF-03）、baseline-shift 绝对值缩放（REF-04），并提取 path-utils.ts 消除代码重复（REF-05）。
</domain>

<decisions>
## Implementation Decisions

### 变换传递方式（REF-01）
- **D-01:** 维持 `walk()` 中 AST 直接修改 — `child.attrs.transform = effectiveTransform`。简单直接，AST 在转换后无用，污染可接受。

### clipPath 展开方式（REF-03）
- **D-02:** 采用预处理模式 — 在 `transformToPPTElement` 调用前对 AST 做一次 clipPath/mask 预处理。需在 transform 前完成 AST 展开。

### 路径工具归并（REF-05）
- **D-03:** 创建 `src/utils/path-utils.ts` — 统一 `scalePathCoords` 和 `toAbsolutePath`，支持全部命令（M/L/H/V/A/C/Q/S/T/Z）。两处都 import 新模块。

### 嵌套变换实现细节
- **D-04:** 父级 `<g>` 的 transform 累加通过 `composeTransforms(parentTransform, childTransform)` 实现，结果回写到 `child.attrs.transform`。

### S/s、T/t 反射计算
- **D-05:** `toAbsolutePath` 中 S 命令需用前一个控制点（关于当前点）反射计算第二个控制点；T 命令类似。反射公式：`rx = 2*curX - prevCtrlX`，`ry = 2*curY - prevCtrlY`。

### baseline-shift 绝对值缩放
- **D-06:** `baseline-shift="-5px"` 类的像素值需乘以 `scaleY` 转换为 canvas 坐标（5px → 3.90625）。相对值（百分比）不变。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Transform System
- `src/mapper/coordinate-mapper.ts` — `mapCoordinates` 函数，当前只处理元素自身 transform
- `src/transformer/transform-to-pptel.ts` — `toAbsolutePath`（含 S/s、T/t），`scalePathCoords`，`walk` 函数
- `src/parser/svg-parser.ts` — 另一份 `scalePathCoords`（需移除）

### Coordinate System
- `src/transformer/apply-transform.ts` — `applyTransform`、`applyRotateWithCenter`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shapes/shape-to-path.ts` — `rectToPath`、`circleToPath` 等已有路径生成函数
- `parseTransform`（coordinate-mapper.ts）— 已有的 transform 解析逻辑

### Established Patterns
- AST 直接转换，无封装层
- 1000×562.5 固定 canvas
- resvg-js text measurement 已集成

### Integration Points
- `transform-to-pptel.ts` 的 `walk()` 是嵌套处理入口
- `mapCoordinates` 是坐标计算核心

</code_context>

<specifics>
## Specific Ideas

- clipPath 预处理在 `transformElement` 调用前执行，AST 被修改后直接进入现有转换流程
- `scalePathCoords` 命令支持需完整：M/L/H/V/A/C/Q/S/T/Z（当前 svg-parser 版本不支持 C/Q/S/T）
- `toAbsolutePath` 已有 S/s、T/t 的基础结构，但反射计算有误（REF-02 核心问题）

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-svg-converter-refactor*
*Context gathered: 2026-07-13*
