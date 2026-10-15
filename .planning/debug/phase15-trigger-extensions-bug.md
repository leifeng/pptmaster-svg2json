---
audit_acknowledged:
  milestone: v1.9
  at: 2026-10-15
  status: unknown
---

# Debug: Phase 15 extensions.originalEffect + 同组元素 trigger 并发

## 症状

Phase 15 Wave 1+2 完成后,两个相关 bug:

**Bug 1 — `extensions.originalEffect` 未保留:**
生成的动画配置 `extensions` 中没有 `originalEffect` 字段(即便 mapped success)。D-11 spec:"映射后同时在 extensions 保留三方原值"。当前 `src/animation-injector.ts:235` 仅当 `fallback=true` 时写 `ext.originalEffect = row.effect`,mapped success 路径不写。

**Bug 2 — 同组元素触发应为同时(meantime),非顺序(auto):**
同 SVG `<g id="gid">` 下的 N 个 PPTElement 应**同时**显示(`trigger='meantime'`),但当前用 `trigger='auto'`(`after-previous` 上一个动画之后)。这与 ELEMENT_ANIMATIONS.md §3 "trigger_shape 行有独立的交互序列"和同 order 同 row 的语义相冲突 — 同行多 element 默认应并行。

## 期望行为

**Bug 1:** 每个 PPTAnimation 的 `extensions` 都应包含 `originalEffect: row.effect` — 无论 mapped 还是 fallback。Reasoning: 调用方随时可读 provenance (Phase 14 D-11 intent)。

**Bug 2:** 同 row 内的多 element 应该共享 `trigger='meantime'`(同时)。跨 row 才用 row-level trigger 解析(`meantime` / `auto` / `click`)。

## 当前代码

`src/animation-injector.ts:235`:

```ts
if (fallback) ext.originalEffect = row.effect
```

应该改为(无条件):

```ts
ext.originalEffect = row.effect
```

`src/animation-injector.ts` element-loop (Phase 14 N→N fix 后,row-loop / element-loop 嵌套):
每个 element 的 `trigger` 来自 row-level 解析。当 row.trigger === undefined,fallback 到 `'after-previous'` → `auto`。同 row 多 element 应并行 → `meantime`。

## 假设

1. Bug 1 是 Phase 14 D-08 决策的副作用 + Phase 15 没纠正 — D-11 注释明确"映射后同时保留",但代码逻辑只 fallback 路径写
2. Bug 2 是 N→N fix 后的副作用 — 同 row 内 element 共享 row-level trigger,默认 `auto`,而不是 `meantime`

## 期望修复

- 修改 `src/animation-injector.ts:235` 改为无条件 `ext.originalEffect = row.effect`
- 修改 element-loop 内的 trigger 计算:同 row 多 element 用 `meantime`(除非 row 显式 `trigger='click'`)
- 更新相关测试用例
- 加反向断言

## Current Focus

status: fixing
bug_class: bohrbug (deterministic — both bugs reproducible from inputs)
hypothesis: 
  - Bug 1: buildExtensions 第 235 行的 `if (fallback)` 是 D-11 实现偏差 — D-11 spec 要求"映射后同时保留三方原值",无论 mapped/fallback 都应写入 originalEffect
  - Bug 2: element-loop 内 `trigger` 由 row-level 单一决定(row-level 默认 `after-previous` → `auto`),同 row 多 element 共享,导致同组元素被串行(`auto` = after-previous),而不是同时(meantime)

test: 单元 + E2E reverse-assertion
expecting: Bug 1 — 所有 PPTAnimation.extensions.originalEffect 都存在;Bug 2 — 多 element row 的首个 element 保留 row-level trigger,后续 element 走 meantime(除非 row 显式 click 变体)
next_action: 实施 Commit 1 — Bug 1 fix (originalEffect unconditional) + 单元测试
reasoning_checkpoint:
  hypothesis:
    - Bug 1: "buildExtensions 的 `if (fallback) ext.originalEffect = row.effect` 是 D-11 实现偏差 — D-11 要求无条件保留三方 effect 原值,所以应当改为无条件赋值"
    - Bug 2: "element-loop 内 trigger 由 row 解析后单值填充到所有 candidate,而同 row 多 element 应当共享 row-level trigger 作 cross-row anchor,但同组内部应使用 meantime 并发 — 需要在 element 循环里依据 candidate index 调整 trigger"
  confirming_evidence:
    - 当前 `src/animation-injector.ts:235` 静态可见 `if (fallback) ext.originalEffect = row.effect` — 证明 mapped success 路径确实不写
    - `ELEMENT_ANIMATIONS.md` §3 行字段表证 trigger_shape 等同 on-click,与 row-level 三方 trigger 互斥
    - `15-CONTEXT.md` D-06 列明 `effect` 在 extensions 中保留;原 commit `944d4b7` resolveEffectiveRow 引入后未触到 buildExtensions 的 conditional 行为
    - fixture 03_overview 的 card-* 组各 4 element,期望 N→N 覆盖下产出 16 个 PPTAnimation,但同组后续 element 仍需并发
  falsification_test:
    - Bug 1: 跑 `injectAnimations` 喂 entrance_fade(MAPPED) 后检查 extensions.originalEffect;期望 unmapped(fallback) 路径不存在
    - Bug 2: 故意构造同 row 多 element sidecar,验证 element[1..N].trigger === 'meantime'(非 'auto'),且 resolved.trigger === 'on-click' 时全部为 'click'
  fix_rationale:
    - Bug 1 修复直接对应 D-11 spec,影响小(单行变化)且回归面只触及 extensionsFieldsPreserved 统计
    - Bug 2 修复在 element-loop 内部按 candidate index 推导 trigger,改动内聚、回归面只覆盖同 row 多 element 的 case(candidates.length > 1)
  blind_spots:
    - Bug 1 — 是否所有 existing extensions 测试断言 originalEffect 缺失 = fail? 经过排查只有 "omits extensions for genuinely empty row" 一个隐含依赖此行为,需要更新
    - Bug 2 — resolved.trigger 通过 mapTrigger 处理,是否会因为 candidate index 推导让 resolved-based diagnostic(defaultsApplied)不准? 不影响 — defaultsApplied 是 row-level 计数,与 element index 无关
    - Bug 2 — 03_overview fixture 是否有 group 内 element>1 的 case? 已验证 4 个 card group 各含 4 个 element,正向覆盖
  candidate_causes:
    - Bug 1: code (single-line conditional), data (fixture 无 fallback effect 暴露), config (无), environment (无)
    - Bug 2: code (element-loop 单值 trigger 复用), data (fixture 同 row 多 element 存在), config (无), environment (无)
    - 跨类别分支已启:code + data 两个 cause 维度,AND-gate = no(任一 code 改动即可解决,不需同时成立)
  and_gate: no — Bug 1 是单行 code 偏差;Bug 2 是 element-loop 内 trigger 推导偏差。两者都是 code 类 cause,任一独立成立即可解释各自的症状,且无环境/数据并发条件叠加

## Resolution

### Bug 1 — `extensions.originalEffect`

- **root_cause:** `buildExtensions(row, fallback)` only wrote `extensions.originalEffect` on the fallback path (`if (fallback) ext.originalEffect = row.effect`), leaving mapped-success PPTAnimations without effect provenance — a D-11 contract violation.
- **fix:** Replaced the conditional with an unconditional `ext.originalEffect = row.effect` assignment; the `fallback` flag continues to drive the `unmappedEffects` / `unmappedEffectCount` diagnostic counters (no semantic regression).
- **verification:** Unit tests went 56 → 59 (3 new tests in `D-11/D-12/D-13` block: mapped-path emission, fallback-path emission, `extensionsFieldsPreserved` count bumped at least once per animation). E2E tests went 47 → 50 (2 new reverse-assertions: every covered PPTAnimation has `extensions.originalEffect`; `extensionsFieldsPreserved >= animationsInjected`). Pre-existing failures (`__tests__/shape-rx.test.ts`, `__tests__/shadow.test.ts`, etc.) are unrelated and unchanged.
- **files_changed:** `src/animation-injector.ts`, `src/animation-injector.test.ts`, `tests/e2e/202610131101001.test.ts`.

### Bug 2 — 同组多 element 触发并发

- **root_cause:** The element-loop in `injectAnimations()` filled `PPTAnimation.trigger` with a single row-level value (`mapTrigger(resolved.trigger, row.order, previousOrder)`) for every matching PPTElement. With the default (`'after-previous'` → `'auto'`), same-group PPTShapes inherited `'auto'` (one-after-another) rather than `'meantime'` (concurrent) — contradicting `ELEMENT_ANIMATIONS.md` §3 (same-row should be parallel) and Phase 14 D-18 (`trigger_shape` is per-row interactive, not per-element).
- **fix:** Per-element trigger derivation inside the element-loop. If `resolved.trigger === 'on-click'` (either explicit `trigger='on-click'` or `trigger_shape` presence → D-18 collapse), every element emits `'click'`. Otherwise the first element carries the row-level `baseTrigger` (the cross-row anchor) and every subsequent element collapses to `'meantime'`. Cross-row `previousOrder` semantics unchanged.
- **verification:** Unit tests went 59 → 66 (7 new tests in `'Phase 15 — same-group multi-element concurrent trigger semantics'` block: default concurrent split; explicit `after-previous` / `with-previous` / `on-click`; `trigger_shape`; cross-row chain preservation; single-element regression guard). E2E: 03_overview fixture has 4 card groups × 4 PPTShapes each → verified 4 multi-element groups with 12 subsequent `'meantime'`-collapsed animations and distinct `elId`s per animation.
- **files_changed:** `src/animation-injector.ts`, `src/animation-injector.test.ts`, `tests/e2e/202610131101001.test.ts`.

### Final state

- **Build:** `tsc && node scripts/copy-fonts.js` → no diagnostics.
- **Test totals after 3 atomic commits:** 66 unit + 50 E2E = **116 animation tests pass** (was 56 unit + 47 E2E = 103 before this debug session).
- **Commits (chronological):**
  1. `a3d8e67` — fix(animations): preserve originalEffect in extensions unconditionally (D-11)
  2. `2941d66` — fix(animations): same-group multi-element rows play concurrently
  3. `c23e1c6` — test(e2e): reverse-assert Bug 1 originalEffect + Bug 2 same-group concurrent triggers
