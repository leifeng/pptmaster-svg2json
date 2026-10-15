/**
 * convertDir() programmatic tests — Phase 14 / Plan 14-03.
 *
 * Covers ANIM-CLI-01/02/03 acceptance criteria with a self-contained temp-dir
 * fixture (3 fake SVG files + minimal animations.json). Pins:
 *
 *   - 3 `.svg.json` files emitted to `<tmp>/svg_output/` (NOT `<tmp>/`)
 *   - `result.success === true` with no errors
 *   - Slides with sidecar entries receive `animations[]`; slides without do not
 *   - Output is parseable JSON containing the expected PPTist envelope
 *   - Missing `animations.json` is silent (no exit-code change, no error)
 *
 * Imports `convertDir` from the BUILT `dist/src/index.js` — `npm run build`
 * must run before this test suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { convertDir } = require('../dist/src/index.js')

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const MINIMAL_SVG = (title: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280" viewBox="0 0 200 280">
  <g id="card-${title}">
    <rect x="20" y="20" width="160" height="100" rx="8" fill="#F1F6F3" stroke="#408062"/>
    <text x="100" y="70" font-size="18" fill="#40423F" text-anchor="middle">${title}</text>
  </g>
</svg>`

function buildFixture(
  withSidecar: boolean,
  sidecarOverride?: object,
): { dir: string; svgDir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'p14-03-convert-dir-'))
  const svgDir = join(dir, 'svg_output')
  mkdirSync(svgDir, { recursive: true })

  // 3 fake SVGs — group ids: 'card-foo', 'card-bar', 'card-baz'
  for (const name of ['foo', 'bar', 'baz']) {
    writeFileSync(join(svgDir, `slide_${name}.svg`), MINIMAL_SVG(name), 'utf-8')
  }

  if (withSidecar) {
    const animations = sidecarOverride ?? {
      version: 1,
      defaults: {
        transition: { effect: 'fade' },
        animation: { duration: 0.5, trigger: 'after-previous' },
      },
      slides: {
        slide_foo: {
          transition: { effect: 'fade' },
          groups: {
            'card-foo': {
              effect: 'entrance_fade',
              order: 1,
              duration: 0.5,
            },
          },
        },
        // slide_bar intentionally ABSENT — exercises D-22 strict
        slide_baz: {
          groups: {
            'card-baz': {
              effect: 'entrance_zoom',
              order: 1,
            },
          },
        },
      },
    }
    writeFileSync(join(dir, 'animations.json'), JSON.stringify(animations, null, 2), 'utf-8')
  }

  return { dir, svgDir }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Plan 14-03 — convertDir() programmatic tests (ANIM-CLI-01/02/03)', () => {
  describe('happy path: 3 SVGs + sidecar with 2 entries', () => {
    let fixture: { dir: string; svgDir: string }
    let result: any

    beforeAll(async () => {
      fixture = buildFixture(true)
      result = await convertDir(fixture.dir)
    }, 60_000)

    afterAll(() => {
      try { rmSync(fixture.dir, { recursive: true, force: true }) } catch {}
    })

    it('writes 3 .svg.json files to svg_output/ (NOT the parent dir)', () => {
      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
      const files = readdirSync(fixture.svgDir).filter(f => f.endsWith('.svg.json'))
      expect(files.length).toBe(3)
      // .svg.json files MUST live under svg_output/, never in the parent
      const parentFiles = readdirSync(fixture.dir).filter(f => f.endsWith('.svg.json'))
      expect(parentFiles.length).toBe(0)
    })

    it('produces 3 slides in result.slides', () => {
      expect(result.slides.length).toBe(3)
    })

    it('slide_foo has animations populated and turningMode set', () => {
      const s = result.slides.find((sl: any) => sl.id === 'slide_foo')
      expect(s).toBeDefined()
      expect(s.animations).toBeDefined()
      // N→N coverage: card-foo group has 2 child elements (rect + text), so the
      // single sidecar row produces 2 PPTAnimations — one per matching PPTElement.
      expect(s.animations.length).toBe(2)
      expect(s.animations.every((a: any) => a.effect === 'fadeIn')).toBe(true)
      expect(s.animations.every((a: any) => a.duration === 500)).toBe(true)
      // Every emitted elId must resolve to a slide element, and the two
      // animations must target distinct elements (N-to-N, not 1-to-1).
      const elIds = s.animations.map((a: any) => a.elId)
      expect(new Set(elIds).size).toBe(2)
      const elementIds = new Set(s.elements.map((e: any) => e.id))
      for (const eid of elIds) expect(elementIds.has(eid)).toBe(true)
      expect(s.turningMode).toBe('fade')
    })

    it('slide_bar (no sidecar entry) → animations undefined AND turningMode undefined (D-22)', () => {
      const s = result.slides.find((sl: any) => sl.id === 'slide_bar')
      expect(s).toBeDefined()
      expect(s.animations).toBeUndefined()
      expect(s.turningMode).toBeUndefined()
    })

    it('slide_baz has animations populated; turningMode falls back to defaults.transition', () => {
      const s = result.slides.find((sl: any) => sl.id === 'slide_baz')
      expect(s).toBeDefined()
      expect(s.animations).toBeDefined()
      // N→N coverage: card-baz group has 2 child elements → 2 PPTAnimations.
      expect(s.animations.length).toBe(2)
      expect(s.animations.every((a: any) => a.effect === 'zoomIn')).toBe(true)
      const elIds = s.animations.map((a: any) => a.elId)
      expect(new Set(elIds).size).toBe(2)
      expect(s.turningMode).toBe('fade') // from defaults.transition.effect
    })

    it('each .svg.json file parses as the PPTist envelope', () => {
      const files = readdirSync(fixture.svgDir).filter(f => f.endsWith('.svg.json'))
      for (const f of files) {
        const env = JSON.parse(readFileSync(join(fixture.svgDir, f), 'utf-8'))
        expect(env).toHaveProperty('title')
        expect(env).toHaveProperty('width')
        expect(env).toHaveProperty('height')
        expect(env).toHaveProperty('theme')
        expect(env).toHaveProperty('slides')
        expect(Array.isArray(env.slides)).toBe(true)
        expect(env.slides.length).toBe(1)
      }
    })

    it('diagnostics: animationsInjected + slidesWithAnimation + elementsCovered match expectations', () => {
      // N→N coverage: 2 slides × 2 elements/group × 1 row/group = 4 animations
      expect(result.diagnostics.animationsInjected).toBe(4)
      expect(result.diagnostics.slidesWithAnimation).toBe(2)
      expect(result.diagnostics.elementsCovered).toBe(4)
      // defaultsApplied is PER-ROW, not per-element:
      //   foo row: explicit duration=0.5 (0 sub), no trigger → 1 sub
      //   baz row: no duration (1 sub), no trigger (1 sub) → 2 subs
      //   Total: 3 substitutions
      expect(result.diagnostics.defaultsApplied).toBe(3)
    })

    it('result.warnings reflects diagnostics.elIdNotFoundWarnings', () => {
      expect(result.warnings).toEqual(result.diagnostics.elIdNotFoundWarnings)
    })
  })

  describe('ANIM-CLI-02 — missing animations.json is tolerated', () => {
    let fixture: { dir: string; svgDir: string }
    let result: any

    beforeAll(async () => {
      fixture = buildFixture(false /* no sidecar */)
      result = await convertDir(fixture.dir)
    }, 60_000)

    afterAll(() => {
      try { rmSync(fixture.dir, { recursive: true, force: true }) } catch {}
    })

    it('success=true, errors=[] even with no sidecar', () => {
      expect(result.success).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('writes 3 .svg.json files', () => {
      const files = readdirSync(fixture.svgDir).filter(f => f.endsWith('.svg.json'))
      expect(files.length).toBe(3)
    })

    it('every slide has animations === undefined and turningMode === undefined', () => {
      for (const slide of result.slides) {
        expect(slide.animations).toBeUndefined()
        expect(slide.turningMode).toBeUndefined()
      }
    })

    it('diagnostics reflect zero injections', () => {
      expect(result.diagnostics.animationsInjected).toBe(0)
      expect(result.diagnostics.slidesWithAnimation).toBe(0)
      expect(result.diagnostics.defaultsApplied).toBe(0)
      expect(result.diagnostics.unmappedEffects).toBe(0)
    })
  })

  describe('D-22 negative — defaults present but empty slides[] does NOT leak', () => {
    let fixture: { dir: string; svgDir: string }
    let result: any

    beforeAll(async () => {
      fixture = buildFixture(true, {
        version: 1,
        defaults: {
          transition: { effect: 'fade' },
          animation: { duration: 1.5, trigger: 'on-click' },
        },
        slides: {}, // ← empty
      })
      result = await convertDir(fixture.dir)
    }, 60_000)

    afterAll(() => {
      try { rmSync(fixture.dir, { recursive: true, force: true }) } catch {}
    })

    it('every slide has animations === undefined and turningMode === undefined', () => {
      for (const slide of result.slides) {
        expect(slide.animations).toBeUndefined()
        expect(slide.turningMode).toBeUndefined()
      }
    })

    it('diagnostics reflect zero work', () => {
      expect(result.diagnostics.animationsInjected).toBe(0)
      expect(result.diagnostics.defaultsApplied).toBe(0)
      expect(result.diagnostics.slidesWithAnimation).toBe(0)
    })
  })
})