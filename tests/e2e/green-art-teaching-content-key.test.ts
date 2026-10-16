/**
 * End-to-end test -- Phase 17 / Plan 17-04.
 *
 * Pins v1.12 contentKey injection against real exampels/green-art-teaching/
 * svg_output/*.svg fixtures (20 slides).
 *
 * Validates:
 *   - 01_cover.svg has exactly 3 cover_* contentKey (CK-01/02/03)
 *   - 02_toc.svg has 4 directory_item_1..4 (CK-11/12) + ≥ 4 directory_item_desc_1..4 (CK-13)
 *   - 03_chapter.svg has exactly 3 chapter_* contentKey (CK-04/05/06)
 *   - 04_content.svg has exactly 2 content_* contentKey (CK-07/08)
 *   - 20_ending.svg has exactly 2 end_* contentKey (CK-09/10)
 *   - All 20 slides: contentKey ⊆ CONTENT_KEY_VALUES (whitelist reverse, CK-14)
 *   - All 20 slides: no null/empty/non-whitelisted contentKey (CK-15 strict)
 *   - All 20 slides: non-text elements do NOT carry contentKey (CK-16 type guard)
 *   - All 20 slides: no N≥5 contentKey (CK-17 fixture scope)
 *
 * Requires `npm run build` to populate `dist/src/index.js`.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { resolve } from 'path'
import { existsSync } from 'fs'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { convertDir } = require('../../dist/src/index.js')
import { CONTENT_KEY_VALUES } from '../../src/utils/content-key'

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

function ckeys(slideId: string): string[] {
  const slide = getSlide(slideId)
  if (!slide) return []
  return slide.elements
    .filter(e => e.contentKey !== undefined)
    .map(e => e.contentKey as string)
}

describe('Plan 17-04 -- fixture E2E on exampels/green-art-teaching (CK-01 ~ CK-17)', () => {
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

  // --- CK-01/02/03 cover ---
  it('01_cover has exactly 3 cover_* contentKey (CK-01/02/03)', () => {
    if (!hasFixture || !result) return
    const keys = new Set(ckeys('01_cover'))
    expect(keys).toEqual(new Set(['cover_title', 'cover_subtitle', 'cover_author']))
  })

  // --- CK-11/12 TOC Row 1 ---
  it('02_toc Row 1 has 4 directory_item_1..4 (CK-11/12)', () => {
    if (!hasFixture || !result) return
    const keys = ckeys('02_toc').filter(k => /^directory_item_[1-4]$/.test(k)).sort()
    expect(keys).toEqual([
      'directory_item_1',
      'directory_item_2',
      'directory_item_3',
      'directory_item_4',
    ])
  })

  // --- CK-13 TOC Row 2+ desc ---
  it('02_toc Row 2 has 4 directory_item_desc_1..4 (CK-13)', () => {
    if (!hasFixture || !result) return
    const keys = ckeys('02_toc').filter(k => /^directory_item_desc_[1-4]$/.test(k)).sort()
    expect(new Set(keys)).toEqual(new Set([
      'directory_item_desc_1',
      'directory_item_desc_2',
      'directory_item_desc_3',
      'directory_item_desc_4',
    ]))
  })

  // --- CK-04/05/06 chapter ---
  it('03_chapter has exactly 3 chapter_* contentKey (CK-04/05/06)', () => {
    if (!hasFixture || !result) return
    const keys = new Set(ckeys('03_chapter'))
    expect(keys).toEqual(new Set(['chapter_number', 'chapter_title', 'chapter_desc']))
  })

  // --- CK-07/08 content ---
  it('04_content has exactly 2 content_* contentKey (CK-07/08)', () => {
    if (!hasFixture || !result) return
    const keys = new Set(ckeys('04_content'))
    expect(keys).toEqual(new Set(['content_title', 'content_subtitle']))
  })

  // --- CK-09/10 closing ---
  it('20_ending has exactly 2 end_* contentKey (CK-09/10)', () => {
    if (!hasFixture || !result) return
    const keys = new Set(ckeys('20_ending'))
    expect(keys).toEqual(new Set(['end_title', 'end_subtitle']))
  })

  // --- CK-14 reverse ---
  it('all 20 slides contentKey ⊆ CONTENT_KEY_VALUES (CK-14 reverse whitelist)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        if (el.contentKey !== undefined) {
          expect(CONTENT_KEY_VALUES).toContain(el.contentKey)
        }
      }
    }
  })

  // --- CK-15 strict: no null/empty/non-whitelisted contentKey ---
  it('all 20 slides no null/empty/non-whitelisted contentKey (CK-15 strict)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        // contentKey 要么是 undefined(字段省略),要么是 string
        if (el.contentKey !== undefined) {
          expect(typeof el.contentKey).toBe('string')
          expect(el.contentKey).not.toBe('')
        }
      }
    }
  })

  // --- CK-16 type guard ---
  it('all 20 slides non-text elements do NOT carry contentKey (CK-16)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        if (el.type !== 'text') {
          expect(el.contentKey).toBeUndefined()
        }
      }
    }
  })

  // --- CK-17 fixture scope: N=1..4 only ---
  it('all 20 slides no N≥5 contentKey (CK-17 fixture scope)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        if (el.contentKey !== undefined) {
          // 不含 directory_item_(number_)?(5|6|7|8)$ 或 directory_item_desc_(5|6|7|8)
          expect(el.contentKey).not.toMatch(/^directory_item_(?:number_)?[5678]$/)
          expect(el.contentKey).not.toMatch(/^directory_item_desc_[5678]$/)
        }
      }
    }
  })

  // --- reverse: cover-date-carrier 不带 contentKey ---
  it('01_cover.svg cover-date-carrier does NOT carry contentKey (CK-14 reverse)', () => {
    if (!hasFixture || !result) return
    const slide = getSlide('01_cover')
    expect(slide).toBeDefined()
    const coverDate = slide!.elements.find(e => e.id === 'cover-date-carrier')
    expect(coverDate).toBeDefined()
    expect(coverDate!.contentKey).toBeUndefined()
  })

  // --- reverse: toc-rail-title 不带 contentKey ---
  it('02_toc.svg toc-rail-title does NOT carry contentKey (CK-14 reverse)', () => {
    if (!hasFixture || !result) return
    const slide = getSlide('02_toc')
    expect(slide).toBeDefined()
    const railTitle = slide!.elements.find(e => e.id === 'toc-rail-title')
    expect(railTitle).toBeDefined()
    expect(railTitle!.contentKey).toBeUndefined()
  })
})