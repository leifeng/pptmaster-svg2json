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
  inferAnimationType,
  mapEffect,
  mapTrigger,
  mapDuration,
  mapTransition,
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
    it('ENTRANCE_MAP value count ≥ 30', () => {
      expect(Object.keys(ENTRANCE_MAP).length).toBeGreaterThanOrEqual(30)
    })
    it('EMPHASIS_MAP value count ≥ 10', () => {
      expect(Object.keys(EMPHASIS_MAP).length).toBeGreaterThanOrEqual(10)
    })
    it('EXIT_MAP value count ≥ 10', () => {
      expect(Object.keys(EXIT_MAP).length).toBeGreaterThanOrEqual(10)
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
      expect(mapEffect('emphasis_pulse', 'attention')).toEqual({ effect: 'pulse', fallback: false })
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
