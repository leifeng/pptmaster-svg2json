import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

function makeLine(attrs: Record<string, string>): SvgElement {
  return {
    type: 'line',
    attrs: { ...attrs },
    children: [],
  }
}

describe('LINE-01 stroke-width to width mapping', () => {
  it('maps stroke-width to line width', () => {
    const el = makeLine({ x1: '0', y1: '0', x2: '100', y2: '0', 'stroke-width': '3' })
    const result = transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.width).toBe(3)
  })

  it('defaults width to 1 when stroke-width absent', () => {
    const el = makeLine({ x1: '0', y1: '0', x2: '100', y2: '0' })
    const result = transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.width).toBe(1)
  })

  it('defaults width to 1 when stroke-width is 0', () => {
    const el = makeLine({ x1: '0', y1: '0', x2: '100', y2: '0', 'stroke-width': '0' })
    const result = transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.width).toBe(1)
  })

  it('maps decimal stroke-width values', () => {
    const el = makeLine({ x1: '0', y1: '0', x2: '100', y2: '0', 'stroke-width': '2.5' })
    const result = transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.width).toBe(2.5)
  })
})
