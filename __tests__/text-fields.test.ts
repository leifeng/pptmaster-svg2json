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

describe('p font-size (small-font-top-offset)', () => {
  it('single-line <p> has font-size matching scaledFontSize (覆盖 PPTist .ProseMirror-static 默认 16px)', async () => {
    const result = await makeText({ 'font-size': '11', x: '0', y: '0' }) as { content: string } | null
    expect(result).not.toBeNull()
    // SVG fontSize=11, viewBox=0 0 1000 562.5 → scaleY=562.5/562.5=1.0 (because targetCanvas=1000x562.5)
    // scaledFontSize = 11 * 1 = 11
    expect(result!.content).toMatch(/^<p style="font-size: 11px/)
  })

  it('multiline <p> (per tspan) has font-size matching scaledFontSize', async () => {
    const el: SvgElement = {
      type: 'text',
      attrs: { 'font-size': '11', x: '0', y: '0' },
      children: [
        { type: 'tspan', attrs: { x: '0', dy: '0' }, children: [], text: 'L1', sourceIndex: 0 },
        { type: 'tspan', attrs: { x: '0', dy: '12' }, children: [], text: 'L2', sourceIndex: 1 },
      ],
      sourceIndex: 0,
    }
    const result = await transformElement(el, [0, 0, 1000, 562.5], 0, [1000, 562.5]) as { content: string }[] | null
    expect(result).not.toBeNull()
    expect(Array.isArray(result)).toBe(true)
    expect((result as unknown as { content: string }[]).length).toBe(2)
    for (const r of (result as unknown as { content: string }[])) {
      expect(r.content).toMatch(/^<p style="font-size: 11px/)
    }
  })

  it('不同 SVG fontSize 时 <p> 的 font-size 与 scaledFontSize 一致', async () => {
    // For SVG with target canvas 1000x562.5 (same ratio), scaleY = 1
    const r11 = await makeText({ 'font-size': '11', x: '0', y: '0' }) as { content: string } | null
    const r60 = await makeText({ 'font-size': '60', x: '0', y: '0' }) as { content: string } | null
    expect(r11!.content).toContain('font-size: 11px')
    expect(r60!.content).toContain('font-size: 60px')
  })
})
