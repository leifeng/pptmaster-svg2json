/**
 * Animations sidecar type definitions.
 *
 * These describe the THREE-SIDE (e.g., ppt-master) `animations.json` schema
 * that drives PPTist `slide.animations` injection in Plan 14-02. Plan 14-01
 * ships the INTERFACES ONLY — runtime parsing (`readFileSync` + `JSON.parse`
 * + `as AnimationsSidecar`) lands in Plan 02, alongside the actual
 * `injectAnimations()` mapper.
 *
 * Reference: 14-RESEARCH.md §"Type Extensions (Deltas to Existing Types)".
 *
 * Forward-compat policy: every group/slide includes `[key: string]: unknown`
 * so additional three-side fields don't break deserialization. Plan 02's
 * injector reads only the named fields; unknown keys are dropped per D-12.
 *
 * Field naming: three-side uses snake_case (e.g., `effect_options`,
 * `trigger_shape`, `repeat_count`). Per D-13, fields that survive into
 * `PPTAnimation.extensions` are camelCased at the boundary.
 */

/**
 * A single animation row in the modern (array) form under
 * `AnimationsSidecarGroup.effects[]`.
 */
export interface AnimationsSidecarRow {
  effect: string
  trigger?: 'on-click' | 'with-previous' | 'after-previous'
  order?: number
  delay?: number
  duration?: number
  effect_options?: Record<string, any>
  trigger_shape?: string
  repeat_count?: number
  repeat_duration?: number
  auto_reverse?: boolean
  rewind?: boolean
  accelerate?: boolean
  decelerate?: boolean
  bounce_end?: boolean
  restart?: boolean
  after_effect?: string
  sound?: string
}

/**
 * A group's animation configuration in the sidecar.
 *
 * Two mutually-exclusive shapes:
 * - LEGACY single-effect form: top-level `effect`, `trigger`, etc. (one animation per group)
 * - MODERN array form: top-level `effects: AnimationsSidecarRow[]` (multiple animations per group)
 *
 * Plan 02's injector picks the right shape via field presence.
 */
export interface AnimationsSidecarGroup {
  // Legacy single-effect form
  effect?: string
  trigger?: 'on-click' | 'with-previous' | 'after-previous'
  order?: number
  delay?: number
  duration?: number
  effect_options?: Record<string, any>
  trigger_shape?: string
  // Modern array form (mutually exclusive with legacy single-effect)
  effects?: AnimationsSidecarRow[]
  // Forward-compat: any additional three-side fields not yet modeled.
  // Plan 02 reads only the named fields; unknowns are dropped per D-12.
  [key: string]: unknown
}

/**
 * Per-slide sidecar entry. Keyed by slide_id (filename without `.svg`).
 *
 * `transition` maps to `Slide.turningMode` (D-17).
 * `animation` is slide-level animation defaults (rarely used — most animations
 * are per `<g id>` under `groups`).
 *
 * Plan 15-01 / D-02 — `animation.effect` carries the slide-wide cascade. `effect`
 * can be `'none'` to suppress all animations on the slide (unless a row
 * overrides), a specific three-side key, or omitted entirely.
 */
export interface AnimationsSidecarSlide {
  transition?: {
    effect?: string
    duration?: number
    sound?: string
    [key: string]: unknown
  }
  animation?: {
    effect?: string
    trigger?: 'on-click' | 'with-previous' | 'after-previous'
    duration?: number
    [key: string]: unknown
  }
  groups: Record<string, AnimationsSidecarGroup>
}

/**
 * Root sidecar shape. Top-level `version` for forward-compat (Plan 02 will
 * dispatch on it). `defaults` supplies slide-wide animation/transition
 * fallbacks (D-21).
 */
export interface AnimationsSidecar {
  version: number
  defaults?: {
    transition?: { effect?: string; duration?: number; sound?: string }
    animation?: {
      effect?: string
      trigger?: 'on-click' | 'with-previous' | 'after-previous'
      duration?: number
    }
  }
  slides: Record<string, AnimationsSidecarSlide>
}