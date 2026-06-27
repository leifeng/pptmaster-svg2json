import { describe, it, expect } from 'vitest'
import { parseTransform } from '../src/mapper/coordinate-mapper'

describe('parseTransform', () => {
  it('parses translate(dx, dy)', () => {
    const result = parseTransform('translate(10, 20)')
    expect(result.translateX).toBe(10)
    expect(result.translateY).toBe(20)
  })

  it('parses scale(sx, sy)', () => {
    const result = parseTransform('scale(2, 3)')
    expect(result.scaleX).toBe(2)
    expect(result.scaleY).toBe(3)
  })

  it('parses scale(s) as uniform', () => {
    const result = parseTransform('scale(2)')
    expect(result.scaleX).toBe(2)
    expect(result.scaleY).toBe(2)
  })

  it('parses rotate(deg)', () => {
    const result = parseTransform('rotate(45)')
    expect(result.rotateDeg).toBe(45)
  })

  it('parses rotate(deg, cx, cy) with center', () => {
    const result = parseTransform('rotate(45, 100, 100)')
    expect(result.rotateDeg).toBe(45)
    expect(result.rotateCX).toBe(100)
    expect(result.rotateCY).toBe(100)
  })

  it('parses combined transform string', () => {
    const result = parseTransform('translate(10, 20) scale(2) rotate(45)')
    expect(result.translateX).toBe(10)
    expect(result.translateY).toBe(20)
    expect(result.scaleX).toBe(2)
    expect(result.scaleY).toBe(2)
    expect(result.rotateDeg).toBe(45)
  })

  it('returns defaults for empty input', () => {
    const result = parseTransform('')
    expect(result.translateX).toBe(0)
    expect(result.translateY).toBe(0)
    expect(result.scaleX).toBe(1)
    expect(result.scaleY).toBe(1)
    expect(result.rotateDeg).toBe(0)
  })
})
