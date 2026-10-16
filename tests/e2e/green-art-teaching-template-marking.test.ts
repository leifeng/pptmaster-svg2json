/**
 * End-to-end test -- Phase 16 / Plan 16-03.
 *
 * Pins v1.11 template element marking + contentBounds extraction against
 * real fixtures `exampels/green-art-teaching/svg_output/*.svg` (20 slides).
 *
 * Validates:
 *   - TPL-E2E-01: cover/toc/04_content/ending slides have >= expected
 *     template-marked element count; 04_content has exact contentBounds
 *   - TPL-E2E-02: every slide.elements[].templateType in {1, undefined}
 *   - TPL-CB-03: slides without content-object-slot-template omit the
 *     contentBounds field from JSON output
 *
 * Requires `npm run build` to populate `dist/src/index.js` (mirrors the
 * 202610131101001 E2E pattern).
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { existsSync } from 'fs'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { convertDir } = require('../../dist/src/index.js')

const FIXTURE_PATH = resolve(__dirname, '../../exampels/green-art-teaching')
const hasFixture = existsSync(resolve(FIXTURE_PATH, 'svg_output'))

let result: Awaited<ReturnType<typeof convertDir>> | undefined

beforeAll(async () => {
  if (!hasFixture) return
  result = await convertDir(FIXTURE_PATH)
}, 60_000)

function getSlide(slideId: string) {
  return result?.slides.find(s => s.id === slideId)
}

function templateMarkedCount(slideId: string): number {
  const slide = getSlide(slideId)
  if (!slide) return 0
  return slide.elements.filter(e => e.templateType === 1).length
}

describe('Plan 16-03 -- E2E on exampels/green-art-teaching (TPL-E2E-01/02)', () => {
  it('fixture path must be resolved (skip suite if absent in this checkout)', () => {
    if (!hasFixture) {
      expect(hasFixture, 'fixture exampels/green-art-teaching must exist on disk').toBe(true)
    }
  })

  it('converts all 20 SVG files into slides', () => {
    if (!hasFixture || !result) return
    expect(result.success).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.slides.length).toBe(20)
  })

  // --- TPL-E2E-01 cover ---
  it('01_cover.svg has >= 5 template-marked elements (6 fixture elements)', () => {
    if (!hasFixture || !result) return
    expect(templateMarkedCount('01_cover')).toBeGreaterThanOrEqual(5)
  })

  // --- TPL-E2E-01 toc ---
  it('02_toc.svg has >= 4 template-marked elements', () => {
    if (!hasFixture || !result) return
    expect(templateMarkedCount('02_toc')).toBeGreaterThanOrEqual(4)
  })

  // --- TPL-E2E-01 04_content precise contentBounds + slot exception ---
  it('04_content.svg has contentBounds === { x: 98, y: 180, width: 1084, height: 404 }', () => {
    if (!hasFixture || !result) return
    const slide = getSlide('04_content')
    expect(slide).toBeDefined()
    expect(slide!.contentBounds).toEqual({ x: 98, y: 180, width: 1084, height: 404 })
  })

  it('04_content.svg slot element itself does not carry templateType (TPL-MARK-03)', () => {
    if (!hasFixture || !result) return
    const slide = getSlide('04_content')
    expect(slide).toBeDefined()
    const has42 = slide!.elements.some(e =>
      e.templateType === 1 && (
        e.id === 'content-object-slot-template' ||
        (e.groupId !== undefined && e.groupId.includes('content-object-slot-template'))
      ),
    )
    expect(has42).toBe(false)
  })

  // --- TPL-E2E-01 ending ---
  it('20_ending.svg has >= 4 template-marked elements', () => {
    if (!hasFixture || !result) return
    expect(templateMarkedCount('20_ending')).toBeGreaterThanOrEqual(4)
  })

  // --- TPL-E2E-02 reverse assertion across all 20 slides ---
  it('every templateType across all 20 slides is exactly 1 or undefined (TPL-E2E-02)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        expect(
          el.templateType === 1 || el.templateType === undefined,
          `slide=${slide.id} el.id=${el.id} templateType=${JSON.stringify(el.templateType)} not in {1, undefined}`,
        ).toBe(true)
        expect(el.templateType).not.toBe(null)
        expect(el.templateType).not.toBe(true)
        expect(el.templateType).not.toBe('1')
        expect(el.templateType).not.toBe(2)
      }
    }
  })

  // --- TPL-CB-03 reverse assertion: no slot -> no contentBounds field ---
  it('every slide without content-object-slot-template omits contentBounds field (TPL-CB-03)', () => {
    if (!hasFixture || !result) return
    const slots = ['01_cover', '02_toc', '03_chapter', '20_ending']
    for (const id of slots) {
      const slide = getSlide(id)
      expect(slide).toBeDefined()
      expect(
        Object.keys(slide!),
        `slide=${id} should not have contentBounds in JSON keys`,
      ).not.toContain('contentBounds')
    }
  })
})
