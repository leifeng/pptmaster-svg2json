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
 * ENTRANCE_MAP: three-side `entrance_*` key → PPTist 92-effect whitelist value.
 *
 * 53 entries covering all `entrance_*` keys from ELEMENT_ANIMATIONS.md §4.6
 * (lines 259-311). Direction-driven variants (slideIn*Left vs slideInRight)
 * default to Left per D-16's "visually equivalent mapping" policy. The original
 * three-side key is preserved in `extensions.effectOptions.direction` for v2
 * refinement (RESEARCH §0 Pitfall 4).
 *
 * Unmapped three-side keys fall through to `EFFECT_FALLBACK['in']` (`fadeIn`)
 * and `extensions.originalEffect` carries the original key (D-15).
 */
export const ENTRANCE_MAP: Record<string, string> = {
  // Direct semantic equivalents
  entrance_appear: 'fadeIn',
  entrance_fade: 'fadeIn',
  entrance_zoom: 'zoomIn',
  entrance_bounce: 'bounceIn',
  entrance_flip: 'flipInX',

  // Fly / wipe / glide (direction-aware; default = Left)
  entrance_fly: 'lightSpeedInLeft',
  entrance_wipe: 'fadeIn',
  entrance_glide: 'slideInLeft',

  // Circle / wheel / wedge / spiral (rotate family)
  entrance_circle: 'rotateIn',
  entrance_wheel: 'rotateIn',
  entrance_wedge: 'rotateInDownLeft',
  entrance_spiral: 'rotateIn',
  entrance_pinwheel: 'rotateIn',
  entrance_swivel: 'rotateIn',
  entrance_spinner: 'rotateIn',
  entrance_center_revolve: 'rotateIn',
  entrance_faded_swivel: 'rotateIn',
  entrance_grow_and_turn: 'rotateIn',

  // Box / diamond / plus / peek / split / expand / fold (zoom family)
  entrance_box: 'zoomIn',
  entrance_diamond: 'rotateIn',
  entrance_plus: 'zoomIn',
  entrance_split: 'zoomIn',
  entrance_expand: 'zoomIn',
  entrance_fold: 'zoomIn',
  entrance_faded_zoom: 'zoomIn',

  // Stripes / random_bars / dissolve / blinds (no direct match → fadeIn)
  entrance_blinds: 'fadeIn',
  entrance_checkerboard: 'fadeIn',
  entrance_dissolve: 'fadeIn',
  entrance_random_bars: 'fadeIn',
  entrance_strips: 'slideInLeft',
  entrance_random_effects: 'fadeIn',
  entrance_color_reveal: 'fadeIn',
  entrance_thin_line: 'fadeIn',
  entrance_credits: 'slideInUp',
  entrance_ease_in: 'fadeIn',
  entrance_flash_once: 'fadeIn',

  // Rise / ascend / descend / float / arc_up (back family)
  entrance_rise_up: 'backInUp',
  entrance_ascend: 'backInUp',
  entrance_descend: 'backInDown',
  entrance_float: 'backInUp',
  entrance_arc_up: 'backInUp',

  // Crawl / peek / whip / swish / light_speed / zip / sling / boomerang / unfold / stretchy / stretch
  entrance_crawl: 'slideInUp',
  entrance_peek: 'slideInUp',
  entrance_whip: 'lightSpeedInLeft',
  entrance_swish: 'lightSpeedInLeft',
  entrance_light_speed: 'lightSpeedInLeft',
  entrance_zip: 'lightSpeedInLeft',
  entrance_sling: 'backInLeft',
  entrance_boomerang: 'backInUp',
  entrance_unfold: 'backInUp',
  entrance_stretchy: 'backInUp',
  entrance_stretch: 'backInLeft',

  // 3D — no 3D in PPTist; zoomIn fallback
  entrance_3d_arrive: 'zoomIn',
}

/**
 * EMPHASIS_MAP: three-side `emphasis_*` key → PPTist ATTENTION_ANIMATIONS value.
 * 33 entries covering all `emphasis_*` keys from ELEMENT_ANIMATIONS.md §4.6
 * (lines 317-349). ATTENTION_ANIMATIONS only has 12 values, so most three-side
 * keys cluster on `pulse`, `flash`, `wobble`, or `bounce`.
 */
export const EMPHASIS_MAP: Record<string, string> = {
  // Color / font change families (no PPTist equivalent; pulse fallback)
  emphasis_change_fill_color: 'pulse',
  emphasis_change_font: 'pulse',
  emphasis_change_font_color: 'pulse',
  emphasis_change_font_size: 'pulse',
  emphasis_change_font_style: 'pulse',
  emphasis_change_line_color: 'pulse',
  emphasis_brush_on_color: 'pulse',
  emphasis_brush_on_underline: 'pulse',
  emphasis_color_blend: 'pulse',
  emphasis_color_wave: 'pulse',
  emphasis_complementary_color: 'pulse',
  emphasis_complementary_color2: 'pulse',
  emphasis_contrasting_color: 'pulse',
  emphasis_darken: 'pulse',
  emphasis_desaturate: 'pulse',
  emphasis_grow_with_color: 'pulse',
  emphasis_lighten: 'pulse',
  emphasis_style_emphasis: 'pulse',
  emphasis_bold_reveal: 'pulse',

  // Flash / transparency / flicker
  emphasis_transparency: 'flash',
  emphasis_bold_flash: 'flash',
  emphasis_flash_bulb: 'flash',
  emphasis_flicker: 'flash',

  // Motion / shake / teeter / shimmer / blast / wave
  emphasis_shimmer: 'wobble',
  emphasis_blast: 'wobble',
  emphasis_teeter: 'headShake',
  emphasis_wave: 'swing',

  // Spin / grow / scale (3D / scale)
  emphasis_spin: 'wobble',
  emphasis_grow_shrink: 'bounce',
  emphasis_vertical_grow: 'bounce',

  // 3D emphasis (PPTist has no 3D; wobble/swing/tada fallback)
  emphasis_3d_turntable: 'wobble',
  emphasis_3d_swing: 'swing',
  emphasis_3d_jump_and_turn: 'tada',
}

/**
 * EXIT_MAP: three-side `exit_*` key → PPTist EXIT_ANIMATIONS value.
 * 53 entries covering all `exit_*` keys from ELEMENT_ANIMATIONS.md §4.6
 * (lines 426-478). Symmetric to ENTRANCE_MAP.
 */
export const EXIT_MAP: Record<string, string> = {
  // Direct semantic equivalents
  exit_appear: 'fadeOut',
  exit_fade: 'fadeOut',
  exit_zoom: 'zoomOut',
  exit_bounce: 'bounceOut',
  exit_flip: 'flipOutX',

  // Fly / wipe / glide (direction-aware; default = Left)
  exit_fly: 'lightSpeedOutLeft',
  exit_wipe: 'fadeOut',
  exit_glide: 'slideOutLeft',

  // Circle / wheel / wedge / spiral (rotate family)
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

  // Box / diamond / plus / split / expand / fold (zoom family)
  exit_box: 'zoomOut',
  exit_diamond: 'rotateOut',
  exit_plus: 'zoomOut',
  exit_split: 'zoomOut',
  exit_expand: 'zoomOut',
  exit_fold: 'zoomOut',
  exit_faded_zoom: 'zoomOut',

  // Stripes / random_bars / dissolve / blinds (no direct match → fadeOut)
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
  exit_flash_once: 'fadeOut',

  // Rise / ascend / descend / float / arc_up (back family)
  exit_rise_up: 'backOutUp',
  exit_ascend: 'backOutUp',
  exit_descend: 'backOutDown',
  exit_float: 'backOutUp',
  exit_arc_up: 'backOutUp',

  // Crawl / peek / whip / swish / light_speed / zip / sling / boomerang / unfold / stretchy / stretch
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

  // 3D — no 3D in PPTist; zoomOut fallback
  exit_3d_arrive: 'zoomOut',
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

/**
 * LEGACY_NAME_MAP: 29 legacy compatibility input names → canonical preset.
 *
 * Source: `ELEMENT_ANIMATIONS.md §4.7` lines 490-520. These keys are accepted
 * on input but normalized to `entrance_*` (203-key canonical) before the
 * per-type MAP. The `originalEffect` field in `extensions` (D-15) preserves
 * the original legacy key for provenance.
 *
 * When the legacy variant carries direction/amount semantics (e.g. `fly_left`),
 * the canonical `effect_options` are merged in `normalizeLegacyEffect` (user-
 * provided options win over legacy defaults — user-provided is more specific).
 */
export const LEGACY_NAME_MAP: Record<string, { effect: string; options?: Record<string, any> }> = {
  appear:         { effect: 'entrance_appear' },
  cut:            { effect: 'entrance_appear' },
  fade:           { effect: 'entrance_fade' },
  fly:            { effect: 'entrance_fly', options: { direction: 'down' } },
  fly_left:       { effect: 'entrance_fly', options: { direction: 'left' } },
  fly_right:      { effect: 'entrance_fly', options: { direction: 'right' } },
  fly_top:        { effect: 'entrance_fly', options: { direction: 'up' } },
  zoom:           { effect: 'entrance_zoom' },
  wipe:           { effect: 'entrance_wipe', options: { direction: 'left' } },
  wipe_left:      { effect: 'entrance_wipe', options: { direction: 'left' } },
  wipe_right:     { effect: 'entrance_wipe', options: { direction: 'right' } },
  wipe_up:        { effect: 'entrance_wipe', options: { direction: 'up' } },
  wipe_down:      { effect: 'entrance_wipe', options: { direction: 'down' } },
  split:          { effect: 'entrance_split', options: { direction: 'horizontal' } },
  blinds:         { effect: 'entrance_blinds', options: { direction: 'vertical' } },
  checkerboard:   { effect: 'entrance_checkerboard', options: { direction: 'horizontal' } },
  dissolve:       { effect: 'entrance_dissolve' },
  random_bars:    { effect: 'entrance_random_bars', options: { direction: 'horizontal' } },
  peek:           { effect: 'entrance_peek', options: { direction: 'in_bottom' } },
  wheel:          { effect: 'entrance_wheel', options: { amount: 4 } },
  box:            { effect: 'entrance_box', options: { direction: 'in' } },
  circle:         { effect: 'entrance_circle', options: { direction: 'in' } },
  diamond:        { effect: 'entrance_diamond', options: { direction: 'in' } },
  plus:           { effect: 'entrance_plus', options: { direction: 'in' } },
  strips:         { effect: 'entrance_strips', options: { direction: 'right' } },
  wedge:          { effect: 'entrance_wedge', options: { direction: 'down' } },
  stretch:        { effect: 'entrance_stretch', options: { direction: 'in' } },
  expand:         { effect: 'entrance_expand', options: { direction: 'out' } },
  swivel:         { effect: 'entrance_swivel', options: { direction: 'vertical' } },
}

/**
 * D-LEGACY — Translate a legacy input name to its canonical preset.
 *
 * Returns `{ effect: canonicalKey, options: mergedOptions }`. When the input
 * is NOT a legacy name (e.g. already `entrance_fly` or `emphasis_pulse`), the
 * key is returned verbatim and options are passed through (no legacy defaults
 * applied). User-provided `existingOptions` always WIN over legacy defaults
 * (user is more specific than the table).
 *
 * This is the per-row `NormalizedAnimation` step referenced in
 * `PPTIST_ANIMATION_MAPPING.md §3.2`. Implementation lives in `mappers/`
 * (NOT in `animation-types.ts`) because the table needs the runtime value of
 * the key, which only the mapper consumes.
 */
export function normalizeLegacyEffect(
  key: string,
  existingOptions?: Record<string, any>,
): { effect: string; options?: Record<string, any> } {
  const legacy = LEGACY_NAME_MAP[key]
  if (legacy === undefined) {
    return { effect: key, options: existingOptions }
  }
  // Merge: user-provided wins over legacy defaults (per ELEMENT_ANIMATIONS.md §4.5 v2 rule).
  const merged = existingOptions || legacy.options
    ? { ...(legacy.options ?? {}), ...(existingOptions ?? {}) }
    : undefined
  return { effect: legacy.effect, options: merged }
}

// ---------------------------------------------------------------------------
// Chrome-skip heuristic (D-04 — forward-compat only in Phase 15)
// ---------------------------------------------------------------------------

/**
 * D-04 — Chrome-like group id regex. Matches the well-known chrome tokens
 * used by slide decks to identify non-content groups (backgrounds, headers,
 * footers, navigation chrome, page numbers, etc.).
 *
 * Per `ELEMENT_ANIMATIONS.md §5.2`, every chrome-id candidate is silently
 * skipped by the animation injector unless explicitly listed in the sidecar's
 * `slides.<id>.groups` block (user override). Phase 15 wires the helper
 * forward-compat only — Plan 16+ bulk-scan feature should integrate the
 * chrome-skip filter into the iteration loop.
 *
 * Test cases (ELEMENT_ANIMATIONS.md L541):
 *   bg              → true   (literal)
 *   nav             → true   (literal)
 *   logo            → true   (literal)
 *   watermark       → true   (literal)
 *   pagenumber      → true   (literal)
 *   card-header-arrow → true (matches `.*-header$`)
 *   footer-strip    → true   (matches `.*-footer$`)
 *   background-decor → true  (matches `.*-decor$`)
 *   decor           → false  (`.*-decor` requires ≥1 prefix char)
 *   card-temperature → false (semantic group, not chrome)
 */
export const CHROME_REGEX = /^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$/

/**
 * D-04 — Pure helper that classifies a group id as chrome. The regex is
 * exported as `CHROME_REGEX` so other consumers can compose or inspect it.
 *
 * NOTE: This function is exposed but not yet wired into `injectAnimations`'s
 * `for-of entry.groups` loop (Phase 15 forward-compat). Plan 16+ bulk-scan
 * feature should:
 *   1. For each group id, check `isChromeGroupId(id)`.
 *   2. If true AND id is not in `entry.groups` (explicit override) → skip
 *      AND increment `diagnostics.chromeSkippedGroups`.
 *   3. Otherwise → emit per row as today.
 */
export function isChromeGroupId(id: string): boolean {
  return CHROME_REGEX.test(id)
}

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
 * D-16 / D-15 / D-12 — Map three-side effect key to PPTist effect value.
 *
 * Returns:
 *   { effect: <pptist-whitelist-value>, fallback: false } when key found in MAP
 *   { effect: EFFECT_FALLBACK[inferredType], fallback: true } otherwise
 *   { effect: '__skip__', fallback: false } when row.effect === 'none' (Pitfall 5)
 *
 * Callers are expected to honor the `__skip__` sentinel by skipping the row.
 *
 * D-LEGACY normalization: when `threeSideKey` is a legacy compatibility input
 * name (ELEMENT_ANIMATIONS.md §4.7 — e.g. `fly`, `zoom`, `wipe_left`), it is
 * first translated to its canonical `entrance_*` form via `normalizeLegacyEffect`
 * before the per-type MAP lookup. This unblocks the legacy 29-key input surface
 * without polluting the 203-key canonical MAP.
 *
 * `counters` (D-12 unmapped observability) — when provided, increments
 * `unmappedEffectCount` for each fallback hit (so the injector can surface
 * unmapped-key statistics without changing existing call sites).
 */
export function mapEffect(
  threeSideKey: string,
  inferredType: AnimationType,
  counters?: { unmappedEffectCount: number },
): { effect: string; fallback: boolean } {
  if (threeSideKey === 'none') return { effect: EFFECT_NONE_SENTINEL, fallback: false }

  // D-LEGACY: legacy input → canonical preset before consulting the per-type MAP.
  const normalized = normalizeLegacyEffect(threeSideKey)
  const lookupKey = normalized.effect

  const byType: Record<AnimationType, Record<string, string>> = {
    in: ENTRANCE_MAP,
    attention: EMPHASIS_MAP,
    out: EXIT_MAP,
  }
  const mapped = byType[inferredType]?.[lookupKey]
  if (mapped) return { effect: mapped, fallback: false }
  if (counters) counters.unmappedEffectCount++
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
