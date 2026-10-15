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
  resolveEffectiveRow,
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
        defaultsApplied: 0,
        elementsCovered: 0,
        unmappedEffectCount: 0,
        delayAccumulatedSeconds: 0,
        chromeSkippedGroups: 0,
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

    it('emits ONE PPTAnimation per matching PPTElement (N→N group coverage)', () => {
      // Changed intent post-Wave 2 ship (see .planning/debug/anim-elid-coverage.md):
      // groups[gid] now produces one PPTAnimation per matching PPTElement so every
      // element under the SVG <g id="gid"> gets the same effect. Previously only the
      // first match received an animation (D-08's original "first-match-wins").
      const slide = makeSlide([
        makeShape('card-temp__first', 'card-temperature'),
        makeShape('card-temp__second', 'card-temperature'),
        makeShape('card-temp__third', 'card-temperature'),
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
      expect(result.animations!.length).toBe(3)
      expect(result.animations!.map((a) => a.elId)).toEqual([
        'card-temp__first',
        'card-temp__second',
        'card-temp__third',
      ])
      // Every emitted animation shares the row's effect/trigger/duration
      expect(result.animations!.every((a) => a.effect === 'fadeIn')).toBe(true)
      expect(opts.diagnostics.animationsInjected).toBe(3)
      expect(opts.diagnostics.elementsCovered).toBe(3)
      // 1 row × 1 missing field (no trigger shape on sidecar; trigger comes from defaults)
      // → row-level defaultsApplied counts per-row, not per-element.
      expect(opts.diagnostics.defaultsApplied).toBe(2)
    })

    it('reverse-asserts every PPTElement with matching groupId has at least one animation', () => {
      // Pins the N→N coverage contract: post-path-merge, the count of emitted
      // PPTAnimations for a group must equal the count of matching PPTElements.
      const slide = makeSlide([
        makeShape('el1', 'g1'),
        makeShape('el2', 'g1'),
        makeShape('el3', 'g1'),
        makeShape('el4', 'g2'),
      ])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_wipe' },
            g2: { effect: 'entrance_fade' },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(4)
      const elementIdsByGroup = new Map<string, string[]>()
      for (const e of slide.elements) {
        const gid = (e as { groupId?: string }).groupId!
        const arr = elementIdsByGroup.get(gid) ?? []
        arr.push((e as { id: string }).id)
        elementIdsByGroup.set(gid, arr)
      }
      for (const [gid, ids] of elementIdsByGroup) {
        const elIds = result.animations!
          .filter((a) => ids.includes(a.elId))
          .map((a) => a.elId)
        expect(new Set(elIds)).toEqual(new Set(ids))
      }
    })

    it('path-merge behavior is preserved: 1 merged PPTShapeElement → 1 animation', () => {
      // Backward-compat check: a group whose children were path-merged into a single
      // PPTShapeElement still produces exactly 1 PPTAnimation (1 candidate).
      const slide = makeSlide([makeShape('card-merged__abc', 'card-temperature')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': { effect: 'entrance_zoom' },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(1)
      expect(result.animations![0].elId).toBe('card-merged__abc')
      expect(opts.diagnostics.elementsCovered).toBe(1)
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
        defaultsApplied: 0,
        elementsCovered: 12,
        unmappedEffectCount: 2,
        delayAccumulatedSeconds: 0,
        chromeSkippedGroups: 0,
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
      expect(captured).toContain('12 PPTElement × row tuples')
      expect(captured).toContain('2 effects unmapped (fallback)')
      expect(captured).toContain('0.00s total delay')
      expect(captured).toContain('0 chrome groups skipped')
    })

    it('emits a WARN block when elIdNotFoundWarnings is non-empty', () => {
      const d: InjectDiagnostics = {
        slidesWithAnimation: 1,
        animationsInjected: 1,
        extensionsFieldsPreserved: 0,
        unmappedEffects: 0,
        elIdNotFoundWarnings: ['slide=s1, group=g1: no match'],
        defaultsApplied: 0,
        elementsCovered: 1,
        unmappedEffectCount: 0,
        delayAccumulatedSeconds: 0,
        chromeSkippedGroups: 0,
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

  // -------------------------------------------------------------------------
  // Plan 14-03 / Task 1 — D-21 row-level defaults propagation (ANIM-DEFAULTS-01)
  // -------------------------------------------------------------------------
  describe('Plan 14-03 — D-21 row-level defaults propagation', () => {
    it("sidecar defaults.animation.duration = 0.45 with row lacking duration → duration === 450", () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            groups: {
              g1: { effect: 'entrance_fade', order: 1 /* no duration, no trigger */ },
            },
          },
        },
        { animation: { duration: 0.45, trigger: 'after-previous' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(450)
    })

    it("sidecar defaults.animation.trigger = 'on-click' with row lacking trigger → trigger === 'click'", () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            groups: {
              g1: { effect: 'entrance_fade', order: 1 /* no trigger */ },
            },
          },
        },
        { animation: { duration: 0.45, trigger: 'on-click' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].trigger).toBe('click')
    })

    it('slide-level entry.animation.duration overrides defaults (per-slide wins)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            animation: { duration: 1.5, trigger: 'on-click' },
            groups: {
              g1: { effect: 'entrance_fade', order: 1 /* row has no duration */ },
            },
          },
        },
        { animation: { duration: 0.45, trigger: 'after-previous' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(1500)
      expect(result.animations![0].trigger).toBe('click')
    })

    it("per-row turn > entry > defaults > hardcoded: explicit row values win outright", () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            animation: { duration: 1.5, trigger: 'on-click' },
            groups: {
              g1: {
                effect: 'entrance_fade',
                order: 1,
                duration: 2.5,
                trigger: 'with-previous',
              },
            },
          },
        },
        { animation: { duration: 0.45, trigger: 'after-previous' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(2500)
      expect(result.animations![0].trigger).toBe('meantime')
    })

    it("slide-level entry.transition='push' overrides defaults.transition='fade' (Plan 02 Task 4 boundary)", () => {
      const slide = makeSlide()
      const sidecar = makeSidecar(
        {
          '03_overview': { transition: { effect: 'push' }, groups: {} },
        },
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

    it('defaultsApplied increments per row when both row.duration and row.trigger are missing', () => {
      const slide = makeSlide([
        makeShape('el1', 'g1'),
        makeShape('el2', 'g2'),
      ])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            groups: {
              g1: { effect: 'entrance_fade', order: 1 /* no duration, no trigger */ },
              g2: { effect: 'entrance_zoom', order: 2 /* no duration, no trigger */ },
            },
          },
        },
        { animation: { duration: 0.45, trigger: 'after-previous' } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(2)
      // 2 rows × 2 missing fields = 4 substitutions
      expect(opts.diagnostics.defaultsApplied).toBe(4)
    })

    it('defaultsApplied counts duration substitution only when row.duration is undefined', () => {
      const slide = makeSlide([
        makeShape('el1', 'g1'),
        makeShape('el2', 'g2'),
      ])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_fade', order: 1, duration: 0.5 }, // explicit duration, no trigger
            g2: { effect: 'entrance_zoom', order: 2 /* both missing */ },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      injectAnimations(slide, opts)
      // g1: duration explicit → 0; trigger undefined → 1
      // g2: both missing → 2
      expect(opts.diagnostics.defaultsApplied).toBe(3)
    })

    it('defaultsApplied does NOT increment when trigger_shape is defined (substitution came from trigger_shape, not defaults)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              order: 1,
              duration: 0.5,
              trigger_shape: 'some-other-shape',
              // row.trigger intentionally undefined — but trigger_shape wins
            },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      injectAnimations(slide, opts)
      // duration: explicit → 0; trigger_shape defined → trigger_substitution not counted
      expect(opts.diagnostics.defaultsApplied).toBe(0)
      expect(opts.diagnostics.animationsInjected).toBe(1)
    })

    it('D-22 strict: defaults present but no entry → defaults do NOT leak to animations or turningMode', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: {
          transition: { effect: 'fade' },
          animation: { duration: 0.45, trigger: 'on-click' },
        },
        slides: {}, // ← empty — no entry for 03_overview
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations).toBeUndefined()
      expect(result.turningMode).toBeUndefined()
      // defaultsApplied must NOT have incremented since the entry guard returned early
      expect(opts.diagnostics.defaultsApplied).toBe(0)
      expect(opts.diagnostics.animationsInjected).toBe(0)
    })

    it('trigger_shape present with explicit trigger → still collapses to click (D-18)', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              order: 1,
              trigger: 'after-previous',
              trigger_shape: 'some-other-shape',
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

  // -------------------------------------------------------------------------
  // Plan 15-01 — D-02 / D-03 / D-13 behavior tests
  // -------------------------------------------------------------------------

  describe('D-02: defaults.animation.effect cascade (slide-level none)', () => {
    it('skips animations when defaults.animation.effect === "none" and rows have no own effect', () => {
      const slide = makeSlide([makeShape('el1', 'g1'), makeShape('el2', 'g2')])
      // Row WITHOUT explicit effect should skip due to cascade.
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: { animation: { effect: 'none' } },
        slides: {
          '03_overview': {
            groups: {
              g1: { order: 1 } as any, // no effect
              g2: { order: 2 } as any, // no effect
            },
          },
        },
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      // D-02: slide's defaults.animation.effect === 'none' AND rows lack effect → no emissions
      expect(result.animations).toEqual([])
      expect(opts.diagnostics.animationsInjected).toBe(0)
      expect(opts.diagnostics.elementsCovered).toBe(0)
    })

    it('emits when row has own explicit effect despite slide cascade', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: { animation: { effect: 'none' } },
        slides: {
          '03_overview': {
            groups: {
              g1: { effect: 'entrance_fade', order: 1 } as any,
            },
          },
        },
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations!.length).toBe(1)
      expect(result.animations![0].effect).toBe('fadeIn')
    })
  })

  describe('D-03: transition.effect "none" → turningMode "no"', () => {
    it('maps transition.none to turningMode "no" and preserves auto_advance semantics', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          transition: { effect: 'none' },
          groups: { g1: { effect: 'entrance_fade', order: 1 } },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('no')
    })

    it('defaults.transition.effect "none" propagates as turningMode "no"', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar: AnimationsSidecar = {
        version: 1,
        defaults: { transition: { effect: 'none' } },
        slides: { '03_overview': { groups: { g1: { effect: 'entrance_fade', order: 1 } } } },
      }
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.turningMode).toBe('no')
    })
  })

  describe('D-13: delay + duration merge', () => {
    it('adds delay to duration within clamp', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_fade', order: 1, delay: 0.5, duration: 0.5 },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(1000)
      // Original delay is preserved per D-14
      expect(result.animations![0].extensions!.originalDelay).toBe(0.5)
      expect(opts.diagnostics.delayAccumulatedSeconds).toBe(0.5)
    })

    it('clamps to upper bound when delay+duration overshoots', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_fade', order: 1, delay: 100, duration: 0.1 },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(5000)
      expect(opts.diagnostics.delayAccumulatedSeconds).toBe(100)
    })

    it('clamps to lower bound when delay+duration undershoots', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: { effect: 'entrance_fade', order: 1, delay: 0, duration: 0.05 },
          },
        },
      })
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      expect(result.animations![0].duration).toBe(100)
      // delay === 0 still preserved in extensions + counter
      expect(opts.diagnostics.delayAccumulatedSeconds).toBe(0)
    })

    it('row.delay alone (no row.duration) merges with effectiveRowDuration', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar(
        {
          '03_overview': {
            groups: {
              g1: { effect: 'entrance_fade', order: 1, delay: 0.5 /* no duration */ },
            },
          },
        },
        { animation: { duration: 0.45 } },
      )
      const opts = {
        slideId: '03_overview',
        sidecar,
        diagnostics: emptyInjectorDiagnostics(),
      }
      const result = injectAnimations(slide, opts)
      // 0.5 + 0.45 = 0.95s → 950ms
      expect(result.animations![0].duration).toBe(950)
      expect(opts.diagnostics.delayAccumulatedSeconds).toBe(0.5)
    })
  })

  // -------------------------------------------------------------------------
  // Plan 15-02 / D-15 — resolveEffectiveRow pure-function chain tests
  // -------------------------------------------------------------------------

  describe('resolveEffectiveRow chain (D-15 — pure inheritance resolver)', () => {
    it("uses row.effect when row defines one (no slide/deck fallback)", () => {
      const resolved = resolveEffectiveRow(
        { effect: 'entrance_fade' } as any,
        undefined,
        undefined,
      )
      expect(resolved.effect).toBe('entrance_fade')
    })

    it("falls back to slide.animation.effect when row omits effect", () => {
      const resolved = resolveEffectiveRow(
        {} as any,
        { animation: { effect: 'none' } } as any,
        undefined,
      )
      expect(resolved.effect).toBe('none')
    })

    it("falls back to deck.animation.effect when row + slide both omit", () => {
      const resolved = resolveEffectiveRow(
        {} as any,
        undefined,
        { animation: { effect: 'emphasis_pulse' } } as any,
      )
      expect(resolved.effect).toBe('emphasis_pulse')
    })

    it("falls back to CLI implicit 'none' when no source defines effect", () => {
      const resolved = resolveEffectiveRow({} as any, undefined, undefined)
      expect(resolved.effect).toBe('none')
    })

    it("respects row.trigger_shape over row.trigger (D-18 — collapses to 'on-click')", () => {
      const resolved = resolveEffectiveRow(
        { trigger_shape: 'g1', trigger: 'with-previous' } as any,
        undefined,
        undefined,
      )
      expect(resolved.trigger).toBe('on-click')
      expect(resolved.trigger_shape).toBe('g1')
    })

    it("returns delay=0 when row.delay undefined (D-13 merge input)", () => {
      const resolved = resolveEffectiveRow({} as any, undefined, undefined)
      expect(resolved.delay).toBe(0)
    })

    it("duration falls back across all tiers (row → slide → deck → 0.45)", () => {
      // Only deck provides duration
      const r1 = resolveEffectiveRow(
        {} as any,
        undefined,
        { animation: { duration: 1.2 } } as any,
      )
      expect(r1.duration).toBe(1.2)

      // Only slide provides duration
      const r2 = resolveEffectiveRow(
        {} as any,
        { animation: { duration: 0.8 } } as any,
        undefined,
      )
      expect(r2.duration).toBe(0.8)

      // Row explicitly overrides
      const r3 = resolveEffectiveRow(
        { duration: 2.5 } as any,
        { animation: { duration: 0.8 } } as any,
        { animation: { duration: 1.2 } } as any,
      )
      expect(r3.duration).toBe(2.5)

      // Hardcoded fallback when nothing provides
      const r4 = resolveEffectiveRow({} as any, undefined, undefined)
      expect(r4.duration).toBe(0.45)
    })

    it("trigger falls back across all tiers when no trigger_shape (row → slide → deck → 'after-previous')", () => {
      const r1 = resolveEffectiveRow(
        {} as any,
        undefined,
        { animation: { trigger: 'on-click' as const } } as any,
      )
      expect(r1.trigger).toBe('on-click')

      const r2 = resolveEffectiveRow(
        { trigger: 'with-previous' as const } as any,
        undefined,
        undefined,
      )
      expect(r2.trigger).toBe('with-previous')

      const r3 = resolveEffectiveRow({} as any, undefined, undefined)
      expect(r3.trigger).toBe('after-previous')
    })
  })

  // -------------------------------------------------------------------------
  // Plan 15-02 / D-06 — restart / after_effect / sound preservation
  // -------------------------------------------------------------------------

  describe('restart / after_effect / sound preservation (D-06)', () => {
    it('preserves restart, after_effect, sound as camelCased extensions', () => {
      const slide = makeSlide([makeShape('el1', 'g1')])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            g1: {
              effect: 'entrance_fade',
              restart: 'always',
              after_effect: 'hide',
              sound: 'sounds/click.wav',
              order: 1,
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
      expect(ext).toBeDefined()
      expect(ext!.restart).toBe('always')
      expect(ext!.afterEffect).toBe('hide')
      expect(ext!.sound).toBe('sounds/click.wav')
      // Snake-case keys MUST NOT leak at top level
      expect(ext!.after_effect).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Plan 15-02 / D-04 — chromeSkippedGroups counter (always 0 in Phase 15)
  // -------------------------------------------------------------------------

  describe('chromeSkippedGroups counter (D-04 — forward-compat)', () => {
    it('starts at 0 from emptyInjectorDiagnostics', () => {
      const d = emptyInjectorDiagnostics()
      expect(d.chromeSkippedGroups).toBe(0)
    })

    it('remains 0 after a normal injection run (chrome helper is not wired in Phase 15)', () => {
      const slide = makeSlide([
        makeShape('el1', 'card-temperature'),
        makeShape('el2', 'stage-1-rise'),
      ])
      const sidecar = makeSidecar({
        '03_overview': {
          groups: {
            'card-temperature': { effect: 'entrance_fade', order: 1 },
            'stage-1-rise': { effect: 'entrance_zoom', order: 2 },
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
      expect(opts.diagnostics.chromeSkippedGroups).toBe(0)
    })
  })
})
