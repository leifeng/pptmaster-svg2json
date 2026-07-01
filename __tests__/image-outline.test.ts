import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'
import type { PPTImageElement } from '../src/slides'

function makeImage(attrs: Record<string, string>): SvgElement {
  return {
    type: 'image',
    attrs: { ...attrs },
    children: [],
  }
}

describe('IMGE-01 image outline from stroke', () => {
  it('maps stroke to outline color and width', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: '#000000', 'stroke-width': '2' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeDefined()
    expect(result.outline!.color).toBe('#000000')
    expect(result.outline!.width).toBe(2)
  })

  it('produces no outline when stroke absent', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeUndefined()
  })

  it('defaults outline width to 1 when stroke present but stroke-width absent', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: '#FF0000' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeDefined()
    expect(result.outline!.width).toBe(1)
    expect(result.outline!.color).toBe('#FF0000')
  })

  it('produces no outline when stroke-width is 0', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: '#000000', 'stroke-width': '0' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeUndefined()
  })

  it('maps named color stroke to hex outline color', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: 'red', 'stroke-width': '3' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeDefined()
    expect(result.outline!.color.toLowerCase()).toBe('#ff0000')
    expect(result.outline!.width).toBe(3)
  })

  it('handles stroke with rgb color format', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: 'rgb(128, 0, 255)', 'stroke-width': '2' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(result.outline).toBeDefined()
    expect(result.outline!.color.toLowerCase()).toBe('#8000ff')
    expect(result.outline!.width).toBe(2)
  })

  it('outline color and width are correctly typed', async () => {
    const el = makeImage({ href: 'test.png', width: '100', height: '100', stroke: '#ABCDEF', 'stroke-width': '4' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as PPTImageElement
    expect(typeof result.outline!.color).toBe('string')
    expect(typeof result.outline!.width).toBe('number')
  })
})
