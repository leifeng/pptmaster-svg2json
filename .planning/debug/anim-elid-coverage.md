# Debug: animations.json groups[gid] 缺少元素覆盖（仅第一个 PPTElement 有动画）

## 症状

处理 `E:/git/svg2json/exampels/202610131101001/` 时,`animations.json` 的 `slides.<slide_id>.groups.<group_id>` 对应的 SVG `<g id="<group_id>">` 组下有 N 个 PPTElement,但生成的 `slide.animations[]` 只含 1 条记录(挂到第一个匹配的 PPTElement),N-1 个元素没有动画。

**预期行为**:`groups[gid]` 让组下**所有** PPTElement 都获得同 effect 的 PPTAnimation(动画效果一致,elId 各自不同)。即 1 个 group → N 条 PPTAnimation。

**实际行为**:1 个 group → 1 条 PPTAnimation(只挂第一个 PPTElement)。其余 N-1 个元素没有动画条目。

**错误信息**:无 — 程序正常运行,只是输出行为不符合预期。

**时间线**:Phase 14 (v1.9) SHIPPED 2026-10-15 之后立即出现。D-08 决策的初衷是"挂到第一个匹配的 PPTElement",用户在 DISCUSSION-LOG Area 1 Q2 当时选择了该最简路径;但现在用户意图已经改变,要求"组下所有元素都需要有动画"。

**复现步骤**:
1. `cd E:/git/svg2json`
2. `node ./dist/src/cli.js exampels/202610131101001`
3. 检查 `exampels/202610131101001/svg_output/<slide>.svg.json`
4. 观察:`slide.animations.length` << groups 的元素数量

## 关键源码位置

- `src/animation-injector.ts` `injectAnimations()` — 当前 "first matching PPTElement" 逻辑
- `src/transformer/transform-to-pptel.ts` `walk()` — 已写入 `groupId` 字段,所有 element 都有
- `src/animation-injector.test.ts` — 现有测试可能 pin 了 "first element only" 行为,需要更新

## D-决策上下文

- D-08(原锁定):"合并后 shape 用唯一 id,动画挂其上" — 用户已改变意图
- ANIM-MAP-03:"每个 group 解析为 1+ 条 PPTAnimation 写入对应 Slide 的 animations 数组" — "1+" 暗示多元素覆盖
- ANIM-MAP-04:"elId 字段使用对应元素在 transformer 阶段生成的 `<group_id>__<nanoid(8)>` id" — 单一 elId,但每个 element 都应该有

## 假设

1. `injectAnimations()` 的 "first match" 逻辑是 bug 源头 — 应该遍历所有 `el.groupId === gid` 的 elements,每 element 生成一条 PPTAnimation
2. path-merge 后是 1 element,所以"所有"就是 1 条 — 行为一致
3. 没 path-merge 的 group(N elements)需要 N 条 PPTAnimation,共享 effect/trigger/duration

## 期望修复

- 改 `injectAnimations()` 把"first match"改成"all matches"
- 更新 `animation-injector.test.ts` 相关测试用例
- E2E `tests/e2e/202610131101001.test.ts` 应反映新的 N-to-N 映射(13 covered slides 的 animations 数量应等于各自 group 下 element 总数)
- 现有 25 injector tests 多数可能仍然 pass,但 D-22 reverse-assertion / elId coverage 等需要 review

## Current Focus

status: fixing
bug_class: Bohrbug (deterministic — N candidates → only first gets elId)
hypothesis: `injectAnimations()` 第 271 行 `const elId = (candidates[0] as { id: string }).id` 仅取第一个候选元素的 id;应改为遍历所有 candidates,每个 candidate × row 元组生成一条 PPTAnimation

reasoning_checkpoint:
  hypothesis: "`injectAnimations()` 解析 `groups[gid]` 时只取 `slide.elements.filter(el.groupId === gid)` 的首个候选元素的 id,导致 N 个候选元素中只有 1 个获得 PPTAnimation;修复需将 row-iteration 嵌套在 element-iteration 内部(或反之),使每个 (element, row) 元组生成一条 PPTAnimation"
  confirming_evidence:
    - "src/animation-injector.ts:271 `const elId = (candidates[0] as { id: string }).id` — 显式取首匹配"
    - "03_overview.svg.svg.json 实测:animations.length === 4 而非预期的 16(4 groups × 4 elements)"
    - "groupId 分布:`{card-temperature: 4, card-pulse: 4, card-respiration: 4, card-bp: 4}` → 每个 group 应产生 4 条动画"
    - "animations.json 全部 group 用 legacy 单 effect 形式(每 group 1 row),所以 N→N 实际为 (1 × N) = N"
  falsification_test: "如果把 line 271 改成 `const elId = (candidates[0] as ...).id`(已存在的当前实现),仍只产生 4 条动画;若改为遍历所有 candidates,03_overview 应产生 16 条"
  fix_rationale: "用户意图变更:D-08 原本'挂第一个'是当时最简路径;现已改为'组下所有元素都需要动画'。修复直接修改 elId 解析逻辑,每次迭代取对应候选元素的 id,使每个 element 都获得匹配 group 的动画 effect"
  blind_spots:
    - "path-merge group(<g>全为 path 子元素且共享样式)在 `createMergedShapeElement` 已合并为 1 个 PPTShapeElement,groupId 仍正确 — 经修复后该 group 仍产生 1 条动画(与原 1:1 行为兼容)"
    - "effects[] 多 row 形式下,每个 element 都应获得每行的动画(行×元素笛卡尔积) — 现有 legacy 单 effect 形式 fixture 不触发此路径,但代码须正确"
    - "`previousOrder` 跨元素边界是否会污染 trigger 推导:已设计为每个 row 内所有 element 共享 previousOrder、row 结束后才推进 → 与'同 group 同时出现'的语义一致"
  candidate_causes:
    - "[code] elId 解析为 O(1) first match → 应改为 O(N) per-candidate 遍历"
    - "[data] 用户的 intent(在 discussion-log Area 1 Q2 之后变更)— 已确认"
    - "[config] 无配置介入"
    - "[environment] 无环境因素"
  and_gate: "no — 单一致因:elId 解析逻辑;无 multi-condition AND-gate"

fix_design:
  - "src/animation-injector.ts:
      - 注入嵌套结构 outer=row-loop / inner=element-loop(per-element emit)
      - 第 271 行删除 `const elId = candidates[0].id`,改为内层循环里取 `candidate.id`
      - `defaultsApplied` 计数移至 outer row-loop 之内、inner element-loop 之外(每个 row 只计一次,与原始 per-row 语义一致)
      - 新增 `InjectDiagnostics.elementsCovered: number`,内层每次 emit 自增
      - `emptyInjectorDiagnostics()` 加 `elementsCovered: 0`
      - `printDiagnostics()` summary line 增加 `X elements covered`
      - 文件头 docstring 增加'group→N elements 全部获得同 effect'的描述"
  - "src/animation-injector.test.ts:
      - L217-236 'uses the FIRST matching PPTElement' → 翻转为 'emits one PPTAnimation per matching PPTElement'
      - 新增 'reverse-assert: every candidate element has at least one animation' 测试
      - emptyInjectorDiagnostics / printDiagnostics shape 增加 elementCovered"
  - "tests/e2e/202610131101001.test.ts:
      - L277-296 03_overview `animations.length === groups-keys-count` → 改为 `animations.length === sum(elements_per_group)`"

next_action: implement fix in src/animation-injector.ts → run vitest → run CLI → commit

## Resolution

status: resolved

root_cause: `src/animation-injector.ts` 第 271 行 `const elId = (candidates[0] as { id: string }).id` 仅取 `slide.elements.filter(el.groupId === gid)` 的首个候选元素,后续 N-1 个元素无动画;未实现 user-intent revision 的 N→N 覆盖语义。

fix: 重构 `injectAnimations()` 的 inner loop:
- 删除 `const elId = candidates[0].id` 的 first-match 取值
- 将 row-loop 留在外层、element-loop 嵌入内层,每个 (row, element) 元组生成一条 PPTAnimation
- `previousOrder` 在 row-loop 末尾更新(每 row 推进一次,确保同 row 内 element 共享 trigger 语义)
- `defaultsApplied` 计数器移至 row-loop 之内、element-loop 之外(PER-ROW,不被 element 数稀释)
- `buildExtensions(row, fallback)` 在 row-loop 内调用一次,通过 shallow-copy `{ ...extensions }` 分发给各 element 的 animation.extensions(避免跨 animation 突变)
- 新增 `InjectDiagnostics.elementsCovered: number` — 内层每次 emit 自增;直接观察 N→N 覆盖度
- `emptyInjectorDiagnostics()` 加 `elementsCovered: 0`
- `printDiagnostics()` summary 加 `${(N)} 条元素 × row 组合`

verification:
- 单元测试 `src/animation-injector.test.ts`: 37/37 通过
- E2E 测试 `tests/e2e/202610131101001.test.ts`: 41/41 通过
- 端到端 CLI: `node dist/src/cli.js exampels/202610131101001` 输出 13 covered slides 总 225 动画(原 ~50),7 uncovered slides 仍 undefined(D-22 严格保持)
- `03_overview` 实测:animations.length === 16(从 4),unique elIds === 16,所有 elId 解析到真实 slide.elements
- path-merge 向后兼容:1 merged PPTShapeElement 仍产生 1 条 PPTAnimation(因 1 candidate);`path-merge behavior is preserved` 单元测试通过
- 回归:`__tests__/` 目录 13 个 pre-existing failures 数量不变(image-outline 1 + path-merge 1 + shadow 7 + shape-rx 4,与 14-03-SUMMARY baseline 一致)

files_changed:
  - src/animation-injector.ts
  - src/animation-injector.test.ts
  - tests/convert-dir.test.ts
  - tests/e2e/202610131101001.test.ts
