import { describe, it, expect } from 'vitest'
import { applyRotateWithCenter, getRotateDeg, getFlipFromScale } from '../src/transformer/apply-transform'
import type { TransformResult } from '../src/types/ast'

describe('applyRotateWithCenter', () => {
  it('rotates 90 degrees around center correctly', () => {
    // (0, 0) rotated 90 deg around (100, 100) should be (200, 0)
    const result = applyRotateWithCenter(0, 0, 90, 100, 100)
    expect(result.x).toBeCloseTo(200, 2)
    expect(result.y).toBeCloseTo(0, 2)
  })

  it('rotates 45 degrees around center correctly', () => {
    const result = applyRotateWithCenter(0, 0, 45, 100, 100)
    // Expected: px=-100, py=-100; rx=0, ry=-141.42; final_x=100, final_y=-41.42
    expect(result.x).toBeCloseTo(100, 2)
    expect(result.y).toBeCloseTo(-41.42, 2)
  })

  it('rotates in place when point equals center', () => {
    const result = applyRotateWithCenter(100, 100, 45, 100, 100)
    expect(result.x).toBeCloseTo(100, 2)
    expect(result.y).toBeCloseTo(100, 2)
  })

  it('handles 180 degree rotation', () => {
    const result = applyRotateWithCenter(50, 50, 180, 100, 100)
    expect(result.x).toBeCloseTo(150, 2)
    expect(result.y).toBeCloseTo(150, 2)
  })
})

describe('getRotateDeg', () => {
  it('returns rotateDeg from transform', () => {
    const transform: TransformResult = { rotateDeg: 45 }
    expect(getRotateDeg(transform)).toBe(45)
  })

  it('returns 0 when rotateDeg undefined', () => {
    const transform: TransformResult = {}
    expect(getRotateDeg(transform)).toBe(0)
  })
})

describe('getFlipFromScale', () => {
  it('returns flipH when scaleX < 0', () => {
    const transform: TransformResult = { scaleX: -1, scaleY: 1 }
    expect(getFlipFromScale(transform)).toEqual({ flipH: true })
  })

  it('returns flipV when scaleY < 0', () => {
    const transform: TransformResult = { scaleX: 1, scaleY: -1 }
    expect(getFlipFromScale(transform)).toEqual({ flipV: true })
  })

  it('returns both flipH and flipV when both negative', () => {
    const transform: TransformResult = { scaleX: -1, scaleY: -1 }
    expect(getFlipFromScale(transform)).toEqual({ flipH: true, flipV: true })
  })

  it('returns empty object when no negative scale', () => {
    const transform: TransformResult = { scaleX: 2, scaleY: 3 }
    expect(getFlipFromScale(transform)).toEqual({})
  })
})
