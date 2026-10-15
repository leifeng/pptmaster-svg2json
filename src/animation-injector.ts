/**
 * Animation injector — Phase 14 / Plan 14-02 + Plan 14-03.
 *
 * Sidecar → Slide bridge. Translates a three-side `animations.json` entry for
 * one slide into `slide.animations[]` (one PPTAnimation per matching
 * `slide.elements[]` for every `groups[gid]` row — i.e. each PPTElement under a
 * group id receives the group's effect, and `slide.turningMode` (per
 * `entry.transition.effect`). Pure-ish — returns a new Slide object and
 * accumulates diagnostics into a caller-provided object so `convertDir()` can
 * sum across slides.
 *
 * Per-group coverage model (changed intent post-Wave 2 ship, ANIM-MAP-04
 * originally picked first-match; user revised to "every element in the group
 * gets the same effect" — see `.planning/debug/anim-elid-coverage.md`):
 *   - For each `groups[gid]`, find ALL `slide.elements[]` whose `groupId === gid`.
 *   - For each row in `groups[gid]` (legacy single-effect lifts to 1-row),
 *     emit ONE PPTAnimation PER matching element. So a group with 4 elements
 *     and 1 row produces 4 PPTAnimations; a path-merged group (1 merged
 *     PPTShapeElement) produces 1 PPTAnimation — path-merge coverage is
 *     naturally 1-to-1 and is NOT regressed by the expansion.
 *   - `defaultsApplied` counts PER ROW (not per element) — substitution
 *     happens once per missing field, regardless of how many candidates match.
 *   - `elementsCovered` counts the total (row, element) tuples that emitted a
 *     PPTAnimation, providing direct observability of N→N coverage.
 *
 * Decisions honored:
 *   D-11: Each PPTAnimation carries D-11 fields in `extensions` —
 *     `originalEffect`, `originalDuration`, `originalTrigger`, `originalType`,
 *     `originalOrder`, `originalDelay`, `originalTriggerShape`.
 *   D-12: Three-side fields PPTist cannot express are preserved as well
 *     (`effect_options`, `repeat_count`, `repeat_duration`, `auto_reverse`,
 *     `rewind`, `accelerate`, `decelerate`, `bounce_end`, `restart`).
 *     Plan 15-02 / D-06 also preserves `after_effect` → `afterEffect` and
 *     `sound` (camelCase top-level keys).
 *   D-13: Top-level `extensions` keys are camelCased (e.g. `repeat_count` →
 *     `repeatCount`). Nested keys under `effectOptions` are preserved verbatim.
 *   D-15: When `mapEffect` returns `fallback: true`, `extensions.originalEffect`
 *     captures the original three-side key. Plan 15-02 also extracts the row-
 *     level inheritance chain into the pure `resolveEffectiveRow` helper.
 *   D-18: `trigger_shape` non-undefined collapses to 'on-click' via the row-
 *     level resolver (always returns a string — order-based implicit semantics
 *     only fire when the resolver's string isn't matched).
 *   D-21 row-level: per-row > entry.animation > sidecar.defaults.animation >
 *     hardcoded fallback chain (`0.45` sec, `'after-previous'` trigger) is
 *     implemented inside `resolveEffectiveRow` (Plan 15-02 / D-15). Each
 *     substitution increments `diagnostics.defaultsApplied`.
 *   D-21 slide-level + D-22 + Task 4 fix: `effectiveTransitionEffect` resolves
 *     `entry.transition.effect ?? sidecar.defaults.transition.effect`.
 *     The D-22 strict guard at the top of `injectAnimations()` ensures this
 *     helper never leaks defaults to slides absent from `sidecar.slides`.
 *   D-23: `printDiagnostics` writes to `process.stderr` only (never console.log).
 *   D-04 (chrome): `chromeSkippedGroups` counter is exposed on
 *     `InjectDiagnostics` (Plan 15-02 / forward-compat). Always 0 in Phase 15
 *     because the chrome-skip helper is not wired into the iteration loop —
 *     future bulk-scan feature should increment here.
 *
 * Claude's Discretion: `extensions` is omitted from the JSON when no fields
 * are preservable (avoids shipping `{}` envelopes).
 */

import type {
  PPTAnimation,
  Slide,
  AnimationType,
  AnimationTrigger,
  TurningMode,
} from './slides'
import type {
  AnimationsSidecar,
  AnimationsSidecarGroup,
  AnimationsSidecarRow,
  AnimationsSidecarSlide,
} from './animation-types'
import {
  mapEffect,
  mapTransition,
  mapTrigger,
  mapDuration,
  inferAnimationType,
  EFFECT_NONE_SENTINEL,
} from './mappers/animation'
import pc from 'picocolors'

// ---------------------------------------------------------------------------
// Diagnostics — accumulator passed by `convertDir()` (D-23 + Plan 03 extension)
// ---------------------------------------------------------------------------

export interface InjectDiagnostics {
  slidesWithAnimation: number
  animationsInjected: number
  extensionsFieldsPreserved: number
  unmappedEffects: number
  elIdNotFoundWarnings: string[]
  /**
   * Plan 14-03 — number of times a per-row missing field (duration / trigger)
   * was substituted by the resolved defaults chain (`resolveEffectiveRow`)
   * or the hardcoded fallback.
   * Observability counter that proves ANIM-DEFAULTS-01 row-level resolution
   * actually fired during a run. Increments for each row where:
   *   - `row.duration === undefined` (one count), OR
   *   - `row.trigger === undefined` AND `row.trigger_shape === undefined`
   *     (one count — the trigger substitution happened whether the source
   *     was `entry.animation`, `sidecar.defaults.animation`, or the
   *     `'after-previous'` hardcoded fallback)
   * D-22 strict: when a slide lacks a sidecar entry, this counter does NOT
   * increment even when defaults are populated — the early-return prevents
   * defaults from leaking to slides absent from `sidecar.slides`.
   *
   * Per-row, NOT per-element: a row with N matching PPTElements still increments
   * once (the substitution happens at row-resolution time, not at emission
   * time). For the current exampels/202610131101001 fixture this equals
   * `elementsCovered` because each group has 1 row.
   */
  defaultsApplied: number
  /**
   * Number of PPTElement × row tuples that produced a PPTAnimation. Direct
   * observability for the N→N group-coverage model: a group with 4 elements
   * and 1 row contributes 4 to this counter; a path-merged group with 1
   * element contributes 1. Rows with `effect === 'none'` (Pitfall 5) do NOT
   * contribute. Skipped groups (no matching element) do NOT contribute.
   */
  elementsCovered: number
  /**
   * Plan 15-01 / D-12 — duplicate of `unmappedEffects` keyed for the new
   * `unmappedEffectCount` name used by mapper-level observability. Both
   * counters track the same fact; keeping the legacy name preserves E2E
   * backward-compat (tests assert on `unmappedEffects`).
   */
  unmappedEffectCount: number
  /**
   * Plan 15-01 / D-14 — sum of `row.delay` values across all rows (in
   * seconds). Surfaces the original delay even after D-13 collapses it into
   * the animation `duration`. Zero for fixtures that never set `row.delay`.
   */
  delayAccumulatedSeconds: number
  /**
   * Plan 15-02 / D-04 — forward-compat counter. Counts group ids that match
   * `CHROME_REGEX` (i.e., chrome-style ids like `bg`, `*-header`, `*-footer`,
   * etc.) which were not explicitly listed under `slides.<id>.groups`.
   * Always 0 in Phase 15 because the chrome-skip helper is not yet wired
   * into the `for-of entry.groups` iteration loop. Future bulk-scan feature
   * (Plan 16+) should increment here whenever a chrome id is skipped.
   */
  chromeSkippedGroups: number
}

export function emptyInjectorDiagnostics(): InjectDiagnostics {
  return {
    slidesWithAnimation: 0,
    animationsInjected: 0,
    extensionsFieldsPreserved: 0,
    unmappedEffects: 0,
    elIdNotFoundWarnings: [],
    defaultsApplied: 0,
    elementsCovered: 0,
    unmappedEffectCount: 0,
    delayAccumulatedSeconds: 0,
    chromeSkippedGroups: 0,
  }
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface InjectOptions {
  slideId: string
  sidecar: AnimationsSidecar | undefined
  diagnostics: InjectDiagnostics
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * D-13: snake_case → camelCase for top-level `extensions` keys.
 * Nested keys inside `effect_options` are preserved verbatim (opaque upstream).
 */
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Normalize a group's animation data into AnimationsSidecarRow[].
 *
 * MODERN (preferred): groupEntry.effects is already an AnimationsSidecarRow[].
 * LEGACY: groupEntry has a single `effect` (and other sidecar fields) at the
 * group level — lift them into a single-element array so the row-iteration
 * loop is uniform. All preserved-opaque D-12 fields are also lifted from the
 * group level so the row carries every piece of provenance.
 */
function normalizeRows(groupEntry: AnimationsSidecarGroup): AnimationsSidecarRow[] {
  if (groupEntry.effects !== undefined && Array.isArray(groupEntry.effects)) {
    return groupEntry.effects
  }
  return [
    {
      effect: groupEntry.effect ?? 'none',
      trigger: groupEntry.trigger,
      order: groupEntry.order,
      delay: groupEntry.delay,
      duration: groupEntry.duration,
      effect_options: groupEntry.effect_options,
      trigger_shape: groupEntry.trigger_shape,
      repeat_count: (groupEntry as any).repeat_count,
      repeat_duration: (groupEntry as any).repeat_duration,
      auto_reverse: (groupEntry as any).auto_reverse,
      rewind: (groupEntry as any).rewind,
      accelerate: (groupEntry as any).accelerate,
      decelerate: (groupEntry as any).decelerate,
      bounce_end: (groupEntry as any).bounce_end,
      restart: (groupEntry as any).restart,
      // Plan 15-02 / D-06: legacy single-effect form also lifts after_effect
      // and sound from the group level so the row carries every piece of
      // provenance before buildExtensions camelCases them.
      after_effect: (groupEntry as any).after_effect,
      sound: (groupEntry as any).sound,
    },
  ]
}

/**
 * Build the `extensions` record for one row (D-11, D-12, D-13).
 *
 * Returns an empty object when nothing preservable — caller must omit the
 * field entirely in that case (Claude's Discretion).
 */
function buildExtensions(
  row: AnimationsSidecarRow,
  fallback: boolean,
): Record<string, any> {
  const ext: Record<string, any> = {}

  // Phase 15 / Bug 1 — D-11 spec requires the original three-side `effect`
  // value to be preserved in `extensions.originalEffect` for BOTH mapped and
  // fallback paths. Previously this was gated on `fallback`, which left mapped
  // PPTAnimations without provenance. Write unconditionally.
  ext.originalEffect = row.effect
  if (row.trigger !== undefined) ext.originalTrigger = row.trigger
  if (row.duration !== undefined) ext.originalDuration = row.duration
  if (row.order !== undefined) ext.originalOrder = row.order
  if (row.delay !== undefined) ext.originalDelay = row.delay
  // trigger_shape is already camelCased in the type alias, but keep it as-is.
  if (row.trigger_shape !== undefined) ext.originalTriggerShape = row.trigger_shape

  // D-12 + D-13: opaque three-side fields preserved under camelCased top-level
  // keys (nested data on effect_options is preserved verbatim).
  if (row.effect_options !== undefined) ext.effectOptions = row.effect_options

  const snakeCasePreservedKeys = [
    'repeat_count',
    'repeat_duration',
    'auto_reverse',
    'rewind',
    'accelerate',
    'decelerate',
    'bounce_end',
    'restart',
    'after_effect',
    'sound',
  ] as const
  for (const k of snakeCasePreservedKeys) {
    const v = (row as any)[k]
    if (v !== undefined) ext[toCamel(k)] = v
  }

  return ext
}

// ---------------------------------------------------------------------------
// D-22 strict guard + D-21 defaults propagation helper
// ---------------------------------------------------------------------------

/**
 * D-21 + Task 4 — Resolve the effective transition effect string with a
 * three-tier fallback: per-entry → sidecar defaults → undefined.
 *
 * CALLER MUST GUARANTEE the outer `entry` is defined. The D-22 strict guard
 * inside `injectAnimations()` early-returns the slide unchanged before this
 * helper runs, so defaults never leak to slides absent from `sidecar.slides`.
 */
function effectiveTransitionEffect(
  entry: { transition?: { effect?: string } },
  sidecar: AnimationsSidecar | undefined,
): string | undefined {
  return entry.transition?.effect ?? sidecar?.defaults?.transition?.effect
}

/**
 * D-21 row-level defaults resolution — Plan 14-03.
 *
 * The slide-level `entry.animation` wins over the global `sidecar.defaults.animation`.
 * Either may be `undefined`; the hardcoded `'after-previous'` / `0.45` fallbacks
 * only fire when both tiers are missing. D-22 still guarantees `entry` itself
 * exists (the outer strict-return already filtered slides absent from
 * `sidecar.slides`).
 */
type AnimationDefaults = NonNullable<AnimationsSidecar['defaults']>['animation']
function resolveAnimationDefaults(
  entry: { animation?: AnimationDefaults },
  sidecar: AnimationsSidecar | undefined,
): AnimationDefaults | undefined {
  return entry.animation ?? sidecar?.defaults?.animation
}

// ---------------------------------------------------------------------------
// D-15 — resolved-row capture (Plan 15-02)
// ---------------------------------------------------------------------------

/**
 * D-15 — fully-resolved view of one row + its inherited defaults.
 *
 * Built by `resolveEffectiveRow`. Pure data — every field has been resolved
 * through the inheritance chain so callers do not need to re-resolve. The
 * underlying row is preserved verbatim via `trigger_shape` / `order` so the
 * downstream PPTist pipeline can still inspect raw three-side values when
 * needed.
 */
export interface ResolvedRow {
  effect: string | 'none'
  duration: number // raw seconds, not clamped (clamping happens at PPTist emission)
  delay: number // raw seconds, 0 when row.delay is undefined (D-13 merge input)
  trigger: string // 'on-click' | 'with-previous' | 'after-previous' (pre-map)
  trigger_shape: string | undefined
  order: number | undefined
}

/**
 * D-15 — pure-function resolver: walks the inheritance chain for one row.
 *
 * Resolution order per field (most-specific → least-specific):
 *   effect      : row.effect  ?? slide.animation.effect  ?? deck.animation.effect  ?? 'none'
 *   duration    : row.duration ?? slide.animation.duration ?? deck.animation.duration ?? 0.45
 *   delay       : row.delay ?? 0
 *   trigger     : row.trigger_shape !== undefined
 *                   ? 'on-click'
 *                   : (row.trigger ?? slide.animation.trigger ?? deck.animation.trigger ?? 'after-previous')
 *   trigger_shape: row.trigger_shape (passthrough; undefined is fine)
 *   order       : row.order (passthrough)
 *
 * CRITICAL — this function MUST stay pure: no captured closure variables
 * (no `opts`, `slide`, `entry`, `this`, etc.). All inputs flow through the
 * three explicit parameters. Verification: `grep` 'opts\b\|slide\b\|entry\b'
 * in the function body returns zero hits.
 */
export function resolveEffectiveRow(
  row: AnimationsSidecarRow,
  slideDefaults: AnimationsSidecarSlide | undefined,
  deckDefaults: AnimationsSidecar['defaults'] | undefined,
): ResolvedRow {
  const effect =
    row.effect ??
    slideDefaults?.animation?.effect ??
    deckDefaults?.animation?.effect ??
    'none'
  const duration =
    row.duration ??
    slideDefaults?.animation?.duration ??
    deckDefaults?.animation?.duration ??
    0.45
  const delay = row.delay ?? 0
  const trigger =
    row.trigger_shape !== undefined
      ? 'on-click'
      : (row.trigger ??
        slideDefaults?.animation?.trigger ??
        deckDefaults?.animation?.trigger ??
        'after-previous')
  return {
    effect,
    duration,
    delay,
    trigger,
    trigger_shape: row.trigger_shape,
    order: row.order,
  }
}

// ---------------------------------------------------------------------------
// Main injector function (D-22, D-11~13, D-18~20)
// ---------------------------------------------------------------------------

/**
 * Inject PPTAnimation[] + turningMode into the given slide based on the sidecar
 * entry for `opts.slideId`. Returns the slide unchanged when no entry exists
 * (D-22 strict — observable: `slide.animations` and `slide.turningMode` stay
 * `undefined`).
 */
export function injectAnimations(slide: Slide, opts: InjectOptions): Slide {
  // D-22: undefined sidecar OR missing slide_id entry → no animations.
  if (opts.sidecar?.slides?.[opts.slideId] === undefined) {
    return slide
  }

  const entry = opts.sidecar.slides[opts.slideId]
  const builtAnimations: PPTAnimation[] = []
  let previousOrder: number | undefined

  // Plan 15-02 / D-15 — row-level resolution via the pure `resolveEffectiveRow`
  // helper is applied per-group inside the loop body, where each row's
  // resolved view is captured alongside the raw row for downstream consumers.

  for (const [groupId, groupEntry] of Object.entries(entry.groups)) {
    // Resolve ALL PPTElements whose groupId matches (D-08 + ANIM-MAP-04 + user-intent revision).
    // Each candidate gets its own PPTAnimation per row — N→N coverage rather than 1:1.
    // Path-merged groups naturally stay at 1 candidate → 1 animation (no path-merge regression).
    const candidates = slide.elements.filter((el: { groupId?: string }) => el.groupId === groupId)
    if (candidates.length === 0) {
      opts.diagnostics.elIdNotFoundWarnings.push(
        `slide=${opts.slideId}, group=${groupId}: no PPTElement with groupId match`,
      )
      continue
    }

    const rowsHere = normalizeRows(groupEntry)
    const resolvedRowsHere = rowsHere.map((r) =>
      resolveEffectiveRow(r, entry, opts.sidecar?.defaults),
    )
    for (let rowIdx = 0; rowIdx < rowsHere.length; rowIdx++) {
      const row = rowsHere[rowIdx]
      const resolved = resolvedRowsHere[rowIdx]

      // Plan 15-02 / D-02 cascade — single guard via the resolved row.
      // When the resolved cascade lands on 'none' AND the row itself didn't set
      // its own effect, skip emission. This unifies Plan 15-01's three-line
      // inline check into one readable guard. Row-level `effect === 'none'` is
      // handled later via the EFFECT_NONE_SENTINEL path.
      if (resolved.effect === 'none' && row.effect === undefined) {
        continue
      }

      const inferredType: AnimationType = inferAnimationType(row.effect)
      const { effect, fallback } = mapEffect(
        row.effect,
        inferredType,
        opts.diagnostics,
      )

      // Pitfall 5: row.effect === 'none' → mapEffect returns sentinel '__skip__'.
      if (effect === EFFECT_NONE_SENTINEL) {
        continue
      }

      // D-21 row-level defaults + D-18 trigger_shape fallback — both pass through
      // mapTrigger to collapse three-side strings to the PPTist AnimationTrigger enum.
      // `previousOrder` is shared across all candidates for this row (same trigger
      // semantics), then advances once per row to preserve the cross-row ordering chain.
      const trigger = mapTrigger(
        resolved.trigger,
        row.order,
        previousOrder,
      )
      // Plan 15-01 / D-13 — `delay + duration` collapse into a single ms value.
      // PPTist has no independent `delay` field on PPTAnimation, so the delay is
      // absorbed into `duration` (clamped [100, 5000]). The original delay is
      // preserved in `extensions.originalDelay` per D-14 (buildExtensions below).
      const totalSeconds = resolved.delay + resolved.duration
      if (row.delay !== undefined) {
        opts.diagnostics.delayAccumulatedSeconds += row.delay
      }
      const duration = mapDuration(totalSeconds)

      // ANIM-DEFAULTS-01 observability: count each row-level substitution.
      // PER-ROW, not per-element: the substitution happens once at row-resolution
      // time; emitting the same row to N elements must NOT inflate the count.
      if (row.duration === undefined) opts.diagnostics.defaultsApplied++
      if (row.trigger === undefined && row.trigger_shape === undefined)
        opts.diagnostics.defaultsApplied++

      // D-11/12/13: extensions provenance + preserved opaque fields. Shared
      // content across all candidate emissions for this row (same row, same
      // fallback status). Shallow-copied per animation to keep each
      // PPTAnimation.extensions reference independent — defensive against
      // any future mutation in the consumer path.
      const extensions = buildExtensions(row, fallback)
      const hasExtensions = Object.keys(extensions).length > 0

      for (const candidate of candidates) {
        const pptAnimationId = generatePptAnimationId()

        const animation: PPTAnimation = {
          id: pptAnimationId,
          elId: (candidate as { id: string }).id,
          effect,
          type: inferredType,
          duration,
          trigger,
        }
        if (hasExtensions) animation.extensions = { ...extensions }

        builtAnimations.push(animation)

        opts.diagnostics.animationsInjected++
        opts.diagnostics.elementsCovered++
        opts.diagnostics.extensionsFieldsPreserved += Object.keys(extensions).length
        if (fallback) {
          opts.diagnostics.unmappedEffects++
          opts.diagnostics.unmappedEffectCount++
        }
      }

      previousOrder = row.order
    }
  }

  // D-21 + D-22 + Task 4: three-tier transition resolver. D-22 is enforced
  // by the early-return at the top of this function — defaults only apply
  // when the slide has an actual sidecar entry.
  //
  // Plan 15-01 / D-03 — `transition.effect === 'none'` → `turningMode === 'no'`
  // (preserves auto_advance / sound semantics per ELEMENT_ANIMATIONS.md §2.1).
  const turnEffect = effectiveTransitionEffect(entry, opts.sidecar)
  const turningMode: TurningMode | undefined =
    turnEffect === 'none'
      ? 'no'
      : turnEffect !== undefined
        ? mapTransition(turnEffect)
        : undefined

  // SlidesWithAnimation counts slides whose injections actually altered shape:
  // they either grew an animations[] OR a turningMode. Empty silent slides
  // (entry with no groups + no transition) still count — they got a turningMode.
  if (builtAnimations.length > 0 || turningMode !== undefined) {
    opts.diagnostics.slidesWithAnimation++
  }

  return {
    ...slide,
    animations: builtAnimations,
    turningMode,
  }
}

// ---------------------------------------------------------------------------
// PPTAnimation.id (D-20 — nanoid(10) to match PPTist panel length)
// ---------------------------------------------------------------------------

import { pptAnimationId as generatePptAnimationId } from './utils/id-generator'

// ---------------------------------------------------------------------------
// Diagnostics printer (D-23 — stderr only)
// ---------------------------------------------------------------------------

/**
 * D-23: print the diagnostic summary to `stream` (defaults to `process.stderr`).
 * Never writes to stdout / console.log. Picocolors adds color to WARN lines
 * for visibility without disturbing the JSON pipelines (stderr is unbuffered
 * and not captured into the .svg.json).
 *
 * Plan 15-01 — extended summary line includes:
 *   - `${unmappedEffectCount} effects unmapped (fallback)` (D-12)
 *   - `${delayAccumulatedSeconds.toFixed(2)}s total delay` (D-14)
 */
export function printDiagnostics(
  d: InjectDiagnostics,
  stream: NodeJS.WritableStream = process.stderr,
): void {
  stream.write(
    pc.cyan(
      `[animations] injected into ${d.slidesWithAnimation} slide(s), ` +
        `${d.animationsInjected} PPTAnimation entries ` +
        `(${d.elementsCovered} PPTElement × row tuples), ` +
        `${d.extensionsFieldsPreserved} fields preserved in extensions, ` +
        `${d.unmappedEffects} effects fell back to defaults, ` +
        `${d.unmappedEffectCount} effects unmapped (fallback), ` +
        `${d.delayAccumulatedSeconds.toFixed(2)}s total delay, ` +
        `${d.chromeSkippedGroups} chrome groups skipped\n`,
    ),
  )
  if (d.elIdNotFoundWarnings.length > 0) {
    stream.write(
      pc.yellow(
        `[animations] WARN: ${d.elIdNotFoundWarnings.length} group(s) had no matching PPTElement:\n`,
      ),
    )
    for (const w of d.elIdNotFoundWarnings) stream.write(`  - ${w}\n`)
  }
}
