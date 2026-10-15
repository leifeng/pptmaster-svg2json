/**
 * End-to-end test — Phase 14 / Plan 14-03.
 *
 * Pins the 13-covered / 7-uncovered slide distribution from
 * `exampels/202610131101001/animations.json` ground truth against the
 * real `convertDir()` pipeline. Validates:
 *
 *   - 13 covered slides → `slide.animations.length > 0`
 *   - 7 uncovered slides → `slide.animations === undefined` AND
 *     `slide.turningMode === undefined` (D-22 strict — defaults do NOT leak)
 *   - Every `animation.effect` lives in the PPTist 84-effect whitelist
 *   - Every `animation.elId` resolves to at least one `slide.elements[].id`
 *   - Every `animation.duration ∈ [100, 5000]` (D-19 clamp)
 *   - Every `animation.trigger ∈ {click, meantime, auto}`
 *   - Total injected count matches `result.diagnostics.animationsInjected`
 *   - `convertDir()` second invocation WITHOUT `animations.json` exits
 *     successfully and produces 20 `.svg.json` files with NO `animations`
 *     field (ANIM-CLI-02 missing-sidecar path).
 *
 * Imports `convertDir` from the BUILT `dist/src/index.js` — `npm run build`
 * must run before this test suite.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { convertDir } = require('../../dist/src/index.js')

// ---------------------------------------------------------------------------
// Ground truth — derived from `exampels/202610131101001/animations.json`
// ---------------------------------------------------------------------------

const COVERED_SLIDE_IDS = [
  '03_overview',
  '05_fever-stages',
  '06_fever-types',
  '07_temperature-monitoring',
  '09_abnormal-pulse',
  '10_pulse-monitoring',
  '12_abnormal-respiration',
  '13_respiration-monitoring',
  '15_bp-monitoring',
  '16_bp-assessment',
  '17_bp-recording',
  '18_tips-myths',
  '19_key-points',
] as const

const UNCOVERED_SLIDE_IDS = [
  '01_cover',
  '02_toc',
  '04_chapter-temperature',
  '08_chapter-pulse',
  '11_chapter-respiration',
  '14_chapter-bp',
  '20_ending',
] as const

const ALL_SLIDE_IDS = [...COVERED_SLIDE_IDS, ...UNCOVERED_SLIDE_IDS] // 20 total

// PPTist whitelist — mirrors code/PPTist/src/configs/animation.ts. Kept
// inline (project does not depend on PPTist at runtime).
const PPTIST_EFFECT_WHITELIST = new Set<string>([
  // ENTER
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
  // EXIT
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
  // ATTENTION
  'shakeX', 'shakeY', 'headShake', 'swing', 'wobble', 'tada', 'jello',
  'bounce', 'flash', 'pulse', 'rubberBand', 'heartBeat',
])

const PPTIST_TURNING_MODES = new Set<string>([
  'no', 'fade', 'slideX', 'slideY', 'random', 'slideX3D', 'slideY3D',
  'rotate', 'scaleY', 'scaleX', 'scale', 'scaleReverse',
])

const PPTIST_TRIGGERS = new Set<string>(['click', 'meantime', 'auto'])

// ---------------------------------------------------------------------------
// Fixture resolution — E2E expects `exampels/202610131101001` next to repo root
// ---------------------------------------------------------------------------

const FIXTURE_PATH = resolve(__dirname, '../../exampels/202610131101001')
const ANIMATIONS_JSON_PATH = join(FIXTURE_PATH, 'animations.json')

const hasFixture = existsSync(ANIMATIONS_JSON_PATH)

// ---------------------------------------------------------------------------
// Run-once container — shared result for assertions across tests
// ---------------------------------------------------------------------------

let firstRun: Awaited<ReturnType<typeof convertDir>> | undefined
let sidecar: any

beforeAll(async () => {
  if (!hasFixture) return
  sidecar = JSON.parse(readFileSync(ANIMATIONS_JSON_PATH, 'utf-8'))
  firstRun = await convertDir(FIXTURE_PATH)
}, 60_000)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plan 14-03 — E2E on exampels/202610131101001 (ANIM-DIAG-01)', () => {
  it('fixture path must be resolved (skip suite if absent in this checkout)', () => {
    if (!hasFixture) {
      // Surface a clear message — the orchestrator can decide to skip the suite
      // when the fixture isn't available locally (it is gitignored).
      expect(hasFixture, 'fixture exampels/202610131101001 must exist on disk for E2E').toBe(true)
    }
  })

  it('converts all 20 SVG files into slides (parent-dir mode)', () => {
    if (!hasFixture || !firstRun) return
    expect(firstRun.success).toBe(true)
    expect(firstRun.errors).toEqual([])
    expect(firstRun.slides.length).toBe(20)
  })

  describe('13-covered slide distribution (each must have animations.length > 0)', () => {
    for (const slideId of COVERED_SLIDE_IDS) {
      it(`covered slide "${slideId}" has animations.length > 0`, () => {
        if (!hasFixture || !firstRun) return
        const slide = firstRun.slides.find(s => s.id === slideId)
        expect(slide, `slide ${slideId} must exist`).toBeDefined()
        expect(slide!.animations, `${slideId}.animations must be defined`).toBeDefined()
        expect(
          slide!.animations!.length,
          `${slideId}.animations.length must be > 0`,
        ).toBeGreaterThan(0)
      })
    }
  })

  describe('7-uncovered slide distribution (D-22 strict — defaults do NOT leak)', () => {
    for (const slideId of UNCOVERED_SLIDE_IDS) {
      it(`uncovered slide "${slideId}" has animations === undefined AND turningMode === undefined`, () => {
        if (!hasFixture || !firstRun) return
        const slide = firstRun.slides.find(s => s.id === slideId)
        expect(slide, `slide ${slideId} must exist`).toBeDefined()
        expect(slide!.animations).toBeUndefined()
        expect(slide!.turningMode).toBeUndefined()
      })
    }
  })

  describe('per-animation invariants (D-19, ANIM-DIAG-01)', () => {
    it('every animation.effect is in the PPTist 84-entry whitelist', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        for (const a of slide.animations ?? []) {
          expect(
            PPTIST_EFFECT_WHITELIST.has(a.effect),
            `slide=${slide.id}, animation.id=${a.id}, effect="${a.effect}" not in PPTist whitelist`,
          ).toBe(true)
        }
      }
    })

    it('every animation.duration is in the [100, 5000] ms interval (D-19)', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        for (const a of slide.animations ?? []) {
          expect(a.duration).toBeGreaterThanOrEqual(100)
          expect(a.duration).toBeLessThanOrEqual(5000)
        }
      }
    })

    it('every animation.trigger ∈ {click, meantime, auto}', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        for (const a of slide.animations ?? []) {
          expect(PPTIST_TRIGGERS.has(a.trigger), `trigger=${a.trigger}`).toBe(true)
        }
      }
    })

    it('every animation.elId resolves to at least one slide.elements[].id', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        const elementIds = new Set(slide.elements.map((e: { id: string }) => e.id))
        for (const a of slide.animations ?? []) {
          expect(
            elementIds.has(a.elId),
            `slide=${slide.id}: animation.elId="${a.elId}" not found in elements[]`,
          ).toBe(true)
        }
      }
    })

    it('every animation.id is a 10-character nanoid string', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        for (const a of slide.animations ?? []) {
          expect(typeof a.id).toBe('string')
          expect(a.id.length).toBe(10)
        }
      }
    })
  })

  describe('turningMode invariant', () => {
    it('every turningMode that is set ∈ 12-entry PPTist enum (or undefined)', () => {
      if (!hasFixture || !firstRun) return
      for (const slide of firstRun.slides) {
        if (slide.turningMode !== undefined) {
          expect(PPTIST_TURNING_MODES.has(slide.turningMode)).toBe(true)
        }
      }
    })
  })

  describe('diagnostics accumulator invariants', () => {
    it('animationsInjected === sum(animations.length) across covered slides', () => {
      if (!hasFixture || !firstRun) return
      let total = 0
      for (const slide of firstRun.slides) total += slide.animations?.length ?? 0
      expect(firstRun.diagnostics.animationsInjected).toBe(total)
    })

    it('animationsInjected + extensionsFieldsPreserved match total preserved fields', () => {
      if (!hasFixture || !firstRun) return
      // The accumulator and slide-state surface the same data; this guards against
      // drift between the writer and the reader.
      let totalExtensions = 0
      for (const slide of firstRun.slides) {
        for (const a of slide.animations ?? []) {
          totalExtensions += Object.keys(a.extensions ?? {}).length
        }
      }
      expect(firstRun.diagnostics.extensionsFieldsPreserved).toBe(totalExtensions)
    })

    it('defaultsApplied counter is > 0 (most rows in fixture lack explicit duration/trigger)', () => {
      if (!hasFixture || !firstRun) return
      // Fixture rows uniformly omit duration/trigger (defaults supply them).
      // 13 covered slides × ~4 rows × 2 fields ≈ 100+ substitutions expected.
      expect(firstRun.diagnostics.defaultsApplied).toBeGreaterThan(0)
    })

    it('unmappedEffects is 0 (fixture uses ENTRANCE_MAP-known effects only)', () => {
      if (!hasFixture || !firstRun) return
      expect(firstRun.diagnostics.unmappedEffects).toBe(0)
    })

    it('slidesWithAnimation === 13 (one per covered slide)', () => {
      if (!hasFixture || !firstRun) return
      expect(firstRun.diagnostics.slidesWithAnimation).toBe(13)
    })
  })

  describe('03_overview specific — group-count invariant (N→N coverage)', () => {
    it('animations.length === sum(elements per group) from sidecar', () => {
      if (!hasFixture || !firstRun || !sidecar) return
      const slide = firstRun.slides.find(s => s.id === '03_overview')
      // N→N coverage model: each PPTElement under a <g id="gid"> gets a PPTAnimation
      // for the group's effect row. For legacy single-effect groups (1 row each)
      // this means animations.length === sum over groups of |{elements : groupId === gid}|.
      // For 03_overview (4 groups × 4 elements per group), the expected value is 16.
      // Pitfall 5: rows with effect='none' are skipped; fixture has no 'none' rows
      // in 03_overview, so no row-level subtraction.
      const expectedAnimationsCount = Object.keys(sidecar.slides['03_overview'].groups)
        .reduce((sum, gid) => {
          return sum + slide!.elements.filter((e: any) => e.groupId === gid).length
        }, 0)
      expect(expectedAnimationsCount).toBeGreaterThan(0) // ensure pre-fix 1:1 ≠ new
      expect(slide!.animations!.length).toBe(expectedAnimationsCount)
    })

    it('every PPTElement with groupId matching a sidecar group has at least one animation', () => {
      if (!hasFixture || !firstRun || !sidecar) return
      const slide = firstRun.slides.find(s => s.id === '03_overview')
      const animatedElIds = new Set(slide!.animations!.map((a: any) => a.elId))
      for (const [gid, groupEntry] of Object.entries(sidecar.slides['03_overview'].groups)) {
        const groupElements = slide!.elements.filter((e: any) => e.groupId === gid)
        for (const el of groupElements) {
          expect(
            animatedElIds.has((el as any).id),
            `element ${(el as any).id} under group ${gid} must have an animation`,
          ).toBe(true)
        }
      }
    })

    it('produces a sample of mapped animations on 03_overview', () => {
      if (!hasFixture || !firstRun) return
      const slide = firstRun.slides.find(s => s.id === '03_overview')
      // The fixture maps `entrance_wipe` → fadeIn per the ENTRANCE_MAP table.
      const sample = slide!.animations!.find(a => a.effect === 'fadeIn')
      expect(sample).toBeDefined()
      expect(sample!.elId).toMatch(/^card-(temperature|pulse|respiration|bp)/)
      expect(sample!.type).toBe('in')
    })
  })

  describe('ANIM-CLI-02 — missing sidecar does NOT break the run', () => {
    let missingSidecarResult: any
    let missingSidecarDir: string | undefined

    beforeAll(async () => {
      if (!hasFixture) return
      // Copy fixture into a temp dir, then DELETE the animations.json so
      // convertDir exercises the "missing sidecar" path. SVG files stay.
      missingSidecarDir = mkdtempSync(join(tmpdir(), 'p14-03-missing-sidecar-'))
      const tmpSvgDir = join(missingSidecarDir, 'svg_output')
      mkdirSync(tmpSvgDir, { recursive: true })
      for (const slideId of ALL_SLIDE_IDS) {
        copyFileSync(
          join(FIXTURE_PATH, 'svg_output', `${slideId}.svg`),
          join(tmpSvgDir, `${slideId}.svg`),
        )
      }
      // intentionally NO animations.json
      missingSidecarResult = await convertDir(missingSidecarDir)
    }, 60_000)

    afterAll(() => {
      if (missingSidecarDir) {
        try {
          rmSync(missingSidecarDir, { recursive: true, force: true })
        } catch {
          // best-effort cleanup
        }
      }
    })

    it('produces 20 .svg.json files even when animations.json is absent', () => {
      if (!hasFixture || !missingSidecarResult || !missingSidecarDir) return
      expect(missingSidecarResult.success).toBe(true)
      expect(missingSidecarResult.errors).toEqual([])
      const files = readdirSync(join(missingSidecarDir, 'svg_output')).filter(f =>
        f.endsWith('.svg.json'),
      )
      expect(files.length).toBe(20)
    })

    it('every slide has animations === undefined (no defaults leak when sidecar is missing)', () => {
      if (!hasFixture || !missingSidecarResult) return
      for (const slide of missingSidecarResult.slides) {
        expect(slide.animations).toBeUndefined()
        expect(slide.turningMode).toBeUndefined()
      }
    })

    it('diagnostics reflect zero injections when sidecar missing', () => {
      if (!hasFixture || !missingSidecarResult) return
      expect(missingSidecarResult.diagnostics.animationsInjected).toBe(0)
      expect(missingSidecarResult.diagnostics.slidesWithAnimation).toBe(0)
      expect(missingSidecarResult.diagnostics.unmappedEffects).toBe(0)
    })
  })

  describe('D-22 negative check — defaults do NOT leak to absent entries', () => {
    let negativeResult: any
    let negativeDir: string | undefined

    beforeAll(async () => {
      if (!hasFixture) return
      // Copy fixture to temp dir, REPLACE animations.json with one that has
      // empty slides + populated defaults. exercises D-22 strictly.
      negativeDir = mkdtempSync(join(tmpdir(), 'p14-03-d22-negative-'))
      const tmpSvgDir = join(negativeDir, 'svg_output')
      mkdirSync(tmpSvgDir, { recursive: true })
      for (const slideId of ALL_SLIDE_IDS) {
        copyFileSync(
          join(FIXTURE_PATH, 'svg_output', `${slideId}.svg`),
          join(tmpSvgDir, `${slideId}.svg`),
        )
      }
      const negativeAnimations = {
        version: 1,
        defaults: {
          transition: { effect: 'fade' },
          animation: { duration: 1.5, trigger: 'on-click' },
        },
        slides: {}, // ← empty: no slide entries, defaults must NOT leak
      }
      writeFileSync(
        join(negativeDir, 'animations.json'),
        JSON.stringify(negativeAnimations, null, 2),
        'utf-8',
      )
      negativeResult = await convertDir(negativeDir)
    }, 60_000)

    afterAll(() => {
      if (negativeDir) {
        try {
          rmSync(negativeDir, { recursive: true, force: true })
        } catch {
          // best-effort cleanup
        }
      }
    })

    it('with defaults populated but slides:{}, every slide stays animations === undefined', () => {
      if (!hasFixture || !negativeResult) return
      for (const slide of negativeResult.slides) {
        expect(slide.animations).toBeUndefined()
        expect(slide.turningMode).toBeUndefined()
      }
    })

    it('diagnostics.animationsInjected === 0 and defaultsApplied === 0 (no work done)', () => {
      if (!hasFixture || !negativeResult) return
      expect(negativeResult.diagnostics.animationsInjected).toBe(0)
      expect(negativeResult.diagnostics.defaultsApplied).toBe(0)
      expect(negativeResult.diagnostics.slidesWithAnimation).toBe(0)
    })
  })
})