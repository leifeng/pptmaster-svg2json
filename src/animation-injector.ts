/**
 * Animation injector — Phase 14 / Plan 14-02 + Plan 14-03.
 *
 * Sidecar → Slide bridge. Translates a three-side `animations.json` entry for
 * one slide into `slide.animations[]` (one PPTAnimation per `groups[gid]` row)
 * and `slide.turningMode` (per `entry.transition.effect`). Pure-ish — returns a
 * new Slide object and accumulates diagnostics into a caller-provided object so
 * `convertDir()` can sum across slides.
 *
 * Decisions honored:
 *   D-11: Each PPTAnimation carries D-11 fields in `extensions` —
 *     `originalEffect`, `originalDuration`, `originalTrigger`, `originalType`,
 *     `originalOrder`, `originalDelay`, `originalTriggerShape`.
 *   D-12: Three-side fields PPTist cannot express are preserved as well
 *     (`effect_options`, `repeat_count`, `repeat_duration`, `auto_reverse`,
 *     `rewind`, `accelerate`, `decelerate`, `bounce_end`, `restart`).
 *   D-13: Top-level `extensions` keys are camelCased (e.g. `repeat_count` →
 *     `repeatCount`). Nested keys under `effectOptions` are preserved verbatim.
 *   D-15: When `mapEffect` returns `fallback: true`, `extensions.originalEffect`
 *     captures the original three-side key.
 *   D-18: `trigger_shape` non-undefined collapses to 'click' via the row-level
 *     `effectiveRowTrigger` resolver (always returns a string — order-based
 *     implicit semantics only fire when the resolver's string isn't matched).
 *   D-21 row-level: `effectiveRowDuration(row)` and `effectiveRowTrigger(row)`
 *     apply the per-row > entry.animation > sidecar.defaults.animation >
 *     hardcoded fallback chain (`0.45` sec, `'after-previous'` trigger). Each
 *     substitution increments `diagnostics.defaultsApplied`.
 *   D-21 slide-level + D-22 + Task 4 fix: `effectiveTransitionEffect` resolves
 *     `entry.transition.effect ?? sidecar.defaults.transition.effect`.
 *     The D-22 strict guard at the top of `injectAnimations()` ensures this
 *     helper never leaks defaults into slides absent from `sidecar.slides`.
 *   D-23: `printDiagnostics` writes to `process.stderr` only (never console.log).
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
   * was substituted by `effectiveAnimationDefaults` or the hardcoded fallback.
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
   */
  defaultsApplied: number
}

export function emptyInjectorDiagnostics(): InjectDiagnostics {
  return {
    slidesWithAnimation: 0,
    animationsInjected: 0,
    extensionsFieldsPreserved: 0,
    unmappedEffects: 0,
    elIdNotFoundWarnings: [],
    defaultsApplied: 0,
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

  if (fallback) ext.originalEffect = row.effect
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

  // D-21 + Plan 14-03: row-level defaults resolver. `entry.animation` wins
  // over `sidecar.defaults.animation`; either may be undefined.
  const effectiveAnimationDefaults = resolveAnimationDefaults(entry, opts.sidecar)
  const effectiveRowDuration = (row: AnimationsSidecarRow): number =>
    row.duration ?? effectiveAnimationDefaults?.duration ?? 0.45
  const effectiveRowTrigger = (row: AnimationsSidecarRow): string =>
    row.trigger_shape !== undefined
      ? 'on-click'
      : (row.trigger ?? effectiveAnimationDefaults?.trigger ?? 'after-previous')

  for (const [groupId, groupEntry] of Object.entries(entry.groups)) {
    // Resolve elId — first PPTElement whose groupId matches (D-08 + ANIM-MAP-04).
    const candidates = slide.elements.filter((el: { groupId?: string }) => el.groupId === groupId)
    if (candidates.length === 0) {
      opts.diagnostics.elIdNotFoundWarnings.push(
        `slide=${opts.slideId}, group=${groupId}: no PPTElement with groupId match`,
      )
      continue
    }
    const elId = (candidates[0] as { id: string }).id

    const rows = normalizeRows(groupEntry)
    for (const row of rows) {
      const inferredType: AnimationType = inferAnimationType(row.effect)
      const { effect, fallback } = mapEffect(row.effect, inferredType)

      // Pitfall 5: row.effect === 'none' → mapEffect returns sentinel '__skip__'.
      if (effect === EFFECT_NONE_SENTINEL) {
        continue
      }

      // D-21 row-level defaults + D-18 trigger_shape fallback — both pass through
      // mapTrigger to collapse three-side strings to the PPTist AnimationTrigger enum.
      const trigger = mapTrigger(
        effectiveRowTrigger(row),
        row.order,
        previousOrder,
      )
      const duration = mapDuration(effectiveRowDuration(row))

      // ANIM-DEFAULTS-01 observability: count each row-level substitution.
      if (row.duration === undefined) opts.diagnostics.defaultsApplied++
      if (row.trigger === undefined && row.trigger_shape === undefined)
        opts.diagnostics.defaultsApplied++

      // D-11/12/13: extensions provenance + preserved opaque fields.
      const extensions = buildExtensions(row, fallback)
      const pptAnimationId = generatePptAnimationId()

      const animation: PPTAnimation = {
        id: pptAnimationId,
        elId,
        effect,
        type: inferredType,
        duration,
        trigger,
      }
      if (Object.keys(extensions).length > 0) animation.extensions = extensions

      builtAnimations.push(animation)
      previousOrder = row.order

      opts.diagnostics.animationsInjected++
      opts.diagnostics.extensionsFieldsPreserved += Object.keys(extensions).length
      if (fallback) opts.diagnostics.unmappedEffects++
    }
  }

  // D-21 + D-22 + Task 4: three-tier transition resolver. D-22 is enforced
  // by the early-return at the top of this function — defaults only apply
  // when the slide has an actual sidecar entry.
  const turnEffect = effectiveTransitionEffect(entry, opts.sidecar)
  const turningMode: TurningMode | undefined =
    turnEffect !== undefined ? mapTransition(turnEffect) : undefined

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
 */
export function printDiagnostics(
  d: InjectDiagnostics,
  stream: NodeJS.WritableStream = process.stderr,
): void {
  stream.write(
    pc.cyan(
      `[animations] injected into ${d.slidesWithAnimation} slide(s), ` +
        `${d.animationsInjected} PPTAnimation entries, ` +
        `${d.extensionsFieldsPreserved} fields preserved in extensions, ` +
        `${d.unmappedEffects} effects fell back to defaults\n`,
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
