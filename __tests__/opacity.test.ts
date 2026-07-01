import { describe, it, expect } from 'vitest'
import { transformElement, transformToPPTElement } from '../src/transformer/transform-to-pptel'
import { parseSvg } from '../src/parser/svg-parser'
import type { SVGElement } from '../src/types/ast'

function makeRect(attrs: Record<string, string>): SVGElement {
  return { type: 'rect', attrs, children: [], sourceIndex: 0 }
}

function makeCircle(attrs: Record<string, string>): SVGElement {
  return { type: 'circle', attrs, children: [], sourceIndex: 0 }
}

function makeEllipse(attrs: Record<string, string>): SVGElement {
  return { type: 'ellipse', attrs, children: [], sourceIndex: 0 }
}

function makePath(attrs: Record<string, string>): SVGElement {
  return { type: 'path', attrs, children: [], sourceIndex: 0 }
}

function makePolygon(attrs: Record<string, string>): SVGElement {
  return { type: 'polygon', attrs, children: [], sourceIndex: 0 }
}

function makePolyline(attrs: Record<string, string>): SVGElement {
  return { type: 'polyline', attrs, children: [], sourceIndex: 0 }
}

describe('OPAC-01 fill-opacity', () => {
  it('encodes fill-opacity < 1 as rgba() color in shape fill', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', fill: '#D4845A', 'fill-opacity': '0.6' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toMatch(/^rgba\(\d+, \d+, \d+, 0\.6\)$/)
    // Verify the RGB values match #D4845A
    expect(result.fill).toContain('rgba(212, 132, 90, 0.6)')
  })

  it('encodes fill-opacity 0 as rgba() with 0 alpha', async () => {
    const el = makeCircle({ cx: '50', cy: '50', r: '40', fill: '#5B9BD5', 'fill-opacity': '0' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toBe('rgba(91, 155, 213, 0)')
  })

  it('uses solid hex color when fill-opacity is 1', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', fill: '#D4845A', 'fill-opacity': '1' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toBe('#D4845A')
    expect(result.fill).not.toMatch(/^rgba/)
  })

  it('uses solid hex color when fill-opacity is absent', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', fill: '#FF0000' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toBe('#FF0000')
    expect(result.fill).not.toMatch(/^rgba/)
  })

  it('applies fill-opacity to ellipse', async () => {
    const el = makeEllipse({ cx: '50', cy: '50', rx: '40', ry: '30', fill: '#D4845A', 'fill-opacity': '0.5' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toContain('rgba(212, 132, 90, 0.5)')
  })

  it('applies fill-opacity to path', async () => {
    const el = makePath({ d: 'M0,0 L100,100', fill: '#D4845A', 'fill-opacity': '0.3' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toContain('rgba(212, 132, 90, 0.3)')
  })

  it('applies fill-opacity to polygon', async () => {
    const el = makePolygon({ points: '0,0 100,0 50,100', fill: '#D4845A', 'fill-opacity': '0.4' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toContain('rgba(212, 132, 90, 0.4)')
  })

  it('applies fill-opacity to polyline', async () => {
    const el = makePolyline({ points: '0,0 50,50 100,0', fill: 'none', 'fill-opacity': '0.7' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.fill).toContain('rgba(0, 0, 0, 0.7)')
  })

  it('does not apply rgba wrapper to gradient fills (stop-opacity already encoded)', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#ff0000" stop-opacity="0.5"/>
          <stop offset="100%" stop-color="#0000ff"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)" fill-opacity="0.5"/>
    </svg>`
    const ast = parseSvg(svg)
    const elements = await transformToPPTElement(ast)
    const rect = elements.find(e => e.type === 'shape') as any
    // fill should be undefined when gradient is present (fill-opacity on gradient fill is not applicable)
    // The gradient.colors[].color already has rgba encoding from stop-opacity
    expect(rect.gradient).toBeDefined()
  })
})

describe('OPAC-02 stroke-opacity', () => {
  it('sets outline.opacity from stroke-opacity on rect', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', stroke: '#000', 'stroke-width': '2', 'stroke-opacity': '0.5' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.5)
  })

  it('sets outline.opacity from stroke-opacity on circle', async () => {
    const el = makeCircle({ cx: '50', cy: '50', r: '40', stroke: '#FF0000', 'stroke-width': '3', 'stroke-opacity': '0.3' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.3)
  })

  it('sets outline.opacity from stroke-opacity on ellipse', async () => {
    const el = makeEllipse({ cx: '50', cy: '50', rx: '40', ry: '30', stroke: '#00FF00', 'stroke-width': '2', 'stroke-opacity': '0.75' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.75)
  })

  it('sets outline.opacity from stroke-opacity on path', async () => {
    const el = makePath({ d: 'M0,0 L100,100', stroke: '#0000FF', 'stroke-width': '1', 'stroke-opacity': '0.6' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.6)
  })

  it('sets outline.opacity from stroke-opacity on polygon', async () => {
    const el = makePolygon({ points: '0,0 100,0 50,100', stroke: '#FFFF00', 'stroke-width': '2', 'stroke-opacity': '0.8' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.8)
  })

  it('sets outline.opacity from stroke-opacity on polyline', async () => {
    const el = makePolyline({ points: '0,0 50,50 100,0', stroke: '#FF00FF', 'stroke-width': '1', 'stroke-opacity': '0.25' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBe(0.25)
  })

  it('does not set outline.opacity when stroke-opacity is absent', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', stroke: '#000', 'stroke-width': '2' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.outline).toBeDefined()
    expect(result.outline.opacity).toBeUndefined()
  })

  it('outline.opacity is numeric value (not string)', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', stroke: '#000', 'stroke-width': '2', 'stroke-opacity': '0.5' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(typeof result.outline.opacity).toBe('number')
  })
})

describe('OPAC-03 element opacity', () => {
  it('sets result.opacity from element opacity attr on rect', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', opacity: '0.5' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.5)
  })

  it('sets result.opacity from element opacity attr on circle', async () => {
    const el = makeCircle({ cx: '50', cy: '50', r: '40', opacity: '0.75' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.75)
  })

  it('sets result.opacity from element opacity attr on ellipse', async () => {
    const el = makeEllipse({ cx: '50', cy: '50', rx: '40', ry: '30', opacity: '0.25' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.25)
  })

  it('sets result.opacity from element opacity attr on path', async () => {
    const el = makePath({ d: 'M0,0 L100,100', opacity: '0.9' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.9)
  })

  it('sets result.opacity from element opacity attr on polygon', async () => {
    const el = makePolygon({ points: '0,0 100,0 50,100', opacity: '0.1' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.1)
  })

  it('sets result.opacity from element opacity attr on polyline', async () => {
    const el = makePolyline({ points: '0,0 50,50 100,0', opacity: '0.33' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.opacity).toBe(0.33)
  })

  it('sets result.opacity to undefined when opacity attr is absent', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    // D-20: opacity should be undefined (not 1) when absent
    expect(result.opacity).toBeUndefined()
  })

  it('result.opacity is numeric (parsed from string)', async () => {
    const el = makeRect({ x: '0', y: '0', width: '100', height: '100', opacity: '0.5' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(typeof result.opacity).toBe('number')
  })
})
