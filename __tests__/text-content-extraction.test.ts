/**
 * Mock SVG E2E for Phase 18 / v1.13 (Plan 18-02).
 *
 * Covers transformElement() textContent write contract (D-02 / D-03 / D-04) and
 * convertOne() pageData aggregation contract (D-09). Reverse assertions pin
 * the "no contentKey hit ⇒ no textContent" lock (D-01).
 *
 * Cases:
 *   - D-02 / D-05: single-line textContent retention (placeholder preserved).
 *   - D-04: multiline Row 1 / Row 2..N each carry their own textContent.
 *   - D-01 / PD-16: unmapped id PPTTextElement => textContent === undefined.
 *   - PD-16: non-text element (rect with cover-title-carrier id) => textContent === undefined.
 *   - D-09: 0-contentKey SVG => slide.pageData === undefined and every element's textContent undefined.
 *   - D-19 compatibility: note-carrier single-line textContent (mock desc text).
 *   - CK-16 mirror: cover-title-carrier PPTTextElement gets contentKey === 'cover_title'.
 */

import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformToPPTElement } from '../src/transformer/transform-to-pptel'
import { convert } from '../src/index'
import type { PPTTextElement, PPTShapeElement } from '../src/slides'

describe('PD-16 / D-02 / D-05: 单行 textContent 写入 — 占位符原样保留 (mock SVG)', () => {
  it('cover-title-carrier 单行 text 含 {{TITLE}} 占位符 — textContent 原样保留', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="cover-title-carrier" x="100" y="100" font-size="20">Some {{TITLE}} text</text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const el = elements.find(e => e.id === 'cover-title-carrier') as PPTTextElement
    expect(el).toBeDefined()
    expect(el.contentKey).toBe('cover_title')
    // D-05: 占位符 {{TITLE}} 原样保留(不做 trim / 不解析)
    expect(el.textContent).toBe('Some {{TITLE}} text')
  })
})

describe('D-04: multiline Row 1 / Row 2..N 各自 textContent (mock SVG)', () => {
  it('toc-item-1-carrier 内 tspan[dy] 拆分 — Row 1 = leading inline text, Row 2+ = 各 tspan.text', async () => {
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

    // Row 1: id 不后缀 -line-N
    const row1 = elements.find(e => e.id === 'toc-item-1-carrier') as PPTTextElement
    expect(row1).toBeDefined()
    expect(row1.contentKey).toBe('directory_item_1')
    // D-04: Row 1 写入 leading inline text 的原始 tspan.text(含 svg 缩进 / 换行原样保留 — D-05)
    expect(row1.textContent).toContain('leading inline text')

    // Row 2+: id 后缀 -line-N,每个 row 取自己的 tspan.text
    const row2plus = elements.filter(e => e.id.startsWith('toc-item-1-carrier-line-')) as PPTTextElement[]
    expect(row2plus.length).toBeGreaterThanOrEqual(2)
    expect(row2plus[0].contentKey).toBe('directory_item_desc_1')
    expect(row2plus[1].contentKey).toBe('directory_item_desc_1')

    const rowTexts = row2plus.map(r => r.textContent).filter((t): t is string => t !== undefined)
    // 各自的 tspan 文本(可能 lead 行也包括,但 desc lines 必须各自命中)
    expect(rowTexts.some(t => t.includes('desc line 1'))).toBe(true)
    expect(rowTexts.some(t => t.includes('desc line 2'))).toBe(true)
  })
})

describe('D-01 / PD-20: 未映射 id 反向断言 (mock SVG)', () => {
  it('toc-rail-title / cover-date-carrier / random-unmapped-id 等不写 textContent', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="toc-rail-title" x="100" y="100" font-size="20">录</text>
      <text id="toc-rail-label" x="100" y="140" font-size="14">rail label</text>
      <text id="cover-date-carrier" x="100" y="180" font-size="14">2026</text>
      <text id="random-unmapped-id" x="100" y="220" font-size="14">random</text>
      <text id="my-text" x="100" y="260" font-size="14">plain text</text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const unmappedIds = [
      'toc-rail-title',
      'toc-rail-label',
      'cover-date-carrier',
      'random-unmapped-id',
      'my-text',
    ]

    for (const id of unmappedIds) {
      const el = elements.find(e => e.id === id) as PPTTextElement
      expect(el).toBeDefined()
      // 无 contentKey 命中 → textContent 也不写(D-01 互锁)
      expect(el.contentKey).toBeUndefined()
      expect(el.textContent).toBeUndefined()
    }

    // 反向强约束:任何 element 含 textContent 必有 contentKey
    for (const el of elements) {
      if ((el as PPTTextElement).textContent !== undefined) {
        expect((el as PPTTextElement).contentKey).toBeDefined()
      }
    }
  })
})

describe('PD-16 类型守卫: 非 text case 不写 textContent (mock SVG)', () => {
  it('cover-title-carrier id 但元素是 <rect> 时 — textContent undefined (D-02 镜像 PD-16)', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect id="cover-title-carrier" x="0" y="0" width="100" height="100" fill="#fff"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const rect = elements.find(e => e.id === 'cover-title-carrier') as PPTShapeElement
    expect(rect).toBeDefined()
    expect(rect.type).toBe('shape')
    // contentKey 也不写(类型守卫)
    expect((rect as unknown as PPTTextElement).contentKey).toBeUndefined()
    expect((rect as unknown as PPTTextElement).textContent).toBeUndefined()
  })
})

describe('PD-13 / D-09: 0 命中 slide => slide.pageData undefined (mock SVG 全链路 convert)', () => {
  it('纯 unmapped-id 单 text SVG => slide.pageData === undefined 且 element.textContent undefined', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="random-unmapped-id" x="100" y="100" font-size="20">NoKey</text>
    </svg>`
    const result = await convert(svg)

    // ConvertResult.slide 总是存在(success path),但 pageData 应被 D-09 守卫掉
    expect(result.success).toBe(true)
    expect(result.slide).toBeDefined()
    expect(result.slide!.pageData).toBeUndefined()

    // 同时 0 contentKey 命中 ⇒ 所有 element.textContent undefined
    const firstEl = result.slide!.elements[0]! as PPTTextElement
    expect(firstEl.contentKey).toBeUndefined()
    expect(firstEl.textContent).toBeUndefined()
  })
})

describe('D-19 兼容: note-carrier 单行 textContent (mock SVG)', () => {
  it('toc-item-2-note-carrier 单 text — contentKey=directory_item_desc_2 + textContent=mock desc 2', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="toc-item-2-note-carrier" x="100" y="100" font-size="14">mock desc 2</text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const el = elements.find(e => e.id === 'toc-item-2-note-carrier') as PPTTextElement
    expect(el).toBeDefined()
    expect(el.contentKey).toBe('directory_item_desc_2')
    expect(el.textContent).toBe('mock desc 2')
  })
})

describe('CK-16 mirror: cover-title-carrier PPTTextElement 命中并写入 textContent (mock SVG)', () => {
  it('cover-title-carrier PPTTextElement 同时拿到 contentKey === cover_title 与 textContent', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <text id="cover-title-carrier" x="100" y="100" font-size="20">生命体征监测</text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)

    const el = elements.find(e => e.id === 'cover-title-carrier') as PPTTextElement
    expect(el).toBeDefined()
    expect(el.type).toBe('text')
    expect(el.contentKey).toBe('cover_title')
    expect(el.textContent).toBe('生命体征监测')
  })
})
