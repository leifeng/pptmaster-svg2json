import { describe, it, expect } from 'vitest'
import { transformElement, transformToPPTElement } from '../src/transformer/transform-to-pptel'
import { parseSvg } from '../src/parser/svg-parser'
import type { SvgElement } from '../src/types/ast'

async function makeText(attrs: Record<string, string>): Promise<ReturnType<typeof transformElement>> {
  const el: SvgElement = { type: 'text', attrs, children: [], sourceIndex: 0 }
  return transformElement(el, [0, 0, 1000, 562.5], 0, [1000, 562.5])
}

describe('text-anchor 继承 (cover-tags-text-anchor-middle)', () => {
  it('子 text 没有 text-anchor 但父 g 设置了 text-anchor="middle" 时 left 应用 middle 偏移', async () => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
      <g text-anchor="middle">
        <text x="400" y="100" font-size="20">Hello</text>
      </g>
    </svg>`
    const ast = parseSvg(svgString)
    const result = await transformToPPTElement(ast)
    const textElement = result.find(el => el.type === 'text') as { content: string; left: number } | undefined
    expect(textElement).toBeDefined()
    // 1. content has text-align: center (proves inherited text-anchor)
    expect(textElement!.content).toContain('text-align: center')
    // 2. left is less than 400 (proves middle offset transformed.left - textWidth/2)
    expect(textElement!.left).toBeLessThan(400)
  })

  it('子 text 自带 text-anchor="start" 覆盖父 g 的 middle（不被继承）', async () => {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 562.5" width="1000" height="562.5">
      <g text-anchor="middle">
        <text x="400" y="100" text-anchor="start" font-size="20">Hello</text>
      </g>
    </svg>`
    const ast = parseSvg(svgString)
    const result = await transformToPPTElement(ast)
    const textElement = result.find(el => el.type === 'text') as { content: string; left: number } | undefined
    expect(textElement).toBeDefined()
    // child overrides parent — should be left-aligned
    expect(textElement!.content).toContain('text-align: left')
    // And left should be approximately 400 (no -textWidth/2 offset)
    expect(textElement!.left).toBeCloseTo(400, 0)
  })
})

describe('text-anchor → text-align (TEXT-01)', () => {
  it('maps text-anchor="start" to text-align: left', async () => {
    const result = await makeText({ 'text-anchor': 'start', x: '0', y: '0' })
    expect(result?.content).toContain('text-align: left')
  })

  it('maps text-anchor="middle" to text-align: center', async () => {
    const result = await makeText({ 'text-anchor': 'middle', x: '0', y: '0' })
    expect(result?.content).toContain('text-align: center')
  })

  it('maps text-anchor="end" to text-align: right', async () => {
    const result = await makeText({ 'text-anchor': 'end', x: '0', y: '0' })
    expect(result?.content).toContain('text-align: right')
  })

  it('omits text-align when text-anchor is absent', async () => {
    const result = await makeText({ x: '0', y: '0' })
    expect(result?.content).not.toContain('text-align')
  })
})

describe('text-anchor="middle" → top offset (TEXT-02)', () => {
  it('text-anchor="middle" 时 top 比无 text-anchor 的 top 小 10（画布像素）', async () => {
    const baseline = await makeText({ x: '100', y: '200' }) as { top: number } | null
    const middle = await makeText({ 'text-anchor': 'middle', x: '100', y: '200' }) as { top: number } | null
    expect(baseline).not.toBeNull()
    expect(middle).not.toBeNull()
    expect(middle!.top).toBeCloseTo(baseline!.top - 10, 5)
  })

  it('text-anchor="start" 不应用 top 偏移', async () => {
    const baseline = await makeText({ x: '100', y: '200' }) as { top: number } | null
    const start = await makeText({ 'text-anchor': 'start', x: '100', y: '200' }) as { top: number } | null
    expect(baseline).not.toBeNull()
    expect(start).not.toBeNull()
    expect(start!.top).toBeCloseTo(baseline!.top, 5)
  })

  it('text-anchor="end" 不应用 top 偏移', async () => {
    const baseline = await makeText({ x: '100', y: '200' }) as { top: number } | null
    const end = await makeText({ 'text-anchor': 'end', x: '100', y: '200' }) as { top: number } | null
    expect(baseline).not.toBeNull()
    expect(end).not.toBeNull()
    expect(end!.top).toBeCloseTo(baseline!.top, 5)
  })
})
