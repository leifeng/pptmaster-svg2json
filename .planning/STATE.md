---
gsd_state_version: "1.0"
milestone: v1.14
status: Awaiting next milestone
stopped_at: Phase 19 verified and shipped
last_updated: "2026-10-29T07:13:42.837Z"
last_activity: 2026-10-29
last_activity_desc: Milestone v1.14 completed and archived
state_head: 7291adb3e526eb249c6d3ed3cb45e2b4e917f63a
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 2
  completed_plans: 2
milestone_name: Replace nanoid with uuid
current_phase: 19
current_phase_name: nanoid-to-uuid-migration
---

## Deferred Items

_Updated: 2026-10-15 during v1.9 closeout (30 items newly acknowledged via `audit-open acknowledge`);carried forward unchanged through v1.10 / v1.11 / v1.12 / v1.13 / v1.14 closeouts (0 newly acknowledged at v1.14 close, 2026-10-29)_

| # | Category | Identifier | Status at acknowledge | Origin |
|---:|---|---|---|---|
| 1 | debug_session | anim-elid-coverage | fixing | v1.x carry-over |
| 2 | debug_session | cover-tags-text-anchor-middle | unknown | v1.x carry-over |
| 3 | debug_session | foreignobject-svg-offset | investigating | v1.x carry-over |
| 4 | debug_session | g-fill-stroke-inheritance | investigating | v1.x carry-over |
| 5 | debug_session | icon2-single-path-scale | investigating | v1.x carry-over |
| 6 | debug_session | line-height-not-scaled | unknown | v1.x carry-over |
| 7 | debug_session | nested-g-path-merge-top-offset | fixed | v1.x carry-over |
| 8 | debug_session | path-header-coord-bug | unknown | v1.x carry-over |
| 9 | debug_session | phase15-trigger-extensions-bug | fixing | v1.10 carry-over (resolved post-ship) |
| 10 | debug_session | polygon-defs-background | investigating | v1.x carry-over |
| 11 | debug_session | pptist-rich-text-spec | investigating | v1.x carry-over |
| 12 | debug_session | rect-bg-gradient-display | investigating | v1.x carry-over |
| 13 | debug_session | resvg-pkg-native-module | investigating | v1.x carry-over |
| 14 | debug_session | svg-filter-rendering-bug | investigating | v1.x carry-over |
| 15 | debug_session | svg-rect-text-vertical-alignment | diagnosed | v1.x carry-over |
| 16 | debug_session | svg-tspan-attention-loss | awaiting_human_verify | v1.x carry-over |
| 17 | debug_session | svg-use-fill-attribute | diagnosed | v1.x carry-over |
| 18 | debug_session | svg-w-crossplatform | unknown | v1.x carry-over |
| 19 | debug_session | text-in-circle-vertical-position-v2 | unknown | v1.x carry-over |
| 20 | debug_session | text-in-circle-vertical-position-v3 | unknown | v1.x carry-over |
| 21 | debug_session | text-in-circle-vertical-position | unknown | v1.x carry-over |
| 22 | debug_session | text-tspan-color-and-order-bug | awaiting_human_verify | v1.x carry-over |
| 23 | debug_session | text-tspan-content-splitting-bug | investigating | v1.x carry-over |
| 24 | debug_session | text-tspan-fontsize-nesting | investigating | v1.x carry-over |
| 25 | debug_session | text-tspan-mixed-content-loss | awaiting_human_verify | v1.x carry-over |
| 26 | debug_session | text-width-comparison | investigating | v1.x carry-over |
| 27 | debug_session | text-y-coordinate-textTop-bug | investigating | v1.x carry-over |
| 28 | debug_session | ts-build-errors | unknown | v1.x carry-over |
| 29 | debug_session | tspan-baseline-shift-pptist | in_progress | v1.x carry-over (YAML fixed 2026-10-15 for audit) |
| 30 | verification_gap | 13-VERIFICATION.md (phase 13, archived v1.8) | gaps_found | v1.8 carry-over |

Closeout type: **override_closeout** (28 v1.x-carried debug sessions + 1 v1.10 post-ship debug session + 1 v1.8 verification gap — all acknowledged as known tech debt, none blocking v1.9 completion).

**v1.14 closeout type: verified_closeout** — audit clean(0 newly open items);the 30 items above remain suppressed from the v1.9 close and were **carried forward, not re-fixed** (see `Known verification overrides` in `.planning/MILESTONES.md`).

## Project State

## Current Position

Phase: Milestone v1.14 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-10-29 — Milestone v1.14 completed and archived

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-10-29)

**Core value:** Accurately convert SVG visual elements to PowerPoint JSON with correct coordinates, transforms, and styles — preserving downstream-required semantic annotations (animations, template markers, content slots, page data).
**Current focus:** Awaiting `/gsd-new-milestone` — 下一个 milestone 尚未定义

## Accumulated Context

### Decisions (v1.14 kickoff — Phase 19 SHIPPED)

- **NU-DEC-01**: id 生成改用 `uuidv4().substring(0, N)`(N ∈ {5, 10, 10})而非完整 UUID — D-07 / D-20 锁定 PPTist 编辑面板 5/10 字符 diff 友好性,长度不变是硬约束
- **NU-DEC-02**: 三函数签名 `pptelIdWithFallback` / `pptelIdUngrouped` / `pptAnimationId` 完全不变,只换底层实现 — 不动所有调用点与既有测试
- **NU-DEC-03**: ID 正则字符集精确化 `[A-Za-z0-9_-]` → `[0-9a-f-]`(CD-2) — nanoid 字符集过宽无法约束生成逻辑,uuid 输出确定
- **NU-DEC-04**: D-A1 横向注释同步 11 处(`src/` 6 处 + JSDoc 5 处)+ `.planning/` 6 个历史文档 + `PPTIST_ANIMATION_MAPPING.md` — 用户明确要求"同步更新所有提及"
- **NU-DEC-05**: D-05 ~ D-09 / D-20 决策编号字面保留 — 迁移不改语义,Phase 14 历史可追溯
- **NU-DEC-06**: NU-04 偏差接受 — npm 自动 hoist `postcss` 传递依赖 `nanoid` 到顶层,plan 已声明允许;只移除项目直接依赖

完整决策见 `.planning/milestones/v1.14-phases/19-nanoid-to-uuid-migration/19-CONTEXT.md`。

### Decisions (v1.13 kickoff — Phase 18 SHIPPED)

- **PD-DEC-01**: `textContent` 字段窄范围 — 仅当 PPTTextElement 命中 v1.12 已实现 17 个 contentKey (34 entries) 时写入。互锁写入(contentKey ⇔ textContent)— D-01..D-03
- **PD-DEC-02**: 数据聚合走 `buildPageData(elements)` 纯函数,在 `convertOne()` 末尾调用,返回 undefined 时 pageData 整字段省略 — D-09 / D-15
- **PD-DEC-03**: TOC 数组 N 升序,`directoryItem.index` 为字符串零填充 `"01".."04"`,`index/title/desc` 三字段,`directory_item_number_N` 不进 pageData — D-04 / D-10 / D-12 / D-13
- **PD-DEC-04**: helper 文件 `src/utils/page-data.ts`(与 v1.12 content-key.ts 同位置规范)— D-11 / D-16 / D-17
- **PD-DEC-05**: One-way / costly 决策:D-06 同 N 多 desc first-wins(不可逆)+ D-07 title first-wins(costly)+ D-08 子集发射(field omission)+ D-09 整字段省略 + D-10 number 不进
- **PD-DEC-06**: 测试策略(四类全覆盖)— D-18 + D-19 + D-20;详见各 PLAN.md 文件

完整 20 个 D-* 决策 + 5 个 Claude's Discretion 默认见 `.planning/milestones/v1.13-phases/18-page-data-extraction/18-CONTEXT.md`。

### Override Decisions

- **OVR-PD18-D18** (2026-10-16): D-18 规定 18-03=mock SVG E2E / 18-04=fixture SVG E2E;planner 实际执行 18-03=fixture 重生 + fixture E2E / 18-04=mock SVG E2E。偏差源自 fixture 重生必须在 fixture E2E 之前的工程约束(D-19 锁 5 fixture 重生)。**Functional coverage 完全等价**(4 类测试都在,只是 plan 号反),D-18 自身标注 `Reversibility: reversible — 仅测试策略`。**Override status: accepted by user during /gsd-plan-phase 18**(Phase 18 planning,decision-coverage-plan gate 19/20 pass,D-18 uncovered;用户选择 "Proceed anyway")。**Verify-phase 必须在 re-surface 此 override 并确认功能交付没受影响**。

### Decisions (v1.12 kickoff — Phase 17 SHIPPED, inherited by Phase 18)

- **CK-DEC-01**: 13-id 映射表走静态常量 `CONTENT_KEY_MAP: Record<string, string>` — 13 个 entry 一一对应;非映射 id 通过 `!== undefined` 守卫,字段直接省略(不是 null)
- **CK-DEC-02**: TOC N∈1..4 走 `toc-item-N-{number,carrier}` 模板字符串生成 entry;N∈5..8 静默跳过(`undefined → 不写字段`)— 未来扩展只需补 entry
- **CK-DEC-03**: 复用 v1.11 `templateType=1` 注入点 (`transform-to-pptel.ts:1535`) — contentKey 是 templateType=1 的"下游语义角色",两字段同生命周期写
- **CK-DEC-04**: TOC 多行 tspan 拆分策略 — carrier 内 leading inline text 单独发射 PPTTextElement(`directory_item_N`);带 `dy=` 的 tspan 各自发射 PPTTextElement(`directory_item_desc_N`,N 与父 carrier 共享);不带 dy 的子 tpan 不发射 desc(同前面 tspan 内容已并入第一行)
- **CK-DEC-05**: contentKey 仅对 `type === "text"` PPTElement 施加 — 类型守卫 `instanceof PPTTextElement` 或 `(el.type === "text")` 在 transformElement() 顶部拦截
- **CK-DEC-06**: 未知 id 永不报错也不警告 — 映射表之外 id 走 `=== undefined` 分支,字段省略;兼容未来 svg 新增 template 元素无静默

### Decisions (v1.11 kickoff — inherited)

- **TPL-DEC-01**: renderable element scope = `type ∈ {shape, text, image, path}`;非 renderable 节点不进 elements[],templateType 不写
- **TPL-DEC-02**: `<g id="*-template">` 子树传播范围 = renderable 后代(不只直接子元素);group 容器自身不进 elements 但作为祖先链 mark 广播器
- **TPL-DEC-03**: `content-object-slot-template` 是例外(无 templateType) — 数据证据:`exampels/green-art-teaching/svg_output/04_content.svg` 中此 id 持有 `data-pptx-bounds="98 180 1084 404"`,作为正文/分栏插入区域范围
- **TPL-DEC-04**: `data-pptx-bounds` 解析为 `slide.contentBounds: {x, y, width, height}`;空格分隔(纸面 PPTist 协议)
- **TPL-DEC-05**: 同 slide 多个 `content-object-slot-template` → 仅第一个;否则 JSON 字段不出现

### Decisions (v1.9 kickoff — inherited)

- **ANIM-DEC-01**: PPTAnimation 扩展 `extensions?: Record<string, any>` 字段 — 三方未映射字段全量保留到 extensions，JSON 无损
- **ANIM-DEC-02**: id 命名 `<group_id>__<uuidv4().substring(0, 8)>` — 双下划线分隔避开 PPTist 10-char id 冲突；跨 g 唯一
- **ANIM-DEC-03**: 父目录布局 `<parent>/svg_output/*.svg` + `<parent>/animations.json`（可选）— 接受三方约定
- **ANIM-DEC-04**: effect 映射走"能映射就映射 + 不能映射原样保留"策略；无需兜底映射表
- **ANIM-DEC-05**: turningMode 走映射表（48→12）；未对应 fallback `fade`
- **ANIM-DEC-06**: 转换结束打印 diagnostics 到 stderr，不进 JSON — 调试可见但不污染输出

### Decisions (v1.8 inherited)

- **FONT-VALIDATION-01**: Three-layer font validation defense (existsSync + magic-bytes + getBBox)
- **FONT-VALIDATION-02**: CLI startup gate synchronous
- **FONT-VALIDATION-03**: Real subprocess exit-code tests

### Blockers/Concerns

(None blocking — v1.14 closeout clean.)

Open tech debt carried into the next milestone:
- 30 项 acknowledged artifact(29 debug session + 1 verification gap)自 v1.8/v1.9 延续至今,连续 5 个 milestone 未动
- 13 个 pre-existing 测试失败(shadow 7 / shape-rx 3 / image-outline 1 / path-merge 1 / 另 1)— v1.14 未引入新回归(`git stash` 对照基线一致)
- PPTist 端对 uuid 后缀 id 的实际兼容性未做端到端验证(目前仅由 Phase 14 既有 76 个测试间接覆盖)

### Quick Tasks Completed

2 个 v1.7 时期(2026-07-23)的 quick task 仍留在 `.planning/quick/`,**未**归档进 v1.14(归属 milestone 不符,`milestone complete` 已知限制):
- `260723-gqv-text-json-top-svg-text-text-anchor-middl` — text-anchor="middle" 时 top 偏移补偿
- `260723-he6-constants-to-single-file` — 常量集中到 `src/constants.ts`

---

*State last updated: 2026-10-29 after v1.14 milestone closeout (verified_closeout — 16/16 NU-* covered, 2/2 plans shipped, archived to `.planning/milestones/v1.14-*`)*

## Session

**Last session:** 2026-10-29T07:13:42.837Z
**Stopped at:** Milestone v1.14 completed and archived
**Resume file:** .planning/milestones/v1.14-phases/19-nanoid-to-uuid-migration/19-VERIFICATION.md

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
