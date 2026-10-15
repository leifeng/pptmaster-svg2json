/**
 * Mapper tests — Phase 14 / Plan 14-02.
 *
 * Covers D-14~19 acceptance criteria (must_haves.truths + key_functions).
 * The whitelist assertion ensures every value mapped to PPTist lives in the
 * 84-entry whitelist exported from `code/PPTist/src/configs/animation.ts`.
 */

import { describe, it, expect } from 'vitest'
import {
  ENTRANCE_MAP,
  EMPHASIS_MAP,
  EXIT_MAP,
  TRANSITION_MAP,
  EFFECT_FALLBACK,
  EFFECT_NONE_SENTINEL,
  CHROME_REGEX,
  LEGACY_NAME_MAP,
  isChromeGroupId,
  inferAnimationType,
  mapEffect,
  mapTrigger,
  mapDuration,
  mapTransition,
  normalizeLegacyEffect,
} from './animation'

// PPTist whitelists for runtime safety check.
// These mirror code/PPTist/src/configs/animation.ts:7-214 — kept inline so the
// test is self-contained (the project does not depend on PPTist at runtime).
const PPTIST_WHITELIST = new Set<string>([
  // ENTER (60)
  'bounceIn', 'bounceInLeft', 'bounceInRight', 'bounceInUp', 'bounceInDown',
  'fadeIn', 'fadeInDown', 'fadeInDownBig', 'fadeInLeft', 'fadeInLeftBig',
  'fadeInRight', 'fadeInRightBig', 'fadeInUp', 'fadeInUpBig',
  'fadeInTopLeft', 'fadeInTopRight', 'fadeInBottomLeft', 'fadeInBottomRight',
  'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight',
  'zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp',
  'slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp',
  'flipInX', 'flipInY',
  'backInDown', 'backInLeft', 'backInRight', 'backInUp',
  'lightSpeedInRight', 'lightSpeedInLeft',
  // EXIT (60)
  'bounceOut', 'bounceOutLeft', 'bounceOutRight', 'bounceOutUp', 'bounceOutDown',
  'fadeOut', 'fadeOutDown', 'fadeOutDownBig', 'fadeOutLeft', 'fadeOutLeftBig',
  'fadeOutRight', 'fadeOutRightBig', 'fadeOutUp', 'fadeOutUpBig',
  'fadeOutTopLeft', 'fadeOutTopRight', 'fadeOutBottomLeft', 'fadeOutBottomRight',
  'rotateOut', 'rotateOutDownLeft', 'rotateOutDownRight', 'rotateOutUpLeft', 'rotateOutUpRight',
  'zoomOut', 'zoomOutDown', 'zoomOutLeft', 'zoomOutRight', 'zoomOutUp',
  'slideOutDown', 'slideOutLeft', 'slideOutRight', 'slideOutUp',
  'flipOutX', 'flipOutY',
  'backOutDown', 'backOutLeft', 'backOutRight', 'backOutUp',
  'lightSpeedOutRight', 'lightSpeedOutLeft',
  // ATTENTION (12)
  'shakeX', 'shakeY', 'headShake', 'swing', 'wobble', 'tada', 'jello',
  'bounce', 'flash', 'pulse', 'rubberBand', 'heartBeat',
])
const PPTIST_TURNING_MODES = new Set([
  'no', 'fade', 'slideX', 'slideY', 'random', 'slideX3D', 'slideY3D',
  'rotate', 'scaleY', 'scaleX', 'scale', 'scaleReverse',
])

describe('Plan 14-02 — mappers/animation.ts (D-14~19)', () => {
  describe('whitelist invariants', () => {
    it('ENTRANCE_MAP has exactly 53 entries (ELEMENT_ANIMATIONS.md §4.6 lines 259-311)', () => {
      expect(Object.keys(ENTRANCE_MAP).length).toBe(53)
    })
    it('EMPHASIS_MAP has exactly 33 entries (ELEMENT_ANIMATIONS.md §4.6 lines 317-349)', () => {
      expect(Object.keys(EMPHASIS_MAP).length).toBe(33)
    })
    it('EXIT_MAP has exactly 53 entries (ELEMENT_ANIMATIONS.md §4.6 lines 426-478)', () => {
      expect(Object.keys(EXIT_MAP).length).toBe(53)
    })
    it('TRANSITION_MAP includes both random and cut keys', () => {
      expect(TRANSITION_MAP.random).toBe('random')
      expect(TRANSITION_MAP.cut).toBe('no')
    })
    it('every ENTRANCE_MAP value is in the PPTist whitelist', () => {
      for (const [k, v] of Object.entries(ENTRANCE_MAP)) {
        expect(PPTIST_WHITELIST.has(v), `ENTRANCE_MAP[${k}]=${v}`).toBe(true)
      }
    })
    it('every EMPHASIS_MAP value is in the PPTist whitelist', () => {
      for (const [k, v] of Object.entries(EMPHASIS_MAP)) {
        expect(PPTIST_WHITELIST.has(v), `EMPHASIS_MAP[${k}]=${v}`).toBe(true)
      }
    })
    it('every EXIT_MAP value is in the PPTist whitelist', () => {
      for (const [k, v] of Object.entries(EXIT_MAP)) {
        expect(PPTIST_WHITELIST.has(v), `EXIT_MAP[${k}]=${v}`).toBe(true)
      }
    })
    it('EFFECT_FALLBACK values are in the PPTist whitelist', () => {
      for (const [k, v] of Object.entries(EFFECT_FALLBACK)) {
        expect(PPTIST_WHITELIST.has(v), `EFFECT_FALLBACK[${k}]=${v}`).toBe(true)
      }
    })
    it('every TRANSITION_MAP value is one of 12 TurningMode enum values', () => {
      for (const [k, v] of Object.entries(TRANSITION_MAP)) {
        expect(PPTIST_TURNING_MODES.has(v), `TRANSITION_MAP[${k}]=${v}`).toBe(true)
      }
    })
  })

  describe('inferAnimationType (D-14)', () => {
    it('entrance_ → in', () => expect(inferAnimationType('entrance_wipe')).toBe('in'))
    it('emphasis_ → attention', () => expect(inferAnimationType('emphasis_pulse')).toBe('attention'))
    it('exit_ → out', () => expect(inferAnimationType('exit_fade')).toBe('out'))
    it('path_ → in (per D-14 motion-as-entrance)', () => expect(inferAnimationType('path_right')).toBe('in'))
    it('weird bare key → in (default per D-14)', () => expect(inferAnimationType('weird_key')).toBe('in'))
  })

  describe('mapEffect (D-15/D-16)', () => {
    it('known entrance_ key returns mapped value with fallback=false', () => {
      expect(mapEffect('entrance_wipe', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it('known emphasis_ key returns mapped value with fallback=false', () => {
      // `emphasis_shimmer` is in the expanded 33-entry EMPHASIS_MAP
      // (ELEMENT_ANIMATIONS.md §4.6 line 317).
      expect(mapEffect('emphasis_shimmer', 'attention')).toEqual({ effect: 'wobble', fallback: false })
    })
    it('known exit_ key returns mapped value with fallback=false', () => {
      expect(mapEffect('exit_fade', 'out')).toEqual({ effect: 'fadeOut', fallback: false })
    })
    it('unknown entrance_ key falls back to fadeIn with fallback=true', () => {
      expect(mapEffect('entrance_unknown_key', 'in')).toEqual({ effect: 'fadeIn', fallback: true })
    })
    it('unknown emphasis_ key falls back to pulse with fallback=true', () => {
      expect(mapEffect('emphasis_weird_key', 'attention')).toEqual({ effect: 'pulse', fallback: true })
    })
    it('unknown exit_ key falls back to fadeOut with fallback=true', () => {
      expect(mapEffect('exit_weird_key', 'out')).toEqual({ effect: 'fadeOut', fallback: true })
    })
    it("'none' returns __skip__ sentinel (Pitfall 5)", () => {
      expect(mapEffect('none', 'in')).toEqual({ effect: EFFECT_NONE_SENTINEL, fallback: false })
    })

    // D-LEGACY — every legacy name normalizes to entrance_* then maps to the
    // PPTist whitelist (NOT to the fadeIn fallback). 29 cases mirroring
    // ELEMENT_ANIMATIONS.md §4.7 lines 490-520. Without the normalize step
    // these would all return `{ effect: 'fadeIn', fallback: true }`.
    it("legacy 'fly' normalizes to entrance_fly → lightSpeedInLeft", () => {
      expect(mapEffect('fly', 'in')).toEqual({ effect: 'lightSpeedInLeft', fallback: false })
    })
    it("legacy 'fly_left' normalizes to entrance_fly → lightSpeedInLeft", () => {
      expect(mapEffect('fly_left', 'in')).toEqual({ effect: 'lightSpeedInLeft', fallback: false })
    })
    it("legacy 'fly_right' normalizes to entrance_fly → lightSpeedInLeft", () => {
      expect(mapEffect('fly_right', 'in')).toEqual({ effect: 'lightSpeedInLeft', fallback: false })
    })
    it("legacy 'fly_top' normalizes to entrance_fly → lightSpeedInLeft", () => {
      expect(mapEffect('fly_top', 'in')).toEqual({ effect: 'lightSpeedInLeft', fallback: false })
    })
    it("legacy 'zoom' normalizes to entrance_zoom → zoomIn", () => {
      expect(mapEffect('zoom', 'in')).toEqual({ effect: 'zoomIn', fallback: false })
    })
    it("legacy 'appear' normalizes to entrance_appear → fadeIn", () => {
      expect(mapEffect('appear', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'cut' normalizes to entrance_appear → fadeIn", () => {
      expect(mapEffect('cut', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'fade' normalizes to entrance_fade → fadeIn", () => {
      expect(mapEffect('fade', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'wipe' normalizes to entrance_wipe → fadeIn", () => {
      expect(mapEffect('wipe', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'wipe_left' normalizes to entrance_wipe → fadeIn", () => {
      expect(mapEffect('wipe_left', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'wipe_right' normalizes to entrance_wipe → fadeIn", () => {
      expect(mapEffect('wipe_right', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'wipe_up' normalizes to entrance_wipe → fadeIn", () => {
      expect(mapEffect('wipe_up', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'wipe_down' normalizes to entrance_wipe → fadeIn", () => {
      expect(mapEffect('wipe_down', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'split' normalizes to entrance_split → zoomIn", () => {
      expect(mapEffect('split', 'in')).toEqual({ effect: 'zoomIn', fallback: false })
    })
    it("legacy 'blinds' normalizes to entrance_blinds → fadeIn", () => {
      expect(mapEffect('blinds', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'checkerboard' normalizes to entrance_checkerboard → fadeIn", () => {
      expect(mapEffect('checkerboard', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'dissolve' normalizes to entrance_dissolve → fadeIn", () => {
      expect(mapEffect('dissolve', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'random_bars' normalizes to entrance_random_bars → fadeIn", () => {
      expect(mapEffect('random_bars', 'in')).toEqual({ effect: 'fadeIn', fallback: false })
    })
    it("legacy 'peek' normalizes to entrance_peek → slideInUp", () => {
      expect(mapEffect('peek', 'in')).toEqual({ effect: 'slideInUp', fallback: false })
    })
    it("legacy 'wheel' normalizes to entrance_wheel → rotateIn", () => {
      expect(mapEffect('wheel', 'in')).toEqual({ effect: 'rotateIn', fallback: false })
    })
    it("legacy 'box' normalizes to entrance_box → zoomIn", () => {
      expect(mapEffect('box', 'in')).toEqual({ effect: 'zoomIn', fallback: false })
    })
    it("legacy 'circle' normalizes to entrance_circle → rotateIn", () => {
      expect(mapEffect('circle', 'in')).toEqual({ effect: 'rotateIn', fallback: false })
    })
    it("legacy 'diamond' normalizes to entrance_diamond → rotateIn", () => {
      expect(mapEffect('diamond', 'in')).toEqual({ effect: 'rotateIn', fallback: false })
    })
    it("legacy 'plus' normalizes to entrance_plus → zoomIn", () => {
      expect(mapEffect('plus', 'in')).toEqual({ effect: 'zoomIn', fallback: false })
    })
    it("legacy 'strips' normalizes to entrance_strips → slideInLeft", () => {
      expect(mapEffect('strips', 'in')).toEqual({ effect: 'slideInLeft', fallback: false })
    })
    it("legacy 'wedge' normalizes to entrance_wedge → rotateInDownLeft", () => {
      expect(mapEffect('wedge', 'in')).toEqual({ effect: 'rotateInDownLeft', fallback: false })
    })
    it("legacy 'stretch' normalizes to entrance_stretch → backInLeft", () => {
      expect(mapEffect('stretch', 'in')).toEqual({ effect: 'backInLeft', fallback: false })
    })
    it("legacy 'expand' normalizes to entrance_expand → zoomIn", () => {
      expect(mapEffect('expand', 'in')).toEqual({ effect: 'zoomIn', fallback: false })
    })
    it("legacy 'swivel' normalizes to entrance_swivel → rotateIn", () => {
      expect(mapEffect('swivel', 'in')).toEqual({ effect: 'rotateIn', fallback: false })
    })
  })

  describe('mapTrigger (D-18)', () => {
    it("'on-click' → click", () => {
      expect(mapTrigger('on-click', undefined, undefined)).toBe('click')
    })
    it("'with-previous' → meantime", () => {
      expect(mapTrigger('with-previous', undefined, undefined)).toBe('meantime')
    })
    it("'after-previous' → auto", () => {
      expect(mapTrigger('after-previous', undefined, undefined)).toBe('auto')
    })
    it('same order (prev=current) → meantime', () => {
      expect(mapTrigger(undefined, 1, 1)).toBe('meantime')
    })
    it('strictly increasing order → auto', () => {
      expect(mapTrigger(undefined, 2, 1)).toBe('auto')
    })
    it('undefined order/trigger → auto (default)', () => {
      expect(mapTrigger(undefined, undefined, undefined)).toBe('auto')
    })
    it('current strictly increasing + explicit with-previous → meantime (explicit wins)', () => {
      expect(mapTrigger('with-previous', 2, 1)).toBe('meantime')
    })
  })

  describe('mapDuration (D-19)', () => {
    it('0.45 seconds → 450 ms', () => {
      expect(mapDuration(0.45)).toBe(450)
    })
    it('0.05 seconds clamps to 100 ms (lower bound)', () => {
      expect(mapDuration(0.05)).toBe(100)
    })
    it('10 seconds clamps to 5000 ms (upper bound)', () => {
      expect(mapDuration(10)).toBe(5000)
    })
    it('undefined falls back to default 0.45 → 450 ms', () => {
      expect(mapDuration(undefined)).toBe(450)
    })
    it('sub-millisecond rounding (0.0006 → 1 → clamps to 100)', () => {
      expect(mapDuration(0.0006)).toBe(100)
    })
  })

  describe('D-LEGACY — normalizeLegacyEffect + LEGACY_NAME_MAP (ELEMENT_ANIMATIONS.md §4.7)', () => {
  it('LEGACY_NAME_MAP has exactly 29 entries (matches ELEMENT_ANIMATIONS.md §4.7)', () => {
    expect(Object.keys(LEGACY_NAME_MAP).length).toBe(29)
  })

  it('every canonical target in LEGACY_NAME_MAP is a key in ENTRANCE_MAP', () => {
    for (const [k, v] of Object.entries(LEGACY_NAME_MAP)) {
      expect(ENTRANCE_MAP[v.effect], `LEGACY_NAME_MAP[${k}].effect=${v.effect} not in ENTRANCE_MAP`).toBeDefined()
    }
  })

  it("non-legacy key passes through normalizeLegacyEffect verbatim", () => {
    expect(normalizeLegacyEffect('entrance_fly')).toEqual({
      effect: 'entrance_fly',
      options: undefined,
    })
    expect(normalizeLegacyEffect('emphasis_pulse')).toEqual({
      effect: 'emphasis_pulse',
      options: undefined,
    })
  })

  it("legacy 'fly' normalizes to entrance_fly + direction='down' default", () => {
    expect(normalizeLegacyEffect('fly')).toEqual({
      effect: 'entrance_fly',
      options: { direction: 'down' },
    })
  })

  it("legacy 'fly_left' normalizes to entrance_fly + direction='left'", () => {
    expect(normalizeLegacyEffect('fly_left')).toEqual({
      effect: 'entrance_fly',
      options: { direction: 'left' },
    })
  })

  it("legacy 'wipe_down' normalizes to entrance_wipe + direction='down'", () => {
    expect(normalizeLegacyEffect('wipe_down')).toEqual({
      effect: 'entrance_wipe',
      options: { direction: 'down' },
    })
  })

  it("legacy 'wheel' normalizes to entrance_wheel + amount=4", () => {
    expect(normalizeLegacyEffect('wheel')).toEqual({
      effect: 'entrance_wheel',
      options: { amount: 4 },
    })
  })

  it("user-provided options win over legacy defaults", () => {
    // fly has legacy direction='down', but user overrides with direction='right'
    expect(normalizeLegacyEffect('fly', { direction: 'right' })).toEqual({
      effect: 'entrance_fly',
      options: { direction: 'right' },
    })
  })

  it("user-provided options merge with legacy defaults when keys don't conflict", () => {
    // fly direction='down' (legacy) + user duration='slow' (new key) → merged
    expect(normalizeLegacyEffect('fly', { duration: 'slow' })).toEqual({
      effect: 'entrance_fly',
      options: { direction: 'down', duration: 'slow' },
    })
  })

  it("legacy without options + no user options → options undefined", () => {
    // 'zoom' has no default options
    expect(normalizeLegacyEffect('zoom')).toEqual({
      effect: 'entrance_zoom',
      options: undefined,
    })
    // 'zoom' + no user options → still undefined
    expect(normalizeLegacyEffect('zoom', undefined)).toEqual({
      effect: 'entrance_zoom',
      options: undefined,
    })
  })

  it("legacy without default options + user options → only user options", () => {
    expect(normalizeLegacyEffect('zoom', { direction: 'in' })).toEqual({
      effect: 'entrance_zoom',
      options: { direction: 'in' },
    })
  })

  it("canonical entrance_fly passes through unchanged with user options", () => {
    expect(normalizeLegacyEffect('entrance_fly', { direction: 'right' })).toEqual({
      effect: 'entrance_fly',
      options: { direction: 'right' },
    })
  })
})

describe('mapTransition (D-17)', () => {
  it("'fade' → fade", () => expect(mapTransition('fade')).toBe('fade'))
  it("'cut' → no", () => expect(mapTransition('cut')).toBe('no'))
  it("'random' → random (passthrough)", () => expect(mapTransition('random')).toBe('random'))
  it("'dissolve' → fade (unsupported → fallback)", () => expect(mapTransition('dissolve')).toBe('fade'))
  it("'unknown_thing' → fade (universal fallback)", () => expect(mapTransition('unknown_thing')).toBe('fade'))
  it("'push' → slideY", () => expect(mapTransition('push')).toBe('slideY'))
  it("'cover' → slideX", () => expect(mapTransition('cover')).toBe('slideX'))
})
})

// ---------------------------------------------------------------------------
// Plan 14-02 closing block — was an outer describe; now flattened to top-level
// since the inline nested describe('mapTransition') was the last sub-block.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Plan 15-01 — ELEMENT_ANIMATIONS.md §4.6 cross-coverage tests (D-09~12)
// ---------------------------------------------------------------------------

// 53 entrance_* keys from ELEMENT_ANIMATIONS.md §4.6 lines 259-311.
const SPEC_ENTRANCE_KEYS = [
  'entrance_appear', 'entrance_fly', 'entrance_blinds', 'entrance_box',
  'entrance_checkerboard', 'entrance_circle', 'entrance_crawl',
  'entrance_diamond', 'entrance_dissolve', 'entrance_fade',
  'entrance_flash_once', 'entrance_peek', 'entrance_plus',
  'entrance_random_bars', 'entrance_spiral', 'entrance_split',
  'entrance_stretch', 'entrance_strips', 'entrance_swivel',
  'entrance_wedge', 'entrance_wheel', 'entrance_wipe', 'entrance_zoom',
  'entrance_random_effects', 'entrance_boomerang', 'entrance_bounce',
  'entrance_color_reveal', 'entrance_credits', 'entrance_ease_in',
  'entrance_float', 'entrance_grow_and_turn', 'entrance_light_speed',
  'entrance_pinwheel', 'entrance_rise_up', 'entrance_swish',
  'entrance_thin_line', 'entrance_unfold', 'entrance_whip',
  'entrance_ascend', 'entrance_center_revolve', 'entrance_faded_swivel',
  'entrance_descend', 'entrance_sling', 'entrance_spinner',
  'entrance_stretchy', 'entrance_zip', 'entrance_arc_up',
  'entrance_faded_zoom', 'entrance_glide', 'entrance_expand',
  'entrance_flip', 'entrance_fold', 'entrance_3d_arrive',
] as const

// 33 emphasis_* keys from ELEMENT_ANIMATIONS.md §4.6 lines 317-349.
const SPEC_EMPHASIS_KEYS = [
  'emphasis_shimmer', 'emphasis_change_fill_color', 'emphasis_change_font',
  'emphasis_change_font_color', 'emphasis_change_font_size',
  'emphasis_change_font_style', 'emphasis_grow_shrink',
  'emphasis_change_line_color', 'emphasis_spin', 'emphasis_transparency',
  'emphasis_bold_flash', 'emphasis_blast', 'emphasis_bold_reveal',
  'emphasis_brush_on_color', 'emphasis_brush_on_underline',
  'emphasis_color_blend', 'emphasis_color_wave',
  'emphasis_complementary_color', 'emphasis_complementary_color2',
  'emphasis_contrasting_color', 'emphasis_darken', 'emphasis_desaturate',
  'emphasis_flash_bulb', 'emphasis_flicker', 'emphasis_grow_with_color',
  'emphasis_lighten', 'emphasis_style_emphasis', 'emphasis_teeter',
  'emphasis_vertical_grow', 'emphasis_wave', 'emphasis_3d_turntable',
  'emphasis_3d_swing', 'emphasis_3d_jump_and_turn',
] as const

// 53 exit_* keys from ELEMENT_ANIMATIONS.md §4.6 lines 426-478.
const SPEC_EXIT_KEYS = [
  'exit_appear', 'exit_fly', 'exit_blinds', 'exit_box',
  'exit_checkerboard', 'exit_circle', 'exit_crawl',
  'exit_diamond', 'exit_dissolve', 'exit_fade',
  'exit_flash_once', 'exit_peek', 'exit_plus',
  'exit_random_bars', 'exit_spiral', 'exit_split',
  'exit_stretch', 'exit_strips', 'exit_swivel',
  'exit_wedge', 'exit_wheel', 'exit_wipe', 'exit_zoom',
  'exit_random_effects', 'exit_boomerang', 'exit_bounce',
  'exit_color_reveal', 'exit_credits', 'exit_ease_in',
  'exit_float', 'exit_grow_and_turn', 'exit_light_speed',
  'exit_pinwheel', 'exit_rise_up', 'exit_swish',
  'exit_thin_line', 'exit_unfold', 'exit_whip',
  'exit_ascend', 'exit_center_revolve', 'exit_faded_swivel',
  'exit_descend', 'exit_sling', 'exit_spinner',
  'exit_stretchy', 'exit_zip', 'exit_arc_up',
  'exit_faded_zoom', 'exit_glide', 'exit_expand',
  'exit_flip', 'exit_fold', 'exit_3d_arrive',
] as const

describe('Plan 15-01 — ELEMENT_ANIMATIONS.md §4.6 coverage', () => {
  it('SPEC_ENTRANCE_KEYS has 53 entries (matches spec table)', () => {
    expect(SPEC_ENTRANCE_KEYS.length).toBe(53)
  })
  it('SPEC_EMPHASIS_KEYS has 33 entries (matches spec table)', () => {
    expect(SPEC_EMPHASIS_KEYS.length).toBe(33)
  })
  it('SPEC_EXIT_KEYS has 53 entries (matches spec table)', () => {
    expect(SPEC_EXIT_KEYS.length).toBe(53)
  })

  it('every SPEC_ENTRANCE_KEYS key is present in ENTRANCE_MAP', () => {
    for (const k of SPEC_ENTRANCE_KEYS) {
      expect(ENTRANCE_MAP[k], `ENTRANCE_MAP missing key ${k}`).toBeDefined()
    }
  })

  it('every SPEC_EMPHASIS_KEYS key is present in EMPHASIS_MAP', () => {
    for (const k of SPEC_EMPHASIS_KEYS) {
      expect(EMPHASIS_MAP[k], `EMPHASIS_MAP missing key ${k}`).toBeDefined()
    }
  })

  it('every SPEC_EXIT_KEYS key is present in EXIT_MAP', () => {
    for (const k of SPEC_EXIT_KEYS) {
      expect(EXIT_MAP[k], `EXIT_MAP missing key ${k}`).toBeDefined()
    }
  })

  it('unmapped emphasis key (emphasis_pulse — NOT in §4.6) falls back to pulse', () => {
    // Phase 14 had `emphasis_pulse` mapped to 'pulse', but it is NOT in §4.6.
    // Plan 15-01 strictly aligns to §4.6 — unmapped keys go through fallback.
    const counters = { unmappedEffectCount: 0 }
    expect(mapEffect('emphasis_pulse', 'attention', counters)).toEqual({
      effect: 'pulse',
      fallback: true,
    })
    expect(counters.unmappedEffectCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Plan 15-02 / D-04 — chrome-skip heuristic helper (forward-compat)
// ---------------------------------------------------------------------------

describe('Plan 15-02 — isChromeGroupId (D-04 forward-compat helper)', () => {
  it('exports CHROME_REGEX with the D-04 literal value', () => {
    expect(CHROME_REGEX.source).toBe(
      '^(bg|nav|watermark|logo|pagenumber|.*-header|.*-footer|.*-decor)$',
    )
  })

  it("isChromeGroupId('bg') === true (chrome literal)", () => {
    expect(isChromeGroupId('bg')).toBe(true)
  })

  it("isChromeGroupId('nav') === true (chrome literal)", () => {
    expect(isChromeGroupId('nav')).toBe(true)
  })

  it("isChromeGroupId('logo') === true (chrome literal)", () => {
    expect(isChromeGroupId('logo')).toBe(true)
  })

  it("isChromeGroupId('watermark') === true (chrome literal)", () => {
    expect(isChromeGroupId('watermark')).toBe(true)
  })

  it("isChromeGroupId('pagenumber') === true (chrome literal)", () => {
    expect(isChromeGroupId('pagenumber')).toBe(true)
  })

  it("isChromeGroupId('card-header-arrow') === false (ends with -arrow, not -header)", () => {
    // Spec lists this case but the regex `.*-header$` requires the FULL string to
    // end with `-header`. `card-header-arrow` ends with `-arrow`, so it is NOT
    // chrome by the literal regex. This pins the strict-anchored regex behavior.
    expect(isChromeGroupId('card-header-arrow')).toBe(false)
  })

  it("isChromeGroupId('card-header') === true (matches .*-header$)", () => {
    expect(isChromeGroupId('card-header')).toBe(true)
  })

  it("isChromeGroupId('slide-header') === true (matches .*-header$)", () => {
    expect(isChromeGroupId('slide-header')).toBe(true)
  })

  it("isChromeGroupId('footer-strip') === false (ends with -strip, not -footer)", () => {
    expect(isChromeGroupId('footer-strip')).toBe(false)
  })

  it("isChromeGroupId('page-footer') === true (matches .*-footer$)", () => {
    expect(isChromeGroupId('page-footer')).toBe(true)
  })

  it("isChromeGroupId('header-bar') === false (ends with -bar, not -header)", () => {
    expect(isChromeGroupId('header-bar')).toBe(false)
  })

  it("isChromeGroupId('background-decor') === true (matches .*-decor$)", () => {
    expect(isChromeGroupId('background-decor')).toBe(true)
  })

  it("isChromeGroupId('decor') === false (.*-decor requires ≥1 prefix char)", () => {
    // Pitfall: bare `decor` does NOT match `.*-decor` because `.*` requires
    // zero or more characters BEFORE the `-decor` suffix. The literal `decor`
    // has no `-` separator and is therefore not chrome.
    expect(isChromeGroupId('decor')).toBe(false)
  })

  it("isChromeGroupId('header') === false (no trailing -header segment)", () => {
    // `.*-header$` requires the literal `-header` suffix; bare `header`
    // contains no `-` so it is not chrome.
    expect(isChromeGroupId('header')).toBe(false)
  })

  it("isChromeGroupId('card-temperature') === false (semantic group, not chrome)", () => {
    // Floor-truth: the fixture's semantic group ids like `card-temperature`
    // are NEVER chrome. This pins the regression for Phase 15 forward-compat.
    expect(isChromeGroupId('card-temperature')).toBe(false)
  })

  it("isChromeGroupId('stage-1-rise') === false (semantic group, not chrome)", () => {
    expect(isChromeGroupId('stage-1-rise')).toBe(false)
  })

  it("isChromeGroupId('monitor-routine') === false (semantic group, not chrome)", () => {
    expect(isChromeGroupId('monitor-routine')).toBe(false)
  })
})
