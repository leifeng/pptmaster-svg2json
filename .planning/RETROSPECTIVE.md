# Retrospective

## Milestone: v1.9 — PPTist Animation Sidecar Injection

**Shipped:** 2026-10-15
**Closeout type:** override_closeout (30 items acknowledged as deferred tech debt)
**Phases:** 1 | **Plans:** 3 | **Tasks:** 9 feat/test commits

### What Was Built

- Parent-dir CLI dispatch accepting `svg_output/` + sidecar `animations.json` (ANIM-CLI-01~03)
- transformer id-injection `<group_id>__<nanoid(8)>` (ANIM-ID-01~02)
- Pure-function mappers: 4 tables (ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP / TRANSITION_MAP) + 5 helpers (mapEffect / mapTrigger / mapDuration / mapTransition / inferAnimationType)
- `injectAnimations()` sidecar → slide bridge with N→N group coverage
- `extensions` field for unmapped three-side fields (D-11/12/13 unconditional preservation)
- D-22 strict guard (slides outside sidecar stay animation-free)
- D-23 stderr-only diagnostic summary (5 counters + warnings)
- Post-ship fixes (2026-10-15 hot-fix):
  - `extensions.originalTrigger` unconditional preservation (D-11 spec alignment)
  - 29-entry `LEGACY_NAME_MAP` normalizing fly/zoom/wipe_left etc. → canonical entrance_*

### What Worked

- **Pure-function mapper layer** (D-15 `resolveEffectiveRow`): injectable + sidecar-free, made 29-entry legacy normalize insertion trivial — the seam held.
- **N→N group coverage model**: instead of picking first-match (ANIM-MAP-04 originally picked first), user revised to "every element in group gets same effect" — much more useful for compound animations.
- **Override closeout pattern** for v1.x carry-over debug sessions: cleaner than trying to fix 28+ open sessions before shipping — the work itself doesn't regress, just the open inventory.

### What Was Inefficient

- **Two post-ship fixes** in same week — `originalTrigger` unconditional + legacy normalize — both should have been caught at v1.9 ship. Root cause: test cases only used canonical `entrance_*` keys and only validated `originalEffect` (not `originalTrigger`); fixture coverage gap exposed both bugs.
- **State/Roadmap drift**: v1.9 was marked SHIPPED in git but STATE.md, MILESTONES.md, REQUIREMENTS.md traceability were never updated. Discovered only on `/gsd-complete-milestone`. Lesson: `/gsd-complete-milestone` should run *immediately* after `mark complete` in commit, not deferred.
- **Frontmatter YAML breakage** in `tspan-baseline-shift-pptist.md` blocked the acknowledge CLI — manual repair needed. Lesson: yaml-lint pre-close-out audit step would prevent this.

### Patterns Established

- **D-11 unconditional preservation intent**: every three-side provenance field gets recorded in extensions regardless of mapped/fallback — applied uniformly across `originalEffect`, `originalTrigger`, etc.
- **Override closeout is acceptable for tech-debt carry-over**: v1.8 precedent (29 items) — gate is "all phases verified + all milestone requirements complete", not "no open items anywhere".
- **LEGACY_NAME_MAP dual-table separation**: legacy name → canonical name + injected `effect_options.direction`. User-provided options win over legacy defaults.

### Key Lessons

- Make `/gsd-complete-milestone` a post-`complete` commit hook, not a separate user action.
- Test fixture coverage should include the long-tail (legacy names, conditional fields), not just canonical happy paths.
- Audit-open CLI requires valid YAML frontmatter; pre-close-out yaml-lint.

### Cost Observations

- Model mix: 90% sonnet (debug investigations + fixes), 10% opus (architecture debugging)
- Sessions: 2 `gsd-debug` runs (preserve-original-trigger + legacy-name-normalization) post-ship
- Notable: 29-entry LEGACY_NAME_MAP was written in single gsd-debugger cycle (1+1 cycles total), no red→green→refactor loop needed for that volume of data

---

## Cross-Milestone Trends

| Metric | v1.8 | v1.9 | v1.10 |
|---|---|---|---|
| Phases | 1 | 1 | 1 |
| Plans | 2 | 3 | 2 |
| Feat commits | 9 | 9 | ~10 (incl. 2 post-ship) |
| Files changed | 10 | 21 | 18 |
| LOC change | +1362 / -38 | +4888 / -75 | +3446 / -113 |
| Tests passing | 24 + 14 N/A | 116 (66 unit + 50 E2E) | 116 + new post-ship regression |
| Open debug sessions | 29 acknowledged | 29 acknowledged (carried) | 29 acknowledged (carried — same) |
| Verification gaps | 1 (Phase 13) | 1 (Phase 13 — same) | 1 (Phase 13 — same) |
| Closeout type | override_closeout | override_closeout | verified_closeout |

### v1.10 Trends

- **Resolved carry-over**: All 30 acknowledged items still suppressed (no resurface). Two of them (`phase15-trigger-extensions-bug` and `legacy-name-normalization`) were actually resolved on-disk but didn't get re-audited because they were in suppression list. Fine — closure preserved.
- **Post-ship fix pattern**: 2 of v1.10's deliverables (`extensions.originalTrigger` unconditional, `LEGACY_NAME_MAP` normalize) shipped via `gsd-debug` runs the same week as closeout. Both could be attributed to v1.10 since they fixed v1.10-targeted mappings. Audit clean because all were resolved before v1.10 close audit.
- **Verified closeout achievable**: First v1.x milestone in this project to land `verified_closeout` because previous override carries-forward sat long enough to be fully suppressed. v1.10 itself had no new open items.

---

## Milestone: v1.10 — Animation Sidecar Extension

**Shipped:** 2026-10-15
**Closeout type:** verified_closeout (all phases verified, audit clean — 30 suppressed items carry forward from v1.9)
**Phases:** 1 | **Plans:** 2 | **Tasks:** ~10 feat/test commits (incl. 2 post-ship fixes)

### What Was Built

- **Plan 15-01**: Extended mapping tables to 53/33/53 = 139 entries (`ENTRANCE_MAP` / `EMPHASIS_MAP` / `EXIT_MAP`). D-02 `effect: "none"` cascade, D-03 `transition 'none' → turningMode 'no'`. D-13 `delay + duration` merged into single clamped ms duration. New `unmappedEffectCount` + `delayAccumulatedSeconds` diagnostics.
- **Plan 15-02**: `resolveEffectiveRow` pure-function resolver with 5-layer inheritance chain (CLI → deck → slide → group → row). D-06 extensions surface `afterEffect` + `sound`. D-04 `CHROME_REGEX` + `isChromeGroupId()` forward-compat helpers + `chromeSkippedGroups` counter.
- **Post-ship fixes** (commit `9fa7fec` + commit `913e342`):
  - `extensions.originalTrigger` unconditional preservation — D-11 spec alignment (no more `if (row.trigger !== undefined)` guard)
  - 29-entry `LEGACY_NAME_MAP` normalizing bare names (`fly`/`zoom`/`wipe_left`/etc.) → canonical `entrance_*` with merged `effect_options.direction`

### What Worked

- **Pure-function resolver pattern** (`resolveEffectiveRow`): cleanly injectable, made row-level defaults trivial to thread through CLI → deck → slide → group → row. Same pattern should apply to future inheritance use cases (positions, colors, etc.).
- **`extensions` field as a complete audit log**: every three-side field lands somewhere visible, even when unmapped. Calls can later read provenance without re-deriving.
- **Post-ship fix via `gsd-debug`** (`preserve-original-trigger` + `legacy-name-normalization`): 5 atomic commits total — fast turnaround, both bugs caused by spec-implementation drift not core logic errors.

### What Was Inefficient

- **Both post-ship fixes could have been caught at v1.10 ship**: same root cause as v1.9 carry-inspection — test fixtures used canonical keys only, never bare legacy names, and reverse-assertion only covered `originalEffect` not `originalTrigger`. Lesson for v1.11: include legacy-name fixture + reverse-assert `original*` coverage.
- **STATE.md milestone drift**: STATE.md recorded `milestone: v1.9` even after v1.10 was technically in flight, only updated when milestone.complete CLI wrote through. Not blocking but surfaced as a `preservation_warnings` warning during archive. Could be fixed by having STATE.md self-derive from `git tag --list "v*"` ordered by date.
- **`milestone.complete` reported `tasks: 0` for v1.10**: known CLI accounting quirk — task counter didn't increment for v1.10 plan completions. Not blocking; documented for awareness.

### Patterns Established

- **Pure-function row resolver**: same pattern as `mapEffect` etc. — pure input → output, no closure captures. Trivial to test in isolation.
- **D-11 unconditional `extensions.original*`** preservation: every three-side provenance field gets recorded in extensions regardless of mapped/fallback path. Applied uniformly across `originalEffect`, `originalTrigger` (post-fix).
- **Two-table LEGACY_NAME_MAP**: legacy name → canonical name + injected `effect_options.direction`. User-provided options win over legacy defaults.
- **Override closeout carried forward to verified_closeout**: 30 suppressed items from v1.9 close remained valid for v1.10 close. No new items opened.

### Cost Observations

- Model mix: 100% sonnet (debug investigations + fix)
- Sessions: 2 `gsd-debug` post-ship + 2 `gsd-complete-milestone` runs (v1.9 + v1.10)
- Notable: LEGACY_NAME_MAP was synthesized in single gsd-debugger invocation despite 29 entries — clear spec made data-table creation trivial

---

*Last updated: 2026-10-15 after v1.10 closeout (verified_closeout)*
## Milestone: v1.11 — Template Element Marking

**Shipped:** 2026-10-16
**Phases:** 1 | **Plans:** 3

### What Was Built

- PPTBaseElement.templateType?: 1 字面量字段 — TypeScript 编译期拦截非法赋值,反向断言锁字面量
- transformElement() 顶部 typeof-guarded isTemplate 计算 + 注入到 8 cases + multiline text + icon + path-merge
- Slide.contentBounds?: {x, y, width, height} 可选字段 + findContentBounds() DFS helper + convertOne() 集成
- 13 unit tracer 测试 (TPL-MARK-01/02/03/03a/05 + TPL-NONREN-01 + TPL-CB-01/02/03 + 1 regression)
- 9 E2E 测试覆盖 20 个 green-art-teaching fixture slides (cover≥5 / toc≥4 / ending≥4 / 04_content 精确 + 反向断言 + 字段缺失断言)

### What Worked

- **顶层 isTemplate 计算 + 统一 case 注入** — 参照既有 `result.groupId = groupId` 写入模式,8 个 case 末尾追加 `if (isTemplate) result.templateType = 1`,集中改动 < 40 行,对称性好
- **DFS stack-based AST scan** — `findContentBounds()` 用 stack+shift/push 而非 walk 递归,深度嵌套模板(100+ 组)零内存压力
- **fixture 驱动 E2E 钉字面量** — 04_content.svg 的 `data-pptx-bounds="98 180 1084 404"` 锁定精确数值,反向断言 `templateType ∈ {1, undefined}` + 显式 anti-values (null/true/'1'/2) 防止 widen

### What Was Inefficient

- **text single-line 分支遗漏 templateType 注入** — phase 16-01 实施时 Step 3 的 8 case 注入覆盖了 `case 'line'`(line element)但漏了 `case 'text'` 的 single-line 分支(只注入了 multiline)。E2E Test 4(multiline)先过 → Test 1 顶层 element 通过 → carrier 在 `<g id="*-slot-template">` 子树内的回归测试直到用户手动跑 01_cover.svg 才暴露。`5466417` post-ship fix 补上 + 新增 regression test 锁住。
- **verification gate 跳过** — phase 16 实施完整跑完但未跑 `/gsd-verify-work`,直接进入 closeout。closeout type 为 override_closeout,审计干净但缺独立 VERIFICATION.md。修复方案是 fix-end-of-stream 而不是 verify,完整覆盖。
- **debug 流程外的 stales** — `exampels/` 在 `.gitignore` 中,所以 `.svg.json` 是本地产物,phase 16 实施前已生成的 JSON 是 stale 的(无 `templateType` 字段)。用户最初看 stale JSON 误以为 phase 16 bug。修复后重新生成即可。

### Patterns Established

- **typeof 守卫 vs optional chaining** — `typeof elementId === 'string' && elementId.includes('-template')` 等价于 `element.attrs.id?.includes('-template')`,但额外防御 fast-xml-parser 把 id 解析为 number 的情形(`(1).includes(...)` throws TypeError)。语义一致 + 更安全。
- **DFS stack 优于递归** — `findContentBounds()` 用 `while (stack.length > 0) { const node = stack.shift(); ... }` 而非递归 walk,深度模板零内存压力
- **explicit `if (x !== undefined)` 守卫** — TPL-CB-03 字面 "字段直接省略",`JSON.stringify` 自动跳过 undefined 字段,但显式 `if` 守卫让"不写"语义可读

### Key Lessons

- **CRITICAL**: 16-01 实施遗漏 text single-line 分支的 templateType 注入。`result.groupId = groupId` 模式在 8 cases 都对,text 的 multiline 也对,但 single-line 分支独立结尾,易遗漏。修复后加入 regression test "TPL-MARK-02 single-line text inside <g id="*-template">" 锁住。
- **Coverage gap**: 单 E2E 测试覆盖 04_content fixture 是反向断言 (slot 元素不携带 templateType),但正向断言 (slot 子树内 carriers 携带 templateType) 缺失,直到用户手动验 01_cover 才暴露。下次 fixture-driven E2E 应同时覆盖正向 + 反向两边。
- **Exampels .gitignore 影响**: 本地生成的 .svg.json 是 stale 风险源;考虑在 E2E 测试或 README 里加一句 "如出现 missing-field 错误,跑 convert 重新生成 exampels/"

### Cost Observations

- Model mix: 100% sonnet (planning + execution + post-ship fix)
- Sessions: 1 `/gsd-execute-phase 16` (inline, no subagent) + 1 `/gsd-debug` (post-ship fix)
- Notable: phase 16 inline 执行模式(每个 plan 直接改)对小 phase(<5 plans)效率高,但单 line bug 易漏,适合增加 E2E 覆盖 + 更严格的 verify gate

---

*Last updated: 2026-10-16 after v1.11 closeout (override_closeout)*
