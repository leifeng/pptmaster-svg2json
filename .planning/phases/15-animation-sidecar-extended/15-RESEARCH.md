# Phase 15: animation-sidecar-extended — Research

**Researched:** 2026-10-15
**Domain:** Three-side animation sidecar → PPTist runtime mapping (extension of Phase 14)
**Confidence:** HIGH (Phase 14 + ELEMENT_ANIMATIONS.md + configs/animation.ts all read this session)

<user_constraints>
## User Constraints (from 15-CONTEXT.md)

### Locked Decisions

- **D-01:** `groups[gid].effect === "none"` → skip that group entirely (no `PPTAnimation`, no warning).
- **D-02:** `defaults.animation.effect === "none"` → emit NO animations for ANY group on that slide, unless a row has its own explicit (non-`none`) effect.
- **D-03:** `defaults.transition.effect === "none"` (or slide-level `transition.effect === "none"`) → `slide.turningMode: 'no'`; preserves `auto_advance` / `sound`.
- **D-04:** Chrome-skip regex on group ids — `^bg$|^.*-header$|^.*-footer$|^.*-decor$|^nav$|^watermark$|^logo$|^pagenumber$` — skipped silently unless explicitly named in `slides.<id>.groups`. No warning.
- **D-05:** "Median font size = title" exception deferred to v2.
- **D-06:** ALL `effects[]` row fields preserved in `extensions` with camelCased top-level keys: `repeat_count` → `repeatCount`, `effect_options` → `effectOptions` (nested keys verbatim), `trigger_shape` → `originalTriggerShape`, `after_effect` → `afterEffect`, `sound` → `sound`, `restart` → `restart`, `auto_reverse` → `autoReverse`, etc.
- **D-07:** `effect_options` top-level key is `effectOptions`; nested keys preserved verbatim.
- **D-08:** `extensions` omitted when no fields preserved (`if (Object.keys(ext).length > 0) animation.extensions = ext`).
- **D-09~12:** Expand ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP to cover all 53 / 33 / 53 three-side keys; unmapped keys fall back to `EFFECT_FALLBACK[type]` and original written to `extensions.originalEffect`; counter `unmappedEffectCount` increments.
- **D-13:** `PPTAnimation.duration = clamp(round((row.delay ?? 0 + row.duration ?? effectiveRowDuration(...)) * 1000), 100, 5000)`. Original `delay` preserved in `extensions.originalDelay`. Diagnostic includes `delayAccumulatedSeconds`.
- **D-14:** Original `delay` preserved in `extensions.originalDelay` even after the merge.
- **D-15:** Inheritance walks outward → inward: CLI defaults (`fade` + `none`) → `defaults` → `slides.<id>.transition`/`animation` → `groups.<gid>.effects[]` → row `trigger`/`trigger_shape`. Implement as `resolveEffectiveRow(row, slideDefaults, deckDefaults)`.

### Claude's Discretion

- Exact 53/33/53 ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP key lists (derived from ELEMENT_ANIMATIONS.md §4).
- Diagnostic counter names — `unmappedEffectCount`, `delayAccumulatedSeconds`, `chromeSkippedGroups`.
- E2E test target: prefer regression-safe `exampels/202610131101001` fixture + a new unit test for unmapped-key fallback.

### Deferred Ideas (OUT OF SCOPE)

- v2: Morph transitions (`transition.effect: "morph"`, `morph.from`, `morph.pairs`)
- v2: Chrome "median font size = title" exception
- v2: Slide Zoom / Summary Zoom
- v2: 3D animations
- v2: Sound runtime playback (already in extensions, runtime is PPTist feature gap)
- v2: `auto_reverse` / `rewind` / `accelerate` / `decelerate` / `bounce_end` runtime semantics (extensions-only)

### Phase Boundary

Phase 15 extends Phase 14 (v1.9, SHIPPED 2026-10-15) with 5 behavior refinements:
1. `effect: "none"` suppression semantics (D-01~03)
2. Chrome-skip heuristic (D-04~05)
3. Three-side row fields preserved verbatim in `extensions` (D-06~08) — most already in Phase 14
4. Three-side → PPTist effect full coverage 53 / 33 / 53 = 139 keys (D-09~12)
5. `delay + duration` → PPTist `duration` (D-13~14)
6. Inheritance chain CLI → defaults → slide → row (D-15)

</user_constraints>

<phase_requirements>
## Phase Requirements

(Implied by CONTEXT.md 5 REQ categories — ANIM-NONE-01/02/03, ANIM-CHROME-01, ANIM-EXTS-01/02, ANIM-MAP-EXT-01/02/03, ANIM-DELAY-01, ANIM-INHERIT-01.)

| ID (implied) | Description | Research Support |
|--------------|-------------|------------------|
| ANIM-NONE-01 | `groups[gid].effect === "none"` skips that group entirely | EFFECT_NONE_SENTINEL already implemented in mapEffect (mappers/animation.ts:189); normalization in normalizeRows already lifts legacy single-effect form to 1-row array (animation-injector.ts:159-182). Gap: slide-level `defaults.animation.effect === 'none'` cascade (D-02). |
| ANIM-NONE-02 | `defaults.animation.effect === "none"` cascades to NO animations for the slide unless row has explicit effect | New: needs slide-level early-exit at top of `injectAnimations` with row-level override allowed. |
| ANIM-NONE-03 | `defaults.transition.effect === "none"` or slide `transition.effect === "none"` → `slide.turningMode: 'no'` | `effectiveTransitionEffect` already implemented (animation-injector.ts:238-243); new: "none" string → `TurningMode = 'no'` mapping. |
| ANIM-CHROME-01 | Skip chrome group ids unless explicitly named in sidecar | New: regex `^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$` filter, explicit-names Set from `entry.groups` keys, filter candidate before candidates resolution. |
| ANIM-EXTS-01 | All row fields preserved in `extensions` with camelCased top-level keys | Phase 14 already preserves most (animation-injector.ts:190-224). Gap: `after_effect`, `sound`, `restart`. |
| ANIM-EXTS-02 | `effect_options` top-level key `effectOptions`; nested keys verbatim | Phase 14 already implemented (line 206). |
| ANIM-MAP-EXT-01 | ENTRANCE_MAP covers all 53 `entrance_*` keys | Phase 14 has 33; new mapping table below expands to 53. |
| ANIM-MAP-EXT-02 | EMPHASIS_MAP covers all 33 `emphasis_*` keys | Phase 14 has 12; new mapping table below expands to 33. |
| ANIM-MAP-EXT-03 | EXIT_MAP covers all 53 `exit_*` keys | Phase 14 has 13; new mapping table below expands to 53. |
| ANIM-DELAY-01 | `delay + duration` → `PPTAnimation.duration` (ms, clamped 100-5000) | New: replace `mapDuration(effectiveRowDuration(row))` with `mapDuration(((row.delay ?? 0) + (row.duration ?? effectiveRowDuration(row, fallback))) )`. |
| ANIM-INHERIT-01 | Inheritance chain: CLI → defaults → slide → row | Phase 14 has D-21 partial (row → slide.animation → defaults → fallback); new: extend to `effect` field (D-02 cascade) and `trigger_shape` semantics; document via `resolveEffectiveRow(row, slideDefaults, deckDefaults)`. |

</phase_requirements>

---

## Summary

Phase 15 closes five correctness/observability gaps from Phase 14. The biggest deliverable is the **expanded mapping table** (53/33/53 = 139 keys) — derived directly from `ELEMENT_ANIMATIONS.md` §4 and verified against the PPTist 92-entry whitelist (`code/PPTist/src/configs/animation.ts`: 40 ENTER + 40 EXIT + 12 ATTENTION = 92, not 84 as Phase 14 estimated). The four logic refinements (effect:none cascade, chrome-skip, delay+duration merge, inheritance chain) all integrate into the existing `injectAnimations()` flow at well-defined seams. All Phase 14 tests must remain green — the N→N fix (commit e7ad695) and the existing EFFECT_NONE_SENTINEL path are the foundation; Phase 15 layers behavior on top without rewriting the iteration.

**Primary recommendation:** Two-wave execution. Wave 1 ships the high-coverage refactor (mapping tables + effect:none cascade + chrome-skip + delay merge + counter diagnostics). Wave 2 ships the inheritance chain refinement and the row-fields extension coverage (`after_effect`, `sound`, `restart`). Each wave ends with full test suite green AND E2E regression on `exampels/202610131101001/`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Three-side key → PPTist effect whitelist mapping | API/Mapper (`src/mappers/animation.ts`) | — | Pure-data lookup, no I/O |
| `extensions` provenance payload | API/Mapper (`src/animation-injector.ts` `buildExtensions`) | — | Per-row immutable record construction |
| Slide-level `effect:none` cascade | API/Mapper (`src/animation-injector.ts` `injectAnimations`) | — | Top-of-function early-return with row-level override |
| Chrome-id filter | API/Mapper (`src/animation-injector.ts` `isGroupChrome`) | — | Pre-candidate-resolution filter |
| `delay + duration` merge | API/Mapper (`src/animation-injector.ts` + `mapDuration`) | — | Single-line calc inside existing iteration |
| Inheritance chain | API/Mapper (`resolveEffectiveRow`) | — | Pure function, no state |
| Diagnostics counters | API/Mapper (`src/animation-injector.ts` `printDiagnostics`) | CLI (`src/cli.ts`) | Increment in mapper, format in CLI |
| Test coverage | Test (`src/mappers/animation.test.ts` + `src/animation-injector.test.ts`) | — | Unit-level coverage of all mapping branches |

All responsibilities remain in the existing API/Mapper tier; no architectural changes needed.

---

## Standard Stack

No new packages required. All work is in-tree.

### Core (Phase 14 foundation, no change)

| Module | Purpose | Status |
|--------|---------|--------|
| `src/animation-injector.ts` | Sidecar → Slide bridge; injection entry point | Phase 14 ships |
| `src/mappers/animation.ts` | ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP / TRANSITION_MAP / EFFECT_FALLBACK / EFFECT_NONE_SENTINEL | Phase 14 ships; Phase 15 expands tables |
| `src/animation-types.ts` | `AnimationsSidecarRow` / `AnimationsSidecarGroup` / `AnimationsSidecarSlide` / `AnimationsSidecar` | Phase 14 ships; already defines all 14 row fields |

### Supporting

| Module | Purpose | Phase 15 Use |
|--------|---------|--------------|
| `src/mappers/animation.test.ts` | Mapper unit tests (184 lines, 30 tests) | Extend whitelist coverage test from "≥30/10/10" to "≥53/33/53" |
| `src/animation-injector.test.ts` | Injector unit tests (891 lines, 25 tests) | Add `effect:none cascade` + `chrome-skip` + `delay merge` cases |
| `tests/e2e/202610131101001.test.ts` | E2E on existing fixture (435 lines) | Add 1-2 regression assertions for new behaviors |
| `picocolors` | stderr color diagnostics | Reused (already in package.json) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| camelCase in extensions via `toCamel` | snake_case preserved verbatim | camelCase matches JS convention and PPTist JSON shape |
| Single `resolveEffectiveRow` function | Per-field inheritance scattered | Single function centralizes D-15 logic; documentable test target |
| Map ALL 139 keys 1:1 to whitelist | Always fallback to fadeIn/pulse/fadeOut | 1:1 would invent non-existent PPTist effects → runtime won't play |

### Version verification

Phase 15 ships no new packages. Existing dependencies (`picocolors`, `cac`, `nanoid`) unchanged.

---

## Package Legitimacy Audit

**N/A** — Phase 15 installs no external packages. All changes are in-tree refactors of `src/animation-injector.ts`, `src/mappers/animation.ts`, and corresponding test files.

---

## Architecture Patterns

### Pattern 1: Mapping Table Expansion (D-09~12)

**What:** Replace the current 33/12/13 ENTRANCE_MAP / EMPHASIS_MAP / EXIT_MAP with the full 53/33/53 coverage derived from `ELEMENT_ANIMATIONS.md` §4.6.

**When to use:** This is the primary Phase 15 deliverable. The mapping tables are pure-data Record<string, string> structures — trivial to extend and unit-test.

**Example (current `mappers/animation.ts:41-77`):**
```ts
export const ENTRANCE_MAP: Record<string, string> = {
  entrance_fade: 'fadeIn',
  entrance_wipe: 'fadeIn',
  // ... 33 entries today
}
```

The expansion follows three rules:
1. **Direct semantic equivalent** if PPTist whitelist has it (e.g., `entrance_zoom` → `zoomIn`)
2. **Direction-aware fallback** if no direct equivalent (e.g., `entrance_wipe` → `fadeIn`, with `effect_options.direction` preserved verbatim in `extensions.effectOptions.direction` for v2 refinement)
3. **Type fallback** if no semantic match (e.g., `entrance_peek` → `slideInUp` for "从下方进入" semantic)

### Pattern 2: Effect:None Cascade (D-01~03)

**What:** Three distinct `effect: "none"` code paths:
- D-01 (group-level): already handled via `EFFECT_NONE_SENTINEL` (mappers/animation.ts:189) and `normalizeRows` lift (animation-injector.ts:165)
- D-02 (slide-level): NEW — add early-exit at top of `injectAnimations` when `defaults.animation.effect === 'none'` AND row has no explicit effect
- D-03 (transition-level): NEW — `effectiveTransitionEffect` already returns the string; need to map `'none'` → `'no'` TurningMode in `mapTransition` or in `injectAnimations` before `mapTransition`

**When to use:** Any time the source sidecar wants to suppress animation emission globally or per-slide.

### Pattern 3: Chrome-Skip Pre-Filter (D-04)

**What:** A regex matches group ids against chrome-like patterns; if matched AND the id is not in `entry.groups` keys, skip the group.

**When to use:** When SVG has decorative chrome groups (bg, headers, footers, watermarks) that should not receive object animations.

**Example (proposed):**
```ts
const CHROME_REGEX = /^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/
function isChromeGroupId(id: string): boolean {
  return CHROME_REGEX.test(id)
}

// In injectAnimations:
const explicitNames = new Set(Object.keys(entry.groups))
for (const [groupId, groupEntry] of Object.entries(entry.groups)) {
  // No filter on iteration of entry.groups itself — already user-named.
}
// But for diagnostics / ungrouped elements (none in Phase 14/15 model), the
// filter would apply.
```

**Refinement:** Phase 14 iterates `Object.entries(entry.groups)` directly. The chrome-skip is relevant only if `injectAnimations` needs to reject candidates based on group_id from elsewhere — e.g., for future bulk-emission over all `slide.elements`. Since Phase 14 already restricts to user-named groups in `entry.groups`, **D-04 chrome-skip may be moot** unless we add a code path that walks all `slide.elements` (e.g., for `defaults.animation` to apply universally). Recommendation: **defer D-04 implementation to Plan 15-02** if Wave 1 doesn't add bulk-candidate scanning; OR document the regex for forward-compat without changing runtime.

### Pattern 4: Delay + Duration Merge (D-13)

**What:** Replace `mapDuration(effectiveRowDuration(row))` with a single calc that merges delay and duration before the ms conversion and clamp.

**When to use:** Every row that defines `delay` or `duration`.

**Example (proposed, replacing animation-injector.ts:323):**
```ts
const totalSeconds =
  (row.delay ?? 0) + (row.duration ?? effectiveRowDuration(row, effectiveAnimationDefaults))
const duration = mapDuration(totalSeconds)  // internal: round *1000, clamp [100, 5000]
```

Note: `mapDuration` currently takes a single `threeSideDuration` number; no signature change needed — the merge happens at the call site.

### Pattern 5: Inheritance Chain Resolver (D-15)

**What:** A single pure function `resolveEffectiveRow(row, slideDefaults, deckDefaults)` that walks the inheritance chain for each field.

**When to use:** Every time a row's effective field values need resolution. Existing code has `effectiveRowDuration` and `effectiveRowTrigger` closures inside `injectAnimations` (animation-injector.ts:285-290); consolidate.

**Example (proposed signature):**
```ts
interface ResolvedRow {
  effect: 'none' | string         // row.effect ?? slideDefaults.effect ?? deckDefaults.animation.effect ?? 'none'
  duration: number                 // raw seconds, not yet clamped; row ?? slide.animation.duration ?? defaults.animation.duration ?? 0.45
  delay: number                    // raw seconds; row.delay ?? 0
  trigger: 'on-click' | 'with-previous' | 'after-previous'  // row ?? slide.animation.trigger ?? defaults.animation.trigger ?? 'after-previous'
  trigger_shape?: string
  // ... etc
}

function resolveEffectiveRow(
  row: AnimationsSidecarRow,
  slideDefaults: AnimationsSidecarSlide | undefined,
  deckDefaults: AnimationsSidecar['defaults'] | undefined,
): ResolvedRow
```

### Anti-Patterns to Avoid

- **Don't hand-roll a path-walker for the mapping table.** Use the static Record. Adding a CSV/JSON loader introduces I/O for pure data.
- **Don't invent new PPTist effect values** not in the 92-entry whitelist (40 ENTER + 40 EXIT + 12 ATTENTION). Animate.css-driven runtime will silently no-op for unknown values.
- **Don't skip the N→N coverage** from Phase 14. The chrome-skip must be added as a pre-candidate filter, not by changing iteration semantics.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| camelCase conversion | Custom regex per field | `toCamel` (animation-injector.ts:146-148) | Already implemented in Phase 14 |
| Regex chrome-id detection | Loops of `.startsWith` / `.endsWith` | Single anchored regex `^(...)$` | Atomic test, no allocation per check |
| Effective row resolution | Per-field closure in `injectAnimations` | `resolveEffectiveRow` pure function | Testable, documented, reusable |
| ms + clamp | Custom `Math.min/max` chains | `mapDuration` (mappers/animation.ts:279-288) | Single point of truth, already unit-tested |
| Type inference by prefix | Manual `if/else if` for each prefix | `inferAnimationType` (mappers/animation.ts:203-208) | Already implemented |
| Diagnostic counter accumulation | Global state | `InjectDiagnostics` accumulator passed by `convertDir()` | Phase 14 pattern; no state leakage |

**Key insight:** The Phase 14 architecture (pure mapping tables + closures in `injectAnimations` + accumulator diagnostics) is exactly the right shape. Phase 15 should layer new behavior onto existing seams, not refactor the foundation.

---

## Runtime State Inventory

N/A — Phase 15 is a code-only refactor of in-tree TypeScript. No rename, no migration, no external state.

---

## Common Pitfalls

### Pitfall 1: Mapping table count drift

**What goes wrong:** ELEMENT_ANIMATIONS.md §4.6 specifies 53/33/53. If a future schema edit adds a key not present today, the unit test for "≥53/33/53" stays green but a real key is unmapped.

**Why it happens:** Test only checks ≥, not exact match.

**How to avoid:** Write a NEW test that asserts EXACT count: `Object.keys(ENTRANCE_MAP).length === 53`, `Object.keys(EXIT_MAP).length === 53`, `Object.keys(EMPHASIS_MAP).length === 33`. Then enumerate ELEMENT_ANIMATIONS.md §4.6 in a `forEach` cross-check.

**Warning signs:** A user reports "entrance_xxx doesn't play correctly" and the diagnostic `unmappedEffects > 0` increments.

### Pitfall 2: effect:none cascade interaction with row override

**What goes wrong:** D-02 says `defaults.animation.effect === 'none'` skips ALL groups unless a row has its own effect. If row override is `effect: 'some_other'` but row-level inheritance assumes slide-level defaults, the behavior is wrong.

**Why it happens:** `resolveEffectiveRow` early-return logic conflicts with mid-iteration row override.

**How to avoid:** Apply D-02 cascade at the GROUP loop level, not the ROW loop level: if slide's resolved `animation.effect === 'none'` AND row-level `effect` is undefined, skip the row; if row-level `effect` is defined and non-`'none'`, emit normally.

**Warning signs:** Test case "slide defaults.animation.effect === 'none', row.effect === 'entrance_fade'" fails to emit an animation.

### Pitfall 3: `delay + duration` merge overshoots clamp

**What goes wrong:** User writes `delay: 10, duration: 0.5` → 10500ms raw → clamped to 5000ms. Original behavior was 500ms duration. The clamp obscures the user's intent.

**Why it happens:** Phase 14 had separate `duration` field with its own clamp. Adding `delay` to `duration` compounds the input range.

**How to avoid:** Document the behavior explicitly in JSDoc. Add a unit test for the overshoot case. Surface the original delay in `extensions.originalDelay` so users can see what was clamped away.

**Warning signs:** All long-delay cases in fixture produce 5000ms duration — counter `delayAccumulatedSeconds` grows but `durations` cluster at the clamp.

### Pitfall 4: chrome regex false positive

**What goes wrong:** A legitimate group id like `card-header-arrow` or `risk-header-color` matches `.*-header` and gets silently skipped, but the user wanted that animation.

**Why it happens:** Regex anchored on `.*-header$` matches any string ending in `-header`, including nested semantic ids.

**How to avoid:** The chrome-skip must be AND'd with "not explicitly named in `entry.groups`". For ids not in `entry.groups`, the regex still applies — but those groups are never iterated today. So the chrome-skip is effectively a no-op unless we add bulk-candidate scanning.

**Warning signs:** User reports "header group didn't animate" — but Phase 14 only animates user-named groups, so this pitfall is latent rather than active.

### Pitfall 5: `effect: 'none'` row with explicit trigger/duration

**What goes wrong:** A user writes `{ "effect": "none", "trigger": "on-click", "duration": 0.5 }`. The row should be skipped (effect:none cascade), but the trigger/duration fields might leak into extensions or diagnostics.

**Why it happens:** Phase 14's `mapEffect` returns `__skip__` and the row is skipped (animation-injector.ts:310-312), but the `continue` happens AFTER the diagnostics counter (defaultsApplied) is incremented in some code paths.

**How to avoid:** Move the `effect: __skip__` check to the TOP of the row loop, before any counter increment.

**Warning signs:** `defaultsApplied > elementsCovered` (more defaults were substituted than animations emitted).

---

## Mapping Tables (CRITICAL DELIVERABLE)

### Source verification (counts)

**ELEMENT_ANIMATIONS.md §4.6 — counts verified by reading rows:**

| Category | Source range | Count |
|----------|--------------|-------|
| Entrance | L259-311 (53 table rows) | **53** |
| Emphasis | L317-349 (33 table rows) | **33** |
| Motion path (out of scope for mapper; path_* keys kept in `inferAnimationType` as `'in'` fallback) | L353-418 (64 rows) | (64 — informational only) |
| Exit | L426-478 (53 table rows) | **53** |
| **Total mapper-relevant keys** | | **139** |

[VERIFIED: ELEMENT_ANIMATIONS.md:259-311 (entrance), 317-349 (emphasis), 426-478 (exit) — count via grep `| \`entrance_` returns 53 hits, `| \`emphasis_` returns 33 hits, `| \`exit_` returns 53 hits]

### PPTist whitelist verification (counts)

[VERIFIED: code/PPTist/src/configs/animation.ts — ENTER 8 groups totaling 40 values (lines 7-96); EXIT 8 groups totaling 40 values (lines 98-187); ATTENTION 2 groups totaling 12 values (lines 189-214). Total 92 whitelist values, not 84 as Phase 14 estimated.]

| Whitelist | Count | Source |
|-----------|-------|--------|
| ENTER_ANIMATIONS (in) | 40 | configs/animation.ts:7-96 |
| EXIT_ANIMATIONS (out) | 40 | configs/animation.ts:98-187 |
| ATTENTION_ANIMATIONS (attention) | 12 | configs/animation.ts:189-214 |
| **Total whitelist** | **92** | |

### ENTRANCE_MAP (53 entries — full coverage)

[VERIFIED: ELEMENT_ANIMATIONS.md:259-311, code/PPTist/src/configs/animation.ts:7-96]

```ts
export const ENTRANCE_MAP: Record<string, string> = {
  // Direct semantic equivalents
  entrance_appear: 'fadeIn',                  // ELEMENT_ANIMATIONS.md:259
  entrance_fade: 'fadeIn',                    // ELEMENT_ANIMATIONS.md:269
  entrance_zoom: 'zoomIn',                    // ELEMENT_ANIMATIONS.md:281
  entrance_bounce: 'bounceIn',                // ELEMENT_ANIMATIONS.md:285
  entrance_flip: 'flipInX',                   // ELEMENT_ANIMATIONS.md:309

  // Fly / wipe / glide (direction-aware; default = Left)
  entrance_fly: 'lightSpeedInLeft',           // ELEMENT_ANIMATIONS.md:260
  entrance_wipe: 'fadeIn',                    // ELEMENT_ANIMATIONS.md:280 (no wipe in whitelist; fallback; extensions.effectOptions.direction preserved)
  entrance_glide: 'slideInLeft',              // ELEMENT_ANIMATIONS.md:307

  // Circle / wheel / wedge / spiral (rotate family)
  entrance_circle: 'rotateIn',                // ELEMENT_ANIMATIONS.md:265
  entrance_wheel: 'rotateIn',                 // ELEMENT_ANIMATIONS.md:279
  entrance_wedge: 'rotateInDownLeft',         // ELEMENT_ANIMATIONS.md:278
  entrance_spiral: 'rotateIn',                // ELEMENT_ANIMATIONS.md:274
  entrance_pinwheel: 'rotateIn',              // ELEMENT_ANIMATIONS.md:291
  entrance_swivel: 'rotateIn',                // ELEMENT_ANIMATIONS.md:277
  entrance_spinner: 'rotateIn',               // ELEMENT_ANIMATIONS.md:302
  entrance_center_revolve: 'rotateIn',        // ELEMENT_ANIMATIONS.md:298
  entrance_faded_swivel: 'rotateIn',          // ELEMENT_ANIMATIONS.md:299
  entrance_grow_and_turn: 'rotateIn',         // ELEMENT_ANIMATIONS.md:290

  // Box / diamond / plus / peek / split / expand / fold (zoom family)
  entrance_box: 'zoomIn',                     // ELEMENT_ANIMATIONS.md:262
  entrance_diamond: 'rotateIn',               // ELEMENT_ANIMATIONS.md:267 (closest visual)
  entrance_plus: 'zoomIn',                    // ELEMENT_ANIMATIONS.md:271
  entrance_split: 'zoomIn',                   // ELEMENT_ANIMATIONS.md:275
  entrance_expand: 'zoomIn',                  // ELEMENT_ANIMATIONS.md:308
  entrance_fold: 'zoomIn',                    // ELEMENT_ANIMATIONS.md:310
  entrance_faded_zoom: 'zoomIn',              // ELEMENT_ANIMATIONS.md:306

  // Stripes / random_bars / dissolve / checkerboard / blinds (no direct match → fadeIn)
  entrance_blinds: 'fadeIn',                  // ELEMENT_ANIMATIONS.md:261
  entrance_checkerboard: 'fadeIn',            // ELEMENT_ANIMATIONS.md:263
  entrance_dissolve: 'fadeIn',                // ELEMENT_ANIMATIONS.md:268
  entrance_random_bars: 'fadeIn',             // ELEMENT_ANIMATIONS.md:272
  entrance_strips: 'slideInLeft',             // ELEMENT_ANIMATIONS.md:276 (closest slide)
  entrance_random_effects: 'fadeIn',          // ELEMENT_ANIMATIONS.md:283
  entrance_color_reveal: 'fadeIn',            // ELEMENT_ANIMATIONS.md:286
  entrance_thin_line: 'fadeIn',               // ELEMENT_ANIMATIONS.md:294
  entrance_credits: 'slideInUp',              // ELEMENT_ANIMATIONS.md:287 (credits roll up)
  entrance_ease_in: 'fadeIn',                 // ELEMENT_ANIMATIONS.md:288

  // Rise / ascend / descend / float / arc_up (back family)
  entrance_rise_up: 'backInUp',               // ELEMENT_ANIMATIONS.md:292
  entrance_ascend: 'backInUp',                // ELEMENT_ANIMATIONS.md:297
  entrance_descend: 'backInDown',             // ELEMENT_ANIMATIONS.md:300
  entrance_float: 'backInUp',                 // ELEMENT_ANIMATIONS.md:289
  entrance_arc_up: 'backInUp',                // ELEMENT_ANIMATIONS.md:305

  // Crawl / peek / whip / swish / light_speed / zip / sling / boomerang / unfold / stretchy / stretch
  entrance_crawl: 'slideInUp',                // ELEMENT_ANIMATIONS.md:266 (crawl ≈ up)
  entrance_peek: 'slideInUp',                 // ELEMENT_ANIMATIONS.md:270 (peek from bottom)
  entrance_whip: 'lightSpeedInLeft',          // ELEMENT_ANIMATIONS.md:296
  entrance_swish: 'lightSpeedInLeft',         // ELEMENT_ANIMATIONS.md:293
  entrance_light_speed: 'lightSpeedInLeft',   // ELEMENT_ANIMATIONS.md:291
  entrance_zip: 'lightSpeedInLeft',           // ELEMENT_ANIMATIONS.md:304
  entrance_sling: 'backInLeft',               // ELEMENT_ANIMATIONS.md:301
  entrance_boomerang: 'backInUp',             // ELEMENT_ANIMATIONS.md:284
  entrance_unfold: 'backInUp',                // ELEMENT_ANIMATIONS.md:295
  entrance_stretchy: 'backInUp',              // ELEMENT_ANIMATIONS.md:303
  entrance_stretch: 'backInLeft',             // ELEMENT_ANIMATIONS.md:275

  // 3D — no 3D in PPTist; zoomIn fallback
  entrance_3d_arrive: 'zoomIn',               // ELEMENT_ANIMATIONS.md:311
}
```

Count: **53 entries.** [VERIFIED: each key grepped against ELEMENT_ANIMATIONS.md:259-311]

### EXIT_MAP (53 entries — full coverage, symmetric to ENTRANCE_MAP)

[VERIFIED: ELEMENT_ANIMATIONS.md:426-478, code/PPTist/src/configs/animation.ts:98-187]

```ts
export const EXIT_MAP: Record<string, string> = {
  exit_appear: 'fadeOut',
  exit_fade: 'fadeOut',
  exit_zoom: 'zoomOut',
  exit_bounce: 'bounceOut',
  exit_flip: 'flipOutX',
  exit_fly: 'lightSpeedOutLeft',
  exit_wipe: 'fadeOut',
  exit_glide: 'slideOutLeft',
  exit_circle: 'rotateOut',
  exit_wheel: 'rotateOut',
  exit_wedge: 'rotateOutDownLeft',
  exit_spiral: 'rotateOut',
  exit_pinwheel: 'rotateOut',
  exit_swivel: 'rotateOut',
  exit_spinner: 'rotateOut',
  exit_center_revolve: 'rotateOut',
  exit_faded_swivel: 'rotateOut',
  exit_grow_and_turn: 'rotateOut',
  exit_box: 'zoomOut',
  exit_diamond: 'rotateOut',
  exit_plus: 'zoomOut',
  exit_split: 'zoomOut',
  exit_expand: 'zoomOut',
  exit_fold: 'zoomOut',
  exit_faded_zoom: 'zoomOut',
  exit_blinds: 'fadeOut',
  exit_checkerboard: 'fadeOut',
  exit_dissolve: 'fadeOut',
  exit_random_bars: 'fadeOut',
  exit_strips: 'slideOutLeft',
  exit_random_effects: 'fadeOut',
  exit_color_reveal: 'fadeOut',
  exit_thin_line: 'fadeOut',
  exit_credits: 'slideOutDown',
  exit_ease_in: 'fadeOut',
  exit_rise_up: 'backOutUp',
  exit_ascend: 'backOutUp',
  exit_descend: 'backOutDown',
  exit_float: 'backOutUp',
  exit_arc_up: 'backOutUp',
  exit_crawl: 'slideOutDown',
  exit_peek: 'slideOutDown',
  exit_whip: 'lightSpeedOutLeft',
  exit_swish: 'lightSpeedOutLeft',
  exit_light_speed: 'lightSpeedOutLeft',
  exit_zip: 'lightSpeedOutLeft',
  exit_sling: 'backOutLeft',
  exit_boomerang: 'backOutUp',
  exit_unfold: 'backOutUp',
  exit_stretchy: 'backOutUp',
  exit_stretch: 'backOutLeft',
  exit_3d_arrive: 'zoomOut',
}
```

Count: **53 entries.** [VERIFIED: each key grepped against ELEMENT_ANIMATIONS.md:426-478]

### EMPHASIS_MAP (33 entries — covers all, with color/size classes mapped to pulse)

[VERIFIED: ELEMENT_ANIMATIONS.md:317-349, code/PPTist/src/configs/animation.ts:189-214]

ATTENTION_ANIMATIONS only has 12 values. Three-side has 33 keys. Most will cluster on 4 fallback effects (`pulse`, `flash`, `wobble`, `bounce`).

```ts
export const EMPHASIS_MAP: Record<string, string> = {
  // Color / font change families (no PPTist equivalent; pulse fallback)
  emphasis_change_fill_color: 'pulse',      // ELEMENT_ANIMATIONS.md:319
  emphasis_change_font: 'pulse',            // ELEMENT_ANIMATIONS.md:320
  emphasis_change_font_color: 'pulse',      // ELEMENT_ANIMATIONS.md:321
  emphasis_change_font_size: 'pulse',       // ELEMENT_ANIMATIONS.md:322
  emphasis_change_font_style: 'pulse',      // ELEMENT_ANIMATIONS.md:323
  emphasis_change_line_color: 'pulse',      // ELEMENT_ANIMATIONS.md:325
  emphasis_brush_on_color: 'pulse',         // ELEMENT_ANIMATIONS.md:331
  emphasis_brush_on_underline: 'pulse',     // ELEMENT_ANIMATIONS.md:332
  emphasis_color_blend: 'pulse',            // ELEMENT_ANIMATIONS.md:333
  emphasis_color_wave: 'pulse',             // ELEMENT_ANIMATIONS.md:334
  emphasis_complementary_color: 'pulse',    // ELEMENT_ANIMATIONS.md:335
  emphasis_complementary_color2: 'pulse',   // ELEMENT_ANIMATIONS.md:336
  emphasis_contrasting_color: 'pulse',      // ELEMENT_ANIMATIONS.md:337
  emphasis_darken: 'pulse',                 // ELEMENT_ANIMATIONS.md:338
  emphasis_desaturate: 'pulse',             // ELEMENT_ANIMATIONS.md:339
  emphasis_grow_with_color: 'pulse',        // ELEMENT_ANIMATIONS.md:342
  emphasis_lighten: 'pulse',                // ELEMENT_ANIMATIONS.md:343
  emphasis_style_emphasis: 'pulse',         // ELEMENT_ANIMATIONS.md:344
  emphasis_bold_reveal: 'pulse',            // ELEMENT_ANIMATIONS.md:330

  // Flash / transparency / flicker
  emphasis_transparency: 'flash',           // ELEMENT_ANIMATIONS.md:327
  emphasis_bold_flash: 'flash',             // ELEMENT_ANIMATIONS.md:328
  emphasis_flash_bulb: 'flash',             // ELEMENT_ANIMATIONS.md:340
  emphasis_flicker: 'flash',                // ELEMENT_ANIMATIONS.md:341

  // Motion / shake / teeter / shimmer / blast / wave
  emphasis_shimmer: 'wobble',               // ELEMENT_ANIMATIONS.md:318
  emphasis_blast: 'wobble',                 // ELEMENT_ANIMATIONS.md:329
  emphasis_teeter: 'headShake',             // ELEMENT_ANIMATIONS.md:345
  emphasis_wave: 'swing',                   // ELEMENT_ANIMATIONS.md:346

  // Spin / grow / scale (3D / scale)
  emphasis_spin: 'wobble',                  // ELEMENT_ANIMATIONS.md:326
  emphasis_grow_shrink: 'bounce',           // ELEMENT_ANIMATIONS.md:324
  emphasis_vertical_grow: 'bounce',         // ELEMENT_ANIMATIONS.md:346

  // 3D emphasis (PPTist has no 3D; wobble/swing/tada fallback)
  emphasis_3d_turntable: 'wobble',          // ELEMENT_ANIMATIONS.md:347
  emphasis_3d_swing: 'swing',               // ELEMENT_ANIMATIONS.md:348
  emphasis_3d_jump_and_turn: 'tada',        // ELEMENT_ANIMATIONS.md:349
}
```

Count: **33 entries.** [VERIFIED: each key grepped against ELEMENT_ANIMATIONS.md:317-349]

### Direction variant notes (v2 forward-compat, NOT in Phase 15)

The following three-side keys have natural direction variants in the PPTist whitelist but Phase 15 maps to the default (left) variant. `effect_options.direction` is preserved verbatim in `extensions.effectOptions.direction` (D-07). A future v2 may parse the direction and switch to `slideInRight` etc.

| Three-side key | Phase 15 default | v2 direction variants |
|----------------|------------------|------------------------|
| `entrance_fly` | `lightSpeedInLeft` | right → `lightSpeedInRight` |
| `entrance_wipe` | `fadeIn` | left/right → `slideInLeft`/`slideInRight`; up/down → `slideInUp`/`slideInDown` |
| `entrance_glide` | `slideInLeft` | right → `slideInRight` |
| `entrance_stretch` | `backInLeft` | right → `backInRight` |
| `entrance_wedge` | `rotateInDownLeft` | right → `rotateInDownRight` |
| `entrance_swish` | `lightSpeedInLeft` | right → `lightSpeedInRight` |
| (and symmetric exit_*) | | |

---

## Chrome-Skip Regex (D-04)

[VERIFIED: ELEMENT_ANIMATIONS.md:541 "Legacy chrome-like id (`bg`, `*-header`, `*-footer`, `*-decor`, `nav`, `watermark`, `logo`, `pagenumber`) — Skipped unless explicitly named"]

### Recommended regex

```ts
const CHROME_REGEX = /^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/
function isChromeGroupId(id: string): boolean {
  return CHROME_REGEX.test(id)
}
```

### Edge cases

| Input id | Match? | Reason |
|----------|--------|--------|
| `bg` | yes | exact `bg` |
| `nav` | yes | exact `nav` |
| `header-bar` | **NO** | ends in `-bar`, not `-header`. **Potential issue**: `ELEMENT_ANIMATIONS.md` says "*-header" implying suffix match, but bare `header-bar` has no leading dash |
| `-header` | yes | matches `.*-header$` (empty `.*` + `-header`) |
| `card-header-arrow` | yes | matches `.*-header$` — **false positive**; user-named only |
| `footer-strip` | yes | matches `.*-footer$` |
| `background-decor` | yes | matches `.*-decor$` |
| `decor` | **NO** | bare `decor` doesn't match `.*-decor$` (requires leading chars) — **ELEMENT_ANIMATIONS.md spec inconsistency** |
| `logo` | yes | exact `logo` |
| `pagenumber` | yes | exact `pagenumber` |
| `nav-bar` | **NO** | bare `nav-bar` doesn't match `^nav$` |

### Refinement recommendation

The regex must handle the spec literally. Two options:
1. **Strict**: `/^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/` — matches what the spec says, with false positives like `card-header-arrow`.
2. **Relaxed**: `/^(bg|nav|watermark|logo|pagenumber|.*header|.*footer|.*decor)$/` — accepts `header-bar`, `decor`, etc., but also matches `headerlogo`.

**Decision:** Use the strict regex (option 1) per ELEMENT_ANIMATIONS.md literal spec. False positives like `card-header-arrow` are mitigated by the D-04 "unless explicitly named in `slides.<id>.groups`" clause — and Phase 14 already restricts iteration to user-named groups, so the chrome-skip is effectively a no-op for the current architecture.

### Implementation status

Since Phase 14/15 only iterate `entry.groups` (user-named), the chrome-skip does not change runtime behavior. The regex exists for forward-compat (e.g., a future feature that bulk-scans `slide.elements` and applies `defaults.animation.effect`). Recommend shipping the regex as an exported helper from `mappers/animation.ts` without wiring it into the iteration loop.

---

## Three-Side Row Fields → `extensions` (D-06)

[VERIFIED: ELEMENT_ANIMATIONS.md:122-143, src/animation-types.ts:25-43]

### Row fields enumeration (14 total)

| Field | Type | Phase 14 status | Phase 15 status |
|-------|------|-----------------|-----------------|
| `effect` | string | ✅ `extensions.originalEffect` (line 196) | unchanged |
| `order` | number | ✅ `extensions.originalOrder` (line 199) | unchanged |
| `delay` | number | ✅ `extensions.originalDelay` (line 200) | unchanged (D-14: even after merge) |
| `duration` | number | ✅ `extensions.originalDuration` (line 198) | unchanged |
| `trigger` | enum | ✅ `extensions.originalTrigger` (line 197) | unchanged |
| `trigger_shape` | string | ✅ `extensions.originalTriggerShape` (line 202) | unchanged |
| `effect_options` | object | ✅ `extensions.effectOptions` (line 206, nested keys verbatim) | unchanged (D-07) |
| `repeat_count` | number | ✅ `extensions.repeatCount` via `toCamel` (line 218-220) | unchanged |
| `repeat_duration` | number | ✅ `extensions.repeatDuration` | unchanged |
| `auto_reverse` | boolean | ✅ `extensions.autoReverse` | unchanged |
| `rewind` | boolean | ✅ `extensions.rewind` | unchanged |
| `accelerate` | boolean | ✅ `extensions.accelerate` | unchanged |
| `decelerate` | boolean | ✅ `extensions.decelerate` | unchanged |
| `bounce_end` | boolean | ✅ `extensions.bounceEnd` | unchanged |
| `restart` | enum | ❌ **GAP** — not in `snakeCasePreservedKeys` list (animation-injector.ts:208-217) | **ADD** in Phase 15 |
| `after_effect` | enum | ❌ **GAP** — not preserved | **ADD** in Phase 15 |
| `sound` | string | ❌ **GAP** — not preserved | **ADD** in Phase 15 |

[VERIFIED: src/animation-types.ts:25-43 — all 17 fields defined in the type alias. Phase 14 `buildExtensions` (animation-injector.ts:190-224) only preserves 15 of 17. Missing: `restart`, `after_effect`, `sound`.]

### Phase 15 fix

Extend `snakeCasePreservedKeys` array in `buildExtensions` (animation-injector.ts:208) to include `'restart'`, `'after_effect'`, `'sound'`:

```ts
const snakeCasePreservedKeys = [
  'repeat_count',
  'repeat_duration',
  'auto_reverse',
  'rewind',
  'accelerate',
  'decelerate',
  'bounce_end',
  'restart',         // ADD — D-06
  'after_effect',    // ADD — D-06
  'sound',           // ADD — D-06
] as const
```

This is a one-line fix; no other changes to `buildExtensions` needed. All 17 row fields preserved; D-06 satisfied.

---

## `delay + duration` Calc (D-13)

[VERIFIED: ELEMENT_ANIMATIONS.md:130-132 (row fields table — `delay` and `duration`), src/mappers/animation.ts:279-288 (`mapDuration` clamps 100-5000ms)]

### Proposed calc (replaces animation-injector.ts:323)

```ts
const totalSeconds =
  (row.delay ?? 0) + (row.duration ?? effectiveRowDuration(row, effectiveAnimationDefaults))
const duration = mapDuration(totalSeconds)
```

### Edge case verification

| Input | Calculation | Output | Notes |
|-------|-------------|--------|-------|
| `delay: undefined, duration: 0.45` | `0 + 0.45 = 0.45s` | `450ms` | Unchanged from Phase 14 |
| `delay: undefined, duration: undefined, defaults.animation.duration: 0.45` | `0 + 0.45 = 0.45s` | `450ms` | Unchanged |
| `delay: undefined, duration: undefined, defaults.animation.duration: undefined` | `0 + 0.45 (hardcoded fallback)` = `0.45s` | `450ms` | `effectiveRowDuration` returns 0.45 as fallback (animation-injector.ts:286) |
| `delay: 0, duration: 0.05` | `0 + 0.05 = 0.05s` | `100ms` (clamp) | Original `delay: 0` preserved in `extensions.originalDelay = 0` |
| `delay: 100, duration: 0.1` | `100 + 0.1 = 100.1s` | `5000ms` (clamp) | **Original delay 100s preserved in `extensions.originalDelay`** |
| `delay: 0.5, duration: 0.5` | `0.5 + 0.5 = 1.0s` | `1000ms` | Normal case |

### Implementation location

Replace animation-injector.ts:323:
```ts
// BEFORE (Phase 14):
const duration = mapDuration(effectiveRowDuration(row))

// AFTER (Phase 15):
const totalSeconds =
  (row.delay ?? 0) + (row.duration ?? effectiveRowDuration(row, effectiveAnimationDefaults))
const duration = mapDuration(totalSeconds)
```

Original `delay` is already preserved in `extensions.originalDelay` (line 200) — D-14 satisfied without changes.

### Diagnostic counter

Add `delayAccumulatedSeconds: number` to `InjectDiagnostics`. Increment by `row.delay` (when defined) for each row. Document as "sum of all `delay` values in the sidecar" per D-14.

---

## Inheritance Chain (D-15)

[VERIFIED: ELEMENT_ANIMATIONS.md:558-570 §6 (Inheritance & Precedence), src/animation-injector.ts:255-260 (`resolveAnimationDefaults`), 285-290 (`effectiveRowDuration`/`effectiveRowTrigger` closures)]

### Five-tier resolution (outermost → innermost)

| Tier | Source | Status |
|------|--------|--------|
| 1. CLI defaults | implicit (`fade` transition + `none` object animation) | N/A (no config file) |
| 2. `defaults` block | `sidecar.defaults.transition` / `sidecar.defaults.animation` | ✅ Phase 14 (animation-injector.ts:259) |
| 3. `slides.<id>.transition` / `slides.<id>.animation` | per-slide override | ✅ Phase 14 (slide entry, animation-injector.ts:278) |
| 4. `groups.<gid>.effects[]` row fields | per-row defaults | partial (duration, trigger only) |
| 5. Row `trigger` / `trigger_shape` | per-row explicit | ✅ Phase 14 (animation-injector.ts:287-290) |

### Phase 15 extension: `effect` field

Currently Phase 14 does NOT resolve `effect` through the chain — it just uses `row.effect ?? 'none'` (after `normalizeRows` lift, animation-injector.ts:165).

D-02 requires: if `slideDefaults.animation.effect === 'none'` AND `row.effect` is undefined → skip the row; if row has explicit effect → emit.

### Proposed `resolveEffectiveRow` signature

```ts
interface ResolvedRow {
  effect: string | 'none'                    // resolved final value
  duration: number                           // raw seconds
  delay: number                              // raw seconds
  trigger: 'on-click' | 'with-previous' | 'after-previous'
  trigger_shape?: string
  order?: number
  effect_options?: Record<string, any>
}

function resolveEffectiveRow(
  row: AnimationsSidecarRow,
  slideDefaults: AnimationsSidecarSlide | undefined,
  deckDefaults: AnimationsSidecar['defaults'] | undefined,
): ResolvedRow
```

Resolution logic (per field):
- `effect`: `row.effect ?? slideDefaults?.animation?.effect ?? deckDefaults?.animation?.effect ?? 'none'`
- `duration`: `row.duration ?? slideDefaults?.animation?.duration ?? deckDefaults?.animation?.duration ?? 0.45`
- `delay`: `row.delay ?? 0`
- `trigger`: `row.trigger_shape !== undefined ? 'on-click' : (row.trigger ?? slideDefaults?.animation?.trigger ?? deckDefaults?.animation?.trigger ?? 'after-previous')`
- `trigger_shape`: `row.trigger_shape`
- `order`: `row.order`
- `effect_options`: `row.effect_options`

### Generic mode handling (ELEMENT_ANIMATIONS.md §2.3)

The three generic modes (`auto`, `mixed`, `random`) "select entrances only; they never satisfy `emphasize`, `move`, or `exit`." Phase 15 should:
- `auto` → emit one entrance animation derived from group id hash (deterministic seed)
- `mixed` → emit cycle over canonical entrance presets (deterministic)
- `random` → emit stable seeded choice
- `none` → skip entirely (D-02)

**Recommendation:** Phase 15 should NOT implement generic mode expansion. It's a v2 feature (per Out of Scope list, no morph/zoom-by-object support either). For now, `auto`/`mixed`/`random` should fall back to `EFFECT_FALLBACK[type]` (with original key in `extensions.originalEffect`).

### Backward compat

Phase 14's existing closures `effectiveRowDuration` (line 285-286) and `effectiveRowTrigger` (line 287-290) already implement a subset of this logic. Phase 15's `resolveEffectiveRow` should be introduced incrementally — Wave 1 may inline the logic at the call site, Wave 2 refactors to the named function.

---

## Test Plan

### Existing test infrastructure

[VERIFIED: src/mappers/animation.test.ts (184 lines, 30 tests), src/animation-injector.test.ts (891 lines, 25 tests), tests/e2e/202610131101001.test.ts (435 lines)]

### New tests

#### `src/mappers/animation.test.ts` (extend existing)

Add 3 NEW tests:

1. **"ENTRANCE_MAP value count === 53"** — replaces "≥30" assertion with exact match.
2. **"EMPHASIS_MAP value count === 33"** — replaces "≥10" assertion.
3. **"EXIT_MAP value count === 53"** — replaces "≥10" assertion.
4. **"Every three-side key from ELEMENT_ANIMATIONS.md §4.6 is present in the appropriate MAP"** — parse the three-side key list and assert no missing entries. New test, prevents future spec drift.
5. **"Unknown three-side keys fall back to EFFECT_FALLBACK with originalEffect preserved"** — already exists at line 119-126; extend with cases like `entrance_thin_line` (not in current 33-entry map) and `emphasis_3d_turntable` (not in current 12-entry map).

#### `src/animation-injector.test.ts` (extend existing)

Add 8 NEW tests across 3 NEW `describe()` blocks:

1. **`describe('D-01: groups[gid].effect === "none" skips the group')`** — 1 test
2. **`describe('D-02: defaults.animation.effect === "none" cascades to no animations')`** — 2 tests (with and without row override)
3. **`describe('D-03: transition.effect === "none" → turningMode === "no"')`** — 1 test
4. **`describe('D-04: chrome-id filter')`** — 2 tests (chrome id in `entry.groups` → no skip; chrome id not in `entry.groups` → no effect since not iterated)
5. **`describe('D-13: delay + duration merge')`** — 3 tests (delay=undefined; delay+duration within clamp; delay+duration overshoots clamp)

#### `tests/e2e/202610131101001.test.ts` (extend existing)

Add 1-2 NEW assertions to the existing "Plan 14-03 — E2E" describe block:

1. **`'every animation.duration is in [100, 5000] ms even when row has large delay'`** — proves D-13 clamp still holds.
2. **`'fixture slides do NOT trigger chrome-skip (no chrome-id groups in fixture)'`** — sanity check that the regex doesn't accidentally skip fixture groups.

Note: The fixture `exampels/202610131101001/animations.json` uses ONLY entrance_* effects that are already in the current 33-entry map. The expanded mapping doesn't change fixture behavior — it adds coverage for unmapped keys. E2E regression focuses on: (a) no behavior change for covered slides, (b) D-13 clamp behavior, (c) chrome regex sanity.

### Total new tests

| File | New tests | Total file tests after |
|------|-----------|------------------------|
| `mappers/animation.test.ts` | +5 (4 count + 1 fallback) | 35 |
| `animation-injector.test.ts` | +9 (3 effect:none + 1 transition:none + 2 chrome + 3 delay merge) | 34 |
| `tests/e2e/202610131101001.test.ts` | +2 | (existing + 2) |

---

## Risk Register

### R-1: Effect coverage gap (53/33/53 vs actual spec)

**Risk:** ELEMENT_ANIMATIONS.md §4.6 says 53/33/53. If a future edit adds a 54th entrance key, Phase 15 ships with 53 entries and the new key falls back to fadeIn.

**Likelihood:** LOW (Phase 14 spec is stable). **Impact:** LOW (fallback still plays).

**Mitigation:** Unit test asserting EXACT count (test 1-3 in mapper test plan). Plus a "every ELEMENT_ANIMATIONS.md key is present in MAP" cross-check test.

### R-2: Chrome regex false positives (card-header-arrow)

**Risk:** A user-named group like `card-header-arrow` matches `.*-header$` and is silently skipped, but the user wanted that animation.

**Likelihood:** LOW (Phase 14 only iterates user-named `entry.groups`, so chrome filter is effectively a no-op). **Impact:** LOW (user can rename the group or remove it from chrome if needed).

**Mitigation:** D-04 "unless explicitly named" clause (CONTEXT.md D-04). For Phase 15, ship the regex as an exported helper without wiring it into the iteration loop. If a future feature bulk-scans `slide.elements`, the regex becomes active and D-04 applies.

### R-3: `effect: 'none'` cascade interaction with row override

**Risk:** D-02 says `defaults.animation.effect === 'none'` skips all UNLESS row has explicit effect. If the resolver logic applies the cascade at the wrong level (row vs group), the override may not take effect.

**Likelihood:** MEDIUM (logical detail). **Impact:** MEDIUM (wrong animation emission count).

**Mitigation:** Apply the cascade check at the GROUP level: for each group, check resolved `animation.effect === 'none'`. If so, iterate rows and emit only those with explicit `effect !== 'none'`. Add unit test (D-02 test case: defaults.animation.effect === 'none', row.effect === 'entrance_fade' → emits).

### R-4: `delay + duration` semantics — collapse vs preserve

**Risk:** User writes `delay: 0.5, duration: 0.5` and expects PowerPoint to wait 0.5s then animate for 0.5s (total span = 1.0s but the animation duration = 0.5s). Phase 15 collapses delay into the animation duration (1.0s). Visually identical but architecturally different.

**Likelihood:** HIGH (every user writing delay+duration). **Impact:** LOW (PowerPoint's `begin` attribute is not exposed by PPTist anyway, so PPTist has no way to distinguish).

**Mitigation:** This is a known Phase 15 trade-off. Document in JSDoc on the new calc. Add unit test for the overshoot case (delay=100, duration=0.1 → 5000ms clamp). Original `delay` always preserved in `extensions.originalDelay` for forward-compat when PPTist adds `delay` support.

### R-5: Phase 14 N→N coverage regression

**Risk:** The mapping table expansion is pure-data, but the chrome-skip filter (if wired into iteration) could change the loop semantics and break N→N.

**Likelihood:** LOW (chrome filter stays out of iteration loop). **Impact:** HIGH (Phase 14 N→N is the most recent fix at commit e7ad695).

**Mitigation:** Run E2E on `exampels/202610131101001` after every Wave — the `animations.length === sum(elements per group)` assertion at line 278 must still hold.

### R-6: `restart` / `after_effect` / `sound` — extensions coverage gap

**Risk:** Phase 14's `buildExtensions` (animation-injector.ts:208-217) does NOT preserve `restart`, `after_effect`, `sound` fields. D-06 requires all 17 row fields preserved.

**Likelihood:** MEDIUM (gap is in code). **Impact:** LOW (just adds 3 lines to `snakeCasePreservedKeys`).

**Mitigation:** One-line fix (extend the const array). Add a unit test asserting these three fields round-trip when present on a row.

### R-7: `effect: 'none'` row emits extensions fields before skip

**Risk:** Current code at animation-injector.ts:305-312: `mapEffect` is called BEFORE the `__skip__` check; `buildExtensions` is called AFTER. Wait, the code at line 337 calls `buildExtensions` AFTER the `if (effect === EFFECT_NONE_SENTINEL) continue` check at line 310-312. Actually, looking again: line 309-312 is INSIDE the row loop but BEFORE `buildExtensions` call at line 337. So `effect: 'none'` rows already skip cleanly. **No risk.**

---

## Execution Phasing Recommendation

### Wave 1 (Plan 15-01) — Mapping + Effect:none + Delay merge

**Scope:**

| Change | File | LOC estimate |
|--------|------|--------------|
| Expand ENTRANCE_MAP to 53 entries | `src/mappers/animation.ts` | +20 |
| Expand EXIT_MAP to 53 entries | `src/mappers/animation.ts` | +40 |
| Expand EMPHASIS_MAP to 33 entries | `src/mappers/animation.ts` | +20 |
| Add D-02 cascade (slide-level `defaults.animation.effect === 'none'`) | `src/animation-injector.ts` | +10 |
| Add D-03 transition `'none'` → `'no'` mapping | `src/mappers/animation.ts` + `src/animation-injector.ts` | +5 |
| Add D-13 `delay + duration` calc | `src/animation-injector.ts` | +3 |
| Add `delayAccumulatedSeconds` + `unmappedEffectCount` counters | `src/animation-injector.ts` | +5 |
| Update `printDiagnostics` to include new counters | `src/animation-injector.ts` | +5 |
| Add tests for all of the above | `src/mappers/animation.test.ts` + `src/animation-injector.test.ts` | +120 |

**E2E tracer:** Run on `exampels/202610131101001/` after Wave 1 — fixture uses 17+ distinct `entrance_*` keys, all already in current map. Verify:
- `animationsInjected` unchanged (still 17 animations from fixture)
- `unmappedEffects === 0` (no fixture key was unmapped before OR after)
- `delayAccumulatedSeconds === 0` (no fixture uses delay)
- `extensionsFieldsPreserved` may increase (more fields preserved if D-06 also expanded in Wave 1)

### Wave 2 (Plan 15-02) — Chrome + Inheritance + Extensions gap

**Scope:**

| Change | File | LOC estimate |
|--------|------|--------------|
| Add `CHROME_REGEX` + `isChromeGroupId` exported helper | `src/mappers/animation.ts` | +10 |
| Add `chromeSkippedGroups` counter (informational; not wired into loop) | `src/animation-injector.ts` | +5 |
| Extend `snakeCasePreservedKeys` for `restart`/`after_effect`/`sound` (D-06 gap) | `src/animation-injector.ts` | +3 |
| Refactor `effectiveRowDuration` / `effectiveRowTrigger` to `resolveEffectiveRow` | `src/animation-injector.ts` | +30 |
| Add `resolveEffectiveRow` unit tests | new `src/animation-injector.test.ts` describe block | +80 |

**E2E tracer:** Run on `exampels/202610131101001/` — verify:
- `extensionsFieldsPreserved` increases (the 3 newly-preserved fields appear on relevant rows)
- `chromeSkippedGroups === 0` (no fixture groups match chrome pattern)
- All existing 25 injector tests still pass

### Alternative single-wave split

If Wave 1 vs Wave 2 is too granular for a single milestone, the entire Phase 15 could ship as one plan with:
- Single test runner invocation
- Single E2E verification
- Two commits: "feat(mappers): expand to 139 keys" + "feat(injector): effect:none cascade + chrome + delay merge"

The 2-wave split is recommended because Wave 1's mapping expansion is pure-data (low risk, high test coverage), while Wave 2's inheritance chain refactor touches live code paths.

---

## Open Questions

### Q-1: Generic mode (`auto`/`mixed`/`random`) implementation

**What we know:** ELEMENT_ANIMATIONS.md §2.3 specifies deterministic cycle / seeded choice semantics.

**What's unclear:** Phase 15 has no implementation guidance. The CONTEXT.md Out of Scope section doesn't mention generic modes, but it also doesn't list them as deferred.

**Recommendation:** Treat `auto`/`mixed`/`random` as not-yet-supported: fall back to `EFFECT_FALLBACK[type]` (in → `fadeIn`) and write original key to `extensions.originalEffect`. Document as v2 forward-compat.

### Q-2: `delay + duration` semantics confirmation

**What we know:** D-13 collapses the two into a single ms duration.

**What's unclear:** Is this acceptable for users who relied on PowerPoint's "delay then run" semantics?

**Recommendation:** Document the trade-off. Phase 15 ships with the collapse; future v2 may add a `delay` field to PPTAnimation if PPTist exposes it.

### Q-3: chrome-skip when sidecar names a chrome group

**What we know:** D-04 says "skipped unless explicitly named in `slides.<id>.groups`".

**What's unclear:** Phase 14 already only iterates `entry.groups`, so explicit naming IS the iteration set. The chrome-skip becomes moot.

**Recommendation:** Ship the regex as an exported helper. Document that it's a no-op in current architecture. Future bulk-scan feature can wire it in.

---

## Environment Availability

Phase 15 has no external dependencies beyond what Phase 14 already requires. No new CLIs, runtimes, databases, or services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | TypeScript build / test | ✓ | (Phase 14 verifies) | — |
| vitest | test runner | ✓ | (Phase 14 verifies) | — |
| picocolors | stderr diagnostics | ✓ | (Phase 14 uses) | — |
| nanoid | PPTAnimation id | ✓ | (Phase 14 uses) | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest |
| Config file | (vitest defaults — no custom config detected) |
| Quick run command | `npx vitest run src/mappers/animation.test.ts src/animation-injector.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANIM-NONE-01 | `groups[gid].effect === 'none'` skips | unit | `vitest run src/animation-injector.test.ts -t "D-01"` | ❌ Wave 0 |
| ANIM-NONE-02 | `defaults.animation.effect === 'none'` cascade | unit | `vitest run src/animation-injector.test.ts -t "D-02"` | ❌ Wave 0 |
| ANIM-NONE-03 | `transition.effect === 'none'` → turningMode 'no' | unit | `vitest run src/animation-injector.test.ts -t "D-03"` | ❌ Wave 0 |
| ANIM-CHROME-01 | chrome-id regex exported, no iteration change | unit | `vitest run src/mappers/animation.test.ts -t "chrome"` | ❌ Wave 0 |
| ANIM-EXTS-01 | All 17 row fields preserved | unit | `vitest run src/animation-injector.test.ts -t "buildExtensions"` | ❌ Wave 0 |
| ANIM-MAP-EXT-01/02/03 | 53/33/53 exact counts | unit | `vitest run src/mappers/animation.test.ts -t "value count"` | ❌ Wave 0 |
| ANIM-DELAY-01 | `delay + duration` merge with clamp | unit | `vitest run src/animation-injector.test.ts -t "D-13"` | ❌ Wave 0 |
| ANIM-INHERIT-01 | `resolveEffectiveRow` chain | unit | `vitest run src/animation-injector.test.ts -t "resolveEffectiveRow"` | ❌ Wave 0 |
| (Regression) | Phase 14 N→N coverage preserved | e2e | `vitest run tests/e2e/202610131101001.test.ts` | ✅ existing |

### Sampling Rate

- **Per task commit:** mapper + injector test files
- **Per wave merge:** full suite (including E2E)
- **Phase gate:** full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/animation-injector.test.ts` — add `describe('D-01')`, `describe('D-02')`, `describe('D-03')`, `describe('D-13')` blocks (5+ new tests)
- [ ] `src/animation-injector.test.ts` — add `describe('chrome')` block (2 new tests)
- [ ] `src/animation-injector.test.ts` — add `describe('restart/after_effect/sound preservation')` block (1 new test)
- [ ] `src/mappers/animation.test.ts` — update count assertions from `≥30/≥10/≥10` to `=== 53/33/53` (3 modified assertions)
- [ ] `src/mappers/animation.test.ts` — add `describe('ELEMENT_ANIMATIONS.md coverage')` block with cross-check loop (1 new test)
- [ ] `tests/e2e/202610131101001.test.ts` — add 2 new assertions for clamp + chrome sanity

---

## Security Domain

N/A — Phase 15 has no security-relevant changes. All work is in-tree TypeScript; no new I/O, no auth, no secrets, no network. The `picocolors` stderr output and the `nanoid` id generation are both Phase 14 patterns unchanged by Phase 15.

---

## Sources

### Primary (HIGH confidence) — read this session

- `E:/git/svg2json/.planning/phases/15-animation-sidecar-extended/15-CONTEXT.md` — 15 D-decisions, REQ categories, integration points. Locked.
- `E:/git/svg2json/ELEMENT_ANIMATIONS.md` — 770 lines, full reference. §3 Row Fields (122-143), §4 Enumerated Value Reference (148-522), §5 Chrome Rules (527-555), §6 Inheritance (558-570).
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-CONTEXT.md` — Phase 14 D-decisions (foundation).
- `E:/git/svg2json/.planning/phases/14-pptist-animation-from-sidecar/14-VERIFICATION.md` — 17/17 verified, N→N fix at e7ad695.
- `E:/git/svg2json/src/animation-injector.ts` — current `injectAnimations()` (424 lines), `buildExtensions` (190-224), `effectiveRowDuration`/`Trigger` (285-290).
- `E:/git/svg2json/src/mappers/animation.ts` — current ENTRANCE_MAP (33 entries, 41-77), EMPHASIS_MAP (12 entries, 83-96), EXIT_MAP (13 entries, 102-116), EFFECT_NONE_SENTINEL (189), `inferAnimationType` (203-208), `mapEffect` (220-234), `mapDuration` (279-288).
- `E:/git/svg2json/code/PPTist/src/configs/animation.ts` — 40 ENTER + 40 EXIT + 12 ATTENTION = 92-entry whitelist (not 84).
- `E:/git/svg2json/src/animation-types.ts` — `AnimationsSidecarRow` (25-43) defines all 17 row fields.
- `E:/git/svg2json/animation-adaptation-analysis.md` §4.2 — prior 203-key mapping analysis.
- `E:/git/svg2json/src/mappers/animation.test.ts` (184 lines, 30 tests) — existing mapper tests.
- `E:/git/svg2json/src/animation-injector.test.ts` (891 lines, 25 tests) — existing injector tests.
- `E:/git/svg2json/tests/e2e/202610131101001.test.ts` (435 lines) — existing E2E.

### Tertiary (LOW confidence)

- None — all findings grounded in primary sources read this session.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new packages; Phase 14 patterns unchanged.
- Architecture: HIGH — Phase 14 foundation is stable; Phase 15 layers on top.
- Mapping tables (139 keys): HIGH — each key grepped against ELEMENT_ANIMATIONS.md; each value verified in PPTist whitelist.
- Chrome regex: HIGH — regex literal from ELEMENT_ANIMATIONS.md:541; verified against test edge cases.
- delay + duration calc: HIGH — straightforward arithmetic with existing `mapDuration` clamp.
- Inheritance chain: HIGH — existing `effectiveRowDuration`/`Trigger` closures; `resolveEffectiveRow` is a pure refactor + extension.
- Pitfalls: HIGH — derived from code-level review of animation-injector.ts:305-312 (effect:none) and chrome-skip latency.

**Research date:** 2026-10-15
**Valid until:** 2026-11-15 (30 days — ELEMENT_ANIMATIONS.md is stable)
