---
status: awaiting_human_verify
trigger: '动画效果映射对吗？三方的是fly映射到动画配置中是fadeIn?'
created: 2026-10-15
updated: 2026-10-15
---

# Debug: Legacy effect name 归一化阶段缺失

## 症状(User-reported,端到端验证)

**User directive (CHINESE)**: "动画效果映射对吗？三方的是 fly 映射到动画配置中是 fadeIn?"
English: "Is the animation effect mapping correct? Three-side `fly` mapped to `fadeIn` in the converted animation config?"

**User-provided 文件**:
- 三方输入:`exampels/ppt169_attention_is_all_you_need/animations.json`
- 转换输出:`exampels/ppt169_attention_is_all_you_need/svg_output/04_rnn_cnn_limits.svg.svg.json`

**端到端 trace 已验证 (orchestrator 侧)**:

输入端 `04_rnn_cnn_limits` slide 定义:
```json
{
  "pillar-sequential": { "effect": "fly", "order": 1 },
  "pillar-pathlen":   { "effect": "fly", "order": 2 },
  "pillar-memory":    { "effect": "fly", "order": 3 },
  "rnn-visual":       { "effect": "wipe", "order": 4, "delay": 0.2, "duration": 0.5 }
}
```

输出端 `pillar-sequential__r5MXX`(line 1241-1252):
```json
{
  "elId": "pillar-sequential__r5MXX",
  "effect": "fadeIn",                              ← 预期 lightSpeedInLeft
  "type": "in",
  "duration": 340,
  "trigger": "auto",
  "extensions": {
    "originalEffect": "fly",                       ← raw 保留
    "originalOrder": 1
  }
}
```

**统计**(ppt169 fixture + 当前实现):
| 三方 key | fixture 用量 | slide 分布 | 期望 PPTist | 实际输出 | bug? |
|---|---:|---|---|---|---|
| `fly` | 16 | 03, 04, 06, 09, 10, 13 | `lightSpeedInLeft` | `fadeIn` | ❌ |
| `zoom` | TBD | TBD | `zoomIn` | `fadeIn`(fallback)| ❌ 推测 |
| `appear` | TBD | TBD | `fadeIn` | `fadeIn` | ✓ 巧合 |
| `wipe` | TBD | TBD | `fadeIn` | `fadeIn` | ✓ 巧合 |
| `fade` | TBD | TBD | `fadeIn` | `fadeIn` | ✓ 巧合 |

`04_rnn_cnn_limits.svg.svg.json` 三 pillar groups 共 42 elements × `effect: fadeIn` — 全部错映射。

## Root Cause

`ELEMENT_ANIMATIONS.md §4.7 lines 490-528` 列了 29 个 **legacy 输入名** → canonical 名归一表:

| Legacy input | Normalized to | Effect Options added |
|---|---|---|
| `appear` | `entrance_appear` | (none) |
| `cut` | `entrance_appear` | (none; PowerPoint exposes no separate Cut preset) |
| `fade` | `entrance_fade` | (none) |
| **`fly`** | `entrance_fly` | `direction: down` |
| `fly_left` | `entrance_fly` | `direction: left` |
| `fly_right` | `entrance_fly` | `direction: right` |
| `fly_top` | `entrance_fly` | `direction: up` |
| `zoom` | `entrance_zoom` | (none) |
| `wipe` | `entrance_wipe` | `direction: left` |
| `wipe_left` | `entrance_wipe` | `direction: left` |
| `wipe_right` | `entrance_wipe` | `direction: right` |
| `wipe_up` | `entrance_wipe` | `direction: up` |
| `wipe_down` | `entrance_wipe` | `direction: down` |
| `split` | `entrance_split` | `direction: horizontal` |
| `blinds` | `entrance_blinds` | `direction: vertical` |
| `checkerboard` | `entrance_checkerboard` | `direction: horizontal` |
| `dissolve` | `entrance_dissolve` | (none) |
| `random_bars` | `entrance_random_bars` | `direction: horizontal` |
| `peek` | `entrance_peek` | `direction: in_bottom` |
| `wheel` | `entrance_wheel` | `amount: 4` |
| ... 9 个更多 (box / circle / diamond / plus / strips / wedge / stretch / expand 等) |

**`PPTIST_ANIMATION_MAPPING.md §3.2`**: "29 个 legacy 兼容输入名 `ELEMENT_ANIMATIONS.md §4.7`。在 svg2json 端:`NormalizedAnimation` 阶段把所有 legacy 名归一到 203 规范键后,再走下方映射。**本文档不列 legacy,实现侧在 `animation-types.ts` 的 zod schema 之前已完成归一。**"

**实际情况(orchestrator 已 grep 验证)**:
- `src/` 全目录搜索 `fly\b` / `legacy` / `normalize.*effect` — **只命中 `entrance_fly` 在 mapper 表里**,**没有任何 normalize 阶段**。
- `src/animation-types.ts:63` 唯一 "legacy" 引用,是关于 single-effect form vs modern array form(无关本 bug)。
- `src/mappers/animation.ts` 仅有 `entrance_fly: 'lightSpeedInLeft'`,**没有 legacy 名别名映射**。

**因此**:`fly` 直接进 `mapEffect('fly', 'in')` → `ENTRANCE_MAP['fly']` = undefined → `EFFECT_FALLBACK.in` = `'fadeIn'` with `fallback: true`。`originalEffect` 字段写 `fly` 备用,但实际 effect 错。

### 修复方案(初步)

**最小修改**:在 `src/mappers/animation.ts` 增加 `LEGACY_NAME_MAP`(29 项) + 在 `mapEffect` 顶部 normalize 阶段:

```ts
// ELEMENT_ANIMATIONS.md §4.7 lines 490-528
export const LEGACY_NAME_MAP: Record<string, { normalized: string; options?: Record<string, any> }> = {
  appear: { normalized: 'entrance_appear' },
  cut:    { normalized: 'entrance_appear' },
  fade:   { normalized: 'entrance_fade' },
  fly:    { normalized: 'entrance_fly', options: { direction: 'down' } },
  fly_left:  { normalized: 'entrance_fly', options: { direction: 'left' } },
  fly_right: { normalized: 'entrance_fly', options: { direction: 'right' } },
  fly_top:   { normalized: 'entrance_fly', options: { direction: 'up' } },
  zoom:   { normalized: 'entrance_zoom' },
  wipe:   { normalized: 'entrance_wipe', options: { direction: 'left' } },
  wipe_left:  { normalized: 'entrance_wipe', options: { direction: 'left' } },
  wipe_right: { normalized: 'entrance_wipe', options: { direction: 'right' } },
  wipe_up:    { normalized: 'entrance_wipe', options: { direction: 'up' } },
  wipe_down:  { normalized: 'entrance_wipe', options: { direction: 'down' } },
  split:  { normalized: 'entrance_split', options: { direction: 'horizontal' } },
  blinds: { normalized: 'entrance_blinds', options: { direction: 'vertical' } },
  checkerboard: { normalized: 'entrance_checkerboard', options: { direction: 'horizontal' } },
  dissolve:    { normalized: 'entrance_dissolve' },
  random_bars: { normalized: 'entrance_random_bars', options: { direction: 'horizontal' } },
  peek:    { normalized: 'entrance_peek', options: { direction: 'in_bottom' } },
  wheel:   { normalized: 'entrance_wheel', options: { amount: 4 } },
  box:     { normalized: 'entrance_box', options: { direction: 'in' } },
  circle:  { normalized: 'entrance_circle', options: { direction: 'in' } },
  diamond: { normalized: 'entrance_diamond', options: { direction: 'in' } },
  plus:    { normalized: 'entrance_plus', options: { direction: 'in' } },
  strips:  { normalized: 'entrance_strips', options: { direction: 'right' } },
  wedge:   { normalized: 'entrance_wedge', options: { direction: 'down' } },
  stretch: { normalized: 'entrance_stretch', options: { direction: 'in' } },
  expand:  { normalized: 'entrance_expand', options: { direction: 'out' } },
}
```

normalize 后:`row.effect = canonical`,`row.effect_options = { ...row.effect_options, ...legacyOptions }`。然后 `inferAnimationType` + `mapEffect` 按规范流程走。

### 也需要考虑:

- **`exit_*` legacy:** §3.2 / §4.7 应也对 exit 有 legacy 名(如 `fade_out` 等),但 ELEMENT_ANIMATIONS.md 当前读到 entrance 段。如有,需要同样的 exit legacy 表。
- **`emphasis_*` legacy:** 类似。
- **empirical test fixture:** 验证 29 个 legacy 各跑一遍 normalize test。

## Expected vs Actual(symptom 表)

| 场景 | Expected(`extensions.originalEffect` + 主 effect) | Actual |
|---|---|---|
| `effect: "fly"` | 主 effect = `lightSpeedInLeft`; `originalEffect = "fly"`(`preserve-original-trigger` session 已修) | 主 effect = `fadeIn`; `originalEffect = "fly"` ❌ |
| `effect: "zoom"` | 主 effect = `zoomIn`; `originalEffect = "zoom"` | 主 effect = `fadeIn`; `originalEffect = "zoom"` ❌(推测,需验证) |
| `effect: "appear"` | 主 effect = `fadeIn`; `originalEffect = "appear"` | 主 effect = `fadeIn`; `originalEffect = "appear"` ✓ 巧合 |
| `effect: "wipe"` | 主 effect = `fadeIn`; `originalEffect = "wipe"` | 主 effect = `fadeIn`; `originalEffect = "wipe"` ✓ 巧合 |

## 影响面(估)

| 文件 | 改动 | 风险 |
|---|---|---|
| `src/mappers/animation.ts` | 加 `LEGACY_NAME_MAP` + `normalizeLegacyEffect()` 函数 + mapEffect 内 normalize 调用 | 极低 — 镜像 spec §4.7 |
| `src/mappers/animation.test.ts` | 29 项 legacy 各一个 normalize 测试 + 1 个 round-trip 测试 | 低 |
| `src/animation-injector.ts` | 无需改(normalize 在 mapper 里完成) | 0 |
| `src/animation-injector.test.ts` | 无需改 | 0 |
| `exampels/ppt169_attention_is_all_you_need/animations.json` | 重新 `convertDir` 后验证 `04_rnn_cnn_limits.svg.svg.json` 大量 pillar-* 变 `lightSpeedInLeft` | 0 |
| `PPTIST_ANIMATION_MAPPING.md §13` | 追加一行 commit 记录 | 0 |

**Regression risk**:
- LEGACY_NAME_MAP 应该只匹配 `fly` / `zoom` / `appear` 等裸名,不会匹配 `entrance_appear`(已规范)。但需要谨慎:`entrance_*` 不在 legacy 表里 → 不被错误改写 → 确认测试覆盖。
- 一些 legacy 映射到不同 effect_options.direction(如 `fly` 默认 `down`, `fly_left` 显示 `left`),normalize 阶段如果已有 user-provided `effect_options`,应 merge 而非覆盖:优先 user-provided,fallback legacy options。
- fallback counter `unmappedEffects` / `unmappedEffectCount`:normalize 后,这些 legacy 不再触发 fallback,导致此 counter 下降。这是**期望**(bug 修了之后真实效果是 mapped,不是 unmapped)。

## 反向断言 plan(伪代码)

```ts
it('legacy name fly normalizes to entrance_fly then maps to lightSpeedInLeft', () => {
  expect(mapEffect('fly', 'in')).toEqual({ effect: 'lightSpeedInLeft', fallback: false })
})

it('legacy name fly_left normalizes + injects effect_options.direction=left', () => {
  // inject normalize output, not directly mapEffect
  const result = normalizeLegacyEffect('fly_left')
  expect(result.effect).toBe('entrance_fly')
  expect(result.effect_options).toEqual({ direction: 'left' })
})

it('end-to-end: ppt169 04_rnn_cnn_limits fly row → lightSpeedInLeft output', () => {
  const slide = makeSlide([... 42 shape elements with pillar-* / rnn-visual groupIds ...])
  const sidecar = loadFixture('exampels/ppt169_attention_is_all_you_need/animations.json')
  const result = injectAnimations(slide, { slideId: '04_rnn_cnn_limits', sidecar, diagnostics: emptyInjectorDiagnostics() })
  const flyAnims = result.animations!.filter(a => a.extensions?.originalEffect === 'fly')
  expect(flyAnims.every(a => a.effect === 'lightSpeedInLeft')).toBe(true)
})
```

## Current Focus

status: fixing
bug_class: bohrbug (deterministic — every legacy-named row triggers wrong fallback, end-to-end reproducible from fixture)

reasoning_checkpoint:
  hypothesis: "All 29 legacy effect names (fly / fly_left / fly_right / fly_top / zoom / wipe* / split / blinds / etc. per ELEMENT_ANIMATIONS.md §4.7) fall through `mapEffect` unchanged — `byType['in']['fly']` is `undefined`, returns `EFFECT_FALLBACK['in']='fadeIn'` with `fallback: true`. Root cause: `LEGACY_NAME_MAP` + normalize phase described in PPTIST_ANIMATION_MAPPING.md §3.2 ('NormalizedAnimation 阶段把所有 legacy 名归一到 203 规范键') was never implemented in code."
  confirming_evidence:
    - "Fixture 04_rnn_cnn_limits.svg.svg.json line 1244-1477: 28 entries with `effect: 'fadeIn'` and `extensions.originalEffect: 'fly'` — direct fall-through pattern."
    - "animations.json line 33-43: `pillar-sequential`/`pillar-pathlen`/`pillar-memory` all `effect: 'fly'` should map to `entrance_fly` → `lightSpeedInLeft`."
    - "`grep -nE 'LEGACY|legacy.*normalize|normalize.*legacy' src/` empty — zero hits — confirming absence of normalize phase."
    - "`src/mappers/animation.ts` lines 393-408 (mapEffect): direct lookup with no upstream normalization — `byType[inferredType][threeSideKey]` for `threeSideKey='fly'` → undefined → fallback."
  falsification_test: "If `mapEffect('fly', 'in')` returns `{effect: 'lightSpeedInLeft', fallback: false}`, hypothesis confirmed. Also: `mapEffect('zoom', 'in')` must return `{effect: 'zoomIn', fallback: false}`, `mapEffect('wipe_left', 'in')` must include `effect_options.direction='left'` in some downstream structure."
  fix_rationale: "Add `LEGACY_NAME_MAP` constant (29 entries from ELEMENT_ANIMATIONS.md §4.7) + `normalizeLegacyEffect(key, rawOptions)` to (i) translate legacy key to canonical (e.g. `fly`→`entrance_fly`), (ii) merge legacy options (e.g. `direction: 'down'`) with any user-provided `effect_options` (user wins). Call normalize at top of `mapEffect` BEFORE the per-type MAP lookup, so the rest of the pipeline is unaware legacy ever existed."
  blind_spots:
    - "Whether some legacy names already coincide with the canonical key (e.g. `appear` is both legacy and could be confused with `entrance_appear`). Need to ensure normalize never rewrites a canonical key."
    - "Effect options merge precedence when user provides conflicting `direction`: user-provided must win per spec."
    - "Counter `unmappedEffects`/`unmappedEffectCount`: must drop to a lower value after fix — but assertion that pre-fix value ≥ post-fix value is the only safe test (NOT a fixed number, because other unmapped keys may still exist)."
    - "`04_rnn_cnn_limits` slide also has `effect: 'wipe'` (rnn-visual) — needs to verify whether `wipe` legacy's default `direction: left` produces any unexpected `originalEffect: 'wipe'` vs the new mapping."
  candidate_causes:
    - "[code] missing `LEGACY_NAME_MAP` constant + `normalizeLegacyEffect` function in src/mappers/animation.ts"
    - "[spec] PPTIST_ANIMATION_MAPPING.md §3.2 mis-stated that normalize happens in animation-types.ts zod schema — animation-types.ts has no zod, only TS interfaces, so spec was a phantom reference"
    - "[data] fixture sidecar legitimately contains legacy keys (`fly`/`zoom`/`appear`/`wipe`/`fade`) — not an authoring bug"
  and_gate: "no — the bug is a single missing code path (legacy → canonical key + options). The spec phrasing is misaligned but the data is correct. Only ONE contributing cause: missing normalize phase."
test: 单元 + E2E + fixture re-conversion
expecting:
  - 29 项 legacy normalize 测试全绿
  - end-to-end re-run ppt169 fixture → `04_rnn_cnn_limits.svg.svg.json` 中 pillar-* 改 `effect: "lightSpeedInLeft"`
  - `unmappedEffects`/`unmappedEffectCount` 计数下降(legacy 不再触发 fallback)
  - 1 个原子 commit:`feat(mappers): LEGACY_NAME_MAP + normalize step`
next_action: 实施修复:src/mappers/animation.ts 加 LEGACY_NAME_MAP + normalizeLegacyEffect + mapEffect 顶部调用;src/mappers/animation.test.ts 加 29 项 normalize 测试;e2e 验证 fixture 输出

## Resolution

root_cause: |
  Missing legacy-name normalization phase in `src/mappers/animation.ts`. The
  spec at `PPTIST_ANIMATION_MAPPING.md §3.2` and `ELEMENT_ANIMATIONS.md §4.7`
  defines 29 legacy compatibility input names (e.g. `fly`, `zoom`, `wipe_left`)
  with explicit normalization to canonical `entrance_*` presets + direction
  defaults. The mapper had no `LEGACY_NAME_MAP` and `mapEffect` looked legacy
  keys up directly in ENTRANCE_MAP — undefined hits fell through to
  `EFFECT_FALLBACK['in'] = 'fadeIn'` with `fallback: true`. Some legacy
  names (appear / cut / fade / wipe / dissolve / etc.) coincidentally mapped
  to the same fallback effect as their canonical form, hiding the missing
  phase; direction-bearing ones (fly / fly_left / wipe_right / wheel / etc.)
  exposed the bug.

fix: |
  Added `LEGACY_NAME_MAP` (29 entries, mirrors `ELEMENT_ANIMATIONS.md §4.7`
  lines 490-520 verbatim) + `normalizeLegacyEffect(key, existingOptions?)`
  helper to `src/mappers/animation.ts`. `mapEffect()` now calls normalize at
  the top, so legacy keys transparently route through canonical lookup.
  User-provided options win over legacy defaults (merge precedence per
  ELEMENT_ANIMATIONS.md §4.5 v2 rule). `src/animation-injector.ts` calls
  `normalizeLegacyEffect` once per row to feed normalized options into
  `buildExtensions` so `extensions.effectOptions` carries the legacy
  direction/amount defaults (e.g. `fly` → `direction: 'down'`).
  `extensions.originalEffect` still preserves the raw legacy key per D-15.

verification:
  target_test:        { result: pass }
  mutation_check:     { result: skipped, reason_if_skipped: "no Stryker configured in package.json — signal skipped per graceful degradation" }
  no_op_deletion:     { result: pass, deletion_justified_by_rca: false, note: "fix is purely new code (LEGACY_NAME_MAP const + normalizeLegacyEffect fn + 2 new caller call sites); no branches deleted" }
  adjacent_tests:     { result: pass, suites_run: ["src/animation-injector.test.ts (68 tests)", "src/mappers/animation.test.ts (106 tests)"], note: "all 174 animation tests green; pre-existing failures in __tests__/shape-rx.test.ts / shadow.test.ts / image-outline.test.ts / path-merge.test.ts are unrelated (confirmed via `git stash` + re-test)" }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true, evidence: "3-state verification on ppt169 fixture 04_rnn_cnn_limits: pre-fix 42/42 fly rows → fadeIn; post-fix 42/42 fly rows → lightSpeedInLeft; after `git stash` + rebuild + convertDir → 42/42 fly rows → fadeIn (bug returned); after `git stash pop` + rebuild + convertDir → 42/42 fly rows → lightSpeedInLeft (fixed again)" }
  guardrail_verdict:  accepted

files_changed:
  - src/mappers/animation.ts (added LEGACY_NAME_MAP + normalizeLegacyEffect, modified mapEffect to call normalize at top)
  - src/animation-injector.ts (import normalizeLegacyEffect, call it once per row before mapEffect + buildExtensions, feed normalized options into rowForExt)
  - src/mappers/animation.test.ts (added 29 mapEffect legacy-normalize tests + 11 normalizeLegacyEffect unit tests; restructured Plan 14-02 block to host the new D-LEGACY nested describe)
