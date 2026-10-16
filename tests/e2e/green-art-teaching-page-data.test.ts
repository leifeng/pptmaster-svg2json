/**
 * End-to-end test -- Phase 18 / Plan 18-03.
 *
 * Pins v1.13 pageData injection against real exampels/green-art-teaching/
 * svg_output/*.svg fixtures (20 slides).
 *
 * Validates:
 *   - 01_cover.svg has pageData.cover_title / cover_subtitle / cover_author (PD-01..03)
 *   - 02_toc.svg has pageData.directory length 4, each item with index/title/desc (PD-04 / PD-05)
 *   - 03_chapter.svg has pageData.chapter_number / chapter_title / chapter_desc (PD-06..08)
 *   - 04_content.svg has pageData.content_title / content_subtitle (PD-09..10)
 *   - 20_ending.svg has pageData.end_title / end_subtitle (PD-11..12)
 *   - All 20 slides: pageData static field keys ⊆ 10 static + directory (PD-E2E-03)
 *   - All 20 slides: no N≥5 directory index (D-20 reverse 1)
 *   - All 20 slides: directory items contain exactly {index, title, desc} (D-20 reverse 2)
 *   - All 20 slides: element.textContent locked to contentKey presence (PD-16)
 *   - All 20 slides: non-PPTTextElement does not carry textContent (PD-16 type guard)
 *   - 01_cover: contentKeys = [cover_author, cover_subtitle, cover_title] (PD-E2E-04 unchanged)
 *   - 02_toc: 4 directory_item_N + 4 directory_item_desc_N contentKeys, all carry textContent
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

function pageDataOf(slideId: string) {
  return getSlide(slideId)?.pageData
}

function elementsWithContentKey(slideId: string) {
  const slide = getSlide(slideId)
  if (!slide) return []
  return slide.elements
    .filter(e => e.contentKey !== undefined)
    .map(e => ({ contentKey: e.contentKey as string, textContent: e.textContent, type: e.type }))
}

// 10 static field names per PageData interface (D-12)
const STATIC_PAGE_DATA_KEYS: ReadonlySet<string> = new Set([
  'cover_title',
  'cover_subtitle',
  'cover_author',
  'chapter_number',
  'chapter_title',
  'chapter_desc',
  'content_title',
  'content_subtitle',
  'end_title',
  'end_subtitle',
])

describe('Plan 18-03 -- fixture E2E on exampels/green-art-teaching (PD-01..PD-16 + PD-E2E-01..04)', () => {
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

  // --- PD-01..03 cover ---
  it('01_cover pageData has cover_title / cover_subtitle / cover_author (PD-01..03)', () => {
    if (!hasFixture || !result) return
    const pd = pageDataOf('01_cover')
    expect(pd, 'pageData must be defined for 01_cover').toBeDefined()
    expect(pd?.cover_title).toEqual(expect.any(String))
    expect((pd?.cover_title as string).length).toBeGreaterThan(0)
    expect(pd?.cover_subtitle).toEqual(expect.any(String))
    expect((pd?.cover_subtitle as string).length).toBeGreaterThan(0)
    expect(pd?.cover_author).toEqual(expect.any(String))
    expect((pd?.cover_author as string).length).toBeGreaterThan(0)

    // cross-check: pageData values must match element-level textContent
    const tcMap = new Map(
      elementsWithContentKey('01_cover')
        .filter(e => e.textContent !== undefined)
        .map(e => [e.contentKey, e.textContent as string]),
    )
    expect(pd?.cover_title).toBe(tcMap.get('cover_title'))
    expect(pd?.cover_subtitle).toBe(tcMap.get('cover_subtitle'))
    expect(pd?.cover_author).toBe(tcMap.get('cover_author'))
  })

  // --- PD-04 directory length ---
  it('02_toc pageData.directory.length === 4 (PD-04)', () => {
    if (!hasFixture || !result) return
    const pd = pageDataOf('02_toc')
    expect(pd?.directory).toBeDefined()
    expect(pd?.directory?.length).toBe(4)
    expect(pd?.directory?.map(d => d.index).sort()).toEqual(['01', '02', '03', '04'])
  })

  // --- PD-05 directory[0] shape ---
  it('02_toc pageData.directory[0] has index/title/desc (PD-05)', () => {
    if (!hasFixture || !result) return
    const dir0 = pageDataOf('02_toc')?.directory?.[0]
    expect(dir0).toEqual({
      index: '01',
      title: expect.any(String),
      desc: expect.any(String),
    })
    // reverse: exactly 3 keys, no extras
    expect(Object.keys(dir0!).sort()).toEqual(['desc', 'index', 'title'])
  })

  // --- PD-06..08 chapter ---
  it('03_chapter pageData has chapter_number / chapter_title / chapter_desc (PD-06..08)', () => {
    if (!hasFixture || !result) return
    const pd = pageDataOf('03_chapter')
    expect(pd?.chapter_number).toEqual(expect.any(String))
    expect((pd?.chapter_number as string).length).toBeGreaterThan(0)
    expect(pd?.chapter_title).toEqual(expect.any(String))
    expect((pd?.chapter_title as string).length).toBeGreaterThan(0)
    expect(pd?.chapter_desc).toEqual(expect.any(String))
    expect((pd?.chapter_desc as string).length).toBeGreaterThan(0)
  })

  // --- PD-09..10 content ---
  it('04_content pageData has content_title / content_subtitle (PD-09..10)', () => {
    if (!hasFixture || !result) return
    const pd = pageDataOf('04_content')
    expect(pd?.content_title).toEqual(expect.any(String))
    expect((pd?.content_title as string).length).toBeGreaterThan(0)
    expect(pd?.content_subtitle).toEqual(expect.any(String))
    expect((pd?.content_subtitle as string).length).toBeGreaterThan(0)
  })

  // --- PD-11..12 ending (plan numbering uses 05_ending but real fixture is 20_ending) ---
  it('20_ending pageData has end_title / end_subtitle (PD-11..12)', () => {
    if (!hasFixture || !result) return
    const pd = pageDataOf('20_ending')
    expect(pd?.end_title).toEqual(expect.any(String))
    expect((pd?.end_title as string).length).toBeGreaterThan(0)
    expect(pd?.end_subtitle).toEqual(expect.any(String))
    expect((pd?.end_subtitle as string).length).toBeGreaterThan(0)
  })
})

describe('Plan 18-03 -- PD-E2E-03 + D-20 reverse whitelist and 4 reverse checks', () => {
  // --- PD-E2E-03 reverse whitelist ---
  it('all 20 slides pageData static field keys ⊆ STATIC_PAGE_DATA_KEYS ∪ {directory} (PD-E2E-03)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      const pd = slide.pageData
      if (!pd) continue
      for (const key of Object.keys(pd)) {
        if (key === 'directory') continue
        expect(
          STATIC_PAGE_DATA_KEYS.has(key),
          `slide=${slide.id} key=${key} not in 10 static fields`,
        ).toBe(true)
      }
    }
  })

  // --- D-20 reverse 1: no N>=5 directory index ---
  it('D-20 reverse 1: no N>=5 directory index in any slide pageData (PD-04 scope)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      const dir = slide.pageData?.directory ?? []
      for (const item of dir) {
        expect(['01', '02', '03', '04']).toContain(item.index)
      }
    }
  })

  // --- D-20 reverse 2: directory items contain exactly {index, title, desc} ---
  it('D-20 reverse 2: directory items contain exactly {index, title, desc}', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      const dir = slide.pageData?.directory ?? []
      for (const item of dir) {
        expect(Object.keys(item).sort()).toEqual(['desc', 'index', 'title'])
      }
    }
  })

  // --- D-20 reverse 3: element.textContent lock to contentKey presence ---
  it('D-20 reverse 3: element.textContent locked to contentKey presence (PD-16)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        if (el.textContent !== undefined) {
          expect(
            el.contentKey,
            `slide=${slide.id} el.id=${el.id} has textContent but no contentKey`,
          ).toBeDefined()
          expect(typeof el.contentKey).toBe('string')
        }
      }
    }
  })

  // --- D-20 reverse 4: non-PPTTextElement does not carry textContent ---
  it('D-20 reverse 4: non-PPTTextElement does not carry textContent (PD-16 type guard)', () => {
    if (!hasFixture || !result) return
    for (const slide of result.slides) {
      for (const el of slide.elements) {
        if (el.type !== 'text') {
          expect(
            el.textContent,
            `slide=${slide.id} el.id=${el.id} type=${el.type} should not carry textContent`,
          ).toBeUndefined()
          expect(el.contentKey).toBeUndefined()
        }
      }
    }
  })
})

describe('Plan 18-03 -- PD-E2E-04: v1.12 contentKey injection unchanged', () => {
  // --- PD-E2E-04 v1.12 contentKey injection unchanged ---
  it('01_cover contentKeys still equal [cover_author, cover_subtitle, cover_title]', () => {
    if (!hasFixture || !result) return
    const coverKeys = elementsWithContentKey('01_cover')
      .map(e => e.contentKey)
      .sort()
    expect(coverKeys).toEqual(['cover_author', 'cover_subtitle', 'cover_title'])
  })

  // --- PD-E2E-04 v1.12 + v1.13 dual field on TOC ---
  it('02_toc Row 1 + Row 2 desc contentKeys coexist with textContent (8 entries)', () => {
    if (!hasFixture || !result) return
    const tocElems = elementsWithContentKey('02_toc')
    const row1Keys = tocElems
      .filter(e => /^directory_item_\d+$/.test(e.contentKey))
      .map(e => e.contentKey)
      .sort()
    const descKeys = tocElems
      .filter(e => /^directory_item_desc_\d+$/.test(e.contentKey))
      .map(e => e.contentKey)
      .sort()
    expect(row1Keys).toEqual([
      'directory_item_1',
      'directory_item_2',
      'directory_item_3',
      'directory_item_4',
    ])
    expect(descKeys).toEqual([
      'directory_item_desc_1',
      'directory_item_desc_2',
      'directory_item_desc_3',
      'directory_item_desc_4',
    ])
    // every directory element carries textContent (v1.13 dual-field rule)
    const dirElems = tocElems.filter(
      e => /^directory_item_/.test(e.contentKey),
    )
    for (const el of dirElems) {
      expect(el.textContent).toBeDefined()
      expect(typeof el.textContent).toBe('string')
      expect((el.textContent as string).length).toBeGreaterThan(0)
    }
  })
})

// Touch CONTENT_KEY_VALUES so the import is not removed by an over-aggressive
// tree-shaker; this also serves as a sanity check that the symbol is exported.
describe('Plan 18-03 -- content-key helper sanity', () => {
  it('CONTENT_KEY_VALUES is a non-empty frozen array of whitelisted contentKeys', () => {
    expect(Array.isArray(CONTENT_KEY_VALUES)).toBe(true)
    expect(CONTENT_KEY_VALUES.length).toBeGreaterThan(0)
    expect(Object.isFrozen(CONTENT_KEY_VALUES)).toBe(true)
    // sanity: all whitelist values are non-empty strings
    for (const v of CONTENT_KEY_VALUES) {
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    }
  })
})