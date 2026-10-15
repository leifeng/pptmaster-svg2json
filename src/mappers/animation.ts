/**
 * Animation mapper module — Phase 14 / Plan 14-02.
 *
 * Pure functions and pure-data mapping tables that translate three-side
 * (e.g., ppt-master) animation keys to PPTist's hard effect whitelist.
 * No I/O, no async, no side effects — trivially unit-testable.
 *
 * Decisions honored (see `.planning/phases/14-pptist-animation-from-sidecar/14-CONTEXT.md`):
 *   D-14: `inferAnimationType(key)` — prefix-based type inference.
 *   D-15: `EFFECT_FALLBACK` — per-type default effect when key is unmapped.
 *   D-16: `ENTRANCE_MAP` / `EMPHASIS_MAP` / `EXIT_MAP` — visual-equivalent
 *          mapping tables maintained here.
 *   D-17: `TRANSITION_MAP` — 48→12 transition key → TurningMode mapping.
 *   D-18: `mapTrigger` — order-and-trigger-string → AnimationTrigger.
 *   D-19: `mapDuration` — seconds → milliseconds, clamped `[100, 5000]`.
 *
 * Whitelist source: `code/PPTist/src/configs/animation.ts`
 *   ENTER_ANIMATIONS / EXIT_ANIMATIONS / ATTENTION_ANIMATIONS — 84 effects total.
 *
 * Mapping is intentionally pragmatic (see RESEARCH.md §"Primary recommendation",
 * ~30-entry entrance maps cover instance data + common canonical keys); effect
 * keys not in any MAP fall through to `EFFECT_FALLBACK[inferredType]` and
 * `extensions.originalEffect` carries the original three-side key per D-15.
 */

import type { AnimationType, AnimationTrigger, TurningMode } from '../slides'

// ---------------------------------------------------------------------------
// Mapping tables (D-16, D-17)
// ---------------------------------------------------------------------------

/**
 * ENTRANCE_MAP: three-side `entrance_*` key → PPTist 84-effect whitelist value.
 *
 * Direction-driven variants (slideIn*Left vs slideInRight, etc.) currently map
 * to a single canonical value per D-16's "visually equivalent mapping" policy.
 * `effect_options.direction` is preserved verbatim in `extensions.effectOptions`
 * (per D-12) but is not consulted to refine the choice — flagged as a v2
 * enhancement (RESEARCH §0 Pitfall 4).
 */
export const ENTRANCE_MAP: Record<string, string> = {
  entrance_fade: 'fadeIn',
  entrance_wipe: 'fadeIn',             // direction drives slideInLeft/Right in v2
  entrance_fly: 'lightSpeedInLeft',    // direction drives L/R
  entrance_zoom: 'zoomIn',
  entrance_circle: 'rotateIn',
  entrance_dissolve: 'fadeIn',
  entrance_rise_up: 'backInUp',
  entrance_glide: 'slideInLeft',       // direction drives L/R
  entrance_float: 'backInUp',
  entrance_ascend: 'backInUp',
  entrance_wheel: 'rotateIn',
  entrance_wedge: 'rotateInDownLeft',  // direction drives DownLeft/Right
  entrance_box: 'zoomIn',
  entrance_expand: 'zoomIn',
  entrance_stretch: 'backInLeft',      // direction drives L/R
  entrance_swish: 'lightSpeedInLeft',  // direction drives L/R
  entrance_split: 'zoomIn',
  entrance_bounce: 'bounceIn',
  entrance_drop: 'fadeInDown',
  entrance_swing: 'backInUp',
  entrance_twirl: 'rotateIn',
  entrance_flip: 'flipInX',
  entrance_roll: 'lightSpeedInLeft',
  entrance_slide: 'slideInLeft',
  entrance_drift: 'lightSpeedInLeft',
  entrance_spin: 'rotateIn',
  entrance_burst: 'zoomIn',
  entrance_reveal: 'fadeIn',
  entrance_pulse_in: 'fadeIn',
  entrance_glow: 'fadeIn',
  entrance_unfold: 'backInUp',
  entrance_unfurl: 'backInLeft',
  entrance_appear: 'fadeIn',
  entrance_ignite: 'fadeIn',
  entrance_materialize: 'zoomIn',
}

/**
 * EMPHASIS_MAP: three-side `emphasis_*` key → PPTist ATTENTION_ANIMATIONS value.
 * 12 entries cover the canonical attention effects from the whitelist.
 */
export const EMPHASIS_MAP: Record<string, string> = {
  emphasis_pulse: 'pulse',
  emphasis_beat: 'pulse',
  emphasis_flash: 'flash',
  emphasis_bounce: 'bounce',
  emphasis_jump: 'bounce',
  emphasis_shake: 'headShake',
  emphasis_teeter: 'headShake',
  emphasis_spin: 'wobble',
  emphasis_rotate: 'wobble',
  emphasis_heartbeat: 'heartBeat',
  emphasis_pendulum: 'swing',
  emphasis_jelly: 'jello',
}

/**
 * EXIT_MAP: three-side `exit_*` key → PPTist EXIT_ANIMATIONS value.
 * Symmetric to ENTRANCE_MAP where possible; minimum 10 entries required.
 */
export const EXIT_MAP: Record<string, string> = {
  exit_fade: 'fadeOut',
  exit_wipe: 'fadeOut',
  exit_fly: 'lightSpeedOutLeft',
  exit_zoom: 'zoomOut',
  exit_circle: 'rotateOut',
  exit_rise_up: 'backOutUp',
  exit_glide: 'slideOutLeft',
  exit_box: 'zoomOut',
  exit_split: 'zoomOut',
  exit_dissolve: 'fadeOut',
  exit_bounce: 'bounceOut',
  exit_drop: 'fadeOutDown',
  exit_shrink: 'zoomOut',
}

/**
 * TRANSITION_MAP: three-side 48 transition key → PPTist 12 TurningMode.
 * D-17: `fade` is the universal fallback. `random` is preserved verbatim so
 * PPTist's `useSlidesWithTurningMode.ts` can do its random expansion at runtime.
 */
export const TRANSITION_MAP: Record<string, TurningMode> = {
  fade: 'fade',
  morph: 'fade',
  push: 'slideY',
  wipe: 'fade',
  split: 'scale',
  reveal: 'fade',
  cut: 'no',
  cover: 'slideX',
  uncover: 'slideX',
  flash: 'fade',
  random_bars: 'fade',
  shape: 'fade',
  dissolve: 'fade',
  checkerboard: 'fade',
  blinds: 'fade',
  clock: 'fade',
  ripple: 'fade',
  honeycomb: 'fade',
  glitter: 'fade',
  comb: 'fade',
  zoom: 'fade',
  random: 'random',
  fall_over: 'fade',
  drape: 'fade',
  curtains: 'fade',
  wind: 'fade',
  prestige: 'fade',
  fracture: 'fade',
  crush: 'fade',
  peel_off: 'fade',
  page_curl: 'fade',
  airplane: 'fade',
  origami: 'fade',
  vortex: 'fade',
  shred: 'fade',
  switch: 'fade',
  flip: 'fade',
  gallery: 'fade',
  cube: 'fade',
  doors: 'fade',
  pan: 'fade',
  ferris_wheel: 'fade',
  conveyor: 'fade',
  rotate: 'rotate',
  window: 'fade',
  orbit: 'fade',
  fly_through: 'fade',
}

// ---------------------------------------------------------------------------
// Fallback + type defaults (D-14, D-15)
// ---------------------------------------------------------------------------

/**
 * EFFECT_FALLBACK: per-type default effect when no visual-equivalent is found
 * in the per-type MAP. The original three-side key is then written to
 * `extensions.originalEffect` so provenance is preserved.
 */
export const EFFECT_FALLBACK: Record<AnimationType, string> = {
  in: 'fadeIn',
  attention: 'pulse',
  out: 'fadeOut',
}

/** Sentinel effect returned by `mapEffect` when the row carries `effect: 'none'`. */
export const EFFECT_NONE_SENTINEL = '__skip__'

// ---------------------------------------------------------------------------
// Mapping functions
// ---------------------------------------------------------------------------

/**
 * D-14 — Infer AnimationType from three-side key prefix.
 *
 * - `entrance_*` OR `path_*` → `'in'` (path is motion-as-entrance per D-14)
 * - `emphasis_*` → `'attention'`
 * - `exit_*` → `'out'`
 * - Otherwise (unknown prefix or bare key) → `'in'` (default per D-14)
 */
export function inferAnimationType(threeSideKey: string): AnimationType {
  if (threeSideKey.startsWith('entrance_') || threeSideKey.startsWith('path_')) return 'in'
  if (threeSideKey.startsWith('emphasis_')) return 'attention'
  if (threeSideKey.startsWith('exit_')) return 'out'
  return 'in'
}

/**
 * D-16 / D-15 — Map three-side effect key to PPTist effect value.
 *
 * Returns:
 *   { effect: <pptist-whitelist-value>, fallback: false } when key found in MAP
 *   { effect: EFFECT_FALLBACK[inferredType], fallback: true } otherwise
 *   { effect: '__skip__', fallback: false } when row.effect === 'none' (Pitfall 5)
 *
 * Callers are expected to honor the `__skip__` sentinel by skipping the row.
 */
export function mapEffect(
  threeSideKey: string,
  inferredType: AnimationType,
): { effect: string; fallback: boolean } {
  if (threeSideKey === 'none') return { effect: EFFECT_NONE_SENTINEL, fallback: false }

  const byType: Record<AnimationType, Record<string, string>> = {
    in: ENTRANCE_MAP,
    attention: EMPHASIS_MAP,
    out: EXIT_MAP,
  }
  const mapped = byType[inferredType]?.[threeSideKey]
  if (mapped) return { effect: mapped, fallback: false }
  return { effect: EFFECT_FALLBACK[inferredType], fallback: true }
}

/**
 * D-18 — Map (threeSideTrigger, currentOrder, previousOrder) → AnimationTrigger.
 *
 * Rule chain (in order):
 *   1. explicit trigger string:
 *      - 'on-click' → 'click'
 *      - 'with-previous' → 'meantime'
 *      - 'after-previous' → 'auto'
 *   2. implicit by order:
 *      - previousOrder defined AND currentOrder === previousOrder → 'meantime'
 *      - previousOrder defined AND currentOrder > previousOrder (strictly) → 'auto'
 *   3. fallback → 'auto'
 *
 * The injector also handles `trigger_shape` non-undefined as 'click' — but that
 * decision lives outside this mapper (it touches three-side field semantics,
 * not trigger-or-order semantics), so it is handled by the caller.
 */
export function mapTrigger(
  threeSideTrigger: string | undefined,
  currentOrder: number | undefined,
  previousOrder: number | undefined,
): AnimationTrigger {
  if (threeSideTrigger === 'on-click') return 'click'
  if (threeSideTrigger === 'with-previous') return 'meantime'
  if (threeSideTrigger === 'after-previous') return 'auto'

  // No explicit trigger — derive from order semantics.
  if (
    previousOrder !== undefined &&
    currentOrder !== undefined &&
    currentOrder === previousOrder
  ) {
    return 'meantime'
  }
  return 'auto'
}

/**
 * D-19 — Convert three-side seconds → PPTist milliseconds, clamped `[100, 5000]`.
 *
 * If `threeSideDuration` is `undefined`, returns the clamped default of 0.45s
 * (450ms — matches `defaults.animation.duration` per instance data).
 */
export function mapDuration(
  threeSideDuration: number | undefined,
  defaultDurationSeconds: number = 0.45,
): number {
  const seconds = threeSideDuration ?? defaultDurationSeconds
  const ms = Math.round(seconds * 1000)
  if (ms < 100) return 100
  if (ms > 5000) return 5000
  return ms
}

/**
 * D-17 — Map three-side transition key → PPTist TurningMode.
 *
 * Returns `TRANSITION_MAP[key]` when present, else `'fade'` (universal fallback).
 * `random` is intentionally passed through verbatim — PPTist's
 * `useSlidesWithTurningMode.ts` expands it at runtime.
 */
export function mapTransition(threeSideEffect: string): TurningMode {
  return TRANSITION_MAP[threeSideEffect] ?? 'fade'
}
