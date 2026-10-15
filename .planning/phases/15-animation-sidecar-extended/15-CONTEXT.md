---
phase: 15
name: animation-sidecar-extended
padded: 15
source: user-decisions (AskUserQuestion) + new ELEMENT_ANIMATIONS.md reference
---

# Phase 15 — animation-sidecar-extended — Context

**Gathered:** 2026-10-15
**Status:** Ready for planning

---

## Phase Boundary

Phase 15 extends Phase 14 (v1.9, SHIPPED 2026-10-15) with five behavior refinements
derived from the new `ELEMENT_ANIMATIONS.md` (770 lines) reference document:

1. **`effect: "none"` semantics** — When `groups[gid].effect === "none"`, `defaults.animation.effect === "none"`, or `defaults.transition.effect === "none"`, the corresponding animation/transition is suppressed entirely.
2. **Chrome-skip heuristic** — Groups whose id matches `bg`, `*-header`, `*-footer`, `*-decor`, `nav`, `watermark`, `logo`, `pagenumber` are skipped unless explicitly named in `animations.json`. Exception: header/footer whose text reaches median font size stays as ordinary target.
3. **Three-side row fields preserved verbatim in `extensions`** — All row fields (legacy names like `repeat_count`, `effect_options`, `trigger_shape`, `after_effect`, `sound`, `restart`, `auto_reverse`, `rewind`, `accelerate`, `decelerate`, `bounce_end`) stored as-is with camelCase top-level keys per D-13.
4. **Three-side → PPTist effect full coverage** — Map all 53 entrance_*, 33 emphasis_*, 53 exit_* keys to the PPTist 84-entry whitelist via ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP. Unmapped keys fall back to EFFECT_FALLBACK per D-15 (in → fadeIn, attention → pulse, out → fadeOut).
5. **`delay + duration` → PPTist `duration`** — Three-side row `delay` (seconds, finite non-negative) is added to `duration` (seconds); the sum is converted to milliseconds and clamped to `[100, 5000]` before assignment to `PPTAnimation.duration`.

---

## Implementation Decisions

### D-01 — `effect: "none"` semantics (ANIM-NONE-01/02/03)

- **D-01:** When `groups[gid].effect === "none"` (legacy single-effect form), `injectAnimations()` skips that group entirely — no `PPTAnimation` emitted, no warning. This aligns with `ELEMENT_ANIMATIONS.md` §2.4 "legacy `effect: none` removes the group from the sequence". — **Reversibility:** reversible (no observable behavior change for already-mapped groups).
- **D-02:** When `defaults.animation.effect === "none"`, `injectAnimations()` emits NO animations for ANY group on that slide, unless an individual row has its own `effect` (non-`none`). Honors `ELEMENT_ANIMATIONS.md` §2.3 "no object-animation sequence". — **Reversibility:** reversible.
- **D-03:** When `defaults.transition.effect === "none"` (or slide-level `transition.effect === "none"`), `slide.turningMode` is set to `'no'` (PowerPoint `TurningMode` value for "no transition"). Per `ELEMENT_ANIMATIONS.md` §2.1 `effect: "none"` "removes only the visual effect; timed advance remains" — PPTist `turningMode: 'no'` preserves `auto_advance` / `sound` semantics. — **Reversibility:** reversible.

### D-02 — Chrome-skip heuristic (ANIM-CHROME-01)

- **D-04:** Chrome-like group ids (`^bg$`, `^.*-header$`, `^.*-footer$`, `^.*-decor$`, `^nav$`, `^watermark$`, `^logo$`, `^pagenumber$`) are excluded from `injectAnimations()` candidates unless explicitly named in the slide's `groups` block (i.e., the user overrode the chrome heuristic). When excluded, NO warning emitted (silently skipped — chrome is design chrome, not content). — **Reversibility:** reversible.
- **D-05:** The "median font size = title block" exception in `ELEMENT_ANIMATIONS.md` §5.2 is **deferred to v2** — chrome-id heuristic simply skips; PPTist editing panel can ungroup / re-target if needed. (Implementation cost: font-size median calc requires parsing all `<text>` in group, then comparing to slide median — out of v1.10 scope.)

### D-03 — Three-side row fields preserved verbatim (ANIM-EXTS-01/02)

- **D-06:** ALL row fields in `effects[]` and legacy single-effect form are preserved in `extensions` with camelCased top-level keys per D-13. This includes: `repeat_count`, `repeat_duration`, `auto_reverse`, `rewind`, `accelerate`, `decelerate`, `bounce_end`, `restart`, `after_effect`, `sound`, `trigger_shape`, `effect_options`, `delay`, `order`, `duration`, `trigger`, `effect`, plus the original-mapped siblings (`originalEffect`, `originalDuration`, `originalTrigger`, `originalType`, `originalOrder`, `originalDelay`, `originalTriggerShape`). — **Reversibility:** costly (JSON shape addition, downstream consumers may parse).
- **D-07:** `effect_options` is camelCased to `effectOptions` at the **top-level** key, but nested keys (e.g., `effect_options.direction`, `effect_options.amount`) preserved verbatim per their original casing — preserving compatibility with PPTX OOXML's nested format. — **Reversibility:** reversible.
- **D-08:** `extensions` is omitted from JSON entirely when no fields preserved (Claude's Discretion from Phase 14 still applies) — `if (Object.keys(ext).length > 0) animation.extensions = ext`.

### D-04 — Three-side → PPTist effect full coverage (ANIM-MAP-EXT-01/02/03)

- **D-09:** Expand `ENTRANCE_MAP` to cover all 53 three-side entrance_* keys (currently 33). Use `ELEMENT_ANIMATIONS.md` §4 (Enumerated Value Reference) + `pptx_animation_presets.json` (canonical MsoAnimEffect registry) as the source of truth. Mapped to PPTist 84 ENTER_ANIMATIONS by visual semantic. — **Reversibility:** reversible.
- **D-10:** Expand `EMPHASIS_MAP` to cover all 33 three-side emphasis_* keys. — **Reversibility:** reversible.
- **D-11:** Expand `EXIT_MAP` to cover all 53 three-side exit_* keys. — **Reversibility:** reversible.
- **D-12:** Unmapped keys (after expansion) fall back to `EFFECT_FALLBACK[type]` (in → `fadeIn`, attention → `pulse`, out → `fadeOut`) per D-15; original key written to `extensions.originalEffect`. Diagnostic counter `unmappedEffectCount` increments. — **Reversibility:** reversible.

### D-05 — `delay + duration` → PPTist `duration` (ANIM-DELAY-01)

- **D-13:** `PPTAnimation.duration = clamp(round((row.delay + row.duration) * 1000), 100, 5000)`. When `row.delay === undefined`, treat as 0. When `row.duration === undefined`, fall back to `defaults.animation.duration` (D-21 already in effect). Final duration is the **total** time including delay. — **Reversibility:** reversible (single point of calc).
- **D-14:** Original `delay` preserved in `extensions.originalDelay` even after the merge. Diagnostic includes `delayAccumulatedSeconds` (sum of all delay values in the sidecar).

### D-06 — Inheritance chain (ANIM-INHERIT-01)

- **D-15:** Inheritance walks from outermost default inward per `ELEMENT_ANIMATIONS.md` §6:
  1. CLI defaults (fade transition + none animation) — implicit, no config file
  2. `defaults` block (deck-wide override)
  3. `slides.<slide>.transition` / `slides.<slide>.animation` (slide override)
  4. `slides.<slide>.groups.<id>.effects[]` row fields (inherits slide `animation`)
  5. Row `trigger` / `trigger_shape` (overrides slide Start)

  Implement as a single `resolveEffectiveRow(row, slideDefaults, deckDefaults)` function. — **Reversibility:** reversible.

### Out of Scope (deferred to v2)

- Morph transitions (§7 — `transition.effect: "morph"`, `morph.from`, `morph.pairs`) — requires PowerPoint object-name matching, out of scope for v1.10.
- Slide Zoom / Summary Zoom (§11 — unsupported by source format)
- 3D animations (§11 — unsupported by source format)
- Sound playback (§8 — `sound` field already in extensions per D-06; runtime playback is PPTist feature gap, not v1.10)
- Chrome "median font size = title" exception (D-05) — deferred
- `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` runtime semantics — only preserved in extensions; PPTist runtime gap

### Claude's Discretion

- The 53-entry ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP exact key lists: derive from `ELEMENT_ANIMATIONS.md` §4 + `pptx_animation_presets.json`. Researcher should produce the full tables.
- Diagnostic counter naming (`unmappedEffectCount`, `delayAccumulatedSeconds`, `chromeSkippedGroups`) — pick descriptive names.
- E2E test: should the new effect coverage be tested against `ELEMENT_ANIMATIONS.md` directly, or against the existing `exampels/202610131101001` fixture? Recommend the latter (regression-safe) + add a unit test for the unmapped-key fallback.

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 14 foundation (must remain stable)
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-CONTEXT.md` — Phase 14 D-decisions
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-VERIFICATION.md` — what was verified
- `E:/git/svg2json/src/animation-injector.ts` — current `injectAnimations()` (N→N fix at e7ad695)
- `E:/git/svg2json/src/mappers/animation.ts` — current mapping tables
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-02-SUMMARY.md` — what Phase 14 Wave 2 built

### New reference (primary)
- `E:/git/svg2json/ELEMENT_ANIMATIONS.md` — 770 lines, full reference for new behavior
  - §2.1: `transition.effect: none` semantics
  - §2.3: `animation.effect: none` semantics, generic modes (`auto`/`mixed`/`random`/`none`)
  - §2.4: `groups` forms (single effect + `effects[]`, `effect: none` removes group)
  - §3: row fields (delay, duration, trigger_shape, repeat_*, after_effect, sound, restart, auto_reverse, rewind, accelerate, decelerate, bounce_end, effect_options)
  - §4: enumerated value reference (canonical MsoAnimEffect registry)
  - §5: anchor & target resolution (top-level `<g id>` only, chrome-skip rules)
  - §6: inheritance chain
  - §7: morph (deferred)
  - §11: limitations

### Phase 14 prior analysis
- `E:/git/svg2json/animation-adaptation-analysis.md` — prior 203-key analysis (less authoritative than ELEMENT_ANIMATIONS.md)

### PPTist runtime
- `E:/git/svg2json/code/PPTist/src/types/slides.ts` (PPTAnimation / TurningMode / Slide)
- `E:/git/svg2json/code/PPTist/src/configs/animation.ts` (84 ENTER + 36 EXIT + 12 ATTENTION + 12 SLIDE)
- `E:/git/svg2json/code/PPTist/src/store/slides.ts` L84-111 (formatedAnimations)

### Instance fixture
- `E:/git/svg2json/exampels/202610131101001/animations.json` (13 covered slides)
- `E:/git/svg2json/exampels/202610131101001/svg_output/` (20 SVG)

---

## Existing Code Insights

### Reusable Assets

- `src/animation-injector.ts` `injectAnimations()` — Phase 14 N→N fix provides the row × element iteration hook. Phase 15 adds:
  - `effectiveRowTrigger` already handles trigger inheritance from `defaults.animation.trigger` (Phase 14 D-21)
  - `effectiveTransitionEffect` handles transition inheritance from `defaults.transition.effect` (Phase 14 D-21)
  - Phase 15 extends these with `effectiveRowEffect` (new), `isGroupChrome` (new), `effectiveRowDuration` (already in Phase 14 — Phase 15 merges delay into it per D-13)
- `src/mappers/animation.ts` `ENTRANCE_MAP` / `EMPHASIS_MAP` / `EXIT_MAP` — Phase 14 has partial coverage (33 / 12 / 13); Phase 15 expands to 53 / 33 / 53.
- `src/animation-types.ts` — already defines `AnimationsSidecarRow` with all fields from ELEMENT_ANIMATIONS.md §3; no new types needed.
- `src/animation-injector.test.ts` — Phase 14 tests pin mapping + extensions. Phase 15 extends with `effect: none` cases + chrome-skip cases + delay merge cases.

### Integration Points

- `src/animation-injector.ts` `injectAnimations()` — add early-exit for `effect: "none"` rows, chrome-id filter, delay merge
- `src/mappers/animation.ts` — expand 3 mapping tables
- `src/cli.ts` / `src/index.ts` — no changes needed (Phase 14 wiring is sufficient)
- `src/animation-injector.ts` `printDiagnostics()` — add `chromeSkippedGroups`, `unmappedEffectCount`, `delayAccumulatedSeconds` counters
- `tests/e2e/202610131101001.test.ts` — add assertions for new behaviors on existing fixture
- New: `tests/animation-none.test.ts` (effect:none cases), `tests/animation-chrome-skip.test.ts`, `tests/animation-delay-merge.test.ts`

### Established Patterns

- `extensions` shallow-copy pattern (`{ ...extensions }`) when distributing per element (Phase 14 N→N fix)
- `effectiveX` helper pattern (Phase 14 `effectiveRowDuration` / `effectiveRowTrigger` / `effectiveTransitionEffect`)
- Mapping table fallback pattern (`EFFECT_FALLBACK` per type)

---

## Specific Ideas

### Effect coverage expansion approach

Read `ELEMENT_ANIMATIONS.md` §4 for the canonical effect list (likely 53 entrance_* + 33 emphasis_* + 53 exit_*). For each three-side key:
1. If a visual equivalent exists in PPTist's 84-entry whitelist, map directly
2. If no equivalent, fall back to EFFECT_FALLBACK per type
3. Original key always preserved in `extensions.originalEffect`

The researcher should produce a complete coverage table by reading both the three-side source and the PPTist whitelist.

### `delay + duration` calc

```ts
const totalSeconds = (row.delay ?? 0) + (row.duration ?? effectiveRowDuration(row, defaults));
const durationMs = clamp(Math.round(totalSeconds * 1000), 100, 5000);
```

The original delay is preserved in `extensions.originalDelay`.

### Chrome-skip regex

```ts
const CHROME_REGEX = /^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/;
function isChromeGroupId(id: string): boolean {
  return CHROME_REGEX.test(id);
}
```

A group is "explicitly named" if `slides.<slide_id>.groups` has any key matching the id. Implementation: build the explicit-names Set from `entry.groups` keys; filter candidates via `if (chrome && !explicitNames.has(id)) skip;`.

### Morph / Slide Zoom / 3D

Documented in Out of Scope (deferred to v2). Researcher should NOT spend time on morph; focus on the 5 in-scope behaviors.

---

## Deferred Ideas

- **v2: Morph transitions** — `transition.effect: "morph"` + `morph.from` + `morph.pairs` — requires PowerPoint Selection Pane object-name matching (`!!<key>` markers)
- **v2: Chrome "median font size = title" exception** — requires font-size analysis
- **v2: Slide Zoom / Summary Zoom** — unsupported by source
- **v2: 3D animations** — unsupported by source
- **v2: Sound runtime playback** — PPTist feature gap
- **v2: `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` runtime semantics** — currently extensions-only

### Reviewed Todos (not folded)

(None — `cross_reference_todos` returns `todo_count: 0`)

---

*Phase: 15-animation-sidecar-extended*
*Context gathered: 2026-10-15*
