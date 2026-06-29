import { describe, it, expect } from 'vitest'
import { parseSvg } from '../src/parser/svg-parser'
import { transformElement, transformToPPTElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

describe('GRAD-01: linearGradient and radialGradient parsing', () => {
  it('parses linearGradient defs into registry', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff0000"/>
          <stop offset="100%" stop-color="#0000ff"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    // The parser should build gradient registry internally
    // After parsing, the rect element should have attrs.gradient resolved
    const elements = result.root.children
    const rect = elements.find(e => e.type === 'rect')
    expect(rect).toBeDefined()
    expect(rect?.attrs.gradient).toBeDefined()
    expect(rect?.attrs.gradient?.type).toBe('linear')
    expect(rect?.attrs.gradient?.colors).toHaveLength(2)
  })

  it('parses radialGradient defs into registry', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="radGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff0000"/>
          <stop offset="100%" stop-color="#0000ff"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#radGrad)"/>
    </svg>`
    const result = parseSvg(svg)
    const elements = result.root.children
    const rect = elements.find(e => e.type === 'rect')
    expect(rect).toBeDefined()
    expect(rect?.attrs.gradient).toBeDefined()
    expect(rect?.attrs.gradient?.type).toBe('radial')
  })

  it('stores gradient defs with id as key', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="myGradient">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#myGradient)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient).toBeDefined()
    expect(rect?.attrs.gradient?.colors).toHaveLength(1)
  })
})

describe('GRAD-02: stop-color and stop-opacity encoding', () => {
  it('encodes stop-color + stop-opacity as rgba() in gradient.colors', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#D4845A" stop-opacity="0.06"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.colors[0].color).toBe('rgba(212, 132, 90, 0.06)')
  })

  it('encodes stop-color + stop-opacity 0 as rgba() with 0 alpha', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#D4845A" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.colors[0].color).toBe('rgba(212, 132, 90, 0)')
  })

  it('preserves multiple stops at same offset', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="dividerGrad">
          <stop offset="30%" stop-color="#D4845A" stop-opacity="0.6"/>
          <stop offset="30%" stop-color="#D4845A" stop-opacity="0.6"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#dividerGrad)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.colors).toHaveLength(2)
    expect(rect?.attrs.gradient?.colors[0].pos).toBe(0.3)
    expect(rect?.attrs.gradient?.colors[1].pos).toBe(0.3)
  })

  it('normalizes offset from percentage to 0-1 range', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="50%" stop-color="#ff0000"/>
          <stop offset="100%" stop-color="#0000ff"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.colors[0].pos).toBe(0.5)
    expect(rect?.attrs.gradient?.colors[1].pos).toBe(1)
  })
})

describe('GRAD-03: fill="url(#id)" resolution', () => {
  it('resolves fill="url(#id)" to attrs.gradient object', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#D4845A" stop-opacity="0.06"/>
          <stop offset="100%" stop-color="#D4845A" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#bgGlow)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient).toBeDefined()
    expect(rect?.attrs.gradient?.type).toBe('radial')
    expect(rect?.attrs.gradient?.colors).toHaveLength(2)
  })

  it('clears attrs.fill after gradient resolution', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    // fill should be cleared since gradient is now in attrs.gradient
    expect(rect?.attrs.fill).toBeUndefined()
  })
})

describe('GRAD-04: gradientTransform rotation extraction', () => {
  it('extracts rotate from gradientTransform="rotate(N)"', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" gradientTransform="rotate(45)">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.rotate).toBe(45)
  })

  it('extracts rotate from gradientTransform="rotate(N, cx, cy)"', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" gradientTransform="rotate(30, 50, 50)">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.rotate).toBe(30)
  })

  it('extracts rotate from gradientTransform="matrix(...)" rotation', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" gradientTransform="matrix(0.707, 0.707, -0.707, 0.707, 0, 0)">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    // matrix(0.707, 0.707, -0.707, 0.707) is a 45-degree rotation
    expect(rect?.attrs.gradient?.rotate).toBeCloseTo(45, 0)
  })

  it('returns rotate 0 for non-rotation gradientTransform', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1" gradientTransform="translate(10, 20)">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const result = parseSvg(svg)
    const rect = result.root.children.find(e => e.type === 'rect')
    expect(rect?.attrs.gradient?.rotate).toBe(0)
  })
})

describe('transform-to-pptel: attrs.gradient output', () => {
  it('outputs attrs.gradient as PPTShapeElement.gradient field', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#ff0000"/>
          <stop offset="100%" stop-color="#0000ff"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const ast = parseSvg(svg)
    const elements = transformToPPTElement(ast)
    const rect = elements.find(e => e.type === 'shape') as any
    expect(rect?.gradient).toBeDefined()
    expect(rect?.gradient?.type).toBe('linear')
    expect(rect?.gradient?.colors).toHaveLength(2)
  })

  it('does not set fill when gradient is present', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="grad1">
          <stop offset="0%" stop-color="#ff0000"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)"/>
    </svg>`
    const ast = parseSvg(svg)
    const elements = transformToPPTElement(ast)
    const rect = elements.find(e => e.type === 'shape') as any
    // fill should not be a hex color when gradient is set
    expect(rect?.fill).toBeUndefined()
    expect(rect?.gradient).toBeDefined()
  })
})
