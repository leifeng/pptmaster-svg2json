# Phase 10: Path Merge — 决策树与合并引擎 - Context

**Gathered:** 2026-07-13
**Status:** Ready for planning

## Phase Boundary

实现 `<g>` 内全 `<path>` 子元素的合并决策逻辑，减少输出元素数量。当 `<g>` 的子元素全部为 `<path>` 时，按决策树判断是否合并。

**Requirements:** PATH-MERGE-01, PATH-MERGE-02, PATH-MERGE-03, PATH-MERGE-04, PATH-MERGE-05

**Success Criteria:**
1. 决策树正确判断 path 是否可合并（共享样式 → 无独立语义 → fill="none"/无重叠 → 无 evenodd）
2. 公共样式属性从多个 path 中正确提取并合并
3. 包围盒重叠检测对 fill!="none" 的 path 正确工作
4. fill-rule="evenodd" 的 path 正确标记为谨慎合并
5. 合并后的 path 输出到 PPTElement 时坐标和样式正确

## Implementation Decisions

### PATH-MERGE-01: 决策树实现位置

- **D-29:** 独立模块 `src/merger/path-merge.ts`
  - 决策树逻辑独立，不污染 walk() 函数
  - walk() 检测到 `<g>` 全为 path 子元素时，调用 path-merge 模块
  - 模块导出 `shouldMerge()` 判断是否合并，`mergePaths()` 执行合并
  - 决策树步骤：共享样式 → 无独立语义/交互/可访问性需求 → fill="none"/无重叠 → 无 evenodd

### PATH-MERGE-02: 公共样式属性提取

- **D-30:** 遍历 `<g>` 内所有 path 的样式属性（fill, stroke, stroke-width, opacity, fill-rule 等）
  - 提取所有 path 共有的属性值作为合并后的公共样式
  - 不一致的属性值不合并（每个 path 保持独立属性）

### PATH-MERGE-03: 包围盒重叠检测

- **D-31:** 解析 path 命令计算包围盒
  - 扩展 `src/utils/path-utils.ts`，解析 M/L/H/V/A/C/Q/S/T/Z 命令
  - 对 A（椭圆弧）命令，根据 rx/ry 和端点计算外包矩形
  - 对 C/Q（曲线路径），使用控制点外包矩形近似
  - 检测包围盒是否有重叠区域，fill="none" 的 path 默认无重叠

### PATH-MERGE-04: fill-rule="evenodd" 处理

- **D-32:** 检测到任何 evenodd path，直接跳过合并
  - 不合并，保持原样输出
  - evenodd 镂空效果依赖 path 绘制顺序和嵌套关系，合并后会改变视觉

### PATH-MERGE-05: d 属性拼接

- **D-33:** 绝对坐标归一化后拼接
  - 每个 path 的 d 属性先调用 `toAbsolutePath()` 转为绝对坐标
  - 归一化后的 d 用空格连接
  - 继承 `<g>` 的 transform（如有）
  - 合并后的 path 使用公共样式属性

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Source Files
- `src/transformer/transform-to-pptel.ts:1330-1405` — walk() 函数，处理 <g> 递归和属性继承
- `src/transformer/transform-to-pptel.ts:592-` — transformElement() 主逻辑
- `src/utils/path-utils.ts` — 已有的 toAbsolutePath() 和 scalePathCoords()
- `src/shapes/shape-to-path.ts` — 形状转 path 工具函数
- `src/slides.ts` — PPTShapeElement 类型定义（path, fill, outline, opacity 字段）

### Project Planning
- `.planning/ROADMAP.md` — Phase 10 goal 和 success criteria
- `.planning/REQUIREMENTS.md` § v1.7 Requirements (PATH-MERGE-01~05)
- `.planning/PROJECT.md` — v1.7 Path 合并优化 milestone 目标

### Prior Phase Decisions
- `.planning/phases/archive/v1.1-20260630/05-v1-1-transform/05-CONTEXT.md` — D-01: rotate 变换决策
- `.planning/phases/archive/v1.1-20260630/04-shape-image-line-group/04-CONTEXT.md` — D-21~25: shape/image/line/group 扩展决策

## Existing Code Insights

### Reusable Assets
- `toAbsolutePath(d: string)` — path-utils.ts，已支持 M/L/H/V/A/C/Q/S/T/Z 转为绝对坐标
- `scalePathCoords(d, scaleX, scaleY)` — path-utils.ts，扩展版本
- `walk()` function — transform-to-pptel.ts:1330，已有 <g> 递归和属性继承逻辑
- @resvg/resvg-js — 已集成用于 text measurement，可复用 bounding box 计算

### Established Patterns
- 独立模块提取（REF-05: path-utils.ts 独立）
- walk() 拦截模式：clipPath 预处理已用此模式（preprocessClipPaths）
- 决策树返回建议：merge/no-merge/cautious-merge

### Integration Points
- `src/merger/path-merge.ts` — 新模块，walk() 中调用
- walk() 函数需修改：检测 <g> 全为 path 子元素时，调用 path-merge 模块而非直接递归
- transformElement() 保持不变

## Deferred Ideas

None — all raised topics were within Phase 10 scope.

---

*Phase: 10-Path Merge — 决策树与合并引擎*
*Context gathered: 2026-07-13*
