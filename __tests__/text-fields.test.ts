import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

async function makeText(attrs: Record<string, string> = {}): Promise<ReturnType<typeof transformElement>> {
  const el: SvgElement = { type: 'text', attrs, children: [], sourceIndex: 0 }
  return transformElement(el, [0, 0, 1000, 562.5], 0, [1000, 562.5])
}

describe('text-fields (TEXT-03, TEXT-04, TEXT-05, TEXT-07, TEXT-08, TEXT-09)', () => {
  it('output contains defaultColor field (TEXT-03)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('defaultColor')
  })

  it('output contains outline field when stroke is set (TEXT-04)', async () => {
    const result = await makeText({ stroke: '#ff0000', x: '0', y: '0' })
    expect(result).toHaveProperty('outline')
  })

  it('output does not contain outline field when stroke is absent (TEXT-04)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).not.toHaveProperty('outline')
  })

  it('output contains shadow field (TEXT-05)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('shadow')
  })

  it('output contains vAlign field (TEXT-07)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('vAlign')
  })

  it('output contains fixedHeight field (TEXT-07)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('fixedHeight')
  })

  it('output contains wordSpace field with default 0 (TEXT-07)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('wordSpace')
    expect(result.wordSpace).toBe(0)
  })

  it('output contains paragraphSpace field with default 5 (TEXT-08)', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result).toHaveProperty('paragraphSpace')
    expect(result.paragraphSpace).toBe(5)
  })

  it('fill-opacity < 1 produces rgba() in span style (TEXT-09)', async () => {
    const result = await makeText({ fill: '#ff0000', 'fill-opacity': '0.5', x: '0', y: '0' })
    expect(result?.content).toMatch(/rgba?\(/)
  })

  it('fill-opacity = 1 does not produce rgba() (TEXT-09)', async () => {
    const result = await makeText({ fill: '#ff0000', 'fill-opacity': '1', x: '0', y: '0' })
    expect(result?.content).not.toMatch(/rgba?\(/)
  })
})
