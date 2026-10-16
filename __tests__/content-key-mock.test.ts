import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformToPPTElement } from '../src/transformer/transform-to-pptel'
import { CONTENT_KEY_VALUES } from '../src/utils/content-key'
import type { PPTTextElement } from '../src/slides'

/**
 * Mock SVG E2E for Phase 17 / v1.12 (Plan 17-03).
 *
 * 覆盖 fixture 中缺位的边界 case:
 *   - N=5..8 三类 12 sub-class(mock SVG 钉死动态范围上限)
 *   - carrier 内 tspan[dy] 拆分(走 Row 1 vs Row 2..N 路径)
 *   - 未映射 id 反向断言(CK-14 / CK-15)
 *   - 类型守卫(CK-16):contentKey 仅对 PPTTextElement 写入
 *   - CONTENT_KEY_VALUES 白名单 invariant
 */

describe('CK-11 ~ CK-13: TOC 动态 N=5..8 contentKey 注入 (mock SVG)', () => {
  it('toc-item-5..8-number / carrier / note-carrier 三类各命中对应 contentKey', async () => {
    const n5to8 = [5, 6, 7, 8].map(n => `
      <text id="toc-item-${n}-number" x="100" y="${100 + n * 80}" font-size="20">${n}</text>
      <text id="toc-item-${n}-carrier" x="100" y="${120 + n * 80}" font-size="20">mock item ${n}</text>
      <text id="toc-item-${n}-note-carrier" x="100" y="${140 + n * 80}" font-size="14">mock desc ${n}</text>
    `).join('')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">${n5to8}</svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    // 12 个 mock sub-class 各命中对应 contentKey
    for (let n = 5; n <= 8; n++) {
      const numEl = elements.find(e => e.id === `toc-item-${n}-number`) as PPTTextElement
      const carEl = elements.find(e => e.id === `toc-item-${n}-carrier`) as PPTTextElement
      const noteEl = elements.find(e => e.id === `toc-item-${n}-note-carrier`) as PPTTextElement

      expect(numEl).toBeDefined()
      expect(carEl).toBeDefined()
      expect(noteEl).toBeDefined()

      expect(numEl.contentKey).toBe(`directory_item_number_${n}`)
      expect(carEl.contentKey).toBe(`directory_item_${n}`)
      expect(noteEl.contentKey).toBe(`directory_item_desc_${n}`)
    }
  })
})

describe('CK-13: carrier 内 tspan[dy] 拆分 → contentKey 区分 (mock SVG)', () => {
  it('toc-item-1-carrier 内 tspan[dy] 拆分时 Row 1 → directory_item_1,Row 2 → directory_item_desc_1', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="toc-item-1-carrier" x="100" y="100" font-size="20">
        leading inline text
        <tspan x="100" dy="22">desc line 1</tspan>
        <tspan x="100" dy="22">desc line 2</tspan>
      </text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    // multiline 拆分至少 3 行
    expect(elements.length).toBeGreaterThanOrEqual(3)

    // Row 1: id 是原 carrier id(不后缀 -line-N)
    const row1 = elements.find(e => e.id === 'toc-item-1-carrier') as PPTTextElement
    expect(row1).toBeDefined()
    expect(row1.contentKey).toBe('directory_item_1')

    // Row 2+: id 后缀 -line-N,contentKey 是 directory_item_desc_1
    const row2plus = elements.filter(e => e.id.startsWith('toc-item-1-carrier-line-')) as PPTTextElement[]
    expect(row2plus.length).toBeGreaterThanOrEqual(2)
    for (const row of row2plus) {
      expect(row.contentKey).toBe('directory_item_desc_1')
    }
  })
})

describe('CK-14 / CK-15: 未映射 id 反向断言 (mock SVG)', () => {
  it('toc-rail-title / cover-date-carrier / chapter-x-template 等未映射 id 不带 contentKey 字段', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="toc-rail-title" x="100" y="100" font-size="20">录</text>
      <text id="toc-rail-label" x="100" y="140" font-size="14">rail label</text>
      <text id="cover-date-carrier" x="100" y="180" font-size="14">2026</text>
      <text id="chapter-x-template" x="100" y="220" font-size="14">chapter x</text>
      <text id="random-unmapped-id" x="100" y="260" font-size="14">random</text>
      <text id="my-text" x="100" y="300" font-size="14">plain text</text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const unmappedIds = [
      'toc-rail-title',
      'toc-rail-label',
      'cover-date-carrier',
      'chapter-x-template',
      'random-unmapped-id',
      'my-text',
    ]

    for (const id of unmappedIds) {
      const el = elements.find(e => e.id === id) as PPTTextElement
      expect(el).toBeDefined()
      // 字段省略 !== undefined (CK-14 / CK-15 strict)
      expect(el.contentKey).toBeUndefined()
    }
  })
})

describe('CK-16: 类型守卫 — contentKey 仅在文本元素 (mock SVG)', () => {
  it('cover-title-carrier 命中映射表但元素是 <rect> 不带 contentKey', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect id="cover-title-carrier" x="0" y="0" width="100" height="100" fill="#fff"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const rect = elements.find(e => e.id === 'cover-title-carrier')
    expect(rect).toBeDefined()
    expect(rect?.type).toBe('shape')
    expect((rect as any).contentKey).toBeUndefined()
  })

  it('toc-item-3-carrier 是 <rect> 时也不带 contentKey', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect id="toc-item-3-carrier" x="0" y="0" width="100" height="100" fill="#fff"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const rect = elements.find(e => e.id === 'toc-item-3-carrier')
    expect(rect).toBeDefined()
    expect((rect as any).contentKey).toBeUndefined()
  })
})

describe('CONTENT_KEY_VALUES 白名单 invariant', () => {
  it('CONTENT_KEY_VALUES 包含 cover / chapter / content / closing 静态 contentKey', () => {
    expect(CONTENT_KEY_VALUES).toContain('cover_title')
    expect(CONTENT_KEY_VALUES).toContain('cover_subtitle')
    expect(CONTENT_KEY_VALUES).toContain('cover_author')
    expect(CONTENT_KEY_VALUES).toContain('chapter_number')
    expect(CONTENT_KEY_VALUES).toContain('chapter_title')
    expect(CONTENT_KEY_VALUES).toContain('chapter_desc')
    expect(CONTENT_KEY_VALUES).toContain('content_title')
    expect(CONTENT_KEY_VALUES).toContain('content_subtitle')
    expect(CONTENT_KEY_VALUES).toContain('end_title')
    expect(CONTENT_KEY_VALUES).toContain('end_subtitle')
  })

  it('CONTENT_KEY_VALUES 包含 N=1..8 动态 contentKey (上限验证)', () => {
    for (let n = 1; n <= 8; n++) {
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_number_${n}`)
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_${n}`)
      expect(CONTENT_KEY_VALUES).toContain(`directory_item_desc_${n}`)
    }
  })

  it('CONTENT_KEY_VALUES 不包含 N=9+ 越界值(动态上限锁定 8)', () => {
    expect(CONTENT_KEY_VALUES).not.toContain('directory_item_9')
    expect(CONTENT_KEY_VALUES).not.toContain('directory_item_desc_9')
    expect(CONTENT_KEY_VALUES).not.toContain('directory_item_number_9')
  })
})