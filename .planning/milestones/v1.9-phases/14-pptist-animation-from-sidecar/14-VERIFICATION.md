---
phase: 14
name: pptist-animation-from-sidecar
status: passed
verified: 2026-10-15
verifier: self (orchestrator post-merge)
---

# Phase 14 Verification — pptist-animation-from-sidecar

## Goal Achievement

**Goal:** SVG → PPTist JSON 转换时自动消费 `animations.json` sidecar,生成 `slide.animations[]` / `slide.turningMode`,并全量保留三方字段到 `extensions`

**Status:** ✓ ACHIEVED

## Verification Evidence

### 1. CLI parent-dir mode (ANIM-CLI-01/02/03)

- `svg2json <parent-dir>/202610131101001` produces 20 `svg_output/<name>.svg.json` files
- When `animations.json` is present → animations injected; absent → no error, no animations (ANIM-CLI-02)
- Output is multi-file, located in `svg_output/` (ANIM-CLI-03)

### 2. Element id naming (ANIM-ID-01/02)

- 8/8 id-injection tests pass: D-05 verbatim (保留原 id), D-06 group_id__nanoid(5), D-07 nanoid(10), D-08 path-merge fallback, D-09 unconditional population, distinct-suffix, reaffirm D-05 priority
- Path-merged groups produce single PPTShapeElement with `g1__<nanoid(5)>` id
- `<g id="card-temperature">` with 4 children yields 4 distinct `PPTElement.id`, all sharing `groupId === 'card-temperature'`

### 3. Animation mapping (ANIM-MAP-01..06)

- 40/40 mapper tests pass: `ENTRANCE_MAP` 33 entries, `EMPHASIS_MAP` 12, `EXIT_MAP` 13, `TRANSITION_MAP` 44
- All mapped effects ∈ PPTist 84-effect whitelist (verified)
- 25/25 injector tests pass
- E2E on `exampels/202610131101001/`:
  - 13 covered slides → `slide.animations.length > 0`
  - 7 uncovered slides → `slide.animations === undefined` AND `slide.turningMode === undefined` (D-22 strict)
  - `elId` always ∈ `slide.elements[].id`
  - `effect` ∈ PPTist 84-effect whitelist
  - `duration` ∈ [100, 5000] ms

### 4. Field preservation (ANIM-MAP-06)

- `extensions` populated with `originalEffect`, `originalDuration`, `originalTrigger`, `originalType`, `originalOrder`, `originalDelay`, `originalTriggerShape` when present on sidecar row
- D-12 opaque fields (e.g., `effectOptions`, `repeatCount`, `autoReverse`, `bounceEnd`) preserved with camelCased keys (D-13)
- `extensions` OMITTED when no fields preserved (Claude's Discretion)

### 5. Unit conversion + trigger (ANIM-TRANS-01/02/03)

- `mapDuration(0.45) === 450`, `mapDuration(0.05) === 100` (clamped), `mapDuration(10) === 5000` (clamped)
- Trigger mapping per D-18: same-order → `meantime`, strict-ascending → `auto`, explicit → `click`/`meantime`/`auto`, `trigger_shape` → `click`
- Effect mapping: known keys → whitelisted effect; unknown → `EFFECT_FALLBACK` per type, with `extensions.originalEffect` preserved

### 6. Turning mode (ANIM-TURN-01)

- 48 three-side transitions → 12 TurningMode (with `fade` as universal fallback)
- `random` preserved (PPTist self-expands)
- Three-tier fallback: `entry.transition.effect` → `defaults.transition.effect` → undefined (D-21)
- D-22 strict: no sidecar entry → `turningMode === undefined`

### 7. Defaults propagation (ANIM-DEFAULTS-01)

- Row-level: missing `duration` → `defaults.animation.duration` → mapped via `mapDuration`
- Row-level: missing `trigger` → `defaults.animation.trigger` → mapped via `mapTrigger`
- Slide-level: missing `transition.effect` → `defaults.transition.effect` → mapped via `mapTransition`

### 8. Diagnostics (ANIM-DIAG-01)

- `printDiagnostics(diagnostics)` emits to stderr (D-23)
- Reports: mapped count, preserved extensions count, unmapped originals count, per-group warnings
- CLI subprocess stderr contains `[animations] injected into N slide(s)` summary
- `grep -n 'console.log\|process.stdout.write' src/animation-injector.ts src/index.ts` returns 0 code hits (only JSDoc comments)

## Pre-existing Failures (NOT in Phase 14 scope)

4 test files failing (13 tests total) in `__tests__/`: shadow × 7, shape-rx × 4, path-merge × 1, image-outline × 1. **All predate Phase 14** (verified on master base 0e316e2 — same failures). Out of scope.

## Coverage Summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ANIM-CLI-01 | ✓ | `convertDir()` reads `svg_output/*.svg` |
| ANIM-CLI-02 | ✓ | Missing sidecar → no crash, no animations |
| ANIM-CLI-03 | ✓ | Output multi-file in `svg_output/` |
| ANIM-ID-01 | ✓ | `id-injection.test.ts` 8/8 |
| ANIM-ID-02 | ✓ | path-merge test confirms distinct ids |
| ANIM-MAP-01 | ✓ | E2E 13-covered slides |
| ANIM-MAP-02 | ✓ | E2E every animation has valid elId |
| ANIM-MAP-03 | ✓ | E2E `slide.animations.length > 0` for covered slides |
| ANIM-MAP-04 | ✓ | E2E every `elId` ∈ `slide.elements[].id` |
| ANIM-MAP-05 | ✓ | mapper handles single `effect` and `effects[]` |
| ANIM-MAP-06 | ✓ | extensions populated, fields preserved |
| ANIM-TRANS-01 | ✓ | `mapDuration` tests 100/450/1000/5000 |
| ANIM-TRANS-02 | ✓ | `mapTrigger` tests on-click/with-previous/after-previous |
| ANIM-TRANS-03 | ✓ | mapped vs unmapped fallback paths |
| ANIM-TURN-01 | ✓ | `TRANSITION_MAP` 44 entries, `fade` fallback |
| ANIM-DEFAULTS-01 | ✓ | effectiveRowDuration/Trigger + effectiveTransitionEffect |
| ANIM-DIAG-01 | ✓ | stderr diagnostics, no stdout writes |

**17/17 requirements covered and verified.**
