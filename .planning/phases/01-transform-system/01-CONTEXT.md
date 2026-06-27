# Phase 1: Transform 系统重构 - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

## Phase Boundary

Transform 系统重构：完整解析 SVG `transform` 属性（translate/rotate/scale），正确应用坐标变换，并映射到 PPTist 的 `rotate`/`flipH`/`flipV` 字段。

**Requirements:** TRANS-01, TRANS-02, TRANS-03

## Implementation Decisions

### Transform 旋转处理

- **D-01:** `rotate(deg, cx, cy)` 有明确旋转中心 → 坐标预变换方案
  - 计算元素 bounding box 中心 (centerX, centerY)
  - 应用 translate→rotate→translate-back 公式预计算变换后坐标
  - `left/top` 更新为变换后坐标，`rotate` 字段置 0
  - 数学公式：
    ```
    px = x - cx, py = y - cy
    rx = px*cos(θ) - py*sin(θ)
    ry = px*sin(θ) + py*cos(θ)
    final_x = rx + cx, final_y = ry + cy
    ```

- **D-02:** `rotate(deg)` 无旋转中心 → SVG 默认绕 (0,0)，但 PPTist `rotate` 绕元素中心
  - 坐标先平移到 (0,0) 旋转，再平移回
  - `rotate` 字段设为 `rotateDeg`

- **D-03:** `scale(-1, 1)` → `flipH: true`
- **D-04:** `scale(1, -1)` → `flipV: true`

### Transform 变换顺序

- **D-05:** 变换应用顺序严格遵循 SVG 规范：translate → rotate → scale
  - 代码实现需按此顺序在 mapCoordinates 中逐步应用

### Matrix Transform

- **D-06:** `matrix(...)` 检测到后标记 `special: true`，当前版本不支持矩阵分解
  - 后续 Phase 可考虑支持（已记录在 v2 requirements）

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Source Files
- `src/mapper/coordinate-mapper.ts` — parseTransform 和 mapCoordinates 实现位置
- `src/types/ast.ts` — TransformResult 接口定义
- `src/transformer/transform-to-pptel.ts` — transformElement 函数，输出 PPTElement
- `src/slides.ts` — PPTElement 类型定义（PPTist schema）

### Requirements
- `.planning/REQUIREMENTS.md` § Transform (TRANS-01~03)

## Existing Code Insights

### Reusable Assets
- `parseTransform()` in `src/mapper/coordinate-mapper.ts:33-66` — 已实现 translate/scale/rotate 解析
- `mapCoordinates()` in `src/mapper/coordinate-mapper.ts:113-217` — 坐标映射入口

### Established Patterns
- TransformResult 接口（ast.ts）已有 `rotateDeg`/`rotateCX`/`rotateCY` 字段
- `transformElement` 硬编码 `rotate: 0` — 需要改为使用解析出的 rotate 值

### Integration Points
- `coordinate-mapper.ts` 的 `mapCoordinates` → 输出 CoordinateMapping 供 `transformElement` 使用
- `transformElement` 需要接收额外的 transform 信息（rotateDeg）来设置 PPTElement.rotate

## Specific Ideas

- 用户提供的参考实现（idea.md 中的 `applyTransform` 函数）展示了正确的变换顺序逻辑
- 现有测试文件可用于验证 transform 行为

## Deferred Ideas

### SVG 示例观察
- exampels/ 目录中的 12 个 SVG **均未使用 transform 属性**
- Phase 1 实现后需使用测试用例验证正确性

### Matrix Transform
- Matrix transform 分解已记录为 v2 requirement
- 暂不实现

---

*Phase: 1-Transform 系统重构*
*Context gathered: 2026-06-27*
