---
phase: 09-svg-converter-refactor
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mapper/coordinate-mapper.ts
  - src/transformer/transform-to-pptel.ts
  - src/parser/svg-parser.ts
autonomous: true
requirements:
  - REF-01
  - REF-02
  - REF-05

must_haves:
  truths:
    - "<g transform=\"translate(100,0)\"><rect x=\"10\"/></g>\" produces left=110"
    - S/s and T/t path commands produce correct reflected control points
    - scalePathCoords exists once in src/utils/path-utils.ts"
  artifacts:
    - src/utils/path-utils.ts (new)
    - coordinate-mapper.ts with composeTransforms support
    - transform-to-pptel.ts with fixed S/s T/t reflection
  key_links:
    - walk() passes parentTransform to mapCoordinates (REF-01)
    - toAbsolutePath uses prevCtrlPoint tracking for S/s T/t reflection (REF-02)
    - svg-parser.ts and transform-to-pptel.ts both import from path-utils.ts (REF-05)
---

<objective>
重构 SVG 转换器核心逻辑，修复嵌套变换累加（REF-01）、S/s T/t 反射计算（REF-02），并提取 path-utils.ts 消除代码重复（REF-05）。

Purpose: 修复 transform 系统的两个关键 bug，并统一路径处理函数
Output: 修改后的 coordinate-mapper.ts、transform-to-pptel.ts、svg-parser.ts，以及新的 src/utils/path-utils.ts
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@src/mapper/coordinate-mapper.ts
@src/transformer/transform-to-pptel.ts
@src/parser/svg-parser.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix nested transform accumulation (REF-01)</name>
  <files>src/mapper/coordinate-mapper.ts, src/transformer/transform-to-pptel.ts</files>
  <read_first>
    - src/mapper/coordinate-mapper.ts: mapCoordinates function, parseTransform function
    - src/transformer/transform-to-pptel.ts: walk function (lines 1501-1545), composeTransforms function
  </read_first>
  <action>
修复嵌套 `<g>` transform 累加问题（per D-04）：

1. 在 `coordinate-mapper.ts` 的 `mapCoordinates` 函数签名中添加可选参数 `parentTransform?: string`

2. 当 `parentTransform` 存在时，用 `composeTransforms(parentTransform, attrs.transform)` 合并后再解析

3. 在 `transform-to-pptel.ts` 的 `walk()` 函数中，调用 `mapCoordinates` 时传入累积的 parent transform：
   - 找到 `mapCoordinates(element, viewBox)` 调用处（transformElement 函数开头）
   - 改为 `mapCoordinates(element, viewBox, effectiveTransform)`

4. 确保 `composeTransforms` 函数可被 `coordinate-mapper.ts` 复用，或在 `coordinate-mapper.ts` 中实现相同的合并逻辑

验证：``<g transform="translate(100,0)"><rect x="10"/></g>` 正确输出 left=110
</action>
  <verify>
<automated>grep -c "mapCoordinates(element, viewBox, effectiveTransform)" src/transformer/transform-to-pptel.ts && grep -c "parentTransform" src/mapper/coordinate-mapper.ts</automated>
  </verify>
  <done>mapCoordinates 接收 parentTransform 参数并正确累加嵌套变换</done>
</task>

<task type="auto">
  <name>Task 2: Fix S/s and T/t smooth bezier reflection calculation (REF-02)</name>
  <files>src/transformer/transform-to-pptel.ts</files>
  <read_first>
    - src/transformer/transform-to-pptel.ts: toAbsolutePath function (lines 17-130)
    - 09-CONTEXT.md: D-05 reflection formula
  </read_first>
  <action>
修复 `toAbsolutePath` 中 S/s 和 T/t 命令的反射计算（per D-05）：

1. S 命令反射逻辑：
   - S 的第一个控制点需要通过当前点关于前一个控制点反射得到
   - 反射公式：`rx = 2*curX - prevCtrlX`，`ry = 2*curY - prevCtrlY`
   - 需要跟踪前一个控制点坐标（prevCtrlX, prevCtrlY）
   - 只有当前命令是 S/s 时，第一个控制点才用反射计算；后续控制点直接使用输入值

2. T 命令反射逻辑：
   - T 的控制点需要通过当前点关于前一个控制点反射得到
   - 反射公式相同：`rx = 2*curX - prevCtrlX`，`ry = 2*curY - prevCtrlY`
   - 需要跟踪前一个 Q/T 命令的控制点

3. 实现要点：
   - 添加变量 `prevCtrlX: number, prevCtrlY: number` 跟踪上一个控制点
   - 添加变量 `prevCmdU: string` 跟踪上一个命令类型
   - 在 C 命令后更新 prevCtrlX/Y 为第二个控制点 (x2, y2)
   - 在 S 命令后更新 prevCtrlX/Y 为 (x2, y2)
   - 在 Q 命令后更新 prevCtrlX/Y 为 (x1, y1)
   - 在 T 命令后更新 prevCtrlX/Y 为当前点 (curX, curY)
   - 当遇到 S 时，如果 prevCmdU 是 C/S，则第一个控制点用反射公式；否则作为普通控制点
   - 当遇到 T 时，如果 prevCmdU 是 Q/T，则控制点用反射公式；否则作为普通点

示例：假设前一个点是 (10, 10)，前一个控制点是 (5, 5)
- S 命令的反射控制点应该是 (2*10-5, 2*10-5) = (15, 15)
</action>
  <verify>
<automated>grep -c "prevCtrlX\|prevCtrlY" src/transformer/transform-to-pptel.ts</automated>
  </verify>
  <done>toAbsolutePath 中 S/s 和 T/t 命令正确计算反射控制点</done>
</task>

<task type="auto">
  <name>Task 3: Extract path-utils.ts module (REF-05)</name>
  <files>src/utils/path-utils.ts, src/transformer/transform-to-pptel.ts, src/parser/svg-parser.ts</files>
  <read_first>
    - src/transformer/transform-to-pptel.ts: toAbsolutePath (lines 17-130), scalePathCoords (lines 135-201)
    - src/parser/svg-parser.ts: scalePathCoords (line 971)
  </read_first>
  <action>
创建 `src/utils/path-utils.ts`，统一路径处理函数（per D-03）：

1. 创建文件 `src/utils/path-utils.ts`

2. 移动 `toAbsolutePath` 函数（支持 M/L/H/V/A/C/Q/S/T/Z 全命令）

3. 移动并扩展 `scalePathCoords` 函数，支持全部命令（M/L/H/V/A/C/Q/S/T/Z），而非只在 svg-parser 中支持的（M/L/H/V/A/Z）

4. 导出这两个函数：
   ```typescript
   export function toAbsolutePath(d: string): string
   export function scalePathCoords(d: string, scaleX: number, scaleY: number): string
   ```

5. 更新 `src/transformer/transform-to-pptel.ts`:
   - 删除本地的 `toAbsolutePath` 和 `scalePathCoords` 函数
   - 添加 `import { toAbsolutePath, scalePathCoords } from '../utils/path-utils'`

6. 更新 `src/parser/svg-parser.ts`:
   - 删除本地的 `scalePathCoords` 函数
   - 添加 `import { scalePathCoords } from '../utils/path-utils'`

注意：svg-parser 的 scalePathCoords 版本只支持 M/L/H/V/A/Z，而 transform-to-pptel 的版本还支持 C/Q/S/T/Z。新模块应包含完整版本。
</action>
  <verify>
<automated>ls src/utils/path-utils.ts && grep -c "from '../utils/path-utils'" src/transformer/transform-to-pptel.ts src/parser/svg-parser.ts</automated>
  </verify>
  <done>src/utils/path-utils.ts 存在并被两处正确引用，代码无重复</done>
</task>

</tasks>

<verification>
1. 单元测试验证 `<g transform="translate(100,0)"><rect x="10"/></g>` 正确输出 left=110
2. 单元测试验证 S/s、T/t 路径命令转换正确
3. 单元测试验证 path-utils.ts 被正确引用，无重复代码
</verification>

<success_criteria>
1. REF-01: 嵌套 `<g>` 的 transform 正确累加到子元素（REF-01 完成）
2. REF-02: S/s、T/t 命令的反射控制点计算正确（REF-02 完成）
3. REF-05: scalePathCoords 和 toAbsolutePath 统一到 path-utils.ts（REF-05 完成）
4. 所有修改通过现有测试
</success_criteria>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| parent→child transform | parent transform composed with child transform in mapCoordinates |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-09-03 | Tampering | composeTransforms | medium | mitigate | Validate transform string format before parsing; skip malformed transforms |
| T-09-04 | Information Disclosure | path-utils.ts exports | low | accept | Path data is rendering instruction, no sensitive data exposure |
| T-09-05 | Repudiation | S/s T/t reflection | high | mitigate | Add unit tests for reflection formulas; verify against SVG spec test cases |
| T-09-06 | Elevation of Privilege | mapCoordinates parentTransform | medium | mitigate | parentTransform is optional parameter; undefined defaults to element's own transform only |
</threat_model>

<output>
Create `.planning/phases/09-svg-converter-refactor/09-01-SUMMARY.md` when done
</output>
