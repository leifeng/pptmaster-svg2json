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
