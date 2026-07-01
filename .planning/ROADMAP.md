# Roadmap — svg-to-pptel v1.3

## Current Milestone: v1.3 resvg-js Text Measurement

## Phases

- [ ] **Phase 6: resvg-js Text Measurement** — Replace heuristic text measurement with resvg-js bounding box API

---

## Phase Details

### Phase 6: resvg-js Text Measurement

**Goal:** Text elements are measured using resvg-js rendered glyph bounding boxes instead of character-ratio heuristics

**Depends on:** Nothing (new module + targeted modifications)

**Requirements:** MEAS-01, MEAS-02, MEAS-03, MEAS-04, MEAS-05, MEAS-06, MEAS-07, MEAS-08, MEAS-09, MEAS-10, MEAS-11

**Success Criteria** (what must be TRUE):

1. SVG text elements convert with width/height matching rendered glyph bounding box (not heuristic estimate)
2. Multi-line text via tspan children produces correct merged bounding box
3. Font properties (family, size, weight, style, letter-spacing) are propagated to resvg-js measurement
4. Empty text falls back to heuristic estimate rather than zero-width
5. `transformElement()` text case uses `measureTextBBox()` — `calcTextWidthYaHei()` and `BASELINE_OFFSET_RATIO` are removed
6. All existing tests pass without regression

**Plans:** TBD

---

## Progress

| Phase | Requirements | Plans | Status | Completed |
|-------|-------------|-------|--------|-----------|
| Phase 6: resvg-js Text Measurement | MEAS-01~11 (11) | 0/1 | Not started | - |

**Coverage:** 11/11 v1.3 requirements mapped

---

*Roadmap created: 2026-07-01 for milestone v1.3 resvg-js Text Measurement*
