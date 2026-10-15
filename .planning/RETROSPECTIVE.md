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

| Metric | v1.8 | v1.9 |
|---|---|---|
| Phases | 1 | 1 |
| Plans | 2 | 3 |
| Feat commits | 9 | 9 |
| Files changed | 10 | 21 |
| LOC change | +1362 / -38 | +4888 / -75 |
| Tests passing | 24 + 14 N/A | 116 (66 unit + 50 E2E) |
| Open debug sessions | 29 acknowledged | 29 acknowledged (carried) |
| Verification gaps | 1 (Phase 13) | 1 (Phase 13 — same) |
| Closeout type | override_closeout | override_closeout |

---

*Last updated: 2026-10-15 after v1.9 closeout*
