import { describe, it, expect } from 'vitest'
import { transformElement } from '../src/transformer/transform-to-pptel'
import type { SvgElement } from '../src/types/ast'

function makeRect(attrs: Record<string, string>): SvgElement {
  return {
    type: 'rect',
    attrs: attrs,
    children: [],
  }
}

describe('SHPE-01 rx/ry rounded corners', () => {
  it('generates arc commands for rx/ry', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '10', ry: '10' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.path).toMatch(/A 10,10/)
  })

  it('uses sharp corners when rx=0', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '0', ry: '10' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.path).not.toMatch(/A/)
  })

  it('uses sharp corners when ry=0', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '10', ry: '0' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.path).not.toMatch(/A/)
  })

  it('clamps rx/ry to half of min dimension', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '60', ry: '50' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    // max allowed = min(100, 80) / 2 = 40
    expect(result.path).toMatch(/A 40,40/)
  })

  it('sweep-flag = 1 produces clockwise arcs', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '10', ry: '10' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    // sweep-flag 1 appears after large-arc-flag (0) as "0,1"
    expect(result.path).toMatch(/A \d+,\d+ 0 0,1/)
  })

  it('path ends with Z (closed)', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '10', ry: '10' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.path).toMatch(/Z$/)
  })

  it('rx only uses rx value for both axes', async () => {
    const el = makeRect({ width: '100', height: '80', rx: '15' })
    const result = await transformElement(el, [0, 0, 100, 100], 0) as any
    expect(result.path).toMatch(/A 15,15/)
  })
})
