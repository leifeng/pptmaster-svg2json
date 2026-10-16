---
gsd_state_version: "1.0"
milestone: v1.12
milestone_name: Template Content Key Annotation
status: planning
last_updated: "2026-10-16T07:00:00.000Z"
last_activity: 2026-10-16
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

## Deferred Items

_Updated: 2026-10-15 during v1.9 closeout (30 items newly acknowledged via `audit-open acknowledge`)_

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

## Project State

## Current Position

Phase: Phase 17 (planning complete, awaiting plan-phase)
Plan: —
Status: Roadmap defined — 17/17 v1.12 requirements mapped to Phase 17
Last activity: 2026-10-16 — v1.12 roadmap created (Phase 17: template-content-key)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-10-16)

**Core value:** Accurately convert SVG visual elements to PowerPoint JSON with correct coordinates, transforms, and styles — preserving downstream-required semantic annotations (animations, template markers, content slots).
**Current focus:** Phase 17 — template-content-key (v1.12 milestone)

## Accumulated Context

### Decisions (v1.12 kickoff — pending Phase 17 plan-phase)

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
- **ANIM-DEC-02**: id 命名 `<group_id>__<nanoid(8)>` — 双下划线分隔避开 PPTist nanoid(10) 冲突；跨 g 唯一
- **ANIM-DEC-03**: 父目录布局 `<parent>/svg_output/*.svg` + `<parent>/animations.json`（可选）— 接受三方约定
- **ANIM-DEC-04**: effect 映射走"能映射就映射 + 不能映射原样保留"策略；无需兜底映射表
- **ANIM-DEC-05**: turningMode 走映射表（48→12）；未对应 fallback `fade`
- **ANIM-DEC-06**: 转换结束打印 diagnostics 到 stderr，不进 JSON — 调试可见但不污染输出

### Decisions (v1.8 inherited)

- **FONT-VALIDATION-01**: Three-layer font validation defense (existsSync + magic-bytes + getBBox)
- **FONT-VALIDATION-02**: CLI startup gate synchronous
- **FONT-VALIDATION-03**: Real subprocess exit-code tests

### Blockers/Concerns

(None — v1.12 kickoff clean; v1.11 templateType 注入点已就位可直接复用)

### Quick Tasks Completed

(None yet for v1.12 — Phase 17 plans TBD)

---

*State last updated: 2026-10-16 after v1.12 roadmap creation (Phase 17 scoped)*

## Session

**Last session:** 2026-10-16T07:00:00.000Z
**Stopped at:** v1.12 roadmap created
**Resume file:** .planning/REQUIREMENTS.md (Phase 17 mapped, 17/17)

## Operator Next Steps

- Start Phase 17 planning with `/gsd-plan-phase 17`
