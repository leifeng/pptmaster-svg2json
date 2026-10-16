import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformToPPTElement } from '../src/transformer/transform-to-pptel'
import type { PPTShapeElement, PPTImageElement, PPTTextElement, PPTElement } from '../src/slides'

describe('TPL-MARK-01 element id contains -template marks templateType=1', () => {
  it('marks <rect id="*-template"> with templateType=1', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect id="backdrop-template" width="100" height="100"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect).toBeDefined()
    expect(rect.templateType).toBe(1)
  })
})

describe('TPL-MARK-02 group ancestor id propagates templateType', () => {
  it('marks rect under <g id="*-template"> with templateType=1', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <g id="card-template">
        <rect width="50" height="50"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect).toBeDefined()
    expect(rect.templateType).toBe(1)
  })
})

describe('TPL-MARK-03 content-object-slot-template exception', () => {
  it('does not mark rect under <g id="content-object-slot-template"> with templateType', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g id="content-object-slot-template" data-pptx-bounds="98 180 1084 404">
        <rect width="50" height="50"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect).toBeDefined()
    expect(rect.templateType).toBeUndefined()
  })

  it('does not mark top-level element whose id === content-object-slot-template', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect id="content-object-slot-template" width="10" height="10"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const rect = elements.find(e => e.type === 'shape') as PPTShapeElement
    expect(rect).toBeDefined()
    expect(rect.templateType).toBeUndefined()
  })
})

describe('TPL-MARK-05 multiline text propagation', () => {
  it('marks each multiline text line with templateType=1', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <text id="title-template" x="10" y="30" font-size="14">
        <tspan x="10" dy="1em">A</tspan>
        <tspan x="10" dy="1em">B</tspan>
      </text>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const texts = elements.filter(e => e.type === 'text') as PPTTextElement[]
    expect(texts.length).toBeGreaterThanOrEqual(2)
    expect(texts.every(t => t.templateType === 1)).toBe(true)
  })
})

describe('TPL-NONREN-01 non-renderable elements are skipped', () => {
  it('skips <defs>/<linearGradient> and never carries templateType', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad-template">
          <stop offset="0" stop-color="#fff"/>
        </linearGradient>
      </defs>
      <rect width="10" height="10"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    expect(elements.length).toBe(1)
    expect(elements[0].templateType).toBeUndefined()
  })
})

describe('TPL-E2E-02 reverse assertion: templateType is 1 or undefined only', () => {
  it('only emits 1 or undefined across mixed content', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <rect id="a-template" width="10" height="10"/>
      <g id="b-template">
        <rect width="10" height="10"/>
      </g>
      <rect id="c-plain" width="10" height="10"/>
      <g id="content-object-slot-template" data-pptx-bounds="0 0 100 100">
        <rect width="10" height="10"/>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    expect(elements.length).toBeGreaterThanOrEqual(3)
    expect(elements.every(e => e.templateType === 1 || e.templateType === undefined)).toBe(true)
    expect(elements.every(e => e.templateType !== null && e.templateType !== true && e.templateType !== '1' && e.templateType !== 2)).toBe(true)
  })
})

describe('TPL-CB-01 contentBounds extraction from data-pptx-bounds', () => {
  it('writes slide.contentBounds from data-pptx-bounds on content-object-slot-template', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g id="content-object-slot-template" data-pptx-bounds="98 180 1084 404"/>
    </svg>`
    const { convert } = await import('../src/index')
    const result = await convert(svg)
    expect(result.success).toBe(true)
    expect(result.slide).toBeDefined()
    expect(result.slide!.contentBounds).toEqual({ x: 98, y: 180, width: 1084, height: 404 })
  })
})

describe('TPL-CB-02 only the first content-object-slot-template wins', () => {
  it('takes first match (depth-first), ignores second', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g id="content-object-slot-template" data-pptx-bounds="10 10 100 100"/>
      <g id="content-object-slot-template" data-pptx-bounds="20 20 200 200"/>
    </svg>`
    const { convert } = await import('../src/index')
    const result = await convert(svg)
    expect(result.slide!.contentBounds).toEqual({ x: 10, y: 10, width: 100, height: 100 })
  })
})

describe('TPL-CB-03 contentBounds field is omitted when slot is missing/malformed', () => {
  it('omits contentBounds when no slot element present', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <rect width="100" height="100"/>
    </svg>`
    const { convert } = await import('../src/index')
    const result = await convert(svg)
    expect(result.slide!.contentBounds).toBeUndefined()
    // TPL-CB-03: field does not appear in JSON output
    const slideKeys = Object.keys(result.slide as object)
    expect(slideKeys).not.toContain('contentBounds')
  })

  it('omits contentBounds when data-pptx-bounds has fewer than 4 numbers', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g id="content-object-slot-template" data-pptx-bounds="98 180 1084"/>
    </svg>`
    const { convert } = await import('../src/index')
    const result = await convert(svg)
    expect(result.slide!.contentBounds).toBeUndefined()
  })

  it('omits contentBounds when data-pptx-bounds contains non-numeric tokens', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <g id="content-object-slot-template" data-pptx-bounds="abc 180 1084 404"/>
    </svg>`
    const { convert } = await import('../src/index')
    const result = await convert(svg)
    expect(result.slide!.contentBounds).toBeUndefined()
  })
})

describe('TPL-MARK-02 single-line text inside <g id="*-template">', () => {
  it('marks single-line text in template group with templateType=1 (regression for -16-01 missing injection)', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <g id="cover-title-slot-template">
        <text id="cover-title-carrier" x="100" y="50" font-size="14" text-anchor="middle">{{TITLE}}</text>
      </g>
    </svg>`
    const result = parseSvg(svg)
    const elements = await transformToPPTElement(result)
    const t = elements.find(e => e.type === 'text') as PPTTextElement
    expect(t).toBeDefined()
    expect(t.groupId).toBe('cover-title-slot-template')
    expect(t.templateType).toBe(1)
  })
})
