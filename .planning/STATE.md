---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Path 合并优化
current_phase: 12
current_phase_name: Font Preprocess — 统一字体为 Source Han Sans CN Regular
status: planning
stopped_at: Phase 12 context gathered
last_updated: "2026-07-23T07:37:50.171Z"
last_activity: 2026-07-23
last_activity_desc: Phase 11 complete, transitioned to Phase 12
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 4
  completed_plans: 3
---

# Project State

## Current Position

Phase: 12 — Font Preprocess — 统一字体为 Source Han Sans CN Regular
Plan: Not started
Status: Ready to plan
Last activity: 2026-07-23 — Phase 11 complete, transitioned to Phase 12

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-07-23)

**Core value:** Accurately convert SVG visual elements to PowerPoint JSON with correct coordinates, transforms, and styles.
**Current focus:** Phase 12 — Font Preprocess

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
