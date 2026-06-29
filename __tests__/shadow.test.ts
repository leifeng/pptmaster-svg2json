import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformElement, transformToPPTElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'
import type { PPTShapeElement, PPTImageElement } from '../src/slides'

describe('SHPE-03 shadow on shapes', () => {
  it('maps feDropShadow dx/dy to shadow h/v', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="shadow1">
          <feDropShadow dx="2" dy="3" stdDeviation="4" flood-color="#000000"/>
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#shadow1)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.h).toBe(2)
    expect(result.shadow!.v).toBe(3)
  })

  it('maps stdDeviation to shadow blur', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="shadow1">
          <feDropShadow dx="2" dy="3" stdDeviation="5" flood-color="#000000"/>
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#shadow1)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.blur).toBe(5)
  })

  it('maps flood-color to shadow color', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="shadow1">
          <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#FF0000"/>
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#shadow1)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.color).toBe('#FF0000')
  })

  it('sets shadow on circle element', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="circleShadow">
          <feDropShadow dx="1" dy="2" stdDeviation="3" flood-color="#333333"/>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="40" filter="url(#circleShadow)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const circle = parsed.root.children.find(e => e.type === 'circle')!
    const result = transformElement(circle, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.h).toBe(1)
    expect(result.shadow!.v).toBe(2)
    expect(result.shadow!.blur).toBe(3)
    expect(result.shadow!.color).toBe('#333333')
  })

  it('sets shadow on ellipse element', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="ellipseShadow">
          <feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="#0000FF"/>
        </filter>
      </defs>
      <ellipse cx="50" cy="50" rx="40" ry="30" filter="url(#ellipseShadow)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const ellipse = parsed.root.children.find(e => e.type === 'ellipse')!
    const result = transformElement(ellipse, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.color).toBe('#0000FF')
  })

  it('sets shadow on path element', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="pathShadow">
          <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#00FF00"/>
        </filter>
      </defs>
      <path d="M0,0 L100,100" filter="url(#pathShadow)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const path = parsed.root.children.find(e => e.type === 'path')!
    const result = transformElement(path, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.color).toBe('#00FF00')
  })

  it('does not set shadow when filter has no matching def', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" filter="url(#nonexistent)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeUndefined()
  })

  it('does not set shadow when filter attr is absent', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeUndefined()
  })

  it('handles shadow-color as alternative to flood-color', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="shadow1">
          <feDropShadow dx="1" dy="1" stdDeviation="1" shadow-color="#ABCDEF"/>
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#shadow1)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.color).toBe('#ABCDEF')
  })

  it('defaults flood-color to #000000 when not specified', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="shadow1">
          <feDropShadow dx="1" dy="1" stdDeviation="1"/>
        </filter>
      </defs>
      <rect width="100" height="100" filter="url(#shadow1)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const rect = parsed.root.children.find(e => e.type === 'rect')!
    const result = transformElement(rect, [0, 0, 100, 100], 0) as PPTShapeElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.color).toBe('#000000')
  })
})

describe('IMGE-02 shadow on images', () => {
  it('sets shadow on image element', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <filter id="imgShadow">
          <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="#333333"/>
        </filter>
      </defs>
      <image href="test.png" width="100" height="100" filter="url(#imgShadow)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const image = parsed.root.children.find(e => e.type === 'image')!
    const result = transformElement(image, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.shadow).toBeDefined()
    expect(result.shadow!.h).toBe(1)
    expect(result.shadow!.v).toBe(1)
    expect(result.shadow!.blur).toBe(2)
    expect(result.shadow!.color).toBe('#333333')
  })

  it('does not set shadow on image when filter is absent', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <image href="test.png" width="100" height="100"/>
    </svg>`
    const parsed = parseSvg(svg)
    const image = parsed.root.children.find(e => e.type === 'image')!
    const result = transformElement(image, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.shadow).toBeUndefined()
  })

  it('does not set shadow on image when filter has no matching def', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <image href="test.png" width="100" height="100" filter="url(#nonexistent)"/>
    </svg>`
    const parsed = parseSvg(svg)
    const image = parsed.root.children.find(e => e.type === 'image')!
    const result = transformElement(image, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.shadow).toBeUndefined()
  })
})
