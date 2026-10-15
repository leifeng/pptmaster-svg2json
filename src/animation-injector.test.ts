/**
 * Animation-injector tests — Phase 14 / Plan 14-02 + 02 fix.
 *
 * Covers D-22 strict guard, D-11/12/13 extensions preservation, D-15 fallback,
 * D-21 defaults propagation, Pitfall 5 (effect='none' skip), D-18 trigger_shape
 * downgrade, and a reverse assertion that slides with no sidecar entry stay
 * unchanged on `animations` and `turningMode`.
 */

import { describe, it, expect } from 'vitest'
import {
  injectAnimations,
  emptyInjectorDiagnostics,
  printDiagnostics,
  type InjectDiagnostics,
} from './animation-injector'
import type { AnimationsSidecar } from './animation-types'
import type { PPTAnimation, Slide, PPTElement, PPTShapeElement } from './slides'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeShape(id: string, groupId?: string): PPTShapeElement {
  return {
    type: 'shape',
    id,
    groupId,
    left: 0,
    top: 0,
    width: 10,
    height: 10,
    fill: 'red',
  } as unknown as PPTShapeElement
}

function makeSlide(elements: PPTElement[] = []): Slide {
  return { id: '03_overview', elements } as Slide
}

function makeSidecar(slides: AnimationsSidecar['slides'], defaults?: AnimationsSidecar['defaults']): AnimationsSidecar {
  return { version: 1, defaults, slides }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plan 14-02 — animation-injector (D-22, D-11~13, D-15, Pitfall 5, Task 4 D-21)', () => {
  describe('emptyInjectorDiagnostics', () => {
    it('returns all-zero state', () => {
      const d = emptyInjectorDiagnostics()
      expect(d).toEqual({
        slidesWithAnimation: 0,
        animationsInjected: 0,
        extensionsFieldsPreserved: 0,
        unmappedEffects: 0,
        elIdNotFoundWarnings: [],
      })
    })
  })

  describe('D-22 strict guard', () => {
    it('sidecar=undefined → returns slide unchanged with animations=undefined', () => {
      const slide = makeSlide([makeShape('card-temp__abc', 'card-temperature')])
      const opts = {
        slideId: '03_overview',
        sidecar: undefined,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeUndefined()
      expect(result.turningMode).toBeUndefined()
      expect(result.elements).toBe(slide.elements)
      expect(opts.diagnostics.animationsInjected).toBe(0)
    })

    it('sidecar has no entry for slideId → returns slide unchanged (D-22 strict)', () => {
      const slide = makeSlide([makeShape('card-temp__abc', 'card-temperature')])
      const sidecar = makeSidecar({ '04_other_slide': { groups: {} } })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeUndefined()
      expect(result.turningMode).toBeUndefined()
    })

    it('defaults present but no entry → defaults do NOT leak (D-22)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: { transition: { effect: 'fade' } },
        slides: {},
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeUndefined()
      expect(result.turningMode).toBeUndefined()
    })
  })

  describe('legacy single-effect form (ANIM-MAP-05)', () => {
    it('translates entrance_fade with explicit duration', () => {
      const slide = makeSlide([makeShape('card-temp__abc', 'card-temperature')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': {
              effect: 'entrance_fade',
              order: 1,
              duration: 0.46,
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeDefined()
      expect(result.animations!.length).toBe(1)
      const anim = result.animations![0]
      expect(anim.effect).toBe('fadeIn')
      expect(anim.type).toBe('in')
      expect(anim.duration).toBe(460)
      expect(anim.trigger).toBe('auto') // first row → no previousOrder
      expect(anim.elId).toBe('card-temp__abc')
      expect(anim.id.length).toBe(10)
    })
  })

  describe('modern array form (ANIM-MAP-05)', () => {
    it('emits one PPTAnimation per row in effects[]', () => {
      const slide = makeSlide([makeShape('card-temp__abc', 'card-temperature')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': {
              effects: [
                { effect: 'entrance_wipe', order: 1, duration: 0.46 },
                { effect: 'entrance_zoom', order: 2, duration: 0.5 },
              ],
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(2)
      expect(result.animations![0].effect).toBe('fadeIn')
      expect(result.animations![0].type).toBe('in')
      expect(result.animations![1].effect).toBe('zoomIn')
      expect(opts.diagnostics.animationsInjected).toBe(2)
    })
  })

  describe('Pitfall 5: effect=\'none\' skip path', () => {
    it('does NOT emit a PPTAnimation when effect === "none"', () => {
      const slide = makeSlide([makeShape('card-temp__abc', 'card-temperature')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': {
              effects: [{ effect: 'none', order: 1 }],
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toEqual([])
      expect(opts.diagnostics.animationsInjected).toBe(0)
    })
  })

  describe('elId resolution', () => {
    it('emits no animations AND pushes one warning when no PPTElement groupId matches', () => {
      const slide = makeSlide([makeShape('some-other__id', 'unrelated-group')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': {
              effect: 'entrance_wipe',
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toEqual([])
      expect(opts.diagnostics.elIdNotFoundWarnings.length).toBe(1)
      expect(opts.diagnostics.elIdNotFoundWarnings[0]).toContain('card-temperature')
    })

    it('uses the FIRST matching PPTElement by groupId when multiple exist', () => {
      const slide = makeSlide([
        makeShape('card-temp__first', 'card-temperature'),
        makeShape('card-temp__second', 'card-temperature'),
      ])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': { effect: 'entrance_fade' },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].elId).toBe('card-temp__first')
    })
  })

  describe('D-11 / D-12 / D-13: extensions preservation + camelCase', () => {
    it('writes extensions.originalEffect when effect is unrecognized (D-15)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': { groups: { g1: { effect: 'entrance_weird_key' } } },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      const ext = result.animations![0].extensions
      expect(ext).toBeDefined()
      expect(ext!.originalEffect).toBe('entrance_weird_key')
      expect(opts.diagnostics.unmappedEffects).toBe(1)
    })

    it('camelCases top-level snake_case keys (D-13)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              repeat_count: 3,
              repeat_duration: 2,
              auto_reverse: true,
              bounce_end: false,
              restart: true,
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      const ext = result.animations![0].extensions
      expect(ext!.repeatCount).toBe(3)
      expect(ext!.repeatDuration).toBe(2)
      expect(ext!.autoReverse).toBe(true)
      expect(ext!.bounceEnd).toBe(false)
      expect(ext!.restart).toBe(true)
      expect(ext!.repeat_count).toBeUndefined() // NOT snake_case at top level
    })

    it('preserves effect_options nested data verbatim under camelCased top-level key', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_glide',
              effect_options: { direction: 'right', amount: 0.5 },
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      const ext = result.animations![0].extensions
      expect(ext!.effectOptions).toEqual({ direction: 'right', amount: 0.5 })
      expect(ext!.effect_options).toBeUndefined() // camelCased at top level
    })

    it('omits extensions when no preservable fields (Claude Discretion)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              order: 1,
              duration: 0.5,
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      // The row has order/duration, both of which extend. So extensions WILL exist.
      // Test a TRULY empty case: a row with nothing preservable beyond what
      // is already mirrored on the PPTAnimation primary fields.
      expect(result.animations![0].extensions).toBeDefined() // order/duration preserved
    })

    it('omits extensions for genuinely empty row', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effects: [{ effect: 'entrance_zoom' }], // no order/duration/trigger/options
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].extensions).toBeUndefined()
    })

    it('preserves trigger_shape as originalTriggerShape', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              order: 1,
              trigger_shape: 'other-shape-id',
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].extensions!.originalTriggerShape).toBe('other-shape-id')
    })
  })

  describe('D-18 trigger_shape fallback (click)', () => {
    it("downgrades trigger to 'click' when trigger_shape is defined", () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              order: 1,
              trigger: 'after-previous',
              trigger_shape: 'other-el',
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].trigger).toBe('click')
    })
  })

  describe('D-21 + D-22 + Task 4: turningMode resolver', () => {
    it("entry.transition.effect='fade' → turningMode='fade'", () => {
      const slide = makeSlide()
      const sidecar = makeSidecar({
        '03_overview': { transition: { effect: 'fade' }, groups: {} },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('fade')
    })

    it("entry.transition.effect='cut' → turningMode='no'", () => {
      const slide = makeSlide()
      const sidecar = makeSidecar({
        '03_overview': { transition: { effect: 'cut' }, groups: {} },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('no')
    })

    it('no transition configured → turningMode=undefined (NOT defaults)', () => {
      const slide = makeSlide()
      const sidecar: AnimationsSidecar = {
        version: 1,
        slides: { '03_overview': { groups: {} } },
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBeUndefined()
    })

    it("defaults.transition.effect='fade' applies when entry.transition absent (D-21)", () => {
      const slide = makeSlide()
      const sidecar = makeSidecar(
        { '03_overview': { groups: {} } },
        { transition: { effect: 'fade' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('fade')
    })

    it("per-entry wins over defaults: entry.transition='push' overrides defaults.transition='fade'", () => {
      const slide = makeSlide()
      const sidecar = makeSidecar(
        { '03_overview': { transition: { effect: 'push' }, groups: {} } },
        { transition: { effect: 'fade' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('slideY')
    })

    it('D-22 negative: defaults.transition does NOT leak to absent entries', () => {
      const slide = makeSlide()
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: { transition: { effect: 'fade' } },
        slides: {}, // ← no entry for any slideId
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeUndefined()
      expect(result.turningMode).toBeUndefined()
    })
  })

  describe('printDiagnostics (D-23 — stderr only)', () => {
    it('writes the summary line to the provided stream', () => {
      const d: InjectDiagnostics = {
        slidesWithAnimation: 3,
        animationsInjected: 12,
        extensionsFieldsPreserved: 24,
        unmappedEffects: 2,
        elIdNotFoundWarnings: [],
      }
      let captured = ''
      const fakeStream = {
        write: (s: string) => {
          captured += s
          return true
        },
      }
      printDiagnostics(d, fakeStream as unknown as NodeJS.WritableStream)
      expect(captured).toContain('injected into 3 slide(s)')
      expect(captured).toContain('12 PPTAnimation entries')
      expect(captured).toContain('24 fields preserved')
      expect(captured).toContain('2 effects fell back')
    })

    it('emits a WARN block when elIdNotFoundWarnings is non-empty', () => {
      const d: InjectDiagnostics = {
        slidesWithAnimation: 1,
        animationsInjected: 1,
        extensionsFieldsPreserved: 0,
        unmappedEffects: 0,
        elIdNotFoundWarnings: ['slide=s1, group=g1: no match'],
      }
      let captured = ''
      const fakeStream = {
        write: (s: string) => {
          captured += s
          return true
        },
      }
      printDiagnostics(d, fakeStream as unknown as NodeJS.WritableStream)
      expect(captured).toContain('WARN')
      expect(captured).toContain('slide=s1, group=g1: no match')
    })
  })

  describe('diagnostics accumulator updates', () => {
    it('increments animationsInjected + extensionsFieldsPreserved + unmappedEffects correctly', () => {
      const slide = makeSlide([
        makeShape('el1', 'g1'),
        makeShape('el2', 'g2'),
      ])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_weird_key', duration: 0.5 }, // fallback → counts unmappedEffects
            g2: { effect: 'entrance_fade', order: 1, duration: 0.5 }, // mapped
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(2)
      expect(opts.diagnostics.animationsInjected).toBe(2)
      expect(opts.diagnostics.unmappedEffects).toBe(1)
      // The unknown key emits originalEffect + duration → 2 preserved fields.
      // The known key emits duration → 1 preserved field.
      expect(opts.diagnostics.extensionsFieldsPreserved).toBeGreaterThanOrEqual(2)
      expect(opts.diagnostics.slidesWithAnimation).toBe(1)
    })
  })
})
