import { describe, it, expect } from 'vitest'
import {
  shouldMerge,
  mergePaths,
  extractCommonStyle,
  boxesOverlap,
  createMergedShapeElement,
} from '../src/merger/path-merge'
import type { SvgElement } from '../src/types/ast'

function createMockPath(d: string, attrs: Record<string, string | undefined> = {}): SvgElement {
  return { type: 'path', attrs: { d, ...attrs } as Record<string, string | number | undefined>, children: [] }
}

describe('path-merge', () => {
  describe('extractCommonStyle', () => {
    it('returns null for empty array', () => {
      expect(extractCommonStyle([])).toBeNull()
    })

    it('returns null when no shared styles', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000' })
      const path2 = createMockPath('M10 10', { fill: '#00ff00' })
      expect(extractCommonStyle([path1, path2])).toBeNull()
    })

    it('returns common fill when all paths have same fill', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000' })
      const path2 = createMockPath('M10 10', { fill: '#ff0000' })
      const result = extractCommonStyle([path1, path2])
      expect(result).not.toBeNull()
      expect(result?.fill).toBe('#ff0000')
    })

    it('returns multiple common styles (fill + stroke + opacity)', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000', stroke: '#000000', opacity: '0.5' })
      const path2 = createMockPath('M10 10', { fill: '#ff0000', stroke: '#000000', opacity: '0.5' })
      const result = extractCommonStyle([path1, path2])
      expect(result).not.toBeNull()
      expect(result?.fill).toBe('#ff0000')
      expect(result?.stroke).toBe('#000000')
      expect(result?.opacity).toBe('0.5')
    })

    it('ignores undefined values', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000', stroke: undefined })
      const path2 = createMockPath('M10 10', { fill: '#ff0000', stroke: undefined })
      const result = extractCommonStyle([path1, path2])
      expect(result).not.toBeNull()
      expect(result?.fill).toBe('#ff0000')
      expect(result?.stroke).toBeUndefined()
    })

    it('returns null when only 1 of 3 paths has a style', () => {
      const path1 = createMockPath('M0 0', { fill: undefined })
      const path2 = createMockPath('M10 10', { fill: '#00ff00' })
      const path3 = createMockPath('M20 20', { fill: '#00ff00' })
      expect(extractCommonStyle([path1, path2, path3])).toBeNull()
    })
  })

  describe('boxesOverlap', () => {
    it('returns false for non-overlapping boxes (side by side)', () => {
      const a = { left: 0, top: 0, width: 10, height: 10 }
      const b = { left: 20, top: 0, width: 10, height: 10 }
      expect(boxesOverlap(a, b)).toBe(false)
    })

    it('returns false for non-overlapping boxes (one above other)', () => {
      const a = { left: 0, top: 0, width: 10, height: 10 }
      const b = { left: 0, top: 20, width: 10, height: 10 }
      expect(boxesOverlap(a, b)).toBe(false)
    })

    it('returns true for overlapping boxes', () => {
      const a = { left: 0, top: 0, width: 10, height: 10 }
      const b = { left: 5, top: 5, width: 10, height: 10 }
      expect(boxesOverlap(a, b)).toBe(true)
    })

    it('returns true for contained boxes', () => {
      const a = { left: 0, top: 0, width: 20, height: 20 }
      const b = { left: 5, top: 5, width: 10, height: 10 }
      expect(boxesOverlap(a, b)).toBe(true)
    })

    it('returns true for identical boxes', () => {
      const a = { left: 0, top: 0, width: 10, height: 10 }
      const b = { left: 0, top: 0, width: 10, height: 10 }
      expect(boxesOverlap(a, b)).toBe(true)
    })
  })

  describe('shouldMerge', () => {
    it('returns no-merge when paths have different fills', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000' })
      const path2 = createMockPath('M10 10', { fill: '#00ff00' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('no-merge')
    })

    it('returns no-merge when any path has id attribute', () => {
      const path1 = createMockPath('M0 0', { id: 'path1' })
      const path2 = createMockPath('M10 10', { fill: 'none' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('no-merge')
    })

    it('returns no-merge when any path has clip-path attribute', () => {
      const path1 = createMockPath('M0 0', { 'clip-path': 'url(#clip)' })
      const path2 = createMockPath('M10 10', { fill: 'none' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('no-merge')
    })

    it('returns no-merge when any path has aria-label attribute', () => {
      const path1 = createMockPath('M0 0', { 'aria-label': 'decorative' })
      const path2 = createMockPath('M10 10', { fill: 'none' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('no-merge')
    })

    it('returns cautious-merge when any path has fill-rule="evenodd"', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000', 'fill-rule': 'evenodd' })
      const path2 = createMockPath('M10 10', { fill: '#ff0000', 'fill-rule': 'nonzero' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('cautious-merge')
    })

    it('returns merge when all paths have fill="none"', () => {
      const path1 = createMockPath('M0 0', { fill: 'none' })
      const path2 = createMockPath('M10 10', { fill: 'none' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('merge')
    })

    it('returns merge when paths have same style AND no bounding box overlap', () => {
      // Two non-overlapping paths with same fill
      const path1 = createMockPath('M0 0 L10 0 L10 10 L0 10 Z', { fill: '#ff0000' })
      const path2 = createMockPath('M20 0 L30 0 L30 10 L20 10 Z', { fill: '#ff0000' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('merge')
    })

    it('returns cautious-merge when paths have same style AND bounding boxes overlap', () => {
      // Two overlapping paths with same fill
      const path1 = createMockPath('M0 0 L20 0 L20 20 L0 20 Z', { fill: '#ff0000' })
      const path2 = createMockPath('M10 10 L30 10 L30 30 L10 30 Z', { fill: '#ff0000' })
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('cautious-merge')
    })

    it('returns cautious-merge for single path (edge case)', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000' })
      const result = shouldMerge([path1], {})
      expect(result).toBe('cautious-merge')
    })

    it('returns no-merge for paths with no common styles and not all fill="none"', () => {
      const path1 = createMockPath('M0 0', { fill: '#ff0000' })
      const path2 = createMockPath('M10 10', {}) // no fill attribute
      const result = shouldMerge([path1, path2], {})
      expect(result).toBe('no-merge')
    })
  })

  describe('mergePaths', () => {
    it('concatenates two absolute paths with space', () => {
      const path1 = createMockPath('M0 0 L10 0')
      const path2 = createMockPath('M20 0 L30 0')
      const result = mergePaths([path1, path2], {}, undefined)
      // Paths are normalized with commas between coordinates
      expect(result).toContain('M0,0L10,0')
      expect(result).toContain('M20,0L30,0')
    })

    it('handles relative paths (calls toAbsolutePath internally)', () => {
      const path1 = createMockPath('m0 0 l10 0')
      const path2 = createMockPath('m20 0 l30 0')
      const result = mergePaths([path1, path2], {}, undefined)
      // Should convert to absolute and join
      expect(result).toContain(' ')
    })

    it('returns empty string for empty d attributes', () => {
      const path1 = createMockPath('')
      const path2 = createMockPath('')
      const result = mergePaths([path1, path2], {}, undefined)
      expect(result).toBe('')
    })
  })

  describe('createMergedShapeElement', () => {
    it('creates PPTShapeElement with merged path', () => {
      const path1 = createMockPath('M0 0 L10 0 L10 10 L0 10 Z')
      const path2 = createMockPath('M20 0 L30 0 L30 10 L20 10 Z')
      const commonStyle = { fill: '#ff0000' }
      const result = createMergedShapeElement([path1, path2], commonStyle, undefined, [100, 100], 0)
      expect(result.type).toBe('shape')
      // Paths are normalized with commas between coordinates
      expect(result.path).toContain('M0,0L10,0L10,10L0,10Z')
      expect(result.path).toContain('M20,0L30,0L30,10L20,10Z')
    })

    it('applies common style (fill, opacity)', () => {
      const path1 = createMockPath('M0 0 L10 0')
      const path2 = createMockPath('M20 0 L30 0')
      const commonStyle = { fill: '#00ff00', opacity: '0.8' }
      const result = createMergedShapeElement([path1, path2], commonStyle, undefined, [100, 100], 0)
      expect(result.fill).toBe('#00ff00')
      expect(result.opacity).toBe(0.8)
    })

    it('handles group transform (extracts rotate)', () => {
      const path1 = createMockPath('M0 0 L10 0')
      const path2 = createMockPath('M20 0 L30 0')
      const commonStyle = { fill: '#ff0000' }
      const result = createMergedShapeElement([path1, path2], commonStyle, 'rotate(45 50 50)', [100, 100], 0)
      expect(result.rotate).toBe(45)
    })
  })
})
