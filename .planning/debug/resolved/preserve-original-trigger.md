---
status: resolved
trigger: '根据PPTIST_ANIMATION_MAPPING.md 把三方动画效果映射到正确的值,并且需要在extension里保留三方原始动画名称和原始trigger'
created: 2026-10-15
updated: 2026-10-15
---

# Debug: extensions.originalTrigger 无条件保留 (D-11 spec 对齐)

## 症状

**任务来源**:User triggered `/gsd-debug` with directive: "根据 PPTIST_ANIMATION_MAPPING.md 把三方动画效果映射到正确的值,并且需要在 extension 里保留三方原始动画名称和原始 trigger".

**阶段状态**:Phase 14 (PPTist 动画从 sidecar) + Phase 15 (animation-sidecar-extended) 已 SHIPPED 2026-10-15 (`b33876b docs(roadmap): mark Phase 15 + v1.10 milestone SHIPPED`),最近一次 debug session `phase15-trigger-extensions-bug.md` 已 resolved(2026-10-15)。本次触发来自 phase15 收尾后 user 检查映射一致性 + D-11 spec 合规。

**当前已合规**:
- `src/mappers/animation.ts` `ENTRANCE_MAP` = 53 键(与 PPTIST_ANIMATION_MAPPING.md §4 一致)
- `src/mappers/animation.ts` `EXIT_MAP` = 53 键(与 §5 一致)
- `src/mappers/animation.ts` `EMPHASIS_MAP` = 33 键(与 §6 一致)
- `src/mappers/animation.ts` `TRANSITION_MAP` = 40 键(与 §7 一致,12 个 fade 兜底 + random 透传 + 各 direct match)
- `extensions.originalEffect` 无条件保留(`src/animation-injector.ts:239`:`ext.originalEffect = row.effect`,D-11 已合规)
- 同 row 多 element 并发(`src/animation-injector.ts:497-501`:candIdx > 0 → 'meantime',isRowClick → 'click')
- `extensions.originalTriggerShape` 在 `row.trigger_shape !== undefined` 时保留

**当前 D-11 spec 偏差**:
- `extensions.originalTrigger` **仅条件保留**:`src/animation-injector.ts:240` `if (row.trigger !== undefined) ext.originalTrigger = row.trigger`
- 与 `originalEffect` 行为不统一 — D-11 docstring 文件头注释明确将 `originalTrigger` 与 `originalEffect / originalDuration / originalType / originalOrder / originalDelay / originalTriggerShape` 平级列出(`src/animation-injector.ts:27-29`),意图是无条件保留所有"三方原始字段",但实现仅 unconditional 了 `originalEffect`。
- 测试覆盖:仅 `src/animation-injector.test.ts:468` 验证 `originalTriggerShape`,**无 `originalTrigger` 单字段测试**。`phase15-trigger-extensions-bug.md` 的 reverse-assertion 也只验证 `originalEffect` 反向断言,没碰 `originalTrigger`。

## 当前行为(实测)

`buildExtensions(row: AnimationsSidecarRow, fallback: boolean): Record<string, any>`:

```ts
ext.originalEffect = row.effect                                  // ✓ 无条件
if (row.trigger !== undefined) ext.originalTrigger = row.trigger // ❌ 条件
if (row.duration !== undefined) ext.originalDuration = row.duration
if (row.order !== undefined) ext.originalOrder = row.order
if (row.delay !== undefined) ext.originalDelay = row.delay
if (row.trigger_shape !== undefined) ext.originalTriggerShape = row.trigger_shape
```

**Expected vs Actual**:
| 场景 | Expected(D-11 spec) | Actual |
|---|---|---|
| `row.trigger = 'after-previous'` | `extensions.originalTrigger === 'after-previous'` | ✓ |
| `row.trigger = 'with-previous'` | `extensions.originalTrigger === 'with-previous'` | ✓ |
| `row.trigger = 'on-click'` | `extensions.originalTrigger === 'on-click'` | ✓ |
| `row.trigger = undefined`(隐式 'after-previous' 派生) | `extensions` 中 `originalTrigger` 字段存在(值 undefined 或 'after-previous' 派生标记) | ❌ 字段不存在 |

## 假设

1. **主因**:Phase 15 Bug 1 修复(`a3d8e67 fix(animations): preserve originalEffect in extensions unconditionally`)只把 `originalEffect` 改成无条件赋值,**没有同步处理** `originalTrigger` / `originalDuration` / `originalType` / `originalOrder` / `originalDelay`,因为这些原字段本身可能是 `undefined`(与 `originalEffect` 的 `row.effect` 总是非 undefined 不同)。D-11 spec 描述原本意图统一,但实现只对 "非 undefined-safe" 的字段做了无条件赋值。
2. **测试盲点**:`src/animation-injector.test.ts` 现有 `extensions.originalEffect` 测试覆盖(D-11 block,行 471-545),但 `originalTrigger` 等其他字段无对应反向断言。
3. **诊断信号盲点**:`extensionsFieldsPreserved` 计数器只在 `Object.keys(extensions).length > 0` 时自增,但由于 `originalTrigger` 是条件保留,其值在 `row.trigger === undefined` 时不计入键数,导致观测不准。

## 期望修复(spec)

- `src/animation-injector.ts:240` 删除 `if` guard,改为 `ext.originalTrigger = row.trigger`(无条件)
- D-11 spec 对齐:`originalTrigger` 与 `originalEffect` 行为一致(均为无条件保留)
- 当 `row.trigger === undefined` 时,JSON 序列化忽略该字段(JSON.stringify 跳过 undefined 值),但 `Object.keys(extensions).length` 包含它 → 与 `extensionsFieldsPreserved` 计数器语义对齐
- 新增正向 + 反向测试覆盖:
  - 正向:`row.trigger = 'with-previous'` → `extensions.originalTrigger === 'with-previous'`
  - 反向:所有 emit 的 PPTAnimation.extensions 都包含 `originalTrigger` 键(无论是 String 还是 undefined,`Object.keys` 包含)
- 文档同步:`animation-injector.ts` 文件头 D-11 注释已经明示意图,无需改动;`PPTIST_ANIMATION_MAPPING.md §13 版本记录` 待 fix 完成后追加一行 phase16 or micro-fix 记录

## 影响面

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/animation-injector.ts:240` | 删 if guard 一行 | 极低 — D-11 docstring 注释已明示意图,只缺实现 |
| `src/animation-injector.test.ts` | 新增 2-3 个测试用例 | 低 |
| `PPTIST_ANIMATION_MAPPING.md` | §13 追加一行 commit 记录 | 无 |

无副作用风险点:
- `hasExtensions = Object.keys(extensions).length > 0` — `originalTrigger` 即使 undefined,`Object.keys` 仍包含该键,所以 `hasExtensions = true` 的概率略升,可能让原本 extensions 为空的 row 现在写出 `{"originalTrigger": undefined}`(JSON 忽略内容)。但 buildExtensions 已经在其他路径(`effectOptions`、snake_case 字段等)经常使 extensions 非空,所以这个差异在序列化输出上不可观测。
- `extensionsFieldsPreserved` 计数 +1(因为 Object.keys 包含 undefined-valued 键),让 counters 与 D-11 intent("每个 PPTAnimation 至少保留 originalEffect + originalTrigger")对齐 — 这是**期望**的诊断改进。

## 反向断言(plan)

```ts
it('writes extensions.originalTrigger unconditionally (D-11 spec)', () => {
  const slide = makeSlide([makeShape('e1', 'g1')])
  const sidecar = makeSidecar({
    '03_overview': { groups: { g1: { effect: 'entrance_fade', trigger: 'with-previous' } } },
  })
  const diagnostics = emptyInjectorDiagnostics()
  const result = injectAnimations(slide, {
    slideId: '03_overview',
    sidecar,
    diagnostics,
  })
  expect(result.animations![0].extensions?.originalTrigger).toBe('with-previous')
})

it('preserves originalTrigger even when row.trigger is implicit (D-11 unconditional)', () => {
  const slide = makeSlide([makeShape('e1', 'g1')])
  const sidecar = makeSidecar({
    '03_overview': { groups: { g1: { effect: 'entrance_fade' } } }, // 无 trigger
  })
  const result = injectAnimations(slide, {
    slideId: '03_overview',
    sidecar,
    diagnostics: emptyInjectorDiagnostics(),
  })
  // D-11 unconditional — Object.keys 包含 originalTrigger,值是 undefined
  expect(Object.keys(result.animations![0].extensions!).sort()).toContain('originalTrigger')
})
```

## Current Focus (FINAL — see Resolution)

bug_class: Bohrbug (deterministic — the conditional guard at line 240 is empirically wrong vs D-11 docstring)
hypothesis: "`src/animation-injector.ts:240` `if (row.trigger !== undefined) ext.originalTrigger = row.trigger` 是 phase15 Bug 1 修复期间 D-11 spec 实现的遗漏 — D-11 注释行 27-29 已把 originalTrigger 与 originalEffect 列在同一组(intent: 无条件保留),但实现只对 originalEffect 做了 unconditional。本次任务范围:只 fix originalTrigger 一处(用户输入聚焦 '动画名称和 trigger'),其他字段留待后续 PR 单独跟进"
test: 单元 forward + E2E reverse-assertion
expecting:
  - 单行修改:`src/animation-injector.ts:240` 删除 `if` guard,改为无条件赋值
  - 更新既有 'omits extensions for genuinely empty row' 测试的 Object.keys 期望
  - 新增 2 个正向/反向单元测试
  - 1 个 E2E reverse-assertion
reasoning_checkpoint:
  hypothesis: "`src/animation-injector.ts:240` 把 `originalTrigger` 改成无条件赋值即可对齐 D-11 spec"
  confirming_evidence:
    - "`src/animation-injector.ts:239` 已无条件写 `originalEffect`(phase15 Bug 1 a3d8e67 已修),line 240 仍是条件形态"
    - "D-11 docstring 行 27-29 把 originalTrigger 与 originalEffect 列同一组(意图无条件保留),实现未对齐"
    - "`src/animation-injector.test.ts:419-447` Object.keys 期望等于 `['originalEffect']`,证明当前 `trigger=undefined` 时该键不存在"
    - "`extensionsFieldsPreserved` 计数器语义依赖 Object.keys,漏计 originalTrigger"
  falsification_test: "若 conditional 保留不变,新增 `writes extensions.originalTrigger unconditionally` unit 测试会失败(Object.keys 不包含 originalTrigger)"
  fix_rationale: "删 `if` guard,改 `ext.originalTrigger = row.trigger` 一行,镜像 line 239 的 originalEffect 行为;JSON.stringify 跳过 undefined 输出,但 Object.keys 包含 → 与 D-11 '保留三方原始 trigger' 意图一致"
  blind_spots:
    - "未扫下游 PPTAnimation consumer 是否对 extensions.originalTrigger === undefined 做特殊处理"
    - "未直接验证 E2E 跑通(E2E 在 unit 之上的二次反向断言)"
  candidate_causes:
    - "code: `src/animation-injector.ts:240` if guard 漏改"
    - "config: 无"
    - "environment: 无"
    - "data: 无"
  and_gate: "no — 单 code cause;bug 仅在实现层"

## Resolution

root_cause: "`src/animation-injector.ts:240` buildExtensions 对 `originalTrigger` 保留了 `if (row.trigger !== undefined)` 条件 guard,与 D-11 spec(docinjector.ts:27-29 把 originalTrigger 与 originalEffect 平级列出,意图无条件保留)不一致,是 phase15 Bug 1 修复期间(a3d8e67)的实现遗漏。"
fix: |
  // src/animation-injector.ts:240 — drop the if-guard
  -        if (row.trigger !== undefined) ext.originalTrigger = row.trigger
  +        ext.originalTrigger = row.trigger
  镜像 line 239 的 ext.originalEffect = row.effect 行为。
verification: "npm run build passes;src/animation-injector.test.ts 68/68 绿(含 2 个新增 + 2 个更新);tests/e2e/202610131101001.test.ts 51/51 绿(含 1 个新增 reverse-assertion);全套 463 绿 + 13 已知无关失败(shape-rx/path-merge/shadow/image-outline,基线未变);Red→Green 信号确认(4b8b4b4 e2e RED,5e2dbe2 unit reverse RED,9fa7fec fix → 全 GREEN)。"
files_changed: ["src/animation-injector.ts", "src/animation-injector.test.ts", "tests/e2e/202610131101001.test.ts", "PPTIST_ANIMATION_MAPPING.md"]

commits:
  - 4b8b4b4 test(e2e): reverse-assert D-11 unconditional extensions.originalTrigger
  - 5e2dbe2 test(animations): D-11 unconditional originalTrigger unit tests (forward + reverse)
  - 9fa7fec fix(animations): preserve originalTrigger in extensions unconditionally (D-11)
