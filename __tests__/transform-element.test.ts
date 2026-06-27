import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SVGElement } from '../src/types/ast'

function makeRect(attrs: Record<string, string>): SVGElement {
  return { type: 'rect', attrs, children: [], sourceIndex: 0 }
}

describe('transformElement - rotate/flip (TRANS-03)', () => {
  it('sets rotate on PPTElement for rotate(deg) without center', () => {
    const el = makeRect({ x: '50', y: '50', width: '100', height: '100', transform: 'rotate(30)' })
    const result = transformElement(el, [0, 0, 200, 200], 0, [1000, 562.5])
    expect(result?.rotate).toBe(30)
  })

  it('sets flipH for scale(-1, 1)', () => {
    const el = makeRect({ x: '10', y: '10', width: '50', height: '50', transform: 'scale(-1, 1)' })
    const result = transformElement(el, [0, 0, 200, 200], 0, [1000, 562.5])
    expect(result?.flipH).toBe(true)
  })

  it('sets flipV for scale(1, -1)', () => {
    const el = makeRect({ x: '10', y: '10', width: '50', height: '50', transform: 'scale(1, -1)' })
    const result = transformElement(el, [0, 0, 200, 200], 0, [1000, 562.5])
    expect(result?.flipV).toBe(true)
  })

  it('does not set flipH/flipV for positive scale', () => {
    const el = makeRect({ x: '10', y: '10', width: '50', height: '50', transform: 'scale(2)' })
    const result = transformElement(el, [0, 0, 200, 200], 0, [1000, 562.5])
    expect(result?.flipH).toBeUndefined()
    expect(result?.flipV).toBeUndefined()
  })
})
