import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

async function makeText(attrs: Record<string, string>): Promise<ReturnType<typeof transformElement>> {
  const el: SvgElement = { type: 'text', attrs, children: [], sourceIndex: 0 }
  return transformElement(el, [0, 0, 1000, 562.5], 0, [1000, 562.5])
}

describe('font-weight → strong mark (TEXT-02)', () => {
  it('generates <strong> tag for font-weight="bold"', async () => {
    const result = await makeText({ 'font-weight': 'bold', x: '0', y: '0' })
    expect(result?.content).toContain('<strong>')
  })

  it('generates <strong> tag for font-weight="600"', async () => {
    const result = await makeText({ 'font-weight': '600', x: '0', y: '0' })
    expect(result?.content).toContain('<strong>')
  })

  it('generates <strong> tag for font-weight="700"', async () => {
    const result = await makeText({ 'font-weight': '700', x: '0', y: '0' })
    expect(result?.content).toContain('<strong>')
  })

  it('does not generate <strong> for font-weight="normal"', async () => {
    const result = await makeText({ 'font-weight': 'normal', x: '0', y: '0' })
    expect(result?.content).not.toContain('<strong>')
  })

  it('does not generate <strong> for font-weight="400"', async () => {
    const result = await makeText({ 'font-weight': '400', x: '0', y: '0' })
    expect(result?.content).not.toContain('<strong>')
  })
})

describe('font-style → em mark (TEXT-02)', () => {
  it('generates <em> tag for font-style="italic"', async () => {
    const result = await makeText({ 'font-style': 'italic', x: '0', y: '0' })
    expect(result?.content).toContain('<em>')
  })

  it('does not generate <em> for font-style="normal"', async () => {
    const result = await makeText({ 'font-style': 'normal', x: '0', y: '0' })
    expect(result?.content).not.toContain('<em>')
  })
})

describe('writing-mode → vertical (TEXT-06)', () => {
  it('sets vertical: true for writing-mode="vertical-rl"', async () => {
    const result = await makeText({ 'writing-mode': 'vertical-rl', x: '0', y: '0' })
    expect(result?.vertical).toBe(true)
  })

  it('sets vertical: true for writing-mode="vertical-lr"', async () => {
    const result = await makeText({ 'writing-mode': 'vertical-lr', x: '0', y: '0' })
    expect(result?.vertical).toBe(true)
  })

  it('sets vertical: false for writing-mode="horizontal-tb"', async () => {
    const result = await makeText({ 'writing-mode': 'horizontal-tb', x: '0', y: '0' })
    expect(result?.vertical).toBe(false)
  })

  it('sets vertical: false when writing-mode is absent', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result?.vertical).toBe(false)
  })
})
