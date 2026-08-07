---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Text 段落合并
status: planning
last_updated: "2026-08-07T01:48:33.850Z"
last_activity: 2026-08-07
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

## Deferred Items

Items acknowledged and deferred at v1.8 milestone close on 2026-08-07:

| Category | Item | Status |
|----------|------|--------|
| debug | cover-tags-text-anchor-middle | unknown |
| debug | foreignobject-svg-offset | investigating |
| debug | g-fill-stroke-inheritance | investigating |
| debug | icon2-single-path-scale | investigating |
| debug | knowledge-base | unknown |
| debug | line-height-not-scaled | unknown |
| debug | nested-g-path-merge-top-offset | fixed |
| debug | path-header-coord-bug | unknown |
| debug | polygon-defs-background | investigating |
| debug | pptist-rich-text-spec | investigating |
| debug | rect-bg-gradient-display | investigating |
| debug | resvg-pkg-native-module | investigating |
| debug | svg-filter-rendering-bug | investigating |
| debug | svg-rect-text-vertical-alignment | diagnosed |
| debug | svg-tspan-attention-loss | awaiting_human_verify |
| debug | svg-use-fill-attribute | diagnosed |
| debug | svg-w-crossplatform | unknown |
| debug | text-in-circle-vertical-position | unknown |
| debug | text-in-circle-vertical-position-v2 | unknown |
| debug | text-in-circle-vertical-position-v3 | unknown |
| debug | text-tspan-color-and-order-bug | awaiting_human_verify |
| debug | text-tspan-content-splitting-bug | investigating |
| debug | text-tspan-fontsize-nesting | investigating |
| debug | text-tspan-mixed-content-loss | awaiting_human_verify |
| debug | text-width-comparison | investigating |
| debug | text-y-coordinate-textTop-bug | investigating |
| debug | ts-build-errors | unknown |
| debug | tspan-baseline-shift-pptist | in_progress |
| verification_gap | Phase 13: 13-VERIFICATION.md | gaps_found (closed by 13-02 plan) |

**Total deferred**: 29 items (28 debug sessions + 1 verification gap)

**Rationale**: v1.8 里程碑目标(CLI 字体验证)已 SHIPPED 且 24 tests green。剩余 28 个 debug session 跨越 v1.1–v1.7 阶段,与 v1.8 范围无直接依赖关系;Phase 13 verification gaps 已在 13-02 plan (commit aedb0e7) 中通过 magic-bytes pre-flight + 真实 subprocess exit-code 捕获修复。下一里程碑 (/gsd-new-milestone) 可挑选高优先级 item 继续推进。

# Project State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-08-07 — Milestone v1.9 started

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-23)

**Core value:** Accurately convert SVG visual elements to PowerPoint JSON with correct coordinates, transforms, and styles.
**Current focus:** Phase 13 — CLI Font Validation

## Accumulated Context

### Decisions (Phase 11)

- **TEXT-WHPASS-01:** Valid positive finite SVG text width/height values activate the passthrough fast path and skip resvg-js measurement.
- **TEXT-WHPASS-02:** Passthrough width uses `parsedWidth * scaleX + TEXT_WIDTH_SAFETY_MARGIN`; height uses `parsedHeight * scaleY`.
- **TEXT-WHPASS-03:** Missing, invalid, non-positive, or non-finite dimensions preserve the original measurement/fallback path.

### Decisions (v1.6)

- **REF-01:** Fix <g> nested transform accumulation — pass parent transform to mapCoordinates
- **REF-02:** Fix S/s, T/t command reflection calculation in toAbsolutePath
- **REF-03:** Handle clipPath/mask recursive expansion and coordinate scaling
- **REF-04:** Scale baseline-shift absolute values (e.g., "-5" → "-3.90625")
- **REF-05:** Modularize path utilities — extract to src/utils/path-utils.ts

### Decisions (v1.5)

- **USE-01:** Extract autoEmbedIcons to independent module src/svg-use-handler.ts
- **USE-02:** Use resvg-js to render external SVG to PNG, convert to base64 image element
- **USE-03:** Relative paths resolved based on main SVG file location via svgFilePath parameter

### Blockers/Concerns

- ⚠️ [Phase 11] Full-suite gate has 15 stable pre-existing failures across gradient, image-outline, path-merge, shadow, and shape-rx; an intermittent text-anchor failure also reproduces on baseline.
- ⚠️ [Phase 11] Code review WR-01 records possible small `textTop` deltas between heuristic and measured ascent; accepted as non-blocking by phase verification.
- ⚠️ [Phase 11] Security T11-03 tracks theoretical post-scale numeric overflow as low severity, below the `high` blocking threshold.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260723-gqv | text-anchor="middle" 时对 top 加 -5 补偿 | 2026-07-23 | d91da53 | [260723-gqv-text-json-top-svg-text-text-anchor-middl](./quick/260723-gqv-text-json-top-svg-text-text-anchor-middl/) |
| 260723-he6 | 集中所有命名常量到 src/constants.ts | 2026-07-23 | bbecb99 | [260723-he6-constants-to-single-file](./quick/260723-he6-constants-to-single-file/) |

---

*State last updated: 2026-07-23 after Phase 11 complete*

## Session

**Last session:** 2026-07-23T07:37:50.153Z
**Stopped at:** Phase 12 context gathered
**Resume file:** .planning/phases/12-font-preprocess/12-CONTEXT.md

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
