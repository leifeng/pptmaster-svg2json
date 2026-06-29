import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

function makeText(attrs: Record<string, string> = {}): ReturnType<typeof transformElement> {
  const el: SvgElement = { type: 'text', attrs, children: [], sourceIndex: 0 }
  return transformElement(el, [0, 0, 1000, 562.5], 0, [1000, 562.5])
}

describe('text-fields (TEXT-03, TEXT-04, TEXT-05, TEXT-07, TEXT-08, TEXT-09)', () => {
  it('output contains fill field (TEXT-03)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('fill')
  })

  it('output contains outline field (TEXT-04)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('outline')
  })

  it('output contains shadow field (TEXT-05)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('shadow')
  })

  it('output contains vAlign field (TEXT-07)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('vAlign')
  })

  it('output contains fixedHeight field (TEXT-07)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('fixedHeight')
  })

  it('output contains wordSpace field with default 0 (TEXT-07)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('wordSpace')
    expect(result.wordSpace).toBe(0)
  })

  it('output contains paragraphSpace field with default 5 (TEXT-08)', () => {
    const result = makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('paragraphSpace')
    expect(result.paragraphSpace).toBe(5)
  })

  it('fill-opacity < 1 produces rgba() in span style (TEXT-09)', () => {
    const result = makeText({ fill: '#ff0000', 'fill-opacity': '0.5', x: '0', y: '0' })
    expect(result?.content).toMatch(/rgba?\(/)
  })

  it('fill-opacity = 1 does not produce rgba() (TEXT-09)', () => {
    const result = makeText({ fill: '#ff0000', 'fill-opacity': '1', x: '0', y: '0' })
    expect(result?.content).not.toMatch(/rgba?\(/)
  })
})