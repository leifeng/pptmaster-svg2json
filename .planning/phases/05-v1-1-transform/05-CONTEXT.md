# Phase 5: v1.1 Transform 遗留修复 - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

## Phase Boundary

完成 v1.1 未解决的 transform 问题：rotate 中心点、ellipse cx/cy 变换、text baseline ratio。

**Requirements:** REQ-TF-01, REQ-TF-02, REQ-TF-03

## Implementation Decisions

### REQ-TF-01: rotate(deg, cx, cy) 旋转中心

- **D-26:** Ellipse 的 cx/cy（椭圆中心点）需要单独应用旋转变换
  - 公式：`rotatedCxCy = applyRotateWithCenter(cx, cy, rotateDeg, rotateCX, rotateCY)`
  - rx/ry（半径）不参与旋转变换，只做比例缩放：`rx *= |scaleX|`，`ry *= |scaleY|`
  - ellipse path 用变换后的 rotatedCxCy 作为椭圆中心

- **D-01（继承）:** `rotate(deg, cx, cy)` → translate→rotate→translate-back 预计算坐标
  - applyTransform 的 applyRotateWithCenter 已正确处理 bounding box（left/top/width/height）
  - 但 ellipse cx/cy 未经过旋转变换 — 这是遗漏

### REQ-TF-02: Ellipse cx/cy 比例缩放

- **D-27:** Ellipse cx/cy 变换后比例映射
  - transform 后 ellipse 的 bounding box（transformed.left/top/width/height）已知
  - 变换后的椭圆中心计算：`transformedCx = transformed.left + (originalCx - svgOrgX) * scaleX`
  - rx/ry 按比例缩放：`rx *= scaleX`，`ry *= scaleY`
  - 当有 rotate-with-center 时，先计算旋转变换后的外接矩形，再用外接矩形推导新 cx/ry

### REQ-TF-03: Text baseline ratio

- **D-28:** `BASELINE_OFFSET_RATIO = 0.8`
  - SVG ascent ≈ font_size × 0.8（工程常用近似值，比 0.75 更准确）
  - 公式：`top_html = y_svg - fontSize * 0.8`
  - 定义为模块级常量：`const BASELINE_OFFSET_RATIO = 0.8`
  - 变换后：`textTop = (transformed.top + fontSize * BASELINE_OFFSET_RATIO) * scaleY`

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Source Files
- `src/transformer/apply-transform.ts:13-31` — applyRotateWithCenter 实现
- `src/transformer/apply-transform.ts:58-105` — applyTransform 主逻辑
- `src/transformer/transform-to-pptel.ts:439-470` — ellipse case（需修复 cx/cy）
- `src/transformer/transform-to-pptel.ts:705-713` — text case（需改 0.75 → 0.8）
- `src/shapes/shape-to-path.ts:38` — ellipseToPath 函数

### Prior Phase Decisions
- `.planning/phases/01-transform-system/01-CONTEXT.md` — D-01, D-02, D-05（rotate 变换决策）

### SVG Text Coordinate Rules
- `y_svg` = 基线（baseline）；`top_html = y_svg - ascent`
- `ascent ≈ font_size × 0.8`（通用近似）
- `transform="scale(s)"` 时：`font_size *= s`，坐标同步缩放

## Existing Code Insights

### Reusable Assets
- `applyRotateWithCenter(x, y, deg, cx, cy)` — 已实现，直接复用
- `ellipseToPath(cx, cy, rx, ry)` — 生成椭圆 SVG path，可直接使用变换后的中心点

### Established Patterns
- applyTransform 返回 `{ left, top, width, height, rotate, flipH, flipV }`
- 当 `rotateCX !== undefined && rotateCY !== undefined` 时，`rotate = 0`（坐标已预变换）
- 变换顺序：translate → rotate → scale（SVG 规范顺序）

### Integration Points
- transform-to-pptel.ts ellipse case：cx/cy 需改用变换后的值，rx/ry 需缩放
- transform-to-pptel.ts text case：需引用 BASELINE_OFFSET_RATIO 常量替代硬编码 0.75

## Deferred Ideas

None — all issues are within Phase 5 scope.
