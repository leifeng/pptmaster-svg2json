# Roadmap — svg-to-pptel

## Current Milestone: v1.1 transform-fixes

## Phases

- [ ] **Phase 1: Transform System Fixes** — Fix rotate-center, ellipse scaling, and text baseline offset

---

## Phase Details

### Phase 1: Transform System Fixes

**Goal**: Fix three critical SVG transform bugs: rotate-center support, ellipse center scaling, and text baseline offset configuration

**Depends on**: Nothing (first phase)

**Requirements**: REQ-TF-01, REQ-TF-02, REQ-TF-03

**Success Criteria** (what must be TRUE):

1. SVG `rotate(deg, cx, cy)` with explicit rotation center produces correct PPTElement coordinates — user can rotate shapes around any point, not just origin
2. Ellipse `cx`/`cy` are correctly scaled like `rx`/`ry` — center position matches visual on scaled canvas
3. Text baseline offset uses configurable `BASELINE_OFFSET_RATIO` constant (default 0.75) instead of magic number

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Transform System Fixes | 0/1 | Not started | - |

---

*Roadmap created: 2026-06-27 for milestone v1.1 transform-fixes*
