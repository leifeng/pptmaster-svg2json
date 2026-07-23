import { describe, expect, it, beforeEach, vi } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import { TEXT_WIDTH_SAFETY_MARGIN } from '../src/constants'
import type { SvgElement } from '../src/types/ast'

const { measureTextElement } = vi.hoisted(() => ({
  measureTextElement: vi.fn(),
}))

vi.mock('../src/text-measurer', () => ({
  measureTextElement,
}))

function makeText(attrs: Record<string, string>): SvgElement {
  return {
    type: 'text',
    attrs,
    children: [],
  }
}

describe('text width/height passthrough (TEXT-WHPASS)', () => {
  beforeEach(() => {
    measureTextElement.mockReset()
    measureTextElement.mockResolvedValue({ width: 30, height: 10, y: 2 })
  })

  it('uses declared width and height without measuring text', async () => {
    const result = await transformElement(
      makeText({ x: '20', y: '30', width: '100', height: '40', 'font-size': '16' }),
      [0, 0, 200, 100],
      0,
      [1000, 500],
    ) as { type: string; width: number; height: number; fixedHeight: boolean } | null

    expect(result).not.toBeNull()
    expect(result?.type).toBe('text')
    expect(result?.width).toBe(100 * 5 + TEXT_WIDTH_SAFETY_MARGIN)
    expect(result?.height).toBe(40 * 5)
    expect(result?.fixedHeight).toBe(true)
    expect(measureTextElement).not.toHaveBeenCalled()
  })

  it.each([
    ['only width', { width: '100' }],
    ['only height', { height: '40' }],
    ['negative width', { width: '-100', height: '40' }],
    ['non-numeric width', { width: 'auto', height: '40' }],
  ])('falls back to text measurement for %s', async (_caseName, dimensions) => {
    const result = await transformElement(
      makeText({ x: '20', y: '30', 'font-size': '16', ...dimensions }),
      [0, 0, 200, 100],
      0,
      [1000, 500],
    )

    expect(result).not.toBeNull()
    expect(measureTextElement).toHaveBeenCalledTimes(1)
  })
})
