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

---

## Milestone: v1.13 — Page Data Extraction

**Shipped:** 2026-10-16
**Closeout type:** verified_closeout (20/20 must-haves, 50/50 Phase 18 tests green + 76/76 v1.12 contentKey regression)
**Phases:** 1 | **Plans:** 4 | **Tasks:** 7

### What Was Built

- `src/utils/page-data.ts` 新建 251 行 helper — `buildPageData(elements)` 纯函数 + `PageData` / `PageDataDirectoryItem` 接口
- `src/slides.ts` +45 行 — `PPTBaseElement.textContent?: string` + `Slide.pageData?: PageData` 字段 + 2 个新 interface
- `src/transformer/transform-to-pptel.ts` +36 行 — `extractRawText()` helper + 单行 + multiline 每 row 互锁写入 + `TspanExtractResult.text` 字段补全
- `src/index.ts` +7 行 — `convertOne()` 末尾 `buildPageData(elements)` 挂载(D-09 守卫)
- 4 个新测试文件:unit (19) + mock E2E textContent (7) + mock E2E pageData (8) + fixture E2E (16)

### What Worked

- **Wave-based parallel execution**: Wave 2 跑 18-02 + 18-04 parallel,虽然 18-04 的测试在 master base 上 fail(因 18-02 未合并),但 dispatch 后由 orchestrator 合并时 18-02 已先合,worktree 串行 dispatch 模式有效避免 `.git/config.lock` 竞争
- **D-11 单一来源 PageData interface**: `src/slides.ts` 内定义 + `src/utils/page-data.ts` 倒过来 import type,避免循环依赖
- **OVR-PD18-D18 plan 号反转被 verifier 接受**:planner 把 18-03/04 顺序反了(应为 fixture 重生在 mock E2E 之前),但功能覆盖等价 — verifier 重读 surface 后通过

### What Was Inefficient

- **`buildPageData` 优先 `element.contentKey` vs `getContentKeyFor(id)` lookup 漏判**: 18-04 mock 测试在 master base 上 fail(3 个) — multiline Row 2+ 的合成 id(`toc-item-N-carrier-line-N`)不在 v1.12 映射表中。诊断 + 修复 + 测试更新 = 1 个 fix commit(因为 dispatch 时无法预知)
- **Verification digest refresh 失败**: 第一次 verifier 写 VERIFICATION.md 时 `covered_digest` 留了占位符 `v3:sha256:phase-18-aggregate`,`gsd_run query phase.complete` 报 stale;re-verifier 也无法刷新。最终手动查 `gsd_run query verification fingerprint` 拿到真实 digest 写回 — 这个 future verifier 应该直接 compute 真实 hash,而不是留占位
- **fixture 重生 commit 不入 git**: `.gitignore` 第 5 行 `/exampels` 排除整个目录,但 18-03 plan Task 1 原本要 git commit 5 fixture baseline(参考 17-04 之前 plan 的 fixture commit pattern)。agent 按 17-04 precedent 跳过 commit,改让 E2E 测试 in-memory 验证 — 等价但偏离 plan 文字描述,需在 SUMMARY 显式记录 deviation

### Patterns Established

- **Wave 串行 dispatch + 1 个 executor per wave** 适用于单 plan;**Wave 并行 dispatch 时 1 Agent per message + run_in_background:true** 适用多 plan(避免 worktree contention)
- **`element.contentKey` 优先 id lookup** 用于聚合 helper — 多行 / 合成 id 元素不能被 id lookup 漏掉
- **D-09 守卫 + 字段省略 contract**: 0-hit slide `pageData` 整字段省略(`undefined` 不暴露 `null`/`{}`)— 与 v1.11 contentBounds / v1.12 contentKey 同模式

### Key Lessons

- Verification 自动 compute SHA-256 应写入 frontmatter,不留占位 — `gsd_run query verification fingerprint` 输出真实 digest 可直接用
- Plan frontmatter `files_modified` 字段要包括 `__tests__/` 路径 — gsd_run verification fingerprint 默认包含所有 plan 修改文件,缺漏会导致 digest 错位
- `.gitignore` 排除 fixture 后,plan 中 fixture 重生 commit 步骤需要明确"skip git commit,保留 in-memory E2E" 或 "通过 git add -f 强制跟踪" 二选一

### Cost Observations

- Model mix: 100% sonnet(执行 + verifier + 修复)
- Sessions: 5 `Agent()` dispatch(18-01 / 18-02 / 18-04 / 18-03 / re-verifier)+ 1 内联 18-04 fix commit
- Notable: 18-02 单 plan 跑 38 分钟(最复杂,改 3 个 src 文件 + 1 个新测试),其他 plan 平均 4-8 分钟;并行 dispatch Wave 2 总耗时约 38 分钟(取决于最慢的 18-02),串行会 ~50+ 分钟

---

## Cross-Milestone Trends (updated)

| Metric | v1.9 | v1.10 | v1.11 | v1.12 | v1.13 |
|---|---|---|---|---|---|
| Phases | 1 | 1 | 1 | 1 | 1 |
| Plans | 3 | 2 | 3 | 4 | 4 |
| Feat+test commits | 9 + 2 post-ship | 2 plans + 2 post-ship | 3 + 1 post-ship | 4 | 4 + 1 fix |
| Tests passing | 116 | 116 + post-ship | 22 + 9 (override) | 76 | 50 + 76 regression |
| Closeout type | override_closeout | verified_closeout | override_closeout | verified_closeout | verified_closeout |
| Open debug sessions carried | 30 ack | 30 ack (carried) | 30 ack (carried) | 30 ack (carried) | 30 ack (carried) |

### v1.13 Trends

- **连续第三个 verified_closeout**: v1.11 是 override(v1.11.1 single-line 漏 templateType 注入),v1.12 和 v1.13 都 verified — pattern 表明 v1.11 后端到端 + reverse assertion 模板成熟
- **Regression 测试无 cost**: 76 v1.12 contentKey 测试 + 9 v1.11 template-marking 测试 + v1.9 animation 测试全部 untouched,Phase 18 只新增自己的 50 个测试
- **Wave 并行效率稳定**: 4 plans × 1 phase → 3 waves(1+2+1),Wave 2 串行 dispatch(1+1)实际并行,Wall 总 50 分钟 vs 串行估算 70+ 分钟

---

## Milestone: v1.14 — Replace nanoid with uuid

**Shipped:** 2026-10-19 · **Archived:** 2026-10-29
**Closeout type:** verified_closeout (16/16 must-haves, id-injection 8 it() + E2E 51 it() 全绿,644 passed / 13 pre-existing failures)
**Phases:** 1 | **Plans:** 2 | **Tasks:** 0

### What Was Built

- `src/utils/id-generator.ts` 整文件改写 — 3 处 `nanoid(N)` → `uuidv4().substring(0, N)`(N ∈ {5, 10, 10}),三函数签名不变
- `package.json` 移除 `nanoid` 直接依赖;`package-lock.json` 经 `npm install` 重生成
- `src/id-injection.test.ts` — `NANOID_*_RE` → `UUID_SUFFIX_*_RE`,字符集 `[A-Za-z0-9_-]` → `[0-9a-f-]`,顶部 JSDoc + 8 个 it() title 同步
- `tests/e2e/202610131101001.test.ts` 行 247 it title 同步,`length === 10` 断言保留
- 横向同步 13 个文件 — 11 处 `src/` 注释(D-A1 #1-11)+ `.planning/` 6 个历史文档 + `PPTIST_ANIMATION_MAPPING.md`

### What Worked

- **tracer slice → 横向扩展两段式拆 plan**: 19-01 只碰 `src/utils/id-generator.ts` 一个文件,先证明 id 长度(5/10)与 D-05~09 优先级链行为等价,再在 19-02 铺开到 13 个文件 — 把"改实现"和"改措辞"的风险彻底分离
- **机械可判定的成功标准**: 6 条成功标准中 4 条是 `grep` 0-match,verifier 无需人工目测即可判定;唯一需要人判断的(NU-04 hoisting)被单独标为 partial
- **决策编号字面保留**: D-05 ~ D-09 / D-20 的编号与语义在迁移中原样保留,Phase 14 历史文档仍可追溯

### What Was Inefficient

- **`npm install` 的 hoisting 打断了 NU-04 的字面预期**: plan 期望顶层 `node_modules/nanoid` 块被移除,npm 因 `postcss@8.5.15` 的传递依赖把它重新 hoist 回顶层 — 手工删 block 后再 install 即可复现,最终 plan 显式接受该偏差
- **plan 内部自相矛盾**: acceptance criteria `DOC_NANOID_EXIT=1` 要求整个 `.planning/` 0 match,而 Out of Scope 又声明 `.planning/codebase/{ARCHITECTURE,INTEGRATIONS,STACK}.md` 不动 — 产出 7 条需要逐条解释的"残留偏差"
- **phase 路径名内嵌旧技术名**: `19-nanoid-to-uuid-migration` 目录名让 STATE.md 3 处、phase 自身 4 个文件永久保留 nanoid 字面,在不破坏 GSD 状态机追踪的前提下无法清除
- **`summary-extract` 提取不到 one_liner**: 本项目 SUMMARY.md 用中文小节标题而非 `one_liner` frontmatter,`gsd_run query milestone.complete` 自动生成的 accomplishments 为空,MILESTONES.md 条目需人工补全

### Patterns Established

- **"实现"与"同步"分属两个 plan**: 迁移类任务的第一 plan 只碰实现文件并跑 tracer 验证,第二 plan 再铺开注释/文档同步层
- **成功标准优先选机械可判定项**: 优先写 `grep` 0-match、长度断言、类型守卫这类无需人判断的标准,避免"措辞一致"类标准在 verifier 阶段产生歧义
- **不可控的传递依赖属于计划内偏差**: npm hoisting 这类行为应在 plan 阶段就写明可接受,而不是留到执行期再解释

### Key Lessons

- **需求复选框必须随 closeout 同步勾选** — REQUIREMENTS.md 的 16 个 `[ ]` 若不更新,"16/16 covered" 就只存在于 VERIFICATION.md 里,归档后失去文件级证据
- **不要在 plan 里承诺移除 transitive 依赖块** — npm hoisting 是默认行为,承诺它必然产生一条 partial requirement
- **归档会改变旧文件的相对路径** — 归档文件内的自引用必须改指向 `.planning/milestones/vX.Y-phases/`,否则留下死链

### Cost Observations

- 交付范围:2 plans / 2 个 feat commit(`ffe82bf`、`42fbcb2`)/ 26 files changed / +1,701 −203 行
- 实际代码改动集中在 1 个源文件 + 1 个测试文件 + 2 个 package 文件;其余 13 个文件为注释与文档同步
- 全套测试 644 passed / 13 failed,13 个全部是 v1.9 carry-over(shadow / shape-rx / image-outline / path-merge),`git stash` 对照确认 Phase 19 未引入新回归

---

## Cross-Milestone Trends (updated)

| Metric | v1.9 | v1.10 | v1.11 | v1.12 | v1.13 | v1.14 |
|---|---|---|---|---|---|---|
| Phases | 1 | 1 | 1 | 1 | 1 | 1 |
| Plans | 3 | 2 | 3 | 4 | 4 | 2 |
| Feat+test commits | 9 + 2 post-ship | 2 plans + 2 post-ship | 3 + 1 post-ship | 4 | 4 + 1 fix | 2 |
| Tests passing | 116 | 116 + post-ship | 22 + 9 (override) | 76 | 50 + 76 regression | 8 + 51 E2E(全套 644) |
| Closeout type | override_closeout | verified_closeout | override_closeout | verified_closeout | verified_closeout | verified_closeout |
| Open debug sessions carried | 30 ack | 30 ack (carried) | 30 ack (carried) | 30 ack (carried) | 30 ack (carried) | 30 ack (carried) |

### v1.14 Trends

- **连续第二个 verified_closeout(v1.13 之后)**: v1.11 的 override 缺口(v1.11.1 single-line 漏注入)此后未复现,连续 3 个 milestone 保持 verified
- **纯迁移 milestone 的测试成本最低**: 与 v1.13 的 50 个新测试不同,v1.14 只新增 8 个 id-injection 断言 + 复用既有 51 个 E2E,靠 tracer 等价性证明行为不变
- **横向同步成本随历史文档量增长**: v1.14 需要同步的 `.planning/` 历史文档增至 6 个(14-RESEARCH / 14-01-PLAN / 14-01-SUMMARY / CONVENTIONS / STATE / PPTIST_ANIMATION_MAPPING),说明技术名一旦进入历史文档,后续迁移的尾部成本会持续累积
- **技术债台账稳定在 30 项**: v1.8 起累计的 29 debug session + 1 verification gap 四个 milestone 未动,v1.14 是纯内部迁移,未增加也未减少 — 收敛这些 carry-over 需要独立 milestone

---

*Last updated: 2026-10-29 after v1.14 closeout (verified_closeout)*
